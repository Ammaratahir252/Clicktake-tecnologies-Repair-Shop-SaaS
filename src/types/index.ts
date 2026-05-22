// ============================================================
// DibnowRepairSaaS — Shared Types & Enums
// Used across ALL modules — never modify without team approval
// ============================================================

// ─── User Roles (exact strings from architecture doc) ───────
export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
  FRONTDESK = 'frontdesk',
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  SUPER_ADMIN = 'super_admin',
}

// ─── Ticket Statuses ────────────────────────────────────────
export enum TicketStatus {
  RECEIVED = 'received',
  DIAGNOSED = 'diagnosed',
  ESTIMATE_SENT = 'estimate_sent',
  APPROVED = 'approved',
  IN_REPAIR = 'in_repair',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// ─── Inventory Movement Types ────────────────────────────────
export enum StockMovementType {
  ADDED = 'added',
  USED = 'used',
  ADJUSTED = 'adjusted',
  RETURNED = 'returned',
  DAMAGED = 'damaged',
}

// ─── Payment Statuses ────────────────────────────────────────
export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ─── Payment Gateways ────────────────────────────────────────
export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  JAZZCASH = 'jazzcash',
  EASYPAISA = 'easypaisa',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
}

// ─── Notification Channels ───────────────────────────────────
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
  PUSH = 'push',
}

// ─── Audit Action Types ──────────────────────────────────────
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  INVOICE_GENERATED = 'invoice_generated',
  ESTIMATE_APPROVED = 'estimate_approved',
  ESTIMATE_REJECTED = 'estimate_rejected',
  PERMISSION_CHANGED = 'permission_changed',
  EXPORT_DATA = 'export_data',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

// ─── Standard JWT Payload ────────────────────────────────────
// Architecture doc standard — NEVER change field names
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

// ─── Standard API Response ───────────────────────────────────
// Architecture doc standard — ALL APIs must use this
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiValidationError[];
  meta?: PaginationMeta;
}

export interface ApiValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Authenticated Request Extension ─────────────────────────
export interface AuthenticatedRequest {
  user: JwtPayload;
  tenantId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

// ─── Permission Map (role → allowed actions per resource) ────
export type ResourceAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';

export interface PermissionRule {
  resource: string;
  actions: ResourceAction[];
}

export const ROLE_PERMISSIONS: Record<UserRole, PermissionRule[]> = {
  [UserRole.SUPER_ADMIN]: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
  ],
  [UserRole.OWNER]: [
    { resource: 'tickets', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { resource: 'invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    { resource: 'payments', actions: ['create', 'read', 'update', 'approve', 'export'] },
    { resource: 'inventory', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'customers', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
  ],
  [UserRole.MANAGER]: [
    { resource: 'tickets', actions: ['create', 'read', 'update', 'approve'] },
    { resource: 'invoices', actions: ['create', 'read', 'update'] },
    { resource: 'payments', actions: ['create', 'read', 'update'] },
    { resource: 'inventory', actions: ['create', 'read', 'update'] },
    { resource: 'customers', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read'] },
  ],
  [UserRole.FRONTDESK]: [
    { resource: 'tickets', actions: ['create', 'read', 'update'] },
    { resource: 'invoices', actions: ['read'] },
    { resource: 'payments', actions: ['create', 'read'] },
    { resource: 'customers', actions: ['create', 'read', 'update'] },
  ],
  [UserRole.TECHNICIAN]: [
    { resource: 'tickets', actions: ['read', 'update'] },
    { resource: 'inventory', actions: ['read'] },
  ],
  [UserRole.CUSTOMER]: [
    { resource: 'tickets', actions: ['read'] },
    { resource: 'invoices', actions: ['read', 'approve'] },
    { resource: 'payments', actions: ['create', 'read'] },
  ],
  [UserRole.DRIVER]: [
    { resource: 'tickets', actions: ['read', 'update'] },
    { resource: 'payments', actions: ['create'] },
  ],
};
