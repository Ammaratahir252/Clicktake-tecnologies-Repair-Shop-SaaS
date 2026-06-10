import { z } from 'zod';

export const inboxQuerySchema = z.object({
  page:  z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

export const preferencesUpdateSchema = z.object({
  channels: z.object({
    email:    z.boolean().optional(),
    sms:      z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    push:     z.boolean().optional(),
    in_app:   z.boolean().optional(),
  }),
});

export const tenantConfigUpdateSchema = z.object({
  emailProvider:    z.string().optional(),
  smsProvider:      z.string().optional(),
  whatsappProvider: z.string().optional(),
  timezone:         z.string().optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start:   z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm').optional(),
    end:     z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm').optional(),
  }).optional(),
  providerKeys: z.record(z.string()).optional(),
});

export const templateCreateSchema = z.object({
  key:      z.string().min(1),
  channel:  z.enum(['email', 'sms', 'whatsapp', 'in_app', 'push']),
  subject:  z.string().optional(),
  body:     z.string().min(1),
  language: z.string().optional().default('en'),
});

export const templateUpdateSchema = z.object({
  subject:  z.string().optional(),
  body:     z.string().optional(),
  isActive: z.boolean().optional(),
  language: z.string().optional(),
});
