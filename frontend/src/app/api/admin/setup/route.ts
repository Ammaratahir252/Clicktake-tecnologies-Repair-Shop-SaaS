import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import bcrypt from 'bcryptjs';
import { sendResponse } from '@/utils/apiResponse';

// POST /api/admin/setup
// One-time endpoint to create the initial super_admin account.
// Permanently locks itself once any super_admin exists in the database.
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const existing = await User.findOne({ role: 'super_admin' }).select('_id').lean();
    if (existing) {
      return sendResponse(false, 'Setup already completed. Super admin exists.', null, 403);
    }

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return sendResponse(false, 'name, email, and password are required', null, 400);
    }
    if (password.length < 8) {
      return sendResponse(false, 'Password must be at least 8 characters', null, 400);
    }

    const existingEmail = await User.findOne({ email }).select('_id').lean();
    if (existingEmail) {
      return sendResponse(false, 'An account with this email already exists', null, 409);
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await User.create({
      name,
      email,
      password: hashed,
      role: 'super_admin',
    });

    return sendResponse(true, 'Super admin created. You can now log in at /login.', {
      id:    String((admin as any)._id),
      name:  (admin as any).name,
      email: (admin as any).email,
      role:  (admin as any).role,
    }, 201);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// GET /api/admin/setup — check whether setup has been completed
export async function GET(_req: NextRequest) {
  await connectDB();
  try {
    const existing = await User.findOne({ role: 'super_admin' }).select('_id').lean();
    return sendResponse(true, existing ? 'Setup complete' : 'Needs setup', {
      setupComplete: !!existing,
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
