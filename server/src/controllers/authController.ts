import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import validator from 'validator';
import { ChangePasswordValidator } from '../core/userValidator/ChangePasswordValidator';
import { LoginUserValidator } from '../core/userValidator/LoginUserValidator';
import { SignUpUserValidator } from '../core/userValidator/SignUpUserValidator';
import EmailValidation from '../models/EmailValidationModel';
import PasswordResetToken, {
  generateResetToken,
  hashResetToken,
} from '../models/PasswordResetTokenModel';
import User from '../models/UserModel';
import sendValidationCode from '../services/email/SendValidationCode';
import { frontEndUrl } from '../server';
import type { EmailValidationCodeBody, ForgotPasswordParams, SignupBody, UserDocument } from '../types/interfaces';

const senderEmail = `no-reply@${process.env.WEBSITE_DOMAIN}`;

// ─── Sign-up: send validation code email ─────────────────────────────────────

export const sendSignUpValidationCodeEmail = async (req: Request<{}, any, SignupBody>, res: Response) => {
  const { email, password, confirmPassword } = req.body ?? ({} as SignupBody);
  const signUpValidation = new SignUpUserValidator(email, password, confirmPassword);
  const errors = signUpValidation.checkValidation();

  if (errors.length) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  const normalizedEmail = validator.normalizeEmail(email, { gmail_remove_dots: false }) || email;

  try {
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, errors: 'User already exists' });
    }
  } catch {
    return res.status(500).json({ success: false, errors: 'Failed to verify email availability' });
  }

  try {
    await EmailValidation.deleteMany({ email: normalizedEmail });
  } catch {
    return res.status(500).json({ success: false, errors: 'Internal error deleting existing codes' });
  }

  try {
    const emailSentID = await sendValidationCode(senderEmail, normalizedEmail);
    if (!emailSentID) {
      return res.status(500).json({ success: false, errors: 'Email service unavailable, please try again' });
    }
    return res.status(200).json({ success: true, message: 'Validation code sent successfully' });
  } catch {
    return res.status(500).json({ success: false, errors: 'An unexpected error occurred' });
  }
};

// ─── Forgot password: send validation code email ──────────────────────────────

export const sendForgotPasswordEmail = async (req: Request<ForgotPasswordParams, any, SignupBody>, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, errors: ['Please send a valid email'] });
    return;
  }

  // BUG FIX: was missing await — a Mongoose Query object is always truthy
  if (id) {
    const existingCode = await EmailValidation.findById(id).lean();
    if (!existingCode) {
      res.status(401).json({ success: false, errors: ['Code expired, please go back and send another email'] });
      return;
    }
  }

  const normalizedEmail = validator.normalizeEmail(email, { gmail_remove_dots: false }) || email;

  try {
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (!existingUser) {
      // Return the same success response to prevent user enumeration
      res.status(200).json({ success: true, message: 'If an account with that email exists, a recovery email has been sent' });
      return;
    }
    if (existingUser.source !== 'local') {
      // Prevent user enumeration: return same generic response for non-local accounts
      res.status(200).json({ success: true, message: 'If an account with that email exists, a recovery email has been sent' });
      return;
    }
  } catch {
    res.status(500).json({ success: false, errors: 'Internal error on email verification' });
    return;
  }

  try {
    await EmailValidation.deleteMany({ email: normalizedEmail });
  } catch {
    res.status(500).json({ success: false, errors: 'Internal error deleting existing codes' });
    return;
  }

  const emailSentID = await sendValidationCode(senderEmail, normalizedEmail);
  if (!emailSentID) {
    res.status(500).json({ success: false, errors: 'Internal error while sending email, please try again' });
    return;
  }

  res.status(200).json({ success: true, message: 'Email sent successfully', emailSentID });
};

// ─── Shared: validate a code from EmailValidation collection ─────────────────
// Returns the normalised email on success, or sends the error response itself.

