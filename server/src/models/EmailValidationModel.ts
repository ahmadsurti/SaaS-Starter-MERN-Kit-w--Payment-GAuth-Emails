import mongoose, { Schema } from 'mongoose';

export interface EmailValidationDocument extends mongoose.Document {
  email: string;
  validationCode: string;
  createdAt: Date;
  expiresAt: Date;
  validationTries: number;
}

const EmailValidationSchema = new Schema<EmailValidationDocument>({
  email: { type: String, required: true },
  validationCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 1200 },
  validationTries: { type: Number, default: 0 },
});

export default mongoose.model('EmailValidation', EmailValidationSchema);
