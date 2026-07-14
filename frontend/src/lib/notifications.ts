import 'server-only';
import connectDB from '@/lib/db';
import Notification from '@/models/notification.model';
import User from '@/models/user.model';
import mongoose from 'mongoose';
import { sendPlatformEmail } from '@/lib/email/send';

// ─── In-App Notification ──────────────────────────────────────────────────────

interface NotifOpts {
  tenantId:        string;
  recipientUserId: string;
  type:            string;
  title:           string;
  message:         string;
  metadata?:       Record<string, any>;
}

export async function createNotification(opts: NotifOpts): Promise<void> {
  try {
    if (!opts.recipientUserId || opts.recipientUserId.length !== 24) return;
    if (!opts.tenantId        || opts.tenantId.length        !== 24) return;
    await connectDB();
    await Notification.create({
      tenantId:        new mongoose.Types.ObjectId(opts.tenantId),
      recipientUserId: new mongoose.Types.ObjectId(opts.recipientUserId),
      type:            opts.type,
      title:           opts.title,
      message:         opts.message,
      metadata:        opts.metadata ?? {},
    });
  } catch {
    // Non-critical
  }
}

export async function notifyTenantByRole(
  tenantId:  string,
  roles:     string[],
  type:      string,
  title:     string,
  message:   string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    if (!tenantId || tenantId.length !== 24) return;
    await connectDB();

    const users = await User.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      role:     { $in: roles },
      isActive: true,
    }).select('_id').lean() as any[];

    if (!users.length) return;

    await Notification.insertMany(
      users.map((u) => ({
        tenantId:        new mongoose.Types.ObjectId(tenantId),
        recipientUserId: u._id,
        type,
        title,
        message,
        metadata: metadata ?? {},
      }))
    );
  } catch {
    // Non-critical
  }
}

// ─── Email Sending ────────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string, opts?: { category?: 'transactional' | 'marketing' }): Promise<void> {
  await sendPlatformEmail(to, subject, html, opts);
}

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export async function findCustomerById(
  customerId: string
): Promise<{ email?: string; name: string; phone?: string } | null> {
  try {
    if (!customerId || customerId.length !== 24) return null;
    await connectDB();
    const Customer = (await import('@/models/customer.model')).default as any;
    const c = await Customer.findById(customerId).select('email name phone').lean();
    if (!c) return null;
    return { email: c.email, name: c.name, phone: c.phone };
  } catch {
    return null;
  }
}

export async function findCustomerByPhone(
  tenantId: string,
  phone:    string
): Promise<{ email: string; name: string } | null> {
  try {
    if (!tenantId || tenantId.length !== 24 || !phone) return null;
    await connectDB();
    // 1. Check Customer model (walk-in, may have email stored by staff)
    const Customer = (await import('@/models/customer.model')).default as any;
    const customer = await Customer.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      phone:    phone.trim(),
    }).select('email name').lean();
    if (customer?.email) return { email: customer.email, name: customer.name };

    // 2. Fall back to User model (portal-registered customer, no tenantId)
    const user = await User.findOne({
      phone: phone.trim(),
      role:  'customer',
    }).select('email name').lean() as any;
    if (user?.email) return { email: user.email, name: user.name };

    return null;
  } catch {
    return null;
  }
}

export async function findUserById(
  userId: string
): Promise<{ email: string; name: string } | null> {
  try {
    if (!userId || userId.length !== 24) return null;
    await connectDB();
    const user = await User.findById(userId).select('email name').lean() as any;
    if (!user?.email) return null;
    return { email: user.email, name: user.name };
  } catch {
    return null;
  }
}

