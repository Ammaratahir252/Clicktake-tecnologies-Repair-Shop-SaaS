import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Ensure you have installed: npm install jsonwebtoken
import Tenant from '../../models/tenant.model';
import User from '../../models/user.model';

export const AuthService = {
  /**
   * REGISTRATION LOGIC
   * Creates a new Shop (Tenant) and an Admin User (Owner) in one transaction.
   */
  registerTenant: async (data: any) => {
    // === NEW: Handle Staff & Customer Registration ===
    if (data.role && data.role !== 'owner') {
      const { name, email, password, tenantId, role, phone } = data;
      
      // Staff validation: tenantId must be valid and exist
      if (['technician', 'frontdesk', 'manager', 'driver'].includes(role)) {
        if (!tenantId) throw new Error("Shop ID is required for staff roles.");
        try {
          const existingTenant = await Tenant.findById(tenantId);
          if (!existingTenant) throw new Error("Shop ID not found. Please check with your shop owner.");
        } catch (err) {
          throw new Error("Shop ID not found. Please check with your shop owner.");
        }
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) throw new Error('Email already registered');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name, 
        email, 
        password: hashedPassword, 
        tenantId: tenantId || new mongoose.Types.ObjectId(), // customers might not have tenantId initially
        role, 
        phone
      });
      return { user };
    }

    // === EXISTING: Handle Shop Owner Registration ===
    const { shopName, ownerName, email, password, subdomain } = data;

    // 1. Check for duplicates
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error('Email already registered');

    const existingTenant = await Tenant.findOne({ subdomain });
    if (existingTenant) throw new Error('Subdomain already taken');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 2. Create the Shop
      const tenant = await Tenant.create(
        [{ name: shopName, subdomain, plan: 'free' }],
        { session }
      );

      // 3. Secure the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Create the Owner linked to the Shop
      const user = await User.create(
        [{
          name: ownerName,
          email,
          password: hashedPassword,
          tenantId: tenant[0]._id,
          role: 'owner',
        }],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return { tenant: tenant[0], user: user[0] };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(error.message);
    }
  },

  /**
   * LOGIN LOGIC
   * Verifies credentials and generates a secure JWT token.
   */
  loginUser: async (email: string, password: string) => {
    // 1. Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Verify the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // 3. Generate a JWT Token
    // This token contains the User ID and Tenant ID for future requests
    const token = jwt.sign(
      { 
        userId: user._id, 
        tenantId: user.tenantId, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    };
  }
};