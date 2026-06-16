// src/modules/tickets/ticket.controller.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendResponse } from '@/utils/apiResponse';
import { TicketService } from '@/services/tickets/ticket.service';
import {
  CreateTicketSchema,
  UpdateStatusSchema,
  AssignTechnicianSchema,
  AddNoteSchema,
  SetEstimateSchema,
} from './ticket.validation';
import { TicketStatus } from '@/lib/enums';
import connectDB from '@/lib/db';

/**
 * Extracts the context injected by M1's authMiddleware + tenantMiddleware.
 * Your M1 middleware must set these headers on every authenticated request.
 *
 * In your middleware.ts, after JWT verification, add:
 *   requestHeaders.set('x-tenant-id', payload.tenantId);
 *   requestHeaders.set('x-user-id',   payload.userId);
 *   requestHeaders.set('x-user-name', user.name);
 *   requestHeaders.set('x-role',      payload.role);
 */
function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Unknown',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// ─── POST /api/tickets ────────────────────────────────────────────────────────
export async function createTicketHandler(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.createTicket({
      tenantId,
      createdByUserId: userId,
      createdByName:   userName,
      ...(parsed.data as any),
    });

    return sendResponse(true, 'Ticket created successfully', ticket, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
export async function getTicketsHandler(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as TicketStatus | null;

    // For customer role: find their Customer records by phone then filter tickets
    let customerIds: string[] | undefined;
    if (role === 'customer' && userId) {
      const User = (await import('@/models/user.model')).default;
      const user = await User.findById(userId).lean() as any;
      if (user?.phone) {
        const CustomerModel = (await import('@/models/customer.model')).default;
        const customers = await CustomerModel.find({ phone: user.phone }).lean() as any[];
        customerIds = customers.map((c: any) => c._id.toString());
      }
    }

    const tickets = await TicketService.getTickets(tenantId, statusFilter ?? undefined, customerIds);
    return sendResponse(true, 'Tickets retrieved', tickets);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
export async function getTicketByIdHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId } = getCtx(req);
    const ticket = await TicketService.getTicketById(id, tenantId);
    return sendResponse(true, 'Ticket retrieved', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 500;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── PATCH /api/tickets/:id/status ───────────────────────────────────────────
export async function updateStatusHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.updateTicketStatus({
      ticketId:        id,
      tenantId,
      newStatus:       parsed.data.status,
      changedByUserId: userId,
      changedByName:   userName,
      note:            parsed.data.note,
    });

    return sendResponse(true, 'Ticket status updated', ticket);
  } catch (err: any) {
    const status = err.message?.includes('Invalid status transition') ? 400
                 : err.message === 'Ticket not found' ? 404
                 : 500;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── PATCH /api/tickets/:id/assign ───────────────────────────────────────────
export async function assignTechnicianHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = AssignTechnicianSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.assignTechnician({
      ticketId:         id,
      tenantId,
      technicianId:     parsed.data.technicianId,
      assignedByUserId: userId,
      assignedByName:   userName,
    });

    return sendResponse(true, 'Technician assigned successfully', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 400;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── POST /api/tickets/:id/notes ─────────────────────────────────────────────
export async function addNoteHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = AddNoteSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.addNote({
      ticketId:   id,
      tenantId,
      authorId:   userId,
      authorName: userName,
      content:    parsed.data.content,
    });

    return sendResponse(true, 'Note added', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 500;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── PATCH /api/tickets/:id/estimate ─────────────────────────────────────────
export async function setEstimateHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = SetEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.setEstimate({
      ticketId:        id,
      tenantId,
      estimateAmount:  parsed.data.estimateAmount,
      updatedByUserId: userId,
      updatedByName:   userName,
    });

    return sendResponse(true, 'Estimate set — status moved to estimate_sent', ticket);
  } catch (err: any) {
    const status = err.message?.includes('Invalid status transition') ? 400
                 : err.message === 'Ticket not found' ? 404
                 : 500;
    return sendResponse(false, err.message, null, status);
  }
}
