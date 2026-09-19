import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { UserDocument } from '../types/interfaces';

const UserSchema = new mongoose.Schema<UserDocument>({
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  password: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  source: { type: String, default: 'local' },
  profilePhoto: { type: String },
  profilePhotoPublicId: { type: String },
  stripeCustomerId: { type: String },
});

// Hash password before saving — only runs when the password field is modified
UserSchema.pre<UserDocument>('save', async function save(next) {
  const user = this;
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcryptjs.genSalt(10);
  user.password = await bcryptjs.hash(user.password, salt);
  next();
});

// Callback-based password comparison (used by Passport local strategy)
UserSchema.methods.comparePassword = function comparePassword(candidatePassword: string, cb: (err: Error | null, isMatch?: boolean) => void) {
  bcryptjs.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

export default mongoose.model('User', UserSchema);
