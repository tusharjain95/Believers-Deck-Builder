import JSZip from 'jszip';
import type { Member } from '../types';
import { normalizeMemberName, getAllMembers, saveMember } from '../data/membersRepo';

export interface AssetMemberMatch {
  member: Member;
  cardFileName?: string;
  cardBlob?: Blob;
  hasCard: boolean;
  photoFileName?: string;
  photoBlob?: Blob;
  hasPhoto: boolean;
  status: 'both' | 'photo_only' | 'card_only' | 'none';
}

export interface AssetsZipPreview {
  matches: AssetMemberMatch[];
  unmatchedFiles: string[];
  totalFiles: number;
}

/**
 * Normalizes a filename to base stem for fuzzy matching
 */
function cleanStem(filename: string): string {
  const base = filename.split('/').pop() || filename;
  const noExt = base.replace(/\.[^/.]+$/, '');
  return normalizeMemberName(noExt);
}

/**
 * Inspects BNI_Member_Assets.zip and matches files against members
 */
export async function matchAssetsZip(
  zipData: Blob | ArrayBuffer,
  membersList?: Member[]
): Promise<AssetsZipPreview> {
  const zip = await JSZip.loadAsync(zipData);
  const members = membersList || (await getAllMembers());

  // Index files in zip
  const cardFiles = new Map<string, JSZip.JSZipObject>();
  const photoFiles = new Map<string, JSZip.JSZipObject>();
  const allZipFiles: string[] = [];

  zip.forEach((relPath, file) => {
    if (file.dir || relPath.startsWith('__MACOSX') || relPath.startsWith('.')) return;
    allZipFiles.push(relPath);

    const lower = relPath.toLowerCase();
    if (lower.startsWith('cards/') || lower.includes('/cards/') || lower.includes('_card')) {
      const stem = cleanStem(relPath);
      cardFiles.set(relPath, file);
      if (stem) cardFiles.set(stem, file);
    } else if (lower.startsWith('photos/') || lower.includes('/photos/') || lower.includes('_photo')) {
      const stem = cleanStem(relPath);
      photoFiles.set(relPath, file);
      if (stem) photoFiles.set(stem, file);
    } else {
      // General image check
      const stem = cleanStem(relPath);
      if (stem) {
        photoFiles.set(stem, file);
      }
    }
  });

  const usedFiles = new Set<string>();
  const matches: AssetMemberMatch[] = [];

  for (const member of members) {
    const norm = normalizeMemberName(member.name);
    let cardZipObj: JSZip.JSZipObject | undefined;
    let photoZipObj: JSZip.JSZipObject | undefined;
    let cardFileName: string | undefined;
    let photoFileName: string | undefined;

    // 1. Try matching card
    if (member.cardFile) {
      const exact = zip.file(member.cardFile) || zip.file(`cards/${member.cardFile}`);
      if (exact) {
        cardZipObj = exact;
        cardFileName = exact.name;
      }
    }
    if (!cardZipObj) {
      // Try matching by normalized name stem
      const found = cardFiles.get(norm);
      if (found) {
        cardZipObj = found;
        cardFileName = found.name;
      }
    }

    // 2. Try matching photo
    if (member.photoFile) {
      const exact = zip.file(member.photoFile) || zip.file(`photos/${member.photoFile}`);
      if (exact) {
        photoZipObj = exact;
        photoFileName = exact.name;
      }
    }
    if (!photoZipObj) {
      // Try matching by normalized name stem
      const found = photoFiles.get(norm);
      if (found) {
        photoZipObj = found;
        photoFileName = found.name;
      }
    }

    // Extract blobs
    let cardBlob: Blob | undefined;
    let photoBlob: Blob | undefined;

    if (cardZipObj) {
      cardBlob = await cardZipObj.async('blob');
      usedFiles.add(cardZipObj.name);
    }
    if (photoZipObj) {
      photoBlob = await photoZipObj.async('blob');
      usedFiles.add(photoZipObj.name);
    }

    const hasCard = Boolean(cardBlob || member.cardBlob);
    const hasPhoto = Boolean(photoBlob || member.photoBlob);

    let status: AssetMemberMatch['status'] = 'none';
    if (hasCard && hasPhoto) status = 'both';
    else if (hasPhoto) status = 'photo_only';
    else if (hasCard) status = 'card_only';

    matches.push({
      member,
      cardFileName: cardFileName || member.cardFile,
      cardBlob,
      hasCard,
      photoFileName: photoFileName || member.photoFile,
      photoBlob,
      hasPhoto,
      status,
    });
  }

  const unmatchedFiles = allZipFiles.filter((f) => !usedFiles.has(f));

  return {
    matches,
    unmatchedFiles,
    totalFiles: allZipFiles.length,
  };
}

/**
 * Commits matched blobs onto member records in IndexedDB
 */
export async function commitAssetsToMembers(
  matches: AssetMemberMatch[]
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  for (const m of matches) {
    if (m.cardBlob || m.photoBlob) {
      const updatedMember: Member = {
        ...m.member,
        cardBlob: m.cardBlob || m.member.cardBlob,
        photoBlob: m.photoBlob || m.member.photoBlob,
        cardFile: m.cardFileName || m.member.cardFile,
        photoFile: m.photoFileName || m.member.photoFile,
      };
      await saveMember(updatedMember);
      updatedCount++;
    }
  }

  return { updatedCount };
}
