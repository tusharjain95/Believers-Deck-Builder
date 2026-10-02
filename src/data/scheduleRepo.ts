import { db } from './db';
import type { ScheduleEntry } from '../types';

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export async function getAllSchedule(): Promise<ScheduleEntry[]> {
  const all = await db.schedule.toArray();
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveScheduleEntry(entry: ScheduleEntry): Promise<void> {
  await db.schedule.put(entry);
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  await db.schedule.delete(id);
}

export async function bulkSaveSchedule(entries: ScheduleEntry[]): Promise<void> {
  await db.transaction('rw', db.schedule, async () => {
    for (const entry of entries) {
      await db.schedule.put(entry);
    }
  });
}

/**
 * Calculates the next meeting date based on existing schedule or meeting weekday
 */
export function calculateNextMeetingDate(
  existingDates: string[],
  meetingWeekdayName: string = 'Wednesday'
): string {
  const targetDay = WEEKDAY_MAP[meetingWeekdayName.toLowerCase()] ?? 3; // default Wednesday = 3

  let baseDate: Date;
  if (existingDates.length > 0) {
    const sorted = [...existingDates].sort();
    const lastDateStr = sorted[sorted.length - 1];
    baseDate = new Date(`${lastDateStr}T12:00:00Z`);
    // Add 7 days to the last date
    baseDate.setUTCDate(baseDate.getUTCDate() + 7);
  } else {
    // Start from upcoming target weekday
    baseDate = new Date();
    const currentDay = baseDate.getUTCDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    baseDate.setUTCDate(baseDate.getUTCDate() + daysUntil);
  }

  return baseDate.toISOString().slice(0, 10);
}

/**
 * Returns consecutive schedule entries starting from `fromDate` for `weeks` count
 */
export async function getSchedule(fromDate: string, weeks: number = 4): Promise<ScheduleEntry[]> {
  const all = await getAllSchedule();
  const filtered = all.filter((s) => s.date >= fromDate);
  return filtered.slice(0, weeks);
}
