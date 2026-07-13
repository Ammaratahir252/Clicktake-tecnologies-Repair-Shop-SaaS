import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadSource = 'walk-in' | 'whatsapp' | 'instagram' | 'referral' | 'website' | 'facebook';

export interface ILeadNote {
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface ILead extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadNumber: string;
  name: string;
  phone: string;
  email?: string;
  device: string;
  issue: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId;
  claimedBy?: mongoose.Types.ObjectId;
  claimedByName?: string;
  claimedAt?: Date;
  convertedTicketId?: mongoose.Types.ObjectId;
  notes: ILeadNote[];
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    leadNumber:  { type: String, required: true },
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    email:       { type: String, trim: true, lowercase: true },
    device:      { type: String, required: true },
    issue:       { type: String, required: true },
    source:      { type: String, enum: ['walk-in', 'whatsapp', 'instagram', 'referral', 'website', 'facebook'], required: true },
    status:      { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
    assignedTo:  { type: Schema.Types.ObjectId, ref: 'User' },
    claimedBy:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    claimedByName: { type: String, default: null },
    claimedAt:     { type: Date, default: null },
    convertedTicketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
    notes: [{
      content:    { type: String, required: true },
      authorId:   { type: String, required: true },
      authorName: { type: String, required: true },
      createdAt:  { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

leadSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>('Lead', leadSchema);
export default Lead;
