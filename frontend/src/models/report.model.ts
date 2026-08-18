// src/models/report.model.ts
// A manually-authored written report — distinct from the auto-generated
// analytics on the Reports page. Owner/manager compose these themselves
// (e.g. a weekly summary, an incident note, a handover write-up).

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReport extends Document {
  tenantId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  title: string;
  body: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    title:      { type: String, required: true, trim: true },
    body:       { type: String, required: true },
    periodStart: { type: Date, default: null },
    periodEnd:   { type: Date, default: null },
  },
  { timestamps: true }
);

ReportSchema.index({ tenantId: 1, createdAt: -1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
