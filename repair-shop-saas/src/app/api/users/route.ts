import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import bcrypt from 'bcryptjs';

/**
 * GET: Fetch all users for the current tenant
 * POST: Create a new staff member under the current tenant
 */

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Extract tenantId from headers (injected by middleware)
    const tenantId = req.headers.get('x-tenant-id');

    const users = await User.find({ tenantId }).select('-password'); // Never return passwords
    return sendResponse(true, 'Users fetched successfully', users);
  } catch (error: any) {
    return sendResponse(false, 'Failed to fetch users', null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const tenantId = req.headers.get('x-tenant-id');
    const body = await req.json();

    const { name, email, password, role } = body;

    // Check if user already exists
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      return sendResponse(false, 'User with this email already exists in your shop', null, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      tenantId,
      name,
      email,
      password: hashedPassword,
      role,
    });

    return sendResponse(true, 'Staff member created successfully', { userId: newUser._id }, 201);
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}