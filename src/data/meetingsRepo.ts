import { db } from './db';
import type {
  Meeting,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  ChapterSettings,
} from '../types';
import { calculateNextMeetingDate } from './scheduleRepo';
import { normalizeMemberName } from './membersRepo';

export async function getAllMeetings(): Promise<Meeting[]> {
  const list = await db.meetings.toArray();
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  return await db.meetings.get(id);
}

export async function getLatestMeeting(): Promise<Meeting | undefined> {
  const list = await getAllMeetings();
  return list[0];
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  await db.meetings.put({
    ...meeting,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMeeting(id: string): Promise<void> {
  await db.meetings.delete(id);
}

/**
 * Builds default #presenters list:
 * "default = all active members that have a card, sorted by first name A-Z,
 * then holders of the settings 'present last' roles in that order."
 */
export function buildDefaultPresentersList(
  members: Member[],
  roles: Role[],
  presentLastRoleOrder: string[] = ['secretary_treasurer', 'vice_president', 'president']
): Array<{ memberId: string; name: string; category: string; company: string; hasCard: boolean; roleKey?: string }> {
  const activeMembers = members.filter((m) => m.active);

  // Map roles to members
  const roleMemberMap = new Map<string, string>(); // roleKey -> memberId
  roles.forEach((r) => {
    if (r.memberId) {
      roleMemberMap.set(r.roleKey.toLowerCase(), r.memberId);
    }
  });

  // Identify "present last" member IDs in order
  const presentLastMemberIds: string[] = [];
  const presentLastRoleForMember = new Map<string, string>();

  for (const rKey of presentLastRoleOrder) {
    const memId = roleMemberMap.get(rKey.toLowerCase());
    if (memId && !presentLastMemberIds.includes(memId)) {
      presentLastMemberIds.push(memId);
      presentLastRoleForMember.set(memId, rKey);
    }
  }

  // Regular presenters (active, excluding present-last)
  const regularPresenters = activeMembers.filter(
    (m) => !presentLastMemberIds.includes(m.id)
  );

  // Sort regular presenters by first name A-Z
  regularPresenters.sort((a, b) => a.name.localeCompare(b.name));

  // Present last members
  const presentLastMembers = presentLastMemberIds
    .map((id) => activeMembers.find((m) => m.id === id))
    .filter(Boolean) as Member[];

  const combined = [...regularPresenters, ...presentLastMembers];

  return combined.map((m) => ({
    memberId: m.id,
    name: m.title ? `${m.title} ${m.name}` : m.name,
    category: m.category,
    company: m.company,
    hasCard: Boolean(m.cardBlob),
    roleKey: presentLastRoleForMember.get(m.id),
  }));
}

/**
 * Builds default #features list from Speaker Schedule entry for this meeting date
 */
export function buildDefaultFeaturesList(
  meetingDate: string,
  schedule: ScheduleEntry[],
  members: Member[]
): Array<{ memberId?: string; name: string; category: string; topic: string; hasPhoto: boolean }> {
  const entry = schedule.find((s) => s.date === meetingDate);
  if (!entry) return [];

  const membersMap = new Map<string, Member>();
  members.forEach((m) => membersMap.set(m.id, m));

  const list: Array<{ memberId?: string; name: string; category: string; topic: string; hasPhoto: boolean }> = [];

  if (entry.speaker1Id && membersMap.has(entry.speaker1Id)) {
    const m = membersMap.get(entry.speaker1Id)!;
    list.push({
      memberId: m.id,
      name: m.title ? `${m.title} ${m.name}` : m.name,
      category: m.category,
      topic: entry.notes || '8-Minute Presentation',
      hasPhoto: Boolean(m.photoBlob),
    });
  }

  if (entry.speaker2Id && membersMap.has(entry.speaker2Id)) {
    const m = membersMap.get(entry.speaker2Id)!;
    list.push({
      memberId: m.id,
      name: m.title ? `${m.title} ${m.name}` : m.name,
      category: m.category,
      topic: '8-Minute Presentation',
      hasPhoto: Boolean(m.photoBlob),
    });
  }

  return list;
}

/**
 * Builds default #rotation list from Speaker Schedule for next 6 meetings
 */
export function buildDefaultRotationList(
  meetingDate: string,
  schedule: ScheduleEntry[],
  members: Member[]
): Array<{ date: string; speaker_1: string; speaker_2: string; notes?: string }> {
  const membersMap = new Map<string, Member>();
  members.forEach((m) => membersMap.set(m.id, m));

  const upcoming = schedule
    .filter((s) => s.date >= meetingDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return upcoming.map((s) => {
    const spk1 = s.speaker1Id ? membersMap.get(s.speaker1Id)?.name || 'TBD' : 'TBD';
    const spk2 = s.speaker2Id ? membersMap.get(s.speaker2Id)?.name || 'TBD' : 'TBD';
    return {
      date: s.date,
      speaker_1: spk1,
      speaker_2: spk2,
      notes: s.notes,
    };
  });
}

/**
 * Creates a new meeting with carry-forward rules applied:
 * - date = next meeting weekday after latest meeting
 * - number fields in groups "vp" and "weekly" start blank
 * - everything else (statistics, monthly date, image fields, #vacant) is copied from previous meeting
 * - copied image fields are tagged in copiedImageKeys
 */
export async function createNewMeeting(
  templateMap: TemplateMap,
  settings: ChapterSettings,
  members: Member[],
  roles: Role[],
  schedule: ScheduleEntry[]
): Promise<Meeting> {
  const latest = await getLatestMeeting();
  const allExistingMeetings = await getAllMeetings();
  const existingDates = allExistingMeetings.map((m) => m.date);

  const nextDate = calculateNextMeetingDate(
    existingDates,
    settings.meetingWeekday || 'Wednesday'
  );

  const newValues: Record<string, string | number | boolean> = {};
  const newImages: Record<string, { blob?: Blob; source?: 'upload' | 'carry_forward' | 'clipboard'; filename?: string }> = {};
  const copiedImageKeys: string[] = [];

  // Carry-forward rule
  if (latest) {
    for (const [key, val] of Object.entries(latest.values)) {
      const lower = key.toLowerCase();
      const isVpOrWeeklyNumber =
        (lower.startsWith('vp.') || lower.startsWith('weekly.')) &&
        typeof val === 'number';

      if (!isVpOrWeeklyNumber) {
        newValues[key] = val;
      }
    }

    // Copy images from previous meeting
    const latestImages = (latest as any).images || {};
    for (const [key, imgData] of Object.entries(latestImages)) {
      if (imgData) {
        newImages[key] = {
          blob: (imgData as any).blob || imgData,
          source: 'carry_forward',
          filename: (imgData as any).filename,
        };
        copiedImageKeys.push(key);
      }
    }
  }

  // Pre-fill meeting.date
  newValues['meeting.date'] = nextDate;
  if (!newValues['meeting.number'] && latest?.values['meeting.number']) {
    const prevNum = Number(latest.values['meeting.number']);
    if (!isNaN(prevNum)) {
      newValues['meeting.number'] = prevNum + 1;
    }
  }

  // Initialize Special Lists
  const lists: Record<string, any[]> = {};

  lists['#presenters'] = buildDefaultPresentersList(
    members,
    roles,
    settings.presentLastRoleOrder
  );

  lists['#features'] = buildDefaultFeaturesList(nextDate, schedule, members);
  lists['#rotation'] = buildDefaultRotationList(nextDate, schedule, members);
  lists['#feature_deck'] = [];

  // Carry forward generic lists (e.g. #vacant)
  if (latest?.lists) {
    for (const [lName, lItems] of Object.entries(latest.lists)) {
      if (!['#presenters', '#features', '#rotation', '#feature_deck'].includes(lName)) {
        lists[lName] = JSON.parse(JSON.stringify(lItems));
      }
    }
  }

  const meeting: Meeting = {
    id: `meeting_${nextDate}`,
    date: nextDate,
    status: 'draft',
    values: newValues,
    lists,
    images: newImages as any,
    copiedFromMeetingId: latest?.id,
    copiedImageKeys,
    updatedAt: new Date().toISOString(),
  };

  await saveMeeting(meeting);
  return meeting;
}
