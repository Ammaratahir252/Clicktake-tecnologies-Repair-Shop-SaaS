import { StartSessionSchema, UpdateSessionSchema } from '@/lib/validation/timeSession';

describe('StartSessionSchema', () => {
  test('accepts a valid ObjectId ticketId', () => {
    expect(StartSessionSchema.safeParse({ ticketId: '64b7f8a2c1d2e3f4a5b6c7d8' }).success).toBe(true);
  });
  test('rejects malformed ticketIds', () => {
    expect(StartSessionSchema.safeParse({ ticketId: 'not-an-id' }).success).toBe(false);
    expect(StartSessionSchema.safeParse({}).success).toBe(false);
  });
  test('rejects oversized notes', () => {
    expect(
      StartSessionSchema.safeParse({ ticketId: '64b7f8a2c1d2e3f4a5b6c7d8', note: 'x'.repeat(501) }).success
    ).toBe(false);
  });
});

describe('UpdateSessionSchema', () => {
  test('accepts stop requests and duration edits', () => {
    expect(UpdateSessionSchema.safeParse({ stop: true }).success).toBe(true);
    expect(UpdateSessionSchema.safeParse({ durationSeconds: 3600 }).success).toBe(true);
    expect(UpdateSessionSchema.safeParse({ durationSeconds: 60, note: 'screen swap' }).success).toBe(true);
  });
  test('rejects zero, negative, fractional, and >24h durations', () => {
    expect(UpdateSessionSchema.safeParse({ durationSeconds: 0 }).success).toBe(false);
    expect(UpdateSessionSchema.safeParse({ durationSeconds: -30 }).success).toBe(false);
    expect(UpdateSessionSchema.safeParse({ durationSeconds: 12.5 }).success).toBe(false);
    expect(UpdateSessionSchema.safeParse({ durationSeconds: 24 * 3600 + 1 }).success).toBe(false);
  });
});
