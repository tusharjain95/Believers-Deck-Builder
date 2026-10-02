import Dexie, { type Table } from 'dexie';
import type {
  TemplateVersion,
  TemplateMap,
  Member,
  Role,
  ScheduleEntry,
  LibraryImage,
  Meeting,
  ChapterSettings,
  GeneratedDeckRecord,
} from '../types';

export interface TemplateBlobRecord {
  versionId: number;
  blob: Blob;
}

export interface TemplateMapRecord {
  versionId: number;
  templateMap: TemplateMap;
}

export interface ChapterSettingsRecord {
  key: string;
  settings: ChapterSettings;
}

export class BniDeckDatabase extends Dexie {
  template_versions!: Table<TemplateVersion, number>;
  template_blobs!: Table<TemplateBlobRecord, number>;
  template_maps!: Table<TemplateMapRecord, number>;
  library_images!: Table<LibraryImage, string>;
  members!: Table<Member, string>;
  roles!: Table<Role, string>;
  schedule!: Table<ScheduleEntry, string>;
  meetings!: Table<Meeting, string>;
  chapter_settings!: Table<ChapterSettingsRecord, string>;
  generated_decks!: Table<GeneratedDeckRecord, string>;

  constructor() {
    super('BniBelieversDeckDB');
    this.version(3).stores({
      template_versions: '++id, version, filename, uploadDate, isActive, byteLength',
      template_blobs: 'versionId',
      template_maps: 'versionId',
      library_images: 'key',
      members: 'id, name, category, active',
      roles: 'id, roleKey, memberId',
      schedule: 'id, date',
      meetings: 'id, date, status',
      chapter_settings: 'key',
      generated_decks: 'meetingId, meetingDate, savedAt',
    });
  }
}

export const db = new BniDeckDatabase();
