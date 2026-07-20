// src/lib/validation/timeSession.ts
// Zod schemas for the time-sessions API — separate from the route files so
// they can be unit tested without pulling in the Next.js request machinery.

import { z } from 'zod';
import mongoose from 'mongoose';
import { MAX_SESSION_SECONDS } from '@/models/timeSession.model';

export const StartSessionSchema = z.object({
  ticketId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid ticketId'),
  note: z.string().max(500).optional(),
});

export const UpdateSessionSchema = z.object({
  stop: z.boolean().optional(),
  durationSeconds: z.number().int('Duration must be whole seconds')
    .positive('Duration must be positive')
    .max(MAX_SESSION_SECONDS, 'A session cannot exceed 24 hours')
    .optional(),
  note: z.string().max(500).optional(),
});
