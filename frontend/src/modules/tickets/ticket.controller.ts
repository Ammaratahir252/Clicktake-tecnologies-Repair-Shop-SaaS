// src/modules/tickets/ticket.controller.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { sendResponse } from '@/utils/apiResponse';
import { TicketService } from '@/services/tickets/ticket.service';
import {
  CreateTicketSchema,
  UpdateStatusSchema,
  AssignTechnicianSchema,
  AssignDriverSchema,
  UpdateLocationSchema,
  AddNoteSchema,
  AddPhotoSchema,
  SetEstimateSchema,
  RecordPaymentSchema,
} from './ticket.validation';
import { TicketStatus } from '@/lib/enums';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import Payment from '@/models/payment.model';
import { fireAutomationTrigger } from '@/lib/automation';
import {
  notifyTenantByRole,
  createNotification,
  sendEmail,
  findCustomerById,
  findCustomerByPhone,
  findUserById,
  findTenantName,
  emailTenantStaff,
  emailTicketCreatedCustomer,
  emailTicketCreatedStaff,
  emailTicketStatus,
  emailEstimate,
  emailTechnicianAssigned,
} from '@/lib/notifications';

const STATUS_LABELS: Record<string, string> = {
  received:      'Received',
  diagnosed:     'Diagnosed',
  estimate_sent: 'Estimate Sent',
  approved:      'Approved',
  in_repair:     'In Repair',
  ready:         'Ready for Pickup',
  delivered:     'Delivered',
  cancelled:     'Cancelled',
};

const STATUS_EXTRA_MSG: Partial<Record<string, string>> = {
  ready:     'Your device is ready for collection. Please visit the shop during opening hours.',
  delivered: 'Your device has been delivered successfully. Thank you for choosing us!',
  cancelled: 'Your repair ticket has been cancelled. Please contact us if you have questions.',
};

// Front desk may only move a ticket through intake/handover statuses (per blueprint Section 5.1
// Role 4). Diagnosis, estimate, and repair-progress statuses are technician/manager territory.
// This mirrors the UI restriction already applied in TicketDetail.tsx — enforced here too because
// the UI restriction alone does not stop a direct API call from a front desk-authenticated session.
const FRONTDESK_ALLOWED_STATUSES = new Set(['received', 'ready', 'delivered']);