async function validateCode(
  email: string,
  validationCode: string,
  res: Response,
): Promise<string | null> {
  const dbDoc = await EmailValidation.findOneAndUpdate(
    { email },
    { $inc: { validationTries: 1 } },
    { new: true },
  );

  if (!dbDoc) {
    res.status(410).json({ success: false, errors: 'The validation code has expired, please request another one' });
    return null;
  }

  if (dbDoc.validationTries >= 5) {
    await EmailValidation.deleteOne({ email });
    res.status(429).json({ success: false, errors: 'Maximum validation attempts exceeded, please request a new code' });
    return null;
  }

  if (dbDoc.validationCode !== validationCode) {
    res.status(401).json({ success: false, errors: 'Invalid validation code' });
    return null;
  }

  // Code is valid — delete it now so it cannot be replayed
  await EmailValidation.deleteOne({ email });

  return email;
}

// ─── Validate code (forgot-password flow) — issues a secure reset token ──────
//
// Security model:
//  1. The email validation code (OTP) is verified and immediately consumed.
//  2. A 256-bit cryptographically random reset token is generated.
//  3. Only the SHA-256 hash of the token is stored in the DB (15-min TTL).
//  4. The raw token is returned to the client ONE TIME.
//  5. The subsequent changePassword endpoint verifies the token by hashing the
//     submitted value and comparing against the stored hash — then deletes it.
//  This means knowledge of a MongoDB ObjectId alone cannot change any password.

export const checkValidationCodeEmail = async (req: Request<{}, any, EmailValidationCodeBody>, res: Response) => {
  let { email, validationCode } = req.body ?? ({} as EmailValidationCodeBody);
  email = email.toLowerCase();

  if (!email || !validationCode) {
    res.status(400).json({ success: false, errors: 'Missing required fields' });
    return;
  }

  try {
    const validated = await validateCode(email, validationCode, res);
    if (!validated) return;

    const user = await User.findOne({ email }).lean();
    if (!user) {
      res.status(404).json({ success: false, errors: 'User not found' });
      return;
    }

    // Delete any previous unused reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate a new single-use reset token
    const { raw, hash } = generateResetToken();
    await PasswordResetToken.create({ userId: user._id, tokenHash: hash });

    // Return the raw token (never stored) — client must present it to changePassword
    res.status(200).json({ success: true, message: 'Email validated successfully', resetToken: raw });
  } catch {
    res.status(500).json({ success: false, errors: 'Internal server error' });
  }
};

// ─── Validate code (sign-up flow) ─────────────────────────────────────────────

export const checkSignupEmailValidationCode = async (req: Request<{}, any, EmailValidationCodeBody>, res: Response) => {
  let { email, validationCode } = req.body ?? ({} as EmailValidationCodeBody);
  email = email.toLowerCase();

  if (!email || !validationCode) {
    res.status(400).json({ success: false, errors: 'Missing required fields' });
    return;
  }

  try {
    const validated = await validateCode(email, validationCode, res);
    if (!validated) return;

    res.status(200).json({ success: true, message: 'Email validated successfully' });
  } catch {
    res.status(500).json({ success: false, errors: 'Internal server error' });
  }
};

// ─── Sign up ──────────────────────────────────────────────────────────────────

export const postSignup = async (req: Request<{}, any, SignupBody>, res: Response, next: NextFunction) => {
  try {
    const { email, name, password, confirmPassword } = req.body ?? ({} as SignupBody);

    const signUpValidation = new SignUpUserValidator(email, password, confirmPassword || password);
    const errors = signUpValidation.checkValidation();

    if (errors.length) {
      return res.status(422).json({ success: false, message: 'Validation failed', errors });
    }

    const normalizedEmail = validator.normalizeEmail(email, { gmail_remove_dots: false }) || email;

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, errors: 'User already exists' });
    }

    const user = new User({ email: normalizedEmail, password, name });
    await user.save();

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: { _id: user._id, email: user.email, name: user.name },
      });
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, errors: 'User already exists' });
    }
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const postLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const loginValidation = new LoginUserValidator(email, password);
  const errors = loginValidation.checkValidation();

  if (errors.length) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  passport.authenticate('local', (err: string, user: UserDocument, info: { message?: string }) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials', errors: info.message || 'Authentication failed' });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      // BUG FIX: was setting lastLogin but never saving — write is now persisted
      User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch((e) =>
        console.error('[postLogin] Failed to update lastLogin:', e),
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          profilePhoto: user.profilePhoto,
        },
      });
    });
  })(req, res, next);
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ success: false, message: 'Logout failed', errors: ['Failed to destroy session'] });
      }
      req.user = undefined;
      res.status(200).json({ success: true, message: 'Logout successful' });
    });
  });
};

