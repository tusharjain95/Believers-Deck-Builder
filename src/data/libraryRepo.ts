import { db } from './db';
import type { LibraryImage, LibraryImageVersion, TemplateMap } from '../types';
import JSZip from 'jszip';

export async function getAllLibraryImages(): Promise<LibraryImage[]> {
  return await db.library_images.toArray();
}

export async function getLibraryImage(key: string): Promise<LibraryImage | undefined> {
  return await db.library_images.get(key);
}

export async function saveLibraryImage(img: LibraryImage): Promise<void> {
  await db.library_images.put(img);
}

/**
 * Replaces a library image with a new version, preserving previous versions with timestamps.
 */
export async function replaceLibraryImage(
  key: string,
  newBlob: Blob,
  filename?: string
): Promise<LibraryImage> {
  const existing = await getLibraryImage(key);
  const now = new Date().toISOString();

  const newVersion: LibraryImageVersion = {
    blob: newBlob,
    date: now,
    filename: filename || `${key}.png`,
    byteLength: newBlob.size,
  };

  const updated: LibraryImage = existing
    ? {
        ...existing,
        currentBlob: newBlob,
        versions: [newVersion, ...existing.versions],
        lastUpdated: now,
      }
    : {
        key,
        name: key.replace(/^lib\./, '').replace(/_/g, ' '),
        currentBlob: newBlob,
        versions: [newVersion],
        lastUpdated: now,
      };

  await db.library_images.put(updated);
  return updated;
}

/**
 * Restores an older version from history as the current active version.
 */
export async function restoreLibraryVersion(
  key: string,
  versionIndex: number
): Promise<LibraryImage | null> {
  const existing = await getLibraryImage(key);
  if (!existing || !existing.versions[versionIndex]) return null;

  const targetVersion = existing.versions[versionIndex];
  const now = new Date().toISOString();

  const updated: LibraryImage = {
    ...existing,
    currentBlob: targetVersion.blob,
    lastUpdated: now,
  };

  await db.library_images.put(updated);
  return updated;
}

/**
 * Seeds library images from the template when uploaded:
 * For every lib.* image slot, if no image exists in DB, follow r:embed to zip media and seed.
 */
export async function seedLibraryImagesFromTemplate(
  zip: JSZip,
  templateMap: TemplateMap
): Promise<number> {
  let seededCount = 0;

  for (const slide of templateMap.slides) {
    for (const slot of slide.imageSlots) {
      if (slot.group === 'lib' && slot.mediaPath) {
        const existing = await getLibraryImage(slot.key);
        if (!existing) {
          const zipFile = zip.file(slot.mediaPath);
          if (zipFile) {
            const blob = await zipFile.async('blob');
            const now = new Date().toISOString();
            const newLibImage: LibraryImage = {
              key: slot.key,
              name: slot.key.replace(/^lib\./, '').replace(/_/g, ' '),
              currentBlob: blob,
              versions: [
                {
                  blob,
                  date: now,
                  filename: slot.mediaPath.split('/').pop() || `${slot.key}.png`,
                  byteLength: blob.size,
                },
              ],
              slideNumber: slide.slideNumber,
              lastUpdated: now,
            };
            await db.library_images.put(newLibImage);
            seededCount++;
          }
        } else if (!existing.slideNumber) {
          // Update slide number if not set
          await db.library_images.update(slot.key, { slideNumber: slide.slideNumber });
        }
      }
    }
  }

  return seededCount;
}
