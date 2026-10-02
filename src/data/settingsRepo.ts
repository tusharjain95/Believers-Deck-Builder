import { db } from './db';
import type { ChapterSettings } from '../types';

export const DEFAULT_SETTINGS: ChapterSettings = {
  chapterName: 'BNI Believers',
  meetingWeekday: 'Wednesday',
  outputFileNamePattern: 'BNI Believers - {DD MMM YYYY}.pptx',
  presentLastRoleOrder: ['secretary_treasurer', 'vice_president', 'president'],
  region: 'Surat',
  venue: 'Avadh Utopia',
};

export async function getChapterSettings(): Promise<ChapterSettings> {
  const record = await db.chapter_settings.get('main');
  if (record) {
    return { ...DEFAULT_SETTINGS, ...record.settings };
  }
  return DEFAULT_SETTINGS;
}

export async function saveChapterSettings(settings: Partial<ChapterSettings>): Promise<ChapterSettings> {
  const current = await getChapterSettings();
  const updated: ChapterSettings = {
    ...current,
    ...settings,
  };
  await db.chapter_settings.put({
    key: 'main',
    settings: updated,
  });
  return updated;
}
