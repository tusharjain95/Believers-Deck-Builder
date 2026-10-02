import * as XLSX from 'xlsx';
import type { Member, Role, ScheduleEntry } from '../types';
import { normalizeMemberName } from '../data/membersRepo';

export interface ExcelImportPreview {
  members: Member[];
  roles: Role[];
  schedule: ScheduleEntry[];
  unmatchedNames: Array<{
    sheet: 'Roles' | 'Speaker Schedule';
    field: string;
    rawName: string;
    context: string;
  }>;
  summary: {
    membersCount: number;
    rolesCount: number;
    scheduleCount: number;
    unmatchedCount: number;
  };
}

/**
 * Converts Excel serial date or text date into ISO YYYY-MM-DD
 */
export function parseExcelDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date (days since 1899-12-30)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  // If DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return str;
}

/**
 * Normalizes birthday to DD-MM format
 */
export function parseBirthday(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${d}-${m}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Extracts optional honorific title from name or title field (CA, Dr, Adv, etc.)
 */
export function extractTitle(rawTitle: unknown, rawName: string): { title?: string; cleanName: string } {
  let title = rawTitle ? String(rawTitle).trim() : undefined;
  let cleanName = rawName.trim();

  if (!title) {
    const titleMatch = cleanName.match(/^(CA|Dr\.?|Adv\.?|Mr\.?|Mrs\.?|Ms\.?|Er\.?)\s+/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\.$/, '').toUpperCase();
      cleanName = cleanName.substring(titleMatch[0].length).trim();
    }
  }

  return { title, cleanName };
}

/**
 * Parses BNI_Believers_Field_Inventory.xlsx workbook using SheetJS
 */
