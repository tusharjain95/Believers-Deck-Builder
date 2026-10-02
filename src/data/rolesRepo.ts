import { db } from './db';
import type { Role, Member } from '../types';

export const STANDARD_ROLES: Array<{ roleKey: string; roleLabel: string }> = [
  { roleKey: 'president', roleLabel: 'President' },
  { roleKey: 'vice_president', roleLabel: 'Vice President' },
  { roleKey: 'secretary_treasurer', roleLabel: 'Secretary Treasurer' },
  { roleKey: 'education_coordinator', roleLabel: 'Education Coordinator' },
  { roleKey: 'growth_coordinator', roleLabel: 'Growth Coordinator' },
  { roleKey: 'visitor_host_lead', roleLabel: 'Lead Visitor Host' },
  { roleKey: 'events_coordinator', roleLabel: 'Events Coordinator' },
  { roleKey: 'mentor_coordinator', roleLabel: 'Mentor Coordinator' },
];

export async function getAllRoles(): Promise<Role[]> {
  const roles = await db.roles.toArray();
  if (roles.length === 0) {
    // Seed default standard roles
    const seeded: Role[] = STANDARD_ROLES.map((sr) => ({
      id: `role_${sr.roleKey}`,
      roleKey: sr.roleKey,
      roleLabel: sr.roleLabel,
    }));
    await db.roles.bulkAdd(seeded);
    return seeded;
  }
  return roles;
}

export async function saveRole(role: Role): Promise<void> {
  await db.roles.put(role);
}

export async function deleteRole(id: string): Promise<void> {
  await db.roles.delete(id);
}

export async function bulkSaveRoles(roles: Role[]): Promise<void> {
  await db.transaction('rw', db.roles, async () => {
    for (const r of roles) {
      await db.roles.put(r);
    }
  });
}

/**
 * Returns the member holding a given role key on a specific date (or current date if omitted).
 */
export async function getRoleHolder(
  roleKey: string,
  targetDateStr?: string
): Promise<{ role: Role; member?: Member } | null> {
  const allRoles = await db.roles.toArray();
  const matching = allRoles.filter(
    (r) => r.roleKey.toLowerCase() === roleKey.toLowerCase()
  );

  if (matching.length === 0) return null;

  const checkDate = targetDateStr || new Date().toISOString().slice(0, 10);

  // Find role active on checkDate if terms are specified
  let selectedRole = matching[0];
  for (const r of matching) {
    const afterStart = !r.termStart || checkDate >= r.termStart;
    const beforeEnd = !r.termEnd || checkDate <= r.termEnd;
    if (afterStart && beforeEnd) {
      selectedRole = r;
      break;
    }
  }

  let member: Member | undefined;
  if (selectedRole.memberId) {
    member = await db.members.get(selectedRole.memberId);
  }

  return { role: selectedRole, member };
}
