import crypto from 'crypto';
import mongoose, { Schema } from 'mongoose';

export interface PasswordResetTokenDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<PasswordResetTokenDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Store the SHA-256 hash of the raw token — never the raw token itself
  tokenHash: { type: String, required: true, unique: true },
  // TTL: 15 minutes from creation. MongoDB deletes the document automatically.
  createdAt: { type: Date, default: Date.now, expires: 900 },
});

/** Generate a cryptographically secure raw token and return both the raw
 *  token (to be sent to the client once) and the hash to persist in the DB. */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex'); // 256 bits of entropy
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/** Hash a raw token received from the client for constant-time-safe comparison. */
export function hashResetToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export default mongoose.model<PasswordResetTokenDocument>(
  'PasswordResetToken',
  PasswordResetTokenSchema,
);