export async function findCustomerUserId(
  tenantId: string,
  phone:    string
): Promise<string | null> {
  try {
    if (!tenantId || tenantId.length !== 24 || !phone) return null;
    await connectDB();
    const user = await User.findOne({
      phone: phone.trim(),
      role:  'customer',
    }).select('_id').lean() as any;
    return user?._id?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function findTenantName(tenantId: string): Promise<string> {
  try {
    if (!tenantId || tenantId.length !== 24) return 'Your Repair Shop';
    await connectDB();
    const Tenant = (await import('@/models/tenant.model')).default;
    const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
    return tenant?.name || 'Your Repair Shop';
  } catch {
    return 'Your Repair Shop';
  }
}

export async function emailTenantStaff(
  tenantId: string,
  roles:    string[],
  subject:  string,
  htmlFn:   (name: string) => string
): Promise<void> {
  try {
    if (!tenantId || tenantId.length !== 24) return;
    await connectDB();
    const staff = await User.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      role:     { $in: roles },
      isActive: true,
    }).select('email name').lean() as any[];

    await Promise.allSettled(
      staff.filter(u => u.email).map(u => sendEmail(u.email, subject, htmlFn(u.name)))
    );
  } catch {
    // Non-critical
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function wrap(body: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<tr><td style="background:#1d4ed8;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">&#128295; Repair Shop</h1></td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #e5e7eb;"><p style="margin:0;font-size:12px;color:#6b7280;">Automated notification from your repair shop management system. Do not reply to this email.</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function infoTable(rows: [string, string][]): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
<table width="100%" cellpadding="0" cellspacing="0">
${rows.map(([label, value]) => `<tr><td style="padding:6px 0;"><span style="color:#6b7280;font-size:13px;">${label}</span></td><td style="padding:6px 0;text-align:right;"><strong style="color:#1a1a2e;">${value}</strong></td></tr>`).join('')}
</table></div>`;
}

export function emailWelcomeOwner(ownerName: string, shopName: string, email: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Welcome, ${ownerName}!</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">Your repair shop <strong>${shopName}</strong> has been successfully registered.</p>
${infoTable([['Login email', email], ['Shop name', shopName]])}
<p style="margin:16px 0;color:#374151;font-size:15px;">Log in to start managing tickets, your team, and customers.</p>
`, `Welcome to ${shopName}`);
}

export function emailWelcomeStaff(name: string, role: string, shopName: string): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Welcome, ${name}!</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">Your account has been created as a <strong>${roleLabel}</strong> at <strong>${shopName}</strong>.</p>
<p style="margin:16px 0;color:#374151;font-size:15px;">You can now log in to access your dashboard and start working.</p>
<p style="margin:24px 0 0;color:#6b7280;font-size:14px;">If you did not expect this, contact your shop owner immediately.</p>
`, `Welcome to ${shopName}`);
}

export function emailWelcomeCustomer(name: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Welcome, ${name}!</h2>
<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">Your customer account has been created successfully.</p>
<p style="margin:16px 0;color:#374151;font-size:15px;">You can now book repairs, track your devices, and view your repair history.</p>
`, 'Welcome!');
}

export function emailPasswordReset(name: string, resetLink: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Password Reset Request</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>, we received a request to reset your password.</p>
<p style="margin:0 0 20px;color:#374151;font-size:15px;">Click the button below — this link expires in <strong>1 hour</strong>.</p>
<div style="text-align:center;margin:24px 0;">
  <a href="${resetLink}" style="background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Reset Password</a>
</div>
<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">If you didn't request this, ignore this email — your account is safe.</p>
`, 'Password Reset');
}

export function emailTicketCreatedCustomer(
  customerName: string,
  ticketNumber: string,
  deviceBrand:  string,
  deviceModel:  string,
  issue:        string,
  shopName:     string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Your repair has been received</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${customerName}</strong>, we have received your device and opened a repair ticket.</p>
${infoTable([
  ['Ticket number', `<span style="color:#1d4ed8">${ticketNumber}</span>`],
  ['Device', `${deviceBrand} ${deviceModel}`],
  ['Issue', issue],
  ['Shop', shopName],
])}
<p style="margin:16px 0;color:#374151;font-size:15px;">We will email you as your repair progresses. Thank you for your patience.</p>
`, `Repair Ticket ${ticketNumber} Received`);
}

export function emailTicketCreatedStaff(
  staffName:    string,
  ticketNumber: string,
  customerName: string,
  deviceBrand:  string,
  deviceModel:  string,
  issue:        string,
  shopName:     string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">New repair ticket — ${ticketNumber}</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${staffName}</strong>, a new ticket has been created at <strong>${shopName}</strong>.</p>
${infoTable([
  ['Ticket', `<span style="color:#1d4ed8">${ticketNumber}</span>`],
  ['Customer', customerName],
  ['Device', `${deviceBrand} ${deviceModel}`],
  ['Issue', issue],
])}
<p style="margin:16px 0;color:#374151;font-size:15px;">Log in to assign a technician and start processing this repair.</p>
`, `New Ticket ${ticketNumber}`);
}

const STATUS_COLORS: Record<string, string> = {
  diagnosed:      '#7c3aed',
  estimate_sent:  '#d97706',
  approved:       '#2563eb',
  in_repair:      '#2563eb',
  ready:          '#16a34a',
  delivered:      '#059669',
  cancelled:      '#dc2626',
};

export function emailTicketStatus(
  customerName: string,
  ticketNumber: string,
  deviceBrand:  string,
  deviceModel:  string,
  newStatus:    string,
  statusLabel:  string,
  shopName:     string,
  extraMsg?:    string
): string {
  const color = STATUS_COLORS[newStatus] || '#6b7280';
  const badge = `<span style="background:${color};color:#fff;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600;">${statusLabel}</span>`;
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Repair status update</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${customerName}</strong>, your repair status has changed.</p>
${infoTable([
  ['Ticket', `<span style="color:#1d4ed8">${ticketNumber}</span>`],
  ['Device', `${deviceBrand} ${deviceModel}`],
  ['New status', badge],
  ['Shop', shopName],
])}
${extraMsg ? `<p style="margin:16px 0;color:#374151;font-size:15px;">${extraMsg}</p>` : ''}
`, `Repair Update — ${ticketNumber}`);
}

