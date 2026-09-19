import mongoose from 'mongoose';

export interface SignupBody {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export interface EmailValidationCodeBody {
  email: string;
  validationCode: string;
}

export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  lastLogin: Date | Number;
  source: 'google' | 'local';
  profilePhoto?: string;
  profilePhotoPublicId?: string;
  stripeCustomerId?: string;
  comparePassword: (candidatePassword: string, cb: (err: Error | null, isMatch?: boolean) => void) => void;
}

export interface ForgotPasswordParams {
  id?: string;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName: string;
    givenName: string;
  };
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
  provider: string;
  _raw: string;
  _json: any;
}

export interface validateSignup {
  errors: string[];
  validated: boolean;
  hasUpper: RegExp;
  hasLower: RegExp;
  hasSymbol: RegExp;
  hasNumber: RegExp;

  validateEmail(): void;
  validatePasswordLength(): void;
  validatePasswordForce(): void;
  checkIfPasswordsAreEqual(): void;
  checkValidation(): string[];
}

export type ValidateChangePassword = Omit<validateSignup, 'validateEmail'>;
