import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  provider: string;
  status: 'sent' | 'failed' | 'suppressed';
  error?: string;
  createdAt: Date;
}

const schema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    provider: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed', 'suppressed'], required: true },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const EmailLog: Model<IEmailLog> =
  mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', schema);

export default EmailLog;
