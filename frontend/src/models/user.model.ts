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
      required: function (this: IUser) {
        return this.role !== Role.customer;
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