import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import bcrypt from 'bcryptjs';
import { ADMIN_SECTIONS, canAccess } from '@/lib/adminAccess';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailWelcomeStaff } from '@/lib/notifications';

function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'users');
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const role   = searchParams.get('role') ?? '';
    const tenantId = searchParams.get('tenantId') ?? '';
    const limit  = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const query: any = {};
    if (role && role !== 'all') query.role = role;
    if (tenantId && tenantId.length === 24) query.tenantId = tenantId;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpiry')
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('tenantId', 'name subdomain')
      .lean();

    return sendResponse(true, 'Users fetched', users);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// POST /api/admin/users — creates a platform-level, scoped "admin" account.
// Restricted to real super_admin (not a scoped admin, even one with the 'users'
// permission) since granting permissions is itself a privilege-escalation risk.
// This can NEVER create another super_admin — /api/admin/setup is the only
// (self-locking, one-time) path for that.
export async function POST(req: NextRequest) {
  if (req.headers.get('x-role') !== 'super_admin') return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { name, email, password, permissions } = await req.json();
    if (!name || !email || !password) {
      return sendResponse(false, 'name, email, and password are required', null, 400);
    }
    const perms: string[] = Array.isArray(permissions)
      ? permissions.filter((p: string) => (ADMIN_SECTIONS as readonly string[]).includes(p))
      : [];

    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) return sendResponse(false, 'An account with this email already exists', null, 409);

    const hashed = await bcrypt.hash(password, 12);
    const admin = await User.create({
      name,
      email,
      password: hashed,
      role: 'admin',
      permissions: perms,
    });

    const superAdminId = req.headers.get('x-user-id') || 'unknown';
    if (superAdminId !== 'unknown') {
      createAuditLog({
        tenantId: String(admin._id),
        userId: superAdminId,
        action: AUDIT_ACTIONS.USER_INVITED,
        entity: 'user',
        entityId: String(admin._id),
        details: { role: 'admin', email, permissions: perms },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    sendEmail(email, 'Your Admin Account Is Ready', emailWelcomeStaff(name, 'admin', 'the platform team')).catch(() => {});

    const { password: _pw, ...safe } = (admin as any).toObject();
    return sendResponse(true, 'Admin account created', safe, 201);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
