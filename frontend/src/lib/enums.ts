// src/lib/enums.ts
// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS: This is your existing M1 enums.ts with M2 additions appended.
// Your Role enum is UNCHANGED. New enums are added below it.
// ─────────────────────────────────────────────────────────────────────────────

// ─── M1: User Roles ───────────────────────────────────────────────────────────
export enum Role {
  owner      = 'owner',
  manager    = 'manager',
  technician = 'technician',
  frontdesk  = 'frontdesk',
  customer   = 'customer',
  driver     = 'driver',
}

// ─── M2: Ticket Status ────────────────────────────────────────────────────────
// These are the ONLY valid status strings. Never use raw strings elsewhere.
export enum TicketStatus {
  received      = 'received',
  diagnosed     = 'diagnosed',
  estimate_sent = 'estimate_sent',
  approved      = 'approved',
  in_repair     = 'in_repair',
  ready         = 'ready',
  delivered     = 'delivered',
  cancelled     = 'cancelled',
}

// ─── M2: Status Transition Map ────────────────────────────────────────────────
// Defines what status each status is allowed to move to.
// The service layer enforces this — invalid jumps are rejected with a 400.
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.received]:      [TicketStatus.diagnosed,     TicketStatus.cancelled],
  [TicketStatus.diagnosed]:     [TicketStatus.estimate_sent, TicketStatus.cancelled],
  [TicketStatus.estimate_sent]: [TicketStatus.approved,      TicketStatus.cancelled],
  [TicketStatus.approved]:      [TicketStatus.in_repair,     TicketStatus.cancelled],
  [TicketStatus.in_repair]:     [TicketStatus.ready,         TicketStatus.cancelled],
  [TicketStatus.ready]:         [TicketStatus.delivered,     TicketStatus.cancelled],
  [TicketStatus.delivered]:     [],  // terminal
  [TicketStatus.cancelled]:     [],  // terminal
};

// ─── M3: Stock Movement Types (ready for when you build M3) ──────────────────
export enum StockMovementType {
  added    = 'added',
  used     = 'used',
  adjusted = 'adjusted',
  returned = 'returned',
  damaged  = 'damaged',
}