import mongoose, { Schema, Document, Model } from 'mongoose';
// Using relative path to ensure the compiler finds the file
import { Role } from '../lib/enums';

/**
 * Interface representing the User document in MongoDB
 */
export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId; // Multi-tenant identifier
  name: string;
  email: string;
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
}

/**
 * User Schema Definition
 */
const userSchema = new Schema<IUser>(
  {
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
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
    }
  },
  { 
    timestamps: true 
  }
);

/**
 * INDEXES
 * Ensures that an email is unique within a specific tenant (shop).
 * This allows the same email to exist in different shops if necessary.
 */
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Export the model, ensuring we don't redefine it if it already exists
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema, 'users');

export default User;