// Technician territory per the same blueprint section: diagnosis and repair-progress
// statuses only. Mirrors the UI restriction in TicketDetail.tsx, enforced here for the
// same reason — a direct API call must not be able to bypass the UI-only restriction.
const TECHNICIAN_ALLOWED_STATUSES = new Set(['diagnosed', 'in_repair', 'ready']);

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

    const t = ticket as any;
    const { customerName, customerPhone, deviceBrand, deviceModel, issue } = parsed.data;

    // Fire-and-forget notifications
    void (async () => {
      const shopName = await findTenantName(tenantId);

      // In-app notification to owner + manager
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'ticket_created',
        `New Ticket: ${t.ticketNumber ?? ''}`,
        `${customerName} — ${deviceBrand} ${deviceModel}`,
        { ticketId: t._id?.toString() }
      );

      // Email to owner + manager
      await emailTenantStaff(
        tenantId, ['owner', 'manager'],
        `New Repair Ticket — ${t.ticketNumber}`,
        (name) => emailTicketCreatedStaff(name, t.ticketNumber, customerName, deviceBrand, deviceModel, issue, shopName)
      );

      // Email to customer (if email on record)
      const customer = await findCustomerByPhone(tenantId, customerPhone);
      if (customer?.email) {
        await sendEmail(
          customer.email,
          `Your Repair Ticket ${t.ticketNumber} Has Been Received`,
          emailTicketCreatedCustomer(customer.name || customerName, t.ticketNumber, deviceBrand, deviceModel, issue, shopName)
        );
      }

      void fireAutomationTrigger('ticket_created', {
        tenantId,
        ticketId: t._id?.toString(),
        ticketNumber: t.ticketNumber,
        deviceLabel: `${deviceBrand} ${deviceModel}`,
      });
    })();

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

    let customerIds: string[] | undefined;
    if (role === 'customer' && userId) {
      const User = (await import('@/models/user.model')).default;
      const user = await User.findById(userId).lean() as any;
      if (user?.phone) {
        const CustomerModel = (await import('@/models/customer.model')).default as any;
        const customers = await CustomerModel.find({ phone: user.phone }).lean() as any[];
        customerIds = customers.map((c: any) => c._id.toString());
      }
    }

    let technicianId: string | undefined;
    if (role === 'technician' && userId) {
      technicianId = userId;
    }
    const techParam = searchParams.get('technicianId');
    if (techParam && ['manager', 'owner', 'super_admin'].includes(role)) {
      technicianId = techParam;
    }

    const tickets = await TicketService.getTickets(tenantId, statusFilter ?? undefined, customerIds, technicianId);
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
    const { tenantId, userId, userName, role } = getCtx(req);
    const body = await req.json();

    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    if (role === 'frontdesk' && !FRONTDESK_ALLOWED_STATUSES.has(parsed.data.status)) {
      return sendResponse(false, 'Forbidden: front desk can only set status to received, ready, or delivered', null, 403);
    }
    if (role === 'technician' && !TECHNICIAN_ALLOWED_STATUSES.has(parsed.data.status)) {
      return sendResponse(false, 'Forbidden: technicians can only set status to diagnosed, in_repair, or ready', null, 403);
    }

    const ticket = await TicketService.updateTicketStatus({
      ticketId:        id,
      tenantId,
      newStatus:       parsed.data.status,
      changedByUserId: userId,
      changedByName:   userName,
      note:            parsed.data.note,
    });

    const t = ticket as any;
    const newStatus = parsed.data.status;
    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;

    // Fire-and-forget notifications
    void (async () => {
      const shopName = await findTenantName(tenantId);

      // In-app to owner + manager
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'ticket_status_changed',
        `Ticket ${t.ticketNumber ?? ''} → ${statusLabel}`,
        `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''}`,
        { ticketId: t._id?.toString(), status: newStatus }
      );

      // Email to owner + manager for key statuses
      const staffStatuses = ['in_repair', 'ready', 'delivered', 'cancelled'];
      if (staffStatuses.includes(newStatus)) {
        await emailTenantStaff(
          tenantId, ['owner', 'manager'],
          `Ticket ${t.ticketNumber} — ${statusLabel}`,
          (name) => emailTicketStatus(name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', newStatus, statusLabel, shopName)
        );
      }

      // Look up customer details for customer-facing notifications
      const customerId = t.customerId?.toString();
      if (customerId) {
        const customer = await findCustomerById(customerId);

        // In-app notification to customer (if they have a portal account)
        const customerStatuses = ['diagnosed', 'estimate_sent', 'approved', 'in_repair', 'ready', 'delivered', 'cancelled'];
        if (customerStatuses.includes(newStatus)) {
          const User = (await import('@/models/user.model')).default;
          if (customer?.phone) {
            const custUser = await User.findOne({ phone: customer.phone, role: 'customer' }).select('_id').lean() as any;
            if (custUser?._id) {
              createNotification({
                tenantId,
                recipientUserId: custUser._id.toString(),
                type:    'repair_status',
                title:   `${t.ticketNumber}: ${statusLabel}`,
                message: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''} — ${statusLabel}`,
                metadata: { ticketId: t._id?.toString(), status: newStatus },
              });
            }
          }

          // Email to customer
          if (customer?.email) {
            const extra = STATUS_EXTRA_MSG[newStatus];
            await sendEmail(
              customer.email,
              `Your Repair ${t.ticketNumber} — ${statusLabel}`,
              emailTicketStatus(customer.name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', newStatus, statusLabel, shopName, extra)
            );
          }
        }
      }

      void fireAutomationTrigger('ticket_status_changed', {
        tenantId,
        ticketId: t._id?.toString(),
        ticketNumber: t.ticketNumber,
        deviceLabel: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''}`.trim(),
        newStatus,
      });
    })();

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

    const t = ticket as any;

    // Fire-and-forget notifications
    void (async () => {
      const technician = await findUserById(parsed.data.technicianId);
      const customer   = await findCustomerById(t.customerId?.toString());

      // In-app to technician
      createNotification({
        tenantId,
        recipientUserId: parsed.data.technicianId,
        type:    'ticket_assigned',
        title:   `New ticket assigned: ${t.ticketNumber ?? ''}`,
        message: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''} — ${t.issue ?? ''}`,
        metadata: { ticketId: t._id?.toString() },
      });

      // Email to technician
      if (technician?.email) {
        await sendEmail(
          technician.email,
          `Repair Ticket ${t.ticketNumber} Assigned to You`,
          emailTechnicianAssigned(
            technician.name,
            t.ticketNumber,
            t.deviceBrand ?? '',
            t.deviceModel ?? '',
            t.issue ?? '',
            customer?.name ?? 'Customer'
          )
        );
      }
    })();

    return sendResponse(true, 'Technician assigned successfully', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 400;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── PATCH /api/tickets/:id/assign-driver ────────────────────────────────────
export async function assignDriverHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();

    const parsed = AssignDriverSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.assignDriver({
      ticketId:         id,
      tenantId,
      driverId:         parsed.data.driverId,
      assignedByUserId: userId,
      assignedByName:   userName,
    });

    const t = ticket as any;

    void (async () => {
      const driver = await findUserById(parsed.data.driverId);
      if (driver?.email) {
        await sendEmail(
          driver.email,
          `Delivery Job Assigned — ${t.ticketNumber}`,
          emailTechnicianAssigned(driver.name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', 'Deliver to customer', 'Customer')
        );
      }
      createNotification({
        tenantId,
        recipientUserId: parsed.data.driverId,
        type:    'delivery_assigned',
        title:   `New delivery assigned: ${t.ticketNumber ?? ''}`,
        message: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''} is ready for delivery`,
        metadata: { ticketId: t._id?.toString() },
      });
    })();

    return sendResponse(true, 'Driver assigned successfully', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 400;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── PATCH /api/tickets/:id/location ─────────────────────────────────────────
export async function updateLocationHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId } = getCtx(req);
    const body = await req.json();

    const parsed = UpdateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await TicketService.updateDriverLocation({
      ticketId: id,
      tenantId,
      driverId: userId,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });

    return sendResponse(true, 'Location updated', ticket);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404
                 : err.message.includes('not the assigned driver') ? 403
                 : 500;
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

// ─── POST /api/tickets/:id/photos ────────────────────────────────────────────
// Size, file-type, and per-tenant storage-cap limits come from Super Admin →
// Settings → Storage (maxUploadSizeMb / allowedFileTypes / maxStoragePerTenantMb).
const FALLBACK_UPLOAD_MB = 10;
const FALLBACK_PHOTO_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

export async function addPhotoHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const type = String(form.get('type') || '');
    const note = form.get('note') ? String(form.get('note')) : undefined;

    if (!file) return sendResponse(false, 'No file provided', null, 400);

    const parsed = AddPhotoSchema.safeParse({ type, note });
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const PlatformSettings = (await import('@/models/platformSettings.model')).default;
    const storageSettings = await PlatformSettings.findOne()
      .select('maxUploadSizeMb allowedFileTypes maxStoragePerTenantMb')
      .lean() as any;
    const maxUploadMb: number = storageSettings?.maxUploadSizeMb || FALLBACK_UPLOAD_MB;
    const allowedExt: string[] = storageSettings?.allowedFileTypes?.length
      ? storageSettings.allowedFileTypes.map((e: string) => e.toLowerCase().replace(/^\./, ''))
      : FALLBACK_PHOTO_EXT;

    if (file.size > maxUploadMb * 1024 * 1024) {
      return sendResponse(false, `Photo exceeds the ${maxUploadMb}MB upload limit`, null, 400);
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExt.includes(ext)) {
      return sendResponse(false, `File type ".${ext}" isn't supported (${allowedExt.join(', ')})`, null, 400);
    }

    const capMb: number = storageSettings?.maxStoragePerTenantMb || 0;
    if (capMb > 0 && tenantId) {
      const { getTenantStorageMb } = await import('@/lib/storageUsage');
      const usedMb = await getTenantStorageMb(tenantId);
      if (usedMb >= capMb) {
        return sendResponse(false, `Storage limit reached (${usedMb.toFixed(1)}MB of ${capMb}MB used). Contact the platform admin to raise your cap.`, null, 413);
      }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets', id);
    await fs.mkdir(uploadDir, { recursive: true });
    const filename = `${parsed.data.type}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);
    const url = `/uploads/tickets/${id}/${filename}`;

    const ticket = await TicketService.addPhoto({
      ticketId: id,
      tenantId,
      url,
      type: parsed.data.type,
      note: parsed.data.note,
      uploadedBy: userId,
      uploadedByName: userName,
    });

    return sendResponse(true, 'Photo uploaded', ticket, 201);
  } catch (err: any) {
    const status = err.message === 'Ticket not found' ? 404 : 500;
    return sendResponse(false, err.message ?? 'Server error', null, status);
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

    const t = ticket as any;
    const amtStr = `Rs. ${(parsed.data.estimateAmount ?? 0).toLocaleString()}`;

    // Fire-and-forget notifications
    void (async () => {
      const shopName = await findTenantName(tenantId);
      const customer = await findCustomerById(t.customerId?.toString());

      // In-app to owner + manager
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'estimate_set',
        `Estimate set: ${amtStr} for ${t.ticketNumber ?? ''}`,
        `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''}`,
        { ticketId: t._id?.toString(), amount: parsed.data.estimateAmount }
      );

      // Email to owner + manager
      await emailTenantStaff(
        tenantId, ['owner', 'manager'],
        `Estimate Set — ${t.ticketNumber}`,
        (name) => emailTicketStatus(name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', 'estimate_sent', `Estimate: ${amtStr}`, shopName)
      );

      // In-app + email to customer
      if (customer) {
        // In-app (if customer has a portal account)
        const User = (await import('@/models/user.model')).default;
        if (customer.phone) {
          const custUser = await User.findOne({ phone: customer.phone, role: 'customer' }).select('_id').lean() as any;
          if (custUser?._id) {
            createNotification({
              tenantId,
              recipientUserId: custUser._id.toString(),
              type:    'estimate_ready',
              title:   `Estimate ready: ${amtStr}`,
              message: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''} repair estimate is ready.`,
              metadata: { ticketId: t._id?.toString(), amount: parsed.data.estimateAmount },
            });
          }
        }

        // Email to customer
        if (customer.email) {
          await sendEmail(
            customer.email,
            `Repair Estimate Ready — ${t.ticketNumber}`,
            emailEstimate(customer.name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', parsed.data.estimateAmount, shopName)
          );
        }
      }

      void fireAutomationTrigger('estimate_amount_exceeds', {
        tenantId,
        ticketId: t._id?.toString(),
        ticketNumber: t.ticketNumber,
        deviceLabel: `${t.deviceBrand ?? ''} ${t.deviceModel ?? ''}`.trim(),
        estimateAmount: parsed.data.estimateAmount,
      });
    })();

    return sendResponse(true, 'Estimate set — status moved to estimate_sent', ticket);
  } catch (err: any) {
    const status = err.message?.includes('Invalid status transition') ? 400
                 : err.message === 'Ticket not found' ? 404
                 : 500;
    return sendResponse(false, err.message, null, status);
  }
}

