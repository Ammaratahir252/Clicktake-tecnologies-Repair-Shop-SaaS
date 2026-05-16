/**
 * src/lib/rbac.ts
 *
 * Central RBAC configuration for the frontend.
 * Follows the DibnowRepairSaaS Master Blueprint strictly.
 *
 * Roles (exact strings from architecture doc):
 *   super_admin | owner | manager | frontdesk | technician | customer | driver
 *
 * After login, each role is redirected to their own dashboard route.
 * Each dashboard only renders modules that role is permitted to access.
 */

// ─── Role → Dashboard Route mapping ──────────────────────────────────────────
export const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard/super-admin',
  owner:       '/dashboard/owner',
  manager:     '/dashboard/manager',
  frontdesk:   '/dashboard/frontdesk',
  technician:  '/dashboard/technician',
  customer:    '/dashboard/customer',
  driver:      '/dashboard/driver',
};

/** Returns the correct home route for a role. Defaults to /login if unknown. */
export function getRoleHome(role: string): string {
  return ROLE_HOME[role] ?? '/login';
}

// ─── Permission Matrix (from blueprint Section 5.2) ──────────────────────────
// true = allowed, false = not allowed
export const PERMISSIONS = {
  // Tickets
  'tickets.view_all':        ['super_admin', 'owner', 'manager'],
  'tickets.view_own_shift':  ['frontdesk'],
  'tickets.view_assigned':   ['technician'],
  'tickets.create':          ['super_admin', 'owner', 'manager', 'frontdesk'],
  'tickets.assign_tech':     ['super_admin', 'owner', 'manager', 'frontdesk'],
  'tickets.update_status':   ['super_admin', 'owner', 'manager', 'frontdesk', 'technician'],

  // Estimates
  'estimates.create_edit':   ['super_admin', 'owner', 'manager'],
  'estimates.approve':       ['super_admin', 'owner', 'manager', 'customer'],

  // Invoices
  'invoices.view':           ['super_admin', 'owner', 'manager', 'frontdesk', 'customer'],
  'payments.process':        ['super_admin', 'owner', 'manager', 'frontdesk', 'customer', 'driver'],

  // Inventory
  'inventory.view':          ['super_admin', 'owner', 'manager', 'frontdesk', 'technician'],
  'inventory.adjust':        ['super_admin', 'owner', 'manager'],
  'inventory.request':       ['technician'],

  // Customers
  'customers.view_edit':     ['super_admin', 'owner', 'manager', 'frontdesk'],

  // Reports
  'reports.financial':       ['super_admin', 'owner', 'manager'],
  'reports.tech_perf':       ['super_admin', 'owner', 'manager', 'technician'],

  // Settings
  'settings.tenant_config':  ['super_admin', 'owner'],
  'settings.user_mgmt':      ['super_admin', 'owner'],

  // Users/Team
  'users.view':              ['super_admin', 'owner', 'manager'],

  // Leads
  'leads.view':              ['super_admin', 'owner', 'manager'],
  'leads.claim':             ['owner', 'manager'],

  // Audit Logs
  'audit_logs.view':         ['super_admin', 'owner'],

  // Delivery
  'delivery.manage':         ['super_admin', 'owner', 'manager', 'frontdesk', 'driver'],

  // AI
  'ai.diagnostic':           ['super_admin', 'owner', 'manager', 'technician'],

  // Super Admin only
  'platform.all_tenants':    ['super_admin'],
  'platform.impersonate':    ['super_admin'],
} as const;

/** Check if a role has a specific permission */
export function can(role: string, permission: keyof typeof PERMISSIONS): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

// ─── Role display metadata ────────────────────────────────────────────────────
export const ROLE_META: Record<string, {
  label: string;
  color: string;        // Tailwind text color
  bgColor: string;      // Tailwind bg + border for badge
  accent: string;       // Tailwind bg for icon/button accents
  description: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    accent: 'bg-red-600',
    description: 'Full platform access across all tenants.',
  },
  owner: {
    label: 'Shop Owner',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    accent: 'bg-blue-600',
    description: 'Full access to your shop data, team, and settings.',
  },
  manager: {
    label: 'Manager',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    accent: 'bg-purple-600',
    description: 'Manage tickets, inventory, team, and reports.',
  },
  frontdesk: {
    label: 'Front Desk',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    accent: 'bg-emerald-600',
    description: 'Create tickets and manage customer intake.',
  },
  technician: {
    label: 'Technician',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    accent: 'bg-amber-500',
    description: 'View and update your assigned repair tickets.',
  },
  customer: {
    label: 'Customer',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-200',
    accent: 'bg-slate-600',
    description: 'Track your repair status and pay invoices.',
  },
  driver: {
    label: 'Driver',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    accent: 'bg-orange-500',
    description: 'View and manage your delivery jobs.',
  },
};
