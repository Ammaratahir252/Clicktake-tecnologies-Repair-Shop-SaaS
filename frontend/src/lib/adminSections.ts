/**
 * Canonical list of platform-admin sections — shared between server route
 * guards (lib/adminAccess.ts) and client UI (the Add Admin permission
 * checklist, sidebar filtering). No 'server-only' here since client
 * components import it too.
 */
export const ADMIN_SECTIONS = [
  'tenants',
  'users',
  'tickets',
  'leads',
  'customers',
  'subscriptions',
  'notifications',
  'analytics',
  'audit',
  'impersonate',
  'settings',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const ADMIN_SECTION_LABELS: Record<AdminSection, string> = {
  tenants: 'Tenants',
  users: 'All Users',
  tickets: 'All Tickets',
  leads: 'Leads',
  customers: 'Customers',
  subscriptions: 'Subscriptions',
  notifications: 'Notifications',
  analytics: 'Analytics',
  audit: 'Audit Logs',
  impersonate: 'Impersonate',
  settings: 'Settings',
};