export function emailEstimate(
  customerName: string,
  ticketNumber: string,
  deviceBrand:  string,
  deviceModel:  string,
  amount:       number,
  shopName:     string
): string {
  const formatted = `Rs. ${amount.toLocaleString()}`;
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Repair estimate ready</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${customerName}</strong>, your repair estimate is ready.</p>
${infoTable([
  ['Ticket', `<span style="color:#1d4ed8">${ticketNumber}</span>`],
  ['Device', `${deviceBrand} ${deviceModel}`],
  ['Estimate', `<span style="color:#16a34a;font-size:18px;">${formatted}</span>`],
  ['Shop', shopName],
])}
<p style="margin:16px 0;color:#374151;font-size:15px;">Please contact the shop to approve this estimate before we proceed.</p>
`, `Repair Estimate — ${ticketNumber}`);
}

export function emailTechnicianAssigned(
  techName:     string,
  ticketNumber: string,
  deviceBrand:  string,
  deviceModel:  string,
  issue:        string,
  customerName: string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">New ticket assigned to you</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${techName}</strong>, a repair ticket has been assigned to you.</p>
${infoTable([
  ['Ticket', `<span style="color:#1d4ed8">${ticketNumber}</span>`],
  ['Customer', customerName],
  ['Device', `${deviceBrand} ${deviceModel}`],
  ['Issue', issue],
])}
<p style="margin:16px 0;color:#374151;font-size:15px;">Log in to your dashboard to view full details and begin the repair.</p>
`, `Ticket ${ticketNumber} Assigned`);
}

// ─── Super Admin / Account Lifecycle Templates ─────────────────────────────────

export function emailSuperAdminLoginAlert(
  ipAddress: string,
  userAgent: string,
  when:      string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Super Admin Login</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">A super admin login was just recorded on the platform.</p>
${infoTable([
  ['Time', when],
  ['IP address', ipAddress],
  ['Device / browser', userAgent],
])}
<p style="margin:16px 0;color:#374151;font-size:15px;">If this wasn't you, rotate the super admin password immediately.</p>
`, 'Super Admin Login Alert');
}

export function emailSuperAdminActivityReport(
  loginAt: string,
  logoutAt: string,
  ipAddress: string,
  actions: { action: string; entity: string; createdAt: string }[]
): string {
  const rows = actions.length
    ? actions.map(a => `<tr><td style="padding:6px 0;color:#374151;font-size:13px;">${a.createdAt}</td><td style="padding:6px 0;color:#374151;font-size:13px;">${a.action}</td><td style="padding:6px 0;color:#374151;font-size:13px;">${a.entity}</td></tr>`).join('')
    : `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;" colspan="3">No actions recorded this session.</td></tr>`;
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Super Admin Session Report</h2>
${infoTable([
  ['Login time', loginAt],
  ['Logout time', logoutAt],
  ['IP address', ipAddress],
])}
<p style="margin:20px 0 8px;color:#1a1a2e;font-size:15px;font-weight:600;">Actions taken this session</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;">${rows}</table>
`, 'Super Admin Activity Report');
}

export function emailAccountDeleted(name: string, accountType: 'shop' | 'staff account' | 'customer'): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Account Closed</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>, your ${accountType} has been permanently closed by the platform administrator.</p>
<p style="margin:16px 0;color:#374151;font-size:15px;">If you believe this was done in error, please contact support.</p>
`, 'Account Closed');
}

export function emailMaintenanceNotice(name: string, message: string, whenText: string | null): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">${whenText ? 'Scheduled Maintenance Notice' : 'Maintenance Mode Enabled'}</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
<p style="margin:0 0 16px;color:#374151;font-size:15px;white-space:pre-wrap;">${message}</p>
${whenText ? infoTable([['Maintenance starts', whenText]]) : ''}
<p style="margin:16px 0;color:#374151;font-size:15px;">Access to the platform will be temporarily unavailable during this window. We apologize for any inconvenience.</p>
`, 'Maintenance Notice');
}

export function emailDemoRequest(
  name: string,
  email: string,
  shopName: string,
  phone: string,
  preferredDate: string,
  message: string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">New Demo Request</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">A visitor requested a live demo from the marketing site.</p>
${infoTable([
  ['Name', name],
  ['Email', email],
  ['Shop name', shopName],
  ['Phone', phone || '—'],
  ['Preferred date', preferredDate || '—'],
])}
${message ? `<p style="margin:16px 0 0;color:#374151;font-size:15px;white-space:pre-wrap;"><strong>Message:</strong><br/>${message}</p>` : ''}
`, 'New Demo Request');
}

