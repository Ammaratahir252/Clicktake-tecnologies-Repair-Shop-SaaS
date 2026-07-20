// src/lib/ticketFilters.ts
// Client-side ticket search / priority filtering / sorting, shared by TicketList
// so pages can drive it with their own controls. Pure functions — unit tested.

export type TicketSortBy = 'newest' | 'oldest' | 'priority' | 'due-soon';

export interface TicketFilterOptions {
  search?: string;
  priority?: string;   // 'all' | 'low' | 'medium' | 'high' | 'urgent'
  sortBy?: TicketSortBy;
}

// Older tickets predate the priority field — rank them as 'medium'.
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const DEFAULT_PRIORITY = 'medium';

export function ticketPriority(ticket: any): string {
  return ticket?.priority && PRIORITY_RANK[ticket.priority] !== undefined
    ? ticket.priority
    : DEFAULT_PRIORITY;
}

function matchesSearch(ticket: any, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    ticket.ticketNumber,
    ticket.customerId?.name,
    ticket.deviceBrand,
    ticket.deviceModel,
    ticket.issue,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

export function filterAndSortTickets(tickets: any[], opts: TicketFilterOptions): any[] {
  const { search = '', priority = 'all', sortBy = 'newest' } = opts;

  const filtered = tickets.filter(
    (t) =>
      matchesSearch(t, search) &&
      (priority === 'all' || ticketPriority(t) === priority)
  );

  const byCreated = (a: any, b: any) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return -byCreated(a, b);
      case 'priority': {
        const diff = PRIORITY_RANK[ticketPriority(a)] - PRIORITY_RANK[ticketPriority(b)];
        return diff !== 0 ? diff : byCreated(a, b);
      }
      case 'due-soon': {
        // Tickets with a due date come first, soonest first; undated keep newest-first.
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return byCreated(a, b);
      }
      case 'newest':
      default:
        return byCreated(a, b);
    }
  });
}
