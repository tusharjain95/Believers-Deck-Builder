import { db } from './db';
import type { Member } from '../types';

/**
 * Normalizes member name for case-insensitive matching,
 * ignoring honorific titles (CA, Dr, Adv, Mr, Mrs, etc.) and extra whitespace.
 */
export function normalizeMemberName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/^(ca|dr|adv|mr|mrs|ms|er|shri|smt)\.?\s+/i, '')
    .replace(/[.,\-_/()]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function getAllMembers(): Promise<Member[]> {
  return await db.members.toArray();
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  return await db.members.get(id);
}

export async function saveMember(member: Member): Promise<void> {
  await db.members.put(member);
}

export async function updateMember(id: string, changes: Partial<Member>): Promise<void> {
  const existing = await db.members.get(id);
  if (!existing) {
    throw new Error(`Member with ID "${id}" not found.`);
  }
  await db.members.put({ ...existing, ...changes });
}

export async function toggleMemberActive(id: string): Promise<boolean> {
  const existing = await db.members.get(id);
  if (!existing) return false;
  const newActive = !existing.active;
  await db.members.update(id, { active: newActive });
  return newActive;
}

export async function deleteMember(id: string): Promise<void> {
  await db.members.delete(id);
}

/**
 * Bulk upserts members.
 * Rule: Match names case-insensitively, ignoring titles (CA/Dr) and extra spaces.
 * Re-import updates existing members by name instead of duplicating.
 */
export async function bulkUpsertMembers(
  newMembers: Member[]
): Promise<{ added: number; updated: number }> {
  const existing = await getAllMembers();
  const existingMap = new Map<string, Member>();

  for (const m of existing) {
    const norm = normalizeMemberName(m.name);
    if (norm) existingMap.set(norm, m);
  }

  let added = 0;
  let updated = 0;

  await db.transaction('rw', db.members, async () => {
    for (const nm of newMembers) {
      const norm = normalizeMemberName(nm.name);
      const matched = existingMap.get(norm);

      if (matched) {
        // Update existing member, preserving existing blobs if new ones are not provided
        const updatedRecord: Member = {
          ...matched,
          ...nm,
          id: matched.id, // keep original ID
          photoBlob: nm.photoBlob || matched.photoBlob,
          cardBlob: nm.cardBlob || matched.cardBlob,
          cardFile: nm.cardFile || matched.cardFile,
          photoFile: nm.photoFile || matched.photoFile,
        };
        await db.members.put(updatedRecord);
        existingMap.set(norm, updatedRecord);
        updated++;
      } else {
        // New member
        await db.members.add(nm);
        existingMap.set(norm, nm);
        added++;
      }
    }
  });

  return { added, updated };
}

/**
 * Seeds demo BNI Believers members for immediate testing
 */
export async function seedDemoMembers(): Promise<void> {
  // Helper to create a colorful SVG blob for demo cards & photos
  const createColoredBlob = (text: string, sub: string, width: number, height: number, bg: string): Blob => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="${Math.round(height * 0.12)}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${text}</text>
      <text x="50%" y="62%" font-family="Arial, sans-serif" font-size="${Math.round(height * 0.07)}" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${sub}</text>
    </svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  };

  const sampleMembers: Member[] = [
    {
      id: 'mem_tushar_jain',
      title: 'CA',
      name: 'Tushar Jain',
      category: 'Chartered Accountant',
      company: 'Tushar Jain & Co.',
      phone: '+91 98251 12345',
      email: 'tushar@bniexample.com',
      birthday: '15-08',
      joinedDate: '2023-04-01',
      active: true,
      cardFile: 'cards/tushar_card.png',
      photoFile: 'photos/tushar.jpg',
      notes: 'President - Term 2026',
      cardBlob: createColoredBlob('NOW PRESENTING', 'CA Tushar Jain • Audit & Tax', 960, 540, '#991b1b'),
      photoBlob: createColoredBlob('TJ', 'CA Tushar', 431, 500, '#b91c1c'),
    },
    {
      id: 'mem_priya_sharma',
      title: 'Dr',
      name: 'Priya Sharma',
      category: 'Dental Surgeon',
      company: 'Smile Dental Clinic',
      phone: '+91 98252 23456',
      email: 'drpriya@bniexample.com',
      birthday: '22-11',
      joinedDate: '2023-06-15',
      active: true,
      cardFile: 'cards/priya_card.png',
      photoFile: 'photos/priya.jpg',
      notes: 'Vice President',
      cardBlob: createColoredBlob('NOW PRESENTING', 'Dr. Priya Sharma • Dental Care', 960, 540, '#1e3a8a'),
      photoBlob: createColoredBlob('PS', 'Dr. Priya', 431, 500, '#2563eb'),
    },
    {
      id: 'mem_rahul_patel',
      name: 'Rahul Patel',
      category: 'Commercial Printing',
      company: 'Believers Print Solutions',
      phone: '+91 98253 34567',
      email: 'rahul@bniexample.com',
      birthday: '05-03',
      joinedDate: '2023-01-10',
      active: true,
      cardFile: 'cards/rahul_card.png',
      photoFile: 'photos/rahul.jpg',
      notes: 'Secretary Treasurer',
      cardBlob: createColoredBlob('NOW PRESENTING', 'Rahul Patel • Print & Packaging', 960, 540, '#065f46'),
      photoBlob: createColoredBlob('RP', 'Rahul Patel', 431, 500, '#059669'),
    },
    {
      id: 'mem_ananya_desai',
      title: 'Adv',
      name: 'Ananya Desai',
      category: 'Corporate Lawyer',
      company: 'Desai Legal Partners',
      phone: '+91 98254 45678',
      email: 'ananya@bniexample.com',
      birthday: '18-09',
      joinedDate: '2023-08-20',
      active: true,
      cardBlob: createColoredBlob('NOW PRESENTING', 'Adv. Ananya Desai • Legal Advisor', 960, 540, '#4c1d95'),
      photoBlob: createColoredBlob('AD', 'Adv. Ananya', 431, 500, '#6d28d9'),
    },
    {
      id: 'mem_vikram_mehta',
      name: 'Vikram Mehta',
      category: 'Interior Architecture',
      company: 'SpaceCraft Interiors',
      phone: '+91 98255 56789',
      email: 'vikram@bniexample.com',
      birthday: '30-01',
      joinedDate: '2023-09-01',
      active: true,
      cardBlob: createColoredBlob('NOW PRESENTING', 'Vikram Mehta • Interior Design', 960, 540, '#78350f'),
      photoBlob: createColoredBlob('VM', 'Vikram Mehta', 431, 500, '#b45309'),
    },
    {
      id: 'mem_suresh_kothari',
      name: 'Suresh Kothari',
      category: 'Real Estate Developer',
      company: 'Believers Realty',
      phone: '+91 98256 67890',
      email: 'suresh@bniexample.com',
      birthday: '12-06',
      joinedDate: '2022-11-15',
      active: false,
      notes: 'Currently on leave of absence',
    },
  ];

  await bulkUpsertMembers(sampleMembers);
}

