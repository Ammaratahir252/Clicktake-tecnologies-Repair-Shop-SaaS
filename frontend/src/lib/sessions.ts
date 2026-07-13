import 'server-only';
import connectDB from '@/lib/db';
import Session from '@/models/session.model';
import User from '@/models/user.model';

export async function createSession(opts: {
  userId: string;
  tenantId?: string | null;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await connectDB();
    await Session.create({
      userId: opts.userId,
      tenantId: opts.tenantId || undefined,
      role: opts.role,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });
  } catch {
    // non-critical — session tracking must never block login
  }
}

/** Force-logout a single user: revokes their session rows and bumps tokenVersion so any live JWT stops verifying. */
export async function forceLogoutUser(userId: string): Promise<void> {
  await connectDB();
  await Promise.all([
    Session.updateMany({ userId, revoked: false }, { revoked: true, revokedAt: new Date() }),
    User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }),
  ]);
}

/** Force-logout every non-super-admin user on the platform (used by Emergency Lockdown / "Force Logout Everyone"). */
export async function forceLogoutAllExceptSuperAdmin(): Promise<number> {
  await connectDB();
  const res = await User.updateMany({ role: { $ne: 'super_admin' } }, { $inc: { tokenVersion: 1 } });
  await Session.updateMany({ role: { $ne: 'super_admin' }, revoked: false }, { revoked: true, revokedAt: new Date() });
  return res.modifiedCount ?? 0;
}

/** Force-logout every user belonging to one tenant. */
export async function forceLogoutTenant(tenantId: string): Promise<number> {
  await connectDB();
  const res = await User.updateMany({ tenantId }, { $inc: { tokenVersion: 1 } });
  await Session.updateMany({ tenantId, revoked: false }, { revoked: true, revokedAt: new Date() });
  return res.modifiedCount ?? 0;
}
