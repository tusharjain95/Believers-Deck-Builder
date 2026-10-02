import JSZip from 'jszip';
import { db } from '../data/db';
import type { Member, Role, ScheduleEntry, LibraryImage, ChapterSettings, TemplateVersion } from '../types';
import { getChapterSettings, saveChapterSettings } from '../data/settingsRepo';
import { getAllMembers } from '../data/membersRepo';
import { getAllRoles } from '../data/rolesRepo';
import { getAllSchedule } from '../data/scheduleRepo';
import { getAllLibraryImages } from '../data/libraryRepo';
import { getAllTemplateVersions, getTemplateBlob } from '../data/templateRepo';

export interface BackupOptions {
  includeTemplates: boolean;
  onProgress?: (percent: number, message: string) => void;
}

export async function createBackupZip(options: BackupOptions): Promise<Blob> {
  const { includeTemplates, onProgress } = options;
  const zip = new JSZip();

  onProgress?.(10, 'Collecting chapter data...');

  const [members, roles, schedule, library, settings, versions, meetings] = await Promise.all([
    getAllMembers(),
    getAllRoles(),
    getAllSchedule(),
    getAllLibraryImages(),
    getChapterSettings(),
    getAllTemplateVersions(),
    db.meetings.toArray(),
  ]);

  // 1. Settings & Roles & Schedule & Meetings JSON
  zip.file('data/settings.json', JSON.stringify(settings, null, 2));
  zip.file('data/roles.json', JSON.stringify(roles, null, 2));
  zip.file('data/schedule.json', JSON.stringify(schedule, null, 2));
  zip.file('data/meetings.json', JSON.stringify(meetings, null, 2));
  zip.file('data/template_versions.json', JSON.stringify(versions, null, 2));

  // 2. Members metadata & blobs
  onProgress?.(30, `Packaging ${members.length} members & images...`);
  const membersMeta = members.map((m) => {
    const { photoBlob, cardBlob, ...rest } = m;
    return {
      ...rest,
      hasPhoto: Boolean(photoBlob),
      hasCard: Boolean(cardBlob),
    };
  });
  zip.file('data/members.json', JSON.stringify(membersMeta, null, 2));

  for (const m of members) {
    if (m.photoBlob) {
      zip.file(`media/members/photos/${m.id}.png`, m.photoBlob);
    }
    if (m.cardBlob) {
      zip.file(`media/members/cards/${m.id}.png`, m.cardBlob);
    }
  }

  // 3. Slide Library metadata & blobs
  onProgress?.(50, `Packaging ${library.length} library images...`);
  const libraryMeta = library.map((lib) => {
    return {
      key: lib.key,
      name: lib.name,
      category: lib.category,
      slideNumber: lib.slideNumber,
      lastUpdated: lib.lastUpdated,
      versionsMeta: lib.versions.map((v, idx) => ({
        index: idx,
        date: v.date,
        filename: v.filename,
        byteLength: v.byteLength,
      })),
    };
  });
  zip.file('data/library.json', JSON.stringify(libraryMeta, null, 2));

  for (const lib of library) {
    const safeKey = lib.key.replace(/[^a-zA-Z0-9_.]/g, '_');
    if (lib.currentBlob) {
      zip.file(`media/library/${safeKey}/current.png`, lib.currentBlob);
    }
    for (let vIdx = 0; vIdx < lib.versions.length; vIdx++) {
      const ver = lib.versions[vIdx];
      if (ver.blob) {
        zip.file(`media/library/${safeKey}/version_${vIdx}.png`, ver.blob);
      }
    }
  }

  // 4. Optional Template files
  if (includeTemplates) {
    onProgress?.(70, 'Packaging PowerPoint master templates...');
    for (const ver of versions) {
      if (ver.id) {
        const blob = await getTemplateBlob(ver.id);
        if (blob) {
          zip.file(`templates/v${ver.version}_${ver.filename}`, blob);
        }
      }
    }
  }

  onProgress?.(85, 'Compressing archive...');
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(85 + Math.round(metadata.percent * 0.15), 'Writing backup archive...');
    }
  );

  onProgress?.(100, 'Backup package ready!');
  return zipBlob;
}

