import { filterAndSortTickets, ticketPriority } from '@/lib/ticketFilters';

const mk = (over: Record<string, any> = {}) => ({
  _id: Math.random().toString(36).slice(2),
  ticketNumber: 'TKT-0001',
  deviceBrand: 'Apple',
  deviceModel: 'iPhone 13',
  issue: 'Cracked screen',
  customerId: { name: 'Ali Khan' },
  createdAt: '2026-07-01T10:00:00Z',
  ...over,
});

describe('ticketPriority', () => {
  test('legacy tickets without a priority default to medium', () => {
    expect(ticketPriority(mk())).toBe('medium');
    expect(ticketPriority(mk({ priority: undefined }))).toBe('medium');
    expect(ticketPriority(mk({ priority: 'weird-value' }))).toBe('medium');
  });
  test('explicit priorities pass through', () => {
    expect(ticketPriority(mk({ priority: 'urgent' }))).toBe('urgent');
    expect(ticketPriority(mk({ priority: 'low' }))).toBe('low');
  });
});

describe('filterAndSortTickets', () => {
  test('search matches ticket number, customer, device, and issue (case-insensitive)', () => {
    const tickets = [
      mk({ ticketNumber: 'TKT-0042' }),
      mk({ customerId: { name: 'Fatima Malik' } }),
      mk({ deviceBrand: 'Samsung', deviceModel: 'S23' }),
      mk({ issue: 'Battery drain' }),
    ];
    expect(filterAndSortTickets(tickets, { search: '0042' })).toHaveLength(1);
    expect(filterAndSortTickets(tickets, { search: 'fatima' })).toHaveLength(1);
    expect(filterAndSortTickets(tickets, { search: 'samsung s23' })).toHaveLength(1);
    expect(filterAndSortTickets(tickets, { search: 'battery' })).toHaveLength(1);
    expect(filterAndSortTickets(tickets, { search: 'nomatch-xyz' })).toHaveLength(0);
    expect(filterAndSortTickets(tickets, { search: '' })).toHaveLength(4);
  });

  test('priority filter includes legacy tickets under medium', () => {
    const tickets = [mk({ priority: 'high' }), mk(), mk({ priority: 'medium' })];
    expect(filterAndSortTickets(tickets, { priority: 'high' })).toHaveLength(1);
    expect(filterAndSortTickets(tickets, { priority: 'medium' })).toHaveLength(2);
    expect(filterAndSortTickets(tickets, { priority: 'all' })).toHaveLength(3);
  });

  test('newest / oldest sorting by createdAt', () => {
    const a = mk({ ticketNumber: 'A', createdAt: '2026-07-01T00:00:00Z' });
    const b = mk({ ticketNumber: 'B', createdAt: '2026-07-03T00:00:00Z' });
    const newest = filterAndSortTickets([a, b], { sortBy: 'newest' });
    expect(newest[0].ticketNumber).toBe('B');
    const oldest = filterAndSortTickets([a, b], { sortBy: 'oldest' });
    expect(oldest[0].ticketNumber).toBe('A');
  });

  test('priority sort ranks urgent > high > medium (incl. legacy) > low', () => {
    const tickets = [
      mk({ ticketNumber: 'LOW', priority: 'low' }),
      mk({ ticketNumber: 'LEGACY' }),
      mk({ ticketNumber: 'URGENT', priority: 'urgent' }),
      mk({ ticketNumber: 'HIGH', priority: 'high' }),
    ];
    const sorted = filterAndSortTickets(tickets, { sortBy: 'priority' });
    expect(sorted.map((t) => t.ticketNumber)).toEqual(['URGENT', 'HIGH', 'LEGACY', 'LOW']);
  });

  test('due-soon sort puts dated tickets first, soonest first; undated after', () => {
    const tickets = [
      mk({ ticketNumber: 'NONE' }),
      mk({ ticketNumber: 'LATER', dueDate: '2026-08-01T00:00:00Z' }),
      mk({ ticketNumber: 'SOON', dueDate: '2026-07-18T00:00:00Z' }),
    ];
    const sorted = filterAndSortTickets(tickets, { sortBy: 'due-soon' });
    expect(sorted.map((t) => t.ticketNumber)).toEqual(['SOON', 'LATER', 'NONE']);
  });

  test('does not mutate the input array', () => {
    const tickets = [mk({ ticketNumber: 'A' }), mk({ ticketNumber: 'B' })];
    const before = tickets.map((t) => t.ticketNumber);
    filterAndSortTickets(tickets, { sortBy: 'oldest' });
    expect(tickets.map((t) => t.ticketNumber)).toEqual(before);
  });
});
