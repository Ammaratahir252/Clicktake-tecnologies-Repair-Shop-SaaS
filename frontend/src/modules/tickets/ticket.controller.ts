// src/modules/tickets/ticket.controller.ts

import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, CloudinaryConfigError } from '@/lib/uploads/cloudinary';
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
import User from '@/models/user.model';
import { getManagerPermissions } from '@/lib/managerPermissions';
import { fireAutomationTrigger } from '@/lib/automation';
import {
  notifyTenantByRole,
  createNotification,
  sendEmail,
  findCustomerById,
  findCustomerByPhone,
  findUserById,
  findTenantName,
  getTenantOwnerNotificationSettings,
  emailTenantStaff,
  emailTicketCreatedCustomer,
  emailTicketCreatedStaff,
  emailTicketStatus,
  emailEstimate,
  emailTechnicianAssigned,
} from '@/lib/notifications';
import { sendSms } from '@/lib/sms';
import { currencySymbol } from '@/lib/currency';

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
      const [shopName, ownerSettings] = await Promise.all([
        findTenantName(tenantId),
        getTenantOwnerNotificationSettings(tenantId),
      ]);

      // In-app notification to owner + manager
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'ticket_created',
        `New Ticket: ${t.ticketNumber ?? ''}`,
        `${customerName} — ${deviceBrand} ${deviceModel}`,
        { ticketId: t._id?.toString() }
      );

      // Email to owner + manager — gated by Settings → Notification Preferences → "Email on new repair ticket"
      if (ownerSettings.prefs.emailOnNewTicket) {
        await emailTenantStaff(
          tenantId, ['owner', 'manager'],
          `New Repair Ticket — ${t.ticketNumber}`,
          (name) => emailTicketCreatedStaff(name, t.ticketNumber, customerName, deviceBrand, deviceModel, issue, shopName)
        );
      }

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

    // A driver must only ever see delivery-relevant tickets — either unclaimed
    // jobs available to pick up, or ones already assigned to them — not every
    // ticket in the tenant. Without this, a driver's GET /api/tickets fell
    // through with no scoping at all and returned every ticket (and every
    // customer's name/phone/email/address) tenant-wide, including tickets
    // still mid-repair with no delivery task at all.
    let driverId: string | undefined;
    if (role === 'driver' && userId) {
      driverId = userId;
    }

    const tickets = await TicketService.getTickets(tenantId, statusFilter ?? undefined, customerIds, technicianId, driverId);
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
    const { tenantId, userId, role } = getCtx(req);
    const ticket = await TicketService.getTicketById(id, tenantId);

    // Ownership check — tenant-scoping alone isn't enough here: without this,
    // any customer could view any OTHER customer's ticket (name/phone/email/
    // address, plus the assigned technician's contact info) in the same tenant
    // just by knowing or guessing a ticket id, and any driver could view every
    // ticket tenant-wide, not just their own delivery jobs. Mirrors the same
    // phone-match pattern already used by the list endpoint and the
    // delivery-location/driver-location routes.
    if (role === 'customer' && userId) {
      const User = (await import('@/models/user.model')).default;
      const user = await User.findById(userId).select('phone').lean() as any;
      const ticketCustomerPhone = (ticket as any).customerId?.phone;
      if (!user?.phone || !ticketCustomerPhone || user.phone !== ticketCustomerPhone) {
        return sendResponse(false, 'Ticket not found', null, 404);
      }
    }
    if (role === 'driver' && userId) {
      const assignedDriverId = (ticket as any).driverId?._id?.toString() ?? (ticket as any).driverId?.toString();
      if (assignedDriverId && assignedDriverId !== userId) {
        return sendResponse(false, 'Ticket not found', null, 404);
      }
    }

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
      const [shopName, ownerSettings] = await Promise.all([
        findTenantName(tenantId),
        getTenantOwnerNotificationSettings(tenantId),
      ]);

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

      // SMS to the shop's own phone — gated by Settings → Notification Preferences → "SMS when device is ready"
      if (newStatus === 'ready' && ownerSettings.prefs.smsOnReadyForPickup && ownerSettings.phone) {
        void sendSms(
          ownerSettings.phone,
          `${shopName}: Ticket ${t.ticketNumber} (${t.deviceBrand ?? ''} ${t.deviceModel ?? ''}) is now ready for pickup.`
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
// Requester must be shop-floor management to hand off a ticket — mirrors
// ASSIGN_DRIVER_ROLES below. Previously this handler had NO role check at all.
const ASSIGN_TECH_ROLES = new Set(['super_admin', 'owner', 'manager']);

export async function assignTechnicianHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);

    if (!ASSIGN_TECH_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only shop management may assign tickets', null, 403);
    }
    if (role === 'manager') {
      const perms = await getManagerPermissions(tenantId);
      if (!perms.assignWork) {
        return sendResponse(false, 'Your shop owner has not enabled ticket assignment for managers', null, 403);
      }
    }

    const body = await req.json();

    const parsed = AssignTechnicianSchema.safeParse(body);
    if (!parsed.success) {
      return sendResponse(false, parsed.error.errors[0].message, null, 400);
    }

    // The assignee must be a real staff member of this tenant — not a customer,
    // not someone from another shop.
    const assignee = await User.findOne({ _id: parsed.data.technicianId, tenantId }).select('role');
    if (!assignee || assignee.role === 'customer') {
      return sendResponse(false, 'Invalid assignee — must be a staff member of this shop', null, 400);
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

// Only staff who manage the shop floor may hand a ticket to a driver —
// mirrors RECORD_PAYMENT_ROLES/PHOTO_UPLOAD_ROLES above (same file, same pattern).
const ASSIGN_DRIVER_ROLES = new Set(['super_admin', 'owner', 'manager']);

// ─── PATCH /api/tickets/:id/assign-driver ────────────────────────────────────
export async function assignDriverHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);

    if (!ASSIGN_DRIVER_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only owner/manager may assign a driver', null, 403);
    }
    if (role === 'manager') {
      const perms = await getManagerPermissions(tenantId);
      if (!perms.assignWork) {
        return sendResponse(false, 'Your shop owner has not enabled ticket assignment for managers', null, 403);
      }
    }

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

// Staff and drivers document repairs/deliveries; customers only view photos.
const PHOTO_UPLOAD_ROLES = new Set(['super_admin', 'owner', 'manager', 'frontdesk', 'technician', 'driver']);

export async function addPhotoHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);

    if (!PHOTO_UPLOAD_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only shop staff can upload ticket photos', null, 403);
    }

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

    // Cloudinary — permanent cloud storage; local-disk writes don't survive
    // (or even succeed) on serverless hosts.
    const uploaded = await uploadImage(file, `tickets/${tenantId}`);

    const ticket = await TicketService.addPhoto({
      ticketId: id,
      tenantId,
      url: uploaded.url,
      publicId: uploaded.publicId,
      type: parsed.data.type,
      note: parsed.data.note,
      uploadedBy: userId,
      uploadedByName: userName,
    });

    return sendResponse(true, 'Photo uploaded', ticket, 201);
  } catch (err: any) {
    if (err instanceof CloudinaryConfigError) return sendResponse(false, err.message, null, 503);
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

    // Fire-and-forget notifications
    void (async () => {
      const [shopName, ownerSettings, customer] = await Promise.all([
        findTenantName(tenantId),
        getTenantOwnerNotificationSettings(tenantId),
        findCustomerById(t.customerId?.toString()),
      ]);
      const amtStr = `${currencySymbol(ownerSettings.currency)} ${(parsed.data.estimateAmount ?? 0).toLocaleString()}`;

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
            emailEstimate(customer.name, t.ticketNumber, t.deviceBrand ?? '', t.deviceModel ?? '', parsed.data.estimateAmount, shopName, ownerSettings.currency)
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

// ─── PATCH /api/tickets/:id/cost ─────────────────────────────────────────────
// Records the actual cost incurred (parts/labor) on a job — distinct from
// `estimateAmount` (what the customer is charged/revenue). Owner/manager only,
// and only once the job is essentially done (ready or delivered) — matches the
// "after confirming work is done" framing this feature was requested under.
const SET_COST_ROLES = new Set(['owner', 'manager']);
const SET_COST_ALLOWED_STATUSES = new Set([TicketStatus.ready, TicketStatus.delivered]);

export async function setActualCostHandler(
  req: NextRequest,
  id: string
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);

    if (!SET_COST_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only owner/manager may record job cost', null, 403);
    }
    if (role === 'manager') {
      const perms = await getManagerPermissions(tenantId);
      if (!perms.recordRevenue) {
        return sendResponse(false, 'Your shop owner has not enabled cost/revenue recording for managers', null, 403);
      }
    }

    const body = await req.json();
    const actualCost = Number(body.actualCost);
    if (!Number.isFinite(actualCost) || actualCost < 0) {
      return sendResponse(false, 'actualCost must be a non-negative number', null, 400);
    }

    const ticket = await Ticket.findOne({ _id: id, tenantId });
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);
    if (!SET_COST_ALLOWED_STATUSES.has(ticket.status)) {
      return sendResponse(false, 'Cost can only be recorded once the job is ready or delivered', null, 400);
    }

    ticket.actualCost = actualCost;
    await ticket.save();

    void TicketService.addNote({
      ticketId: id, tenantId, authorId: userId, authorName: userName,
      content: `Actual cost recorded: ${actualCost.toLocaleString()}`,
    }).catch(() => {});

    return sendResponse(true, 'Cost recorded', ticket);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
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
    if (role === 'manager') {
      const perms = await getManagerPermissions(tenantId);
      if (!perms.recordRevenue) {
        return sendResponse(false, 'Your shop owner has not enabled cost/revenue recording for managers', null, 403);
      }
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
    const ownerSettings = await getTenantOwnerNotificationSettings(tenantId);
    const cur = currencySymbol(ownerSettings.currency);

    const payment = await Payment.create({
      tenantId,
      kind: 'invoice',
      referenceId: ticket._id,
      amount: ticket.estimateAmount,
      currency: ownerSettings.currency,
      gateway: method,
      environment: 'in-person',
      method: 'in_person',
      status: 'completed',
      gatewayOrderId: `POS-${ticket._id}-${Date.now()}`,
      recordedBy: userId,
      recordedByName: userName,
      notes: note ?? (amountReceived !== undefined ? `Received: ${cur} ${amountReceived}` : undefined),
    });

    void TicketService.addNote({
      ticketId: id,
      tenantId,
      authorId: userId,
      authorName: userName,
      content: `Payment recorded: ${cur} ${ticket.estimateAmount.toLocaleString()} via ${method}${amountReceived !== undefined ? ` (received ${cur} ${amountReceived.toLocaleString()})` : ''}`,
    }).catch(() => {});

    void (async () => {
      const shopName = await findTenantName(tenantId);
      notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'payment_recorded',
        `Payment collected — ${ticket.ticketNumber}`,
        `${cur} ${ticket.estimateAmount!.toLocaleString()} via ${method}, recorded by ${userName}`,
        { ticketId: ticket._id.toString(), amount: ticket.estimateAmount, method }
      );
      // Email gated by Settings → Notification Preferences → "Email on payment received"
      if (ownerSettings.prefs.emailOnPayment) {
        await emailTenantStaff(
          tenantId, ['owner', 'manager'],
          `Payment Collected — ${ticket.ticketNumber}`,
          (name) => emailTicketStatus(name, ticket.ticketNumber, ticket.deviceBrand ?? '', ticket.deviceModel ?? '', 'payment_recorded', `Payment Collected (${method})`, shopName)
        );
      }
    })();

    return sendResponse(true, 'Payment recorded', payment, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
