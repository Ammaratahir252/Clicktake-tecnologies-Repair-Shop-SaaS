import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // ✅ Added to securely extract the role if req.user is missing

// --- RBAC & AUDIT IMPORTS ---
import { permissionMiddleware } from '@/middleware/permissionMiddleware';
import { ACTION_STRINGS } from '@/lib/permissions';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model'; 

/**
 * Helper function to safely inject user context from Bearer token into req object
 */
function injectUserContext(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      
      // Mutate request safely so permissionMiddleware can read it
      (req as any).user = {
        id: decoded.userId,
        role: decoded.role,
        tenantId: decoded.tenantId
      };
    }
  } catch (err) {
    // Fail silently; permissionMiddleware will naturally throw 403 if role injection fails
  }
}

/**
 * GET: Fetch all users for the current tenant
 * Protected by RBAC: Only authorized roles can list users
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // ✅ FIX: Inject user context from token before calling permission middleware
    injectUserContext(req);

    /**
     * RBAC CHECK: Verify if the user has 'settings:userMgmt' permission.
     */
    const permissionError = await permissionMiddleware(ACTION_STRINGS.SETTINGS_USER_MGMT)(req as any);
    if (permissionError) return permissionError;
    
    const tenantId = req.headers.get('x-tenant-id');

    // Security: Fetch users excluding sensitive password field
    const users = await User.find({ tenantId }).select('-password'); 
    return sendResponse(true, 'Users fetched successfully', users);
  } catch (error: any) {
    return sendResponse(false, 'Failed to fetch users', null, 500);
  }
}

/**
 * POST: Create a new staff member under the current tenant
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // ✅ FIX: Inject user context from token before calling permission middleware
    injectUserContext(req);

    // RBAC CHECK: Ensure requester is authorized to create new users
    const permissionError = await permissionMiddleware(ACTION_STRINGS.SETTINGS_USER_MGMT)(req as any);
    if (permissionError) return permissionError;

    const tenantId = req.headers.get('x-tenant-id');
    const body = await req.json();
    const { name, email, password, role } = body;

    // Security: Check if a user with the same email already exists in this tenant
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      return sendResponse(false, 'User with this email already exists', null, 400);
    }

    // Encrypt password before saving to database
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      tenantId,
      name,
      email,
      password: hashedPassword,
      role,
    });

    /**
     * AUDIT LOG: Record the staff creation event for security tracking.
     */
    createAuditLog({
      tenantId: tenantId as string,
      userId: req.headers.get('x-user-id') || 'system', 
      action: AUDIT_ACTIONS.USER_INVITED,
      entity: 'user',
      entityId: (newUser._id as any).toString(),
      details: { invitedEmail: email, assignedRole: role }
    });

    return sendResponse(true, 'Staff member created successfully', { userId: newUser._id }, 201);
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}