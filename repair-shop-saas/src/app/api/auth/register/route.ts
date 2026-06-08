import { NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import { sendResponse } from '../../../../utils/apiResponse';
import { validatePassword } from '../../../../utils/passwordPolicy';
import User from '../../../../models/user.model';
import Tenant from '../../../../models/tenant.model';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { role, email, password } = body;

    if (!role) {
      return sendResponse(false, "Role is required", null, 400);
    }
    
    // Validate password policy
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
      return sendResponse(false, pwdValidation.message, null, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

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
        tenantId: newTenant._id
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
      
      return sendResponse(true, "Shop and Owner registered successfully", null, 201);
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
        tenantId: null
      });

      createAuditLog({
        tenantId: createdUser._id.toString(), // fallback for tenantless customer
        userId: createdUser._id.toString(),
        action: AUDIT_ACTIONS.AUTH_REGISTER,
        entity: 'user',
        entityId: createdUser._id.toString(),
        details: { role, email },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });

      return sendResponse(true, "Account created. You can now log in.", null, 201);
    }
    
    else if (['technician', 'frontdesk', 'manager', 'driver'].includes(role)) {
      const { name, tenantId } = body;
      
      if (!tenantId) {
        return sendResponse(false, "Shop ID not found. Please verify the Shop ID with your shop owner.", null, 400);
      }
      
      try {
        const existingTenant = await Tenant.findById(tenantId);
        if (!existingTenant) {
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
        tenantId
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

      return sendResponse(true, "Account created. You can now log in.", null, 201);
    }

    return sendResponse(false, "Invalid role", null, 400);

  } catch (error: any) {
    console.error("Registration API Error:", error);
    return sendResponse(false, error.message || 'An unexpected error occurred during registration', null, 400);
  }
}