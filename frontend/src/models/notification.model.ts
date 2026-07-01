import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenantId:        { type: Schema.Types.ObjectId, required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    type:            { type: String, required: true },
    title:           { type: String, required: true },
    message:         { type: String, required: true },
    readAt:          { type: Date, default: null },
    metadata:        { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
