import { NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import { sendResponse } from '../../../../utils/apiResponse';
import { validatePassword } from '../../../../utils/passwordPolicy';
import User from '../../../../models/user.model';
import Tenant from '../../../../models/tenant.model';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';
import { sendEmail, emailWelcomeOwner, emailWelcomeStaff, emailWelcomeCustomer, emailNewTenantAlert, notifySuperAdmins, emailVerifyAccount } from '../../../../lib/notifications';
import { getPlatformSettings } from '@/lib/platformSettings';
import { isDisposableEmail } from '@/lib/disposableEmailDomains';
import crypto from 'crypto';

function buildVerifyLink(userId: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/verify-email?userId=${userId}&token=${token}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { role, email, password } = body;

    if (!role) {
      return sendResponse(false, "Role is required", null, 400);
    }

    const settings = await getPlatformSettings();

    if (role === 'owner' && !settings.allowNewSignups) {
      return sendResponse(false, "New shop registrations are temporarily closed. Please contact support.", null, 403);
    }
    if (role === 'customer' && !settings.allowPublicRegistration) {
      return sendResponse(false, "Public registration is currently disabled. Please contact your repair shop directly.", null, 403);
    }
    if (role === 'customer' && settings.inviteOnlyRegistration) {
      return sendResponse(false, "This platform is invite-only right now. Ask your repair shop to create your account.", null, 403);
    }
    if (settings.blockDisposableEmails && isDisposableEmail(email || '')) {
      return sendResponse(false, "Disposable/temporary email addresses are not allowed. Please use a real email address.", null, 400);
    }

    const pwdValidation = validatePassword(password, settings.passwordMinLength, {
      requireUppercase: settings.passwordRequireUppercase,
      requireNumber: settings.passwordRequireNumber,
      requireSymbol: settings.passwordRequireSymbol,
    });
    if (!pwdValidation.valid) {
      return sendResponse(false, pwdValidation.message, null, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Email verification token (only meaningful when requireEmailVerification is on)
    let emailVerified = true;
    let emailVerifyTokenHash: string | undefined;
    let emailVerifyExpiry: number | undefined;
    let rawVerifyToken: string | undefined;
    if (settings.requireEmailVerification) {
      emailVerified = false;
      rawVerifyToken = crypto.randomBytes(32).toString('hex');
      emailVerifyTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
      emailVerifyExpiry = Date.now() + 24 * 60 * 60 * 1000;
    }

    if (role === 'owner') {
      let { shopName, ownerName, subdomain } = body;

      subdomain = subdomain?.toLowerCase().trim();
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return sendResponse(false, "Subdomain can only contain letters, numbers, and hyphens", null, 400);
      }

      const existingTenant = await Tenant.findOne({ subdomain });
      if (existingTenant) {
        return sendResponse(false, "This subdomain is already taken", null, 409);
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(false, "An account with this email already exists", null, 409);
      }

      const newTenant = await Tenant.create({ name: shopName, subdomain, plan: 'free', ownerName, email });

      const createdUser = await User.create({
        name: ownerName,
        email,
        password: hashedPassword,
        role: "owner",
        tenantId: newTenant._id,
        emailVerified,
        emailVerifyTokenHash,
        emailVerifyExpiry,
      });

      createAuditLog({
        tenantId: newTenant._id.toString(),
        userId: createdUser._id.toString(),
        action: AUDIT_ACTIONS.AUTH_REGISTER,
        entity: 'user',
        entityId: createdUser._id.toString(),
        details: { role, email, subdomain },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });

      // Alert super admins of the new signup, if enabled in platform settings
      if (settings.notifs.newTenant) {
        void notifySuperAdmins(
          `New Shop Registered: ${shopName}`,
          emailNewTenantAlert(shopName, ownerName, email, subdomain)
        );
      }

      // Welcome email to the new shop owner
      void sendEmail(
        email,
        `Welcome to ${shopName} — Your repair shop is live!`,
        emailWelcomeOwner(ownerName, shopName, email)
      );
      if (rawVerifyToken) {
        void sendEmail(email, 'Verify your email address', emailVerifyAccount(ownerName, buildVerifyLink(String(createdUser._id), rawVerifyToken)));
        return sendResponse(true, "Shop and Owner registered. Check your email to verify your address before logging in.", { tenantId: newTenant._id.toString() }, 201);
      }

      return sendResponse(true, "Shop and Owner registered successfully", { tenantId: newTenant._id.toString() }, 201);
    }

    else if (role === 'customer') {
      const { name, phone } = body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(false, "An account with this email already exists", null, 409);
      }

      const createdUser = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role: "customer",
        emailVerified,
        emailVerifyTokenHash,
        emailVerifyExpiry,
      });

      createAuditLog({
        tenantId: createdUser._id.toString(),
        userId: createdUser._id.toString(),
        action: AUDIT_ACTIONS.AUTH_REGISTER,
        entity: 'user',
        entityId: createdUser._id.toString(),
        details: { role, email },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });

      // Welcome email to new customer
      void sendEmail(
        email,
        'Welcome! Your account has been created.',
        emailWelcomeCustomer(name)
      );
      if (rawVerifyToken) {
        void sendEmail(email, 'Verify your email address', emailVerifyAccount(name, buildVerifyLink(String(createdUser._id), rawVerifyToken)));
        return sendResponse(true, "Account created. Check your email to verify your address before logging in.", null, 201);
      }

      return sendResponse(true, "Account created. You can now log in.", null, 201);
    }

    else if (['technician', 'frontdesk', 'manager', 'driver'].includes(role)) {
      const { name, tenantId } = body;

      if (!tenantId) {
        return sendResponse(false, "Shop ID not found. Please verify the Shop ID with your shop owner.", null, 400);
      }

      let tenant: any;
      try {
        tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          return sendResponse(false, "Shop ID not found. Please verify the Shop ID with your shop owner.", null, 400);
        }
      } catch {
        return sendResponse(false, "Shop ID not found. Please verify the Shop ID with your shop owner.", null, 400);
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(false, "An account with this email already exists", null, 409);
      }

      const createdUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        tenantId,
        emailVerified,
        emailVerifyTokenHash,
        emailVerifyExpiry,
      });

      createAuditLog({
        tenantId: tenantId.toString(),
        userId: createdUser._id.toString(),
        action: AUDIT_ACTIONS.AUTH_REGISTER,
        entity: 'user',
        entityId: createdUser._id.toString(),
        details: { role, email },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });

      // Welcome email to new staff member
      void sendEmail(
        email,
        `Welcome to ${tenant.name} — Your account is ready`,
        emailWelcomeStaff(name, role, tenant.name)
      );
      if (rawVerifyToken) {
        void sendEmail(email, 'Verify your email address', emailVerifyAccount(name, buildVerifyLink(String(createdUser._id), rawVerifyToken)));
        return sendResponse(true, "Account created. Check your email to verify your address before logging in.", null, 201);
      }

      return sendResponse(true, "Account created. You can now log in.", null, 201);
    }

    return sendResponse(false, "Invalid role", null, 400);

  } catch (error: any) {
    console.error("Registration API Error:", error);
    return sendResponse(false, error.message || 'An unexpected error occurred during registration', null, 400);
  }
}