// ─── POST /api/tickets/:id/payment ───────────────────────────────────────────
// Records an in-person payment (cash/card/mobile-wallet transfer collected directly
// by staff or a driver) — distinct from the online gateway checkout flows under
// /api/payments/*, which redirect the customer to a hosted checkout page instead.
const RECORD_PAYMENT_ROLES = new Set(['owner', 'manager', 'frontdesk', 'driver']);

export async function recordPaymentHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);

    if (!RECORD_PAYMENT_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only staff or a driver may record a payment', null, 403);
    }

    const body = await req.json();
    const parsed = RecordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    const ticket = await Ticket.findOne({
      _id: id,
      tenantId,
    });
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);
    if (!ticket.estimateAmount || ticket.estimateAmount <= 0) {
      return sendResponse(false, 'This ticket has no payable estimate', null, 400);
    }

    const existing = await Payment.findOne({
      tenantId, kind: 'invoice', referenceId: ticket._id, status: 'completed',
    });
    if (existing) {
      return sendResponse(false, 'This ticket has already been paid', null, 409);
    }

    const { method, amountReceived, note } = parsed.data;

    const payment = await Payment.create({
      tenantId,
      kind: 'invoice',
      referenceId: ticket._id,
      amount: ticket.estimateAmount,
      currency: 'PKR',
      gateway: method,
      environment: 'in-person',
      method: 'in_person',
      status: 'completed',
      gatewayOrderId: `POS-${ticket._id}-${Date.now()}`,
      recordedBy: userId,
      recordedByName: userName,
      notes: note ?? (amountReceived !== undefined ? `Received: Rs ${amountReceived}` : undefined),
    });

    void TicketService.addNote({
      ticketId: id,
      tenantId,
      authorId: userId,
      authorName: userName,
      content: `Payment recorded: Rs ${ticket.estimateAmount.toLocaleString()} via ${method}${amountReceived !== undefined ? ` (received Rs ${amountReceived.toLocaleString()})` : ''}`,
    }).catch(() => {});

    void (async () => {
      const shopName = await findTenantName(tenantId);
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'payment_recorded',
        `Payment collected — ${ticket.ticketNumber}`,
        `Rs ${ticket.estimateAmount!.toLocaleString()} via ${method}, recorded by ${userName}`,
        { ticketId: ticket._id.toString(), amount: ticket.estimateAmount, method }
      );
      await emailTenantStaff(
        tenantId, ['owner', 'manager'],
        `Payment Collected — ${ticket.ticketNumber}`,
        (name) => emailTicketStatus(name, ticket.ticketNumber, ticket.deviceBrand ?? '', ticket.deviceModel ?? '', 'payment_recorded', `Payment Collected (${method})`, shopName)
      );
    })();

    return sendResponse(true, 'Payment recorded', payment, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