// ─── Get current user ─────────────────────────────────────────────────────────

export const getUser = (req: Request, res: Response) => {
  // req.user is already populated by passport deserializeUser — no extra DB fetch needed
  const { _id, email, name, profilePhoto } = req.user as UserDocument;
  res.status(200).json({ success: true, message: 'User retrieved successfully', user: { _id, email, name, profilePhoto } });
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export const googleAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

export const googleAuthCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', (err: any, user: UserDocument, info: any) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, errors: [info?.message ?? 'Authentication failed'] });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect(frontEndUrl);
    });
  })(req, res, next);
};

// ─── Change password (forgot-password flow — requires reset token) ────────────
//
// The client must supply the raw `resetToken` returned by checkValidationCodeEmail.
// We hash it and look up the stored hash. If found and unexpired (TTL enforced by
// MongoDB), the password is changed and the token document is deleted (single-use).

export const changeForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { newPassword, confirmPassword, resetToken } = req.body;

  if (!resetToken) {
    res.status(400).json({ success: false, errors: 'Reset token is required' });
    return;
  }

  const passwordValidator = new ChangePasswordValidator(newPassword, confirmPassword);
  const errors = passwordValidator.checkValidation();
  if (errors.length) {
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  // Hash the submitted raw token for DB lookup
  const tokenHash = hashResetToken(resetToken);
  const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

  if (!tokenDoc) {
    // Token not found — either it expired (TTL), was already used, or is invalid.
    // Return a generic message to prevent oracle attacks.
    res.status(401).json({ success: false, errors: 'Reset link is invalid or has expired. Please request a new one.' });
    return;
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    res.status(404).json({ success: false, errors: 'User not found' });
    return;
  }
  if (user.source !== 'local') {
    res.status(403).json({ success: false, errors: `This account uses ${user.source} authentication` });
    return;
  }

  // Consume the token immediately (single-use enforcement)
  await PasswordResetToken.deleteOne({ _id: tokenDoc._id });

  user.password = newPassword;
  await user.save();

  // Return success without creating a full session. The user must log in normally.
  // This avoids privilege escalation via a compromised reset token.
  res.status(200).json({ success: true, message: 'Password changed successfully. Please log in with your new password.' });
};

// ─── Change password (logged in) ──────────────────────────────────────────────

export const changeUserLoggedInPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { newPassword, confirmPassword, currentPassword } = req.body;
  const userId = req.user?._id;

  const passwordValidator = new ChangePasswordValidator(newPassword, confirmPassword);
  const errors = passwordValidator.checkValidation();
  if (errors.length) {
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ success: false, errors: 'New password must be different from current password' });
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, errors: 'User not found' });
    return;
  }
  if (user.source !== 'local') {
    res.status(403).json({ success: false, errors: `Accounts using ${user.source} authentication cannot change passwords` });
    return;
  }

  try {
    const isMatch = await new Promise<boolean>((resolve, reject) => {
      user.comparePassword(currentPassword, (err, match) => {
        if (err) return reject(err);
        resolve(!!match);
      });
    });

    if (!isMatch) {
      return res.status(401).json({ success: false, errors: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: { _id: user._id, email: user.email, name: user.name, profilePhoto: user.profilePhoto },
    });
  } catch {
    res.status(500).json({ success: false, errors: 'Internal error' });
  }
};