export async function parseWorkbook(fileData: ArrayBuffer): Promise<ExcelImportPreview> {
  const wb = XLSX.read(fileData, { type: 'array' });

  // Locate sheets case-insensitively
  const sheetNames = wb.SheetNames;
  const findSheet = (target: string) =>
    sheetNames.find((s) => s.trim().toLowerCase() === target.toLowerCase());

  const membersSheetName = findSheet('Members') || sheetNames[0];
  const rolesSheetName = findSheet('Roles');
  const scheduleSheetName = findSheet('Speaker Schedule') || findSheet('Schedule');

  const membersSheet = wb.Sheets[membersSheetName];
  if (!membersSheet) {
    throw new Error('Workbook missing "Members" sheet.');
  }

  // 1. Parse Members sheet
  const rawMembers: any[] = XLSX.utils.sheet_to_json(membersSheet, { defval: '' });
  const members: Member[] = [];
  const memberNameMap = new Map<string, Member>();

  for (let idx = 0; idx < rawMembers.length; idx++) {
    const row = rawMembers[idx];
    const rawName = String(row['name'] || row['Name'] || row['Member'] || '').trim();
    if (!rawName) continue;

    const { title, cleanName } = extractTitle(row['title'] || row['Title'], rawName);
    const category = String(row['category'] || row['Category'] || '').trim();
    const company = String(row['company'] || row['Company'] || '').trim();
    const phone = String(row['phone'] || row['Phone'] || row['Mobile'] || '').trim();
    const email = String(row['email'] || row['Email'] || '').trim();
    const birthday = parseBirthday(row['birthday'] || row['Birthday'] || row['DOB']);
    const joinedDate = parseExcelDate(row['joined_date'] || row['Joined Date'] || row['joinedDate']);

    let active = true;
    const activeVal = row['active'] ?? row['Active'] ?? row['Status'];
    if (activeVal !== undefined && activeVal !== '') {
      const activeStr = String(activeVal).toLowerCase().trim();
      active = activeStr === 'y' || activeStr === 'yes' || activeStr === 'true' || activeStr === '1' || activeStr === 'active';
    }

    const cardFile = String(row['card_file'] || row['card'] || row['Card File'] || '').trim();
    const photoFile = String(row['photo_file'] || row['photo'] || row['Photo File'] || '').trim();
    const notes = String(row['notes'] || row['Notes'] || '').trim();

    const norm = normalizeMemberName(cleanName);
    const id = `mem_${norm.replace(/[^a-z0-9]/g, '_')}_${idx + 1}`;

    const member: Member = {
      id,
      title,
      name: cleanName,
      category,
      company,
      phone,
      email,
      birthday,
      joinedDate,
      active,
      cardFile,
      photoFile,
      notes,
    };

    members.push(member);
    memberNameMap.set(norm, member);
  }

  const unmatchedNames: ExcelImportPreview['unmatchedNames'] = [];

  // 2. Parse Roles sheet
  const roles: Role[] = [];
  if (rolesSheetName && wb.Sheets[rolesSheetName]) {
    const rawRoles: any[] = XLSX.utils.sheet_to_json(wb.Sheets[rolesSheetName], { defval: '' });

    for (let rIdx = 0; rIdx < rawRoles.length; rIdx++) {
      const row = rawRoles[rIdx];
      const roleKey = String(row['role_key'] || row['roleKey'] || row['Key'] || `role_${rIdx}`).trim().toLowerCase();
      const roleLabel = String(row['Role'] || row['role'] || row['role_label'] || roleKey).trim();
      const rawMemberName = String(row['Member'] || row['member'] || row['Name'] || '').trim();
      const origSlide = row['Orig slide'] || row['origSlide'] || row['Slide'] || '';
      const termStart = parseExcelDate(row['term_start'] || row['termStart'] || row['Start']);
      const termEnd = parseExcelDate(row['term_end'] || row['termEnd'] || row['End']);

      let memberId: string | undefined;

      if (rawMemberName) {
        const norm = normalizeMemberName(rawMemberName);
        const matched = memberNameMap.get(norm);
        if (matched) {
          memberId = matched.id;
        } else {
          unmatchedNames.push({
            sheet: 'Roles',
            field: 'Member',
            rawName: rawMemberName,
            context: `Role: ${roleLabel} (${roleKey})`,
          });
        }
      }

      roles.push({
        id: `role_${roleKey}`,
        roleKey,
        roleLabel,
        memberId,
        origSlide,
        termStart,
        termEnd,
      });
    }
  }

  // 3. Parse Speaker Schedule sheet
  const schedule: ScheduleEntry[] = [];
  if (scheduleSheetName && wb.Sheets[scheduleSheetName]) {
    const rawSchedule: any[] = XLSX.utils.sheet_to_json(wb.Sheets[scheduleSheetName], { defval: '' });

    for (let sIdx = 0; sIdx < rawSchedule.length; sIdx++) {
      const row = rawSchedule[sIdx];
      const date = parseExcelDate(row['date'] || row['Date'] || row['Meeting Date']);
      if (!date) continue;

      const speaker1Raw = String(row['speaker_1'] || row['speaker1'] || row['Speaker 1'] || '').trim();
      const speaker2Raw = String(row['speaker_2'] || row['speaker2'] || row['Speaker 2'] || '').trim();
      const notes = String(row['notes'] || row['Notes'] || '').trim();

      let speaker1Id: string | undefined;
      let speaker2Id: string | undefined;

      if (speaker1Raw) {
        const norm = normalizeMemberName(speaker1Raw);
        const matched = memberNameMap.get(norm);
        if (matched) {
          speaker1Id = matched.id;
        } else {
          unmatchedNames.push({
            sheet: 'Speaker Schedule',
            field: 'Speaker 1',
            rawName: speaker1Raw,
            context: `Meeting Date: ${date}`,
          });
        }
      }

      if (speaker2Raw) {
        const norm = normalizeMemberName(speaker2Raw);
        const matched = memberNameMap.get(norm);
        if (matched) {
          speaker2Id = matched.id;
        } else {
          unmatchedNames.push({
            sheet: 'Speaker Schedule',
            field: 'Speaker 2',
            rawName: speaker2Raw,
            context: `Meeting Date: ${date}`,
          });
        }
      }

      schedule.push({
        id: `sched_${date}`,
        date,
        speaker1Id,
        speaker2Id,
        notes,
      });
    }
  }

  return {
    members,
    roles,
    schedule,
    unmatchedNames,
    summary: {
      membersCount: members.length,
      rolesCount: roles.length,
      scheduleCount: schedule.length,
      unmatchedCount: unmatchedNames.length,
    },
  };
}
