import mongoose, { Schema, Document, Model } from 'mongoose';
import { Role } from '../lib/enums';

export interface IUser extends Document {
  tenantId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: number;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  tokenVersion: number;
  twoFactorOtpHash?: string;
  twoFactorOtpExpiry?: number;
  /** Only meaningful for role === 'admin' — which platform sections this scoped admin can access. */
  permissions?: string[];
  lastLoginAt?: Date;
  emailVerified: boolean;
  emailVerifyTokenHash?: string;
  emailVerifyExpiry?: number;
  passwordChangedAt?: Date;
  passwordHistory: string[];
  forcePasswordReset: boolean;
  forceResetTokenHash?: string;
  forceResetTokenExpiry?: number;
  // ── GPS (Module: Global GPS) — live location for driver role ─────────────
  currentLocation?: {
    lat: number;
    lng: number;
    heading?: number; // compass bearing in degrees, 0-360
    speed?: number;   // meters/second
    updatedAt: Date;
  };
}

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      // Platform-level accounts (super_admin, and scoped sub-admins created via
      // /api/admin/users) aren't tied to any single shop — only tenant-scoped
      // staff/customer roles require one.
      required: function (this: IUser) {
        return this.role !== Role.customer && this.role !== Role.super_admin && this.role !== Role.admin;
      },
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { 
      type: String, 
      required: true, 
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: Object.values(Role), 
      default: Role.customer 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpiry: {
      type: Number
    },
    failedLoginAttempts: { 
      type: Number, 
      default: 0 
    },
    lockoutUntil: { 
      type: Date, 
      default: null 
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    twoFactorOtpHash: {
      type: String
    },
    twoFactorOtpExpiry: {
      type: Number
    },
    permissions: { type: [String], default: undefined },
    lastLoginAt: { type: Date },
    emailVerified: { type: Boolean, default: true }, // existing accounts predate verification — default true so nobody is retroactively locked out
    emailVerifyTokenHash: { type: String },
    emailVerifyExpiry: { type: Number },
    passwordChangedAt: { type: Date, default: Date.now },
    passwordHistory: { type: [String], default: [] },
    forcePasswordReset: { type: Boolean, default: false },
    forceResetTokenHash: { type: String },
    forceResetTokenExpiry: { type: Number },
    currentLocation: {
      lat:       { type: Number },
      lng:       { type: Number },
      heading:   { type: Number },
      speed:     { type: Number },
      updatedAt: { type: Date },
    },
  },
  { 
    timestamps: true 
  }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema, 'users');

export default User;