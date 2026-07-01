import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  tenantId: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  technicianId?: mongoose.Types.ObjectId;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  isPublic: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketId:     { type: Schema.Types.ObjectId, ref: 'Ticket' },
    customerId:   { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    technicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    rating:       { type: Number, required: true, min: 1, max: 5 },
    comment:      { type: String, maxlength: 1000 },
    isPublic:     { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reviewSchema.index({ tenantId: 1, createdAt: -1 });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
export default Review;
