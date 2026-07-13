import 'server-only';
import { NextRequest } from 'next/server';
import { ADMIN_SECTIONS, type AdminSection } from '@/lib/adminSections';

export { ADMIN_SECTIONS, ADMIN_SECTION_LABELS, type AdminSection } from '@/lib/adminSections';

function parsePermissions(req: NextRequest): string[] {
  const raw = req.headers.get('x-permissions') || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** True if the requester is a super_admin, or a scoped `admin` with this section granted. */
export function canAccess(req: NextRequest, section: AdminSection): boolean {
  const role = req.headers.get('x-role');
  if (role === 'super_admin') return true;
  if (role !== 'admin') return false;
  return parsePermissions(req).includes(section);
}

/** True for super_admin OR any admin (used for routes with their own finer-grained checks). */
export function isAdminTier(req: NextRequest): boolean {
  const role = req.headers.get('x-role');
  return role === 'super_admin' || role === 'admin';
}
