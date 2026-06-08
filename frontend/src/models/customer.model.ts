import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing a Customer Document in TypeScript.
 * Defined for type-safety across the application.
 */
export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId; // Links customer to a specific shop
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Schema for the Customer Entity.
 * Implements Multi-tenant architecture using 'tenantId'.
 */
const CustomerSchema: Schema = new Schema(
  {
    // Mandatory link to the Tenant (Shop)
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    name: { 
      type: String, 
      required: [true, "Customer name is required"],
      trim: true 
    },
    phone: { 
      type: String, 
      required: [true, "Phone number is required"],
      trim: true
    },
    email: { 
      type: String, 
      lowercase: true, 
      trim: true 
    },
    address: { 
      type: String 
    },
  },
  { 
    // Automatically manages createdAt and updatedAt fields
    timestamps: true 
  }
);

/**
 * COMPOUND INDEX:
 * Ensures phone numbers are unique within a single shop, 
 * but allows the same phone number to exist in different shops.
 */
CustomerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

// Export the model, preventing re-definition during Next.js Hot Reloads
export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);