/**
 * Role-Based Access Control (RBAC) Permissions Map
 * This file serves as the single source of truth for all role permissions.
 */

export const ACTION_STRINGS = {
  // Auth Actions
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  AUTH_RESET_PASSWORD: 'auth:resetPassword',

  // Ticket Actions
  TICKETS_VIEW_ALL: 'tickets:viewAll',
  TICKETS_VIEW_ASSIGNED: 'tickets:viewAssigned',
  TICKETS_VIEW_OWN: 'tickets:viewOwn',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_ASSIGN: 'tickets:assign',
  TICKETS_UPDATE_STATUS: 'tickets:updateStatus',
  TICKETS_UPDATE_STATUS_LIMITED: 'tickets:updateStatusLimited',

  // Estimate Actions
  ESTIMATES_CREATE_EDIT: 'estimates:createEdit',
  ESTIMATES_APPROVE_OWN: 'estimates:approveOwn',
  ESTIMATES_APPROVE_ALL: 'estimates:approveAll',

  // Invoice & Payment Actions
  INVOICES_VIEW_ALL: 'invoices:viewAll',
  INVOICES_VIEW_OWN: 'invoices:viewOwn',
  PAYMENTS_PROCESS: 'payments:process',
  PAYMENTS_PROCESS_OWN: 'payments:processOwn',
  PAYMENTS_COLLECT_DELIVERY: 'payments:collectOnDelivery',

  // Inventory Actions
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_REQUEST: 'inventory:request',
  INVENTORY_API_IMPORT: 'inventory:apiImport',

  // Customer Actions
  CUSTOMERS_VIEW_EDIT_ALL: 'customers:viewEditAll',
  CUSTOMERS_VIEW_OWN: 'customers:viewOwn',
  CUSTOMERS_VIEW_LIMITED: 'customers:viewLimited',

  // Report Actions
  REPORTS_FINANCIAL: 'reports:financial',
  REPORTS_TECH_PERF: 'reports:techPerf',
  REPORTS_OWN_PERF: 'reports:ownPerf',

  // Settings Actions
  SETTINGS_TENANT_CONFIG: 'settings:tenantConfig',
  SETTINGS_USER_MGMT: 'settings:userMgmt',

  // AI & Leads
  AI_DIAGNOSTIC: 'ai:diagnostic',
  LEADS_VIEW_ALL: 'leads:viewAll',
  LEADS_VIEW_OWN: 'leads:viewOwn',
  LEADS_CLAIM: 'leads:claim',
  LEADS_ANALYTICS: 'leads:analytics',

  // Delivery & Audit
  DELIVERY_MANAGE_ZONES: 'delivery:manageZones',
  DELIVERY_VIEW_JOBS: 'delivery:viewJobs',
  DELIVERY_UPDATE_OWN_JOBS: 'delivery:updateOwnJobs',
  AUDIT_VIEW: 'audit:view',
};

export const PERMISSIONS: Record<string, string[]> = {
  superAdmin: Object.values(ACTION_STRINGS), // Has access to everything
  owner: [
    'auth:login', 'auth:resetPassword', 'tickets:viewAll', 'tickets:create', 'tickets:assign',
    'tickets:updateStatus', 'estimates:createEdit', 'estimates:approveAll', 'invoices:viewAll',
    'payments:process', 'inventory:view', 'inventory:adjust', 'inventory:apiImport',
    'customers:viewEditAll', 'reports:financial', 'reports:techPerf', 'settings:tenantConfig',
    'settings:userMgmt', 'ai:diagnostic', 'leads:viewOwn', 'leads:claim', 'leads:analytics',
    'delivery:manageZones', 'delivery:viewJobs', 'audit:view'
  ],
  manager: [
    'auth:login', 'auth:resetPassword', 'tickets:viewAll', 'tickets:create', 'tickets:assign',
    'tickets:updateStatus', 'estimates:createEdit', 'estimates:approveAll', 'invoices:viewAll',
    'payments:process', 'inventory:view', 'inventory:adjust', 'customers:viewEditAll',
    'reports:financial', 'reports:techPerf', 'settings:userMgmt', 'ai:diagnostic', 'leads:viewOwn', 'leads:claim',
    'leads:analytics', 'delivery:viewJobs', 'audit:view'
  ],
  frontdesk: [
    'auth:login', 'auth:resetPassword', 'tickets:viewAll', 'tickets:create', 'tickets:assign',
    'tickets:updateStatusLimited', 'invoices:viewAll', 'payments:process',
    'inventory:view', 'customers:viewEditAll', 'delivery:viewJobs'
  ],
  technician: [
    'auth:login', 'auth:resetPassword', 'tickets:viewAssigned', 'tickets:updateStatus',
    'inventory:view', 'inventory:request', 'customers:viewLimited', 'reports:ownPerf', 'ai:diagnostic'
  ],
  customer: [
    'auth:login', 'auth:resetPassword', 'tickets:viewOwn', 'estimates:approveOwn',
    'invoices:viewOwn', 'payments:processOwn', 'customers:viewOwn'
  ],
  driver: [
    'auth:login', 'auth:resetPassword', 'delivery:updateOwnJobs', 'payments:collectOnDelivery'
  ],
};

/**
 * Checks if a specific role has permission to perform an action
 * @param role - The user's role string
 * @param action - The action string to validate
 * @returns boolean
 */
export function hasPermission(role: string, action: string): boolean {
  if (!role || !PERMISSIONS[role]) return false;
  return PERMISSIONS[role].includes(action);
}