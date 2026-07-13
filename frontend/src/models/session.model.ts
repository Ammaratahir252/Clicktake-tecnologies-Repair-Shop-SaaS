import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Lightweight login-session record. The JWT itself stays stateless (fast to
 * verify), but every issued token gets a matching Session doc so super admins
 * can see "who is logged in" and force-revoke a single user's active logins
 * (revoke here + bump tokenVersion = the JWT stops verifying on next check).
 */
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  role: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastSeenAt: Date;
  revoked: boolean;
  revokedAt?: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    role: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    lastSeenAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);

export default Session;
