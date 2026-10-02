/**
 * Template Repository - Manages persistence in IndexedDB via Dexie
 * Rule: Store original template bytes unchanged as Blobs.
 */

import { db, type TemplateBlobRecord, type TemplateMapRecord } from './db';
import type { TemplateVersion, TemplateMap } from '../types';
import { readTemplate, type ProgressCallback } from '../engine/readTemplate';
import JSZip from 'jszip';
import { seedLibraryImagesFromTemplate } from './libraryRepo';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function getAllTemplateVersions(): Promise<TemplateVersion[]> {
  return await db.template_versions.orderBy('version').reverse().toArray();
}

export async function getActiveTemplateVersion(): Promise<TemplateVersion | undefined> {
  const versions = await db.template_versions.toArray();
  return versions.find((v) => v.isActive) || versions[0];
}

export async function getTemplateVersionById(id: number): Promise<TemplateVersion | undefined> {
  return await db.template_versions.get(id);
}

export async function setActiveTemplateVersion(versionId: number): Promise<void> {
  await db.transaction('rw', db.template_versions, async () => {
    const all = await db.template_versions.toArray();
    for (const v of all) {
      if (v.id === versionId) {
        await db.template_versions.update(v.id!, { isActive: true });
      } else if (v.isActive) {
        await db.template_versions.update(v.id!, { isActive: false });
      }
    }
  });
}

export async function getTemplateBlob(versionId: number): Promise<Blob | null> {
  const record = await db.template_blobs.get(versionId);
  return record ? record.blob : null;
}

export async function getTemplateBlobForVersion(versionNum?: number): Promise<Blob | null> {
  if (versionNum !== undefined) {
    const versions = await db.template_versions.where('version').equals(versionNum).toArray();
    const v = versions[0];
    if (v && v.id) {
      const b = await getTemplateBlob(v.id);
      if (b) return b;
    }
  }

  const active = await getActiveTemplateVersion();
  if (active && active.id) {
    const b = await getTemplateBlob(active.id);
    if (b) return b;
  }

  const firstBlob = await db.template_blobs.toCollection().first();
  return firstBlob ? firstBlob.blob : null;
}

export async function getTemplateMap(versionId: number): Promise<TemplateMap | null> {
  const record = await db.template_maps.get(versionId);
  return record ? record.templateMap : null;
}

export async function saveTemplateMap(versionId: number, templateMap: TemplateMap): Promise<void> {
  await db.template_maps.put({
    versionId,
    templateMap,
  });
}

/**
 * Saves a new template version:
 * 1. Checks validity (valid ZIP, presentation.xml, etc.) via readTemplate
 * 2. Increments version number (1, 2, 3...)
 * 3. Stores original bytes as Blob in IndexedDB (never modified)
 * 4. Stores parsed TemplateMap
 * 5. Makes it the active version if first, or maintains active flag
 */
export async function uploadAndProcessTemplate(
  fileOrBlob: Blob | File,
  fileName: string,
  onProgress?: ProgressCallback
): Promise<{ version: TemplateVersion; templateMap: TemplateMap }> {
  if (fileOrBlob.size === 0) {
    throw new Error('Upload rejected: The selected file is empty (0 bytes).');
  }

  // Parse template and build TemplateMap
  onProgress?.(5, 'Parsing template presentation structure...');
  const templateMap = await readTemplate(fileOrBlob, fileName, onProgress);

  // Compute next version number
  const existing = await db.template_versions.toArray();
  const maxVersion = existing.reduce((max, v) => (v.version > max ? v.version : max), 0);
  const nextVersionNum = maxVersion + 1;
  const isFirst = existing.length === 0;

  onProgress?.(95, 'Storing original template bytes into IndexedDB...');

  const versionRecord: TemplateVersion = {
    version: nextVersionNum,
    filename: fileName,
    byteLength: fileOrBlob.size,
    formattedSize: formatFileSize(fileOrBlob.size),
    uploadDate: new Date().toISOString(),
    isActive: isFirst, // First uploaded template becomes active automatically
    slideCount: templateMap.slideCount,
    warningCount: templateMap.warnings.length,
  };

  const newId = await db.template_versions.add(versionRecord);
  versionRecord.id = newId;

  // Store Blob untouched
  const blobRecord: TemplateBlobRecord = {
    versionId: newId,
    blob: fileOrBlob,
  };
  await db.template_blobs.put(blobRecord);

  // Store parsed TemplateMap
  templateMap.version = nextVersionNum;
  const mapRecord: TemplateMapRecord = {
    versionId: newId,
    templateMap,
  };
  await db.template_maps.put(mapRecord);

  // Rule: When a template is uploaded, any library key that has no image yet is seeded
  // with the picture currently in that slot (follow slot's r:embed to media)
  try {
    const zip = await JSZip.loadAsync(fileOrBlob);
    await seedLibraryImagesFromTemplate(zip, templateMap);
  } catch (err) {
    console.warn('Could not seed library images:', err);
  }

  onProgress?.(100, 'Template saved successfully!');

  return {
    version: versionRecord,
    templateMap,
  };
}

export async function deleteTemplateVersion(versionId: number): Promise<void> {
  await db.transaction('rw', [db.template_versions, db.template_blobs, db.template_maps], async () => {
    const target = await db.template_versions.get(versionId);
    await db.template_versions.delete(versionId);
    await db.template_blobs.delete(versionId);
    await db.template_maps.delete(versionId);

    // If active was deleted, make the newest remaining version active
    if (target?.isActive) {
      const remaining = await db.template_versions.orderBy('version').reverse().toArray();
      if (remaining.length > 0) {
        await db.template_versions.update(remaining[0].id!, { isActive: true });
      }
    }
  });
}