export function emailContactUsMessage(
  name: string,
  email: string,
  subject: string,
  message: string
): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">New Contact Us Message</h2>
${infoTable([
  ['Name', name],
  ['Email', email],
  ['Subject', subject || '—'],
])}
<p style="margin:16px 0 0;color:#374151;font-size:15px;white-space:pre-wrap;"><strong>Message:</strong><br/>${message}</p>
`, 'New Contact Us Message');
}

export function emailAdminNotice(name: string, message: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Notice from Platform Admin</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
<p style="margin:0 0 16px;color:#374151;font-size:15px;white-space:pre-wrap;">${message}</p>
`, 'Notice from Platform Admin');
}

export function emailSubscriptionChanged(ownerName: string, shopName: string, plan: string, status: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Your Subscription Has Changed</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${ownerName}</strong>, your subscription for <strong>${shopName}</strong> was updated by the platform administrator.</p>
${infoTable([
  ['Plan', plan],
  ['Status', status],
])}
`, 'Subscription Updated');
}

export function emailVerifyAccount(name: string, verifyLink: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Verify your email address</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>, please confirm this is your email address to activate your account.</p>
<div style="text-align:center;margin:24px 0;">
  <a href="${verifyLink}" style="background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Verify Email</a>
</div>
<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">This link expires in 24 hours. You won't be able to log in until you verify.</p>
`, 'Verify Your Email');
}

export function emailTwoFactorCode(code: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Your Verification Code</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">Enter this code to finish signing in. It expires in 10 minutes.</p>
<p style="margin:0 0 16px;text-align:center;">
  <span style="display:inline-block;padding:14px 28px;border-radius:12px;background:#f3f4f6;font-size:28px;font-weight:800;letter-spacing:8px;color:#1a1a2e;">${code}</span>
</p>
<p style="margin:16px 0;color:#6b7280;font-size:13px;">If you didn't try to sign in, you can ignore this email — your account is still secure.</p>
`, 'Your Verification Code');
}

export function emailNewTenantAlert(shopName: string, ownerName: string, email: string, subdomain: string): string {
  return wrap(`
<h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">New Shop Registered</h2>
<p style="margin:0 0 16px;color:#374151;font-size:15px;">A new tenant just signed up on the platform.</p>
${infoTable([
  ['Shop name', shopName],
  ['Owner', ownerName],
  ['Email', email],
  ['Subdomain', subdomain],
])}
`, 'New Tenant Registered');
}

// ─── Super Admin Broadcast Helper ──────────────────────────────────────────────

/** Emails every active super_admin account — used for platform-level alerts. */
export async function notifySuperAdmins(subject: string, html: string): Promise<void> {
  try {
    await connectDB();
    const admins = await User.find({ role: 'super_admin', isActive: true }).select('email').lean() as any[];
    await Promise.all(admins.map((a) => sendPlatformEmail(a.email, subject, html)));
  } catch {
    // Non-critical
  }
}

// ─── Maintenance Mode Notice ────────────────────────────────────────────────

/** Emails + in-app-notifies every tenant-side user (owners, staff, technicians, customers —
 * everyone maintenance mode will actually block) about an upcoming or active maintenance window. */
export async function notifyMaintenanceScheduled(message: string, scheduledAt: Date | string | null): Promise<void> {
  try {
    await connectDB();
    const recipients = await User.find({ role: { $ne: 'super_admin' }, isActive: true })
      .select('_id name email tenantId').lean() as any[];
    if (!recipients.length) return;

    const whenText = scheduledAt
      ? new Date(scheduledAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : null;
    const title = whenText ? `Scheduled Maintenance — ${whenText}` : 'Maintenance Mode Enabled';
    const noticeMessage = (whenText
      ? `The platform will undergo scheduled maintenance starting ${whenText}. ${message || ''}`
      : `The platform has entered maintenance mode. ${message || ''}`).trim();

    await Promise.allSettled(
      recipients.filter((r) => r.email).map((r) =>
        sendEmail(r.email, title, emailMaintenanceNotice(r.name, noticeMessage, whenText))
      )
    );
    await Promise.allSettled(
      recipients.filter((r) => r.tenantId).map((r) =>
        createNotification({
          tenantId: String(r.tenantId),
          recipientUserId: String(r._id),
          type: 'maintenance_notice',
          title,
          message: noticeMessage,
        })
      )
    );
  } catch {
    // Non-critical
  }
}