export interface RestoreStats {
  membersRestored: number;
  rolesRestored: number;
  scheduleRestored: number;
  libraryRestored: number;
  templatesRestored: number;
}

export async function restoreBackupZip(
  zipBlob: Blob,
  onProgress?: (percent: number, message: string) => void
): Promise<RestoreStats> {
  onProgress?.(10, 'Reading backup archive...');
  const zip = await JSZip.loadAsync(zipBlob);

  const stats: RestoreStats = {
    membersRestored: 0,
    rolesRestored: 0,
    scheduleRestored: 0,
    libraryRestored: 0,
    templatesRestored: 0,
  };

  // 1. Settings
  const settingsFile = zip.file('data/settings.json');
  if (settingsFile) {
    const settingsJson = JSON.parse(await settingsFile.async('text'));
    await saveChapterSettings(settingsJson);
  }

  // 2. Roles
  const rolesFile = zip.file('data/roles.json');
  if (rolesFile) {
    const roles: Role[] = JSON.parse(await rolesFile.async('text'));
    await db.transaction('rw', db.roles, async () => {
      await db.roles.clear();
      await db.roles.bulkAdd(roles);
    });
    stats.rolesRestored = roles.length;
  }

  // 3. Schedule
  const schedFile = zip.file('data/schedule.json');
  if (schedFile) {
    const schedule: ScheduleEntry[] = JSON.parse(await schedFile.async('text'));
    await db.transaction('rw', db.schedule, async () => {
      await db.schedule.clear();
      await db.schedule.bulkAdd(schedule);
    });
    stats.scheduleRestored = schedule.length;
  }

  // 4. Members + Images
  onProgress?.(30, 'Restoring members and images...');
  const membersFile = zip.file('data/members.json');
  if (membersFile) {
    const membersMeta: any[] = JSON.parse(await membersFile.async('text'));
    const membersWithBlobs: Member[] = [];

    for (const meta of membersMeta) {
      let photoBlob: Blob | undefined;
      let cardBlob: Blob | undefined;

      const photoFile = zip.file(`media/members/photos/${meta.id}.png`);
      if (photoFile) {
        photoBlob = await photoFile.async('blob');
      }

      const cardFile = zip.file(`media/members/cards/${meta.id}.png`);
      if (cardFile) {
        cardBlob = await cardFile.async('blob');
      }

      membersWithBlobs.push({
        ...meta,
        photoBlob,
        cardBlob,
      });
    }

    await db.transaction('rw', db.members, async () => {
      await db.members.clear();
      for (const m of membersWithBlobs) {
        await db.members.put(m);
      }
    });
    stats.membersRestored = membersWithBlobs.length;
  }

  // 5. Library Images
  onProgress?.(60, 'Restoring slide library images...');
  const libraryFile = zip.file('data/library.json');
  if (libraryFile) {
    const libMetas: any[] = JSON.parse(await libraryFile.async('text'));
    for (const lm of libMetas) {
      const safeKey = lm.key.replace(/[^a-zA-Z0-9_.]/g, '_');
      const curFile = zip.file(`media/library/${safeKey}/current.png`);
      let currentBlob: Blob | undefined;
      if (curFile) {
        currentBlob = await curFile.async('blob');
      }

      const restoredVersions: any[] = [];
      if (lm.versionsMeta && Array.isArray(lm.versionsMeta)) {
        for (const vm of lm.versionsMeta) {
          const vFile = zip.file(`media/library/${safeKey}/version_${vm.index}.png`);
          if (vFile) {
            const vBlob = await vFile.async('blob');
            restoredVersions.push({
              blob: vBlob,
              date: vm.date,
              filename: vm.filename,
              byteLength: vm.byteLength,
            });
          }
        }
      }

      const libRecord: LibraryImage = {
        key: lm.key,
        name: lm.name,
        category: lm.category,
        slideNumber: lm.slideNumber,
        lastUpdated: lm.lastUpdated,
        currentBlob,
        versions: restoredVersions.length > 0 ? restoredVersions : currentBlob ? [{ blob: currentBlob, date: new Date().toISOString() }] : [],
      };

      await db.library_images.put(libRecord);
      stats.libraryRestored++;
    }
  }

  onProgress?.(100, 'Restore completed successfully!');
  return stats;
}
