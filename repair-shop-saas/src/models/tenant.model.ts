import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * REPAIR SHOP SaaS - Tenant Model
 * Based on Module 1 Guide: Step 2
 * This represents the "Shop" itself.
 */
export interface ITenant extends Document {
  name: string;
  subdomain: string; // The unique URL identifier (e.g., 'fast-fix')
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    subdomain: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    // REMOVED: Email field is removed here because it belongs to the User/Owner.
    // Having it here as 'required' was causing your terminal error.
    plan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { 
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

/**
 * Prevents "OverwriteModelError" in Next.js during hot-reloading.
 */
const Tenant: Model<ITenant> = 
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', tenantSchema);

export default Tenant;