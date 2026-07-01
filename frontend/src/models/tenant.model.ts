import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * REPAIR SHOP SaaS - Tenant Model
 * Based on Module 1 Guide: Step 2
 * This represents the "Shop" itself.
 */
export interface ITenant extends Document {
  name: string;
  ownerName: string;
  subdomain: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Shop profile fields
  logo?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  acceptedDevices: string[];
  servicesOffered: string[];
  openingHours?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
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
    ownerName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    // REMOVED: Email field is removed here because it belongs to the User/Owner.
    // Having it here as 'required' was causing your terminal error.
    plan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    isActive: { type: Boolean, default: true },
    stripeCustomerId:     { type: String },
    stripeSubscriptionId: { type: String },
    logo:          { type: String },
    tagline:       { type: String },
    description:   { type: String },
    phone:         { type: String },
    address:       { type: String },
    city:          { type: String },
    postcode:      { type: String },
    acceptedDevices: { type: [String], default: [] },
    servicesOffered: { type: [String], default: [] },
    openingHours:  { type: String },
    socialLinks: {
      facebook:  { type: String },
      instagram: { type: String },
      twitter:   { type: String },
      website:   { type: String },
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