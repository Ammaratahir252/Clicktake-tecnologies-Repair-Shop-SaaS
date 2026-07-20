// src/modules/tickets/ticket.validation.ts

import { z } from 'zod';
import { TicketStatus } from '@/lib/enums';

// ─── POST /api/tickets ────────────────────────────────────────────────────────
export const CreateTicketSchema = z.object({
  customerName:  z.string().min(2, 'Customer name must be at least 2 characters').max(100),
  customerPhone: z.string().min(5, 'Customer phone must be at least 5 characters').max(20),
  deviceBrand:   z.string().min(1, 'Device brand is required').max(100),
  deviceModel:   z.string().min(1, 'Device model is required').max(100),
  issue:         z.string().min(5, 'Issue must be at least 5 characters').max(1000),
  estimateAmount: z.number().min(0).optional().nullable(),
  deviceColor:   z.string().max(50).optional(),
  deviceIMEI:    z.string().max(20).optional(),
  priority:      z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate:       z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid due date').optional().nullable(),
});

// ─── POST /api/tickets/:id/photos ────────────────────────────────────────────
export const AddPhotoSchema = z.object({
  type: z.enum(['before', 'during', 'after', 'damage', 'parts', 'proof']),
  note: z.string().max(500).optional(),
});

// ─── PATCH /api/tickets/:id/status ───────────────────────────────────────────
export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus, {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(TicketStatus).join(', ')}`,
    }),
  }),
  note: z.string().max(500).optional(),
});

// ─── PATCH /api/tickets/:id/assign ───────────────────────────────────────────
export const AssignTechnicianSchema = z.object({
  technicianId: z.string().min(24, 'Invalid technicianId — must be a MongoDB ObjectId'),
});

// ─── PATCH /api/tickets/:id/assign-driver ────────────────────────────────────
export const AssignDriverSchema = z.object({
  driverId: z.string().min(24, 'Invalid driverId — must be a MongoDB ObjectId'),
});

// ─── PATCH /api/tickets/:id/location ─────────────────────────────────────────
export const UpdateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ─── POST /api/tickets/:id/notes ─────────────────────────────────────────────
export const AddNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(2000),
});

// ─── PATCH /api/tickets/:id/estimate ─────────────────────────────────────────
export const SetEstimateSchema = z.object({
  estimateAmount: z
    .number({ invalid_type_error: 'estimateAmount must be a number' })
    .min(0, 'Estimate cannot be negative'),
});

// ─── POST /api/tickets/:id/payment ───────────────────────────────────────────
export const RecordPaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'easypaisa', 'jazzcash']),
  amountReceived: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

// ─── Exported Types ───────────────────────────────────────────────────────────
export type CreateTicketBody  = z.infer<typeof CreateTicketSchema>;
export type UpdateStatusBody  = z.infer<typeof UpdateStatusSchema>;
export type AssignTechBody    = z.infer<typeof AssignTechnicianSchema>;
export type AddNoteBody       = z.infer<typeof AddNoteSchema>;
export type SetEstimateBody   = z.infer<typeof SetEstimateSchema>;
