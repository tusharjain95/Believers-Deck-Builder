import { db } from './db';
import type { GeneratedDeckRecord } from '../types';

export interface StorageEstimateResult {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
  formattedUsage: string;
  formattedQuota: string;
  isLowSpace: boolean;
}

export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function checkStorageQuota(): Promise<StorageEstimateResult> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
      return {
        usageBytes,
        quotaBytes,
        percentUsed: Math.round(percentUsed * 10) / 10,
        formattedUsage: formatByteSize(usageBytes),
        formattedQuota: formatByteSize(quotaBytes),
        isLowSpace: percentUsed > 80 || (quotaBytes - usageBytes < 200 * 1024 * 1024),
      };
    } catch (e) {
      console.warn('Storage estimate failed:', e);
    }
  }

  return {
    usageBytes: 0,
    quotaBytes: 0,
    percentUsed: 0,
    formattedUsage: 'Unknown',
    formattedQuota: 'Unknown',
    isLowSpace: false,
  };
}

export async function saveGeneratedDeck(
  meetingId: string,
  meetingDate: string,
  filename: string,
  blob: Blob
): Promise<GeneratedDeckRecord> {
  const record: GeneratedDeckRecord = {
    meetingId,
    meetingDate,
    filename,
    blob,
    sizeBytes: blob.size,
    savedAt: new Date().toISOString(),
  };

  await db.generated_decks.put(record);
  return record;
}

export async function getGeneratedDeck(meetingId: string): Promise<GeneratedDeckRecord | undefined> {
  return await db.generated_decks.get(meetingId);
}

export async function deleteGeneratedDeck(meetingId: string): Promise<void> {
  await db.generated_decks.delete(meetingId);
}
