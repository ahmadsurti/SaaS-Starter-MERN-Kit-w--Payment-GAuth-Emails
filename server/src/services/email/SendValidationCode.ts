import crypto from 'crypto';
import EmailValidation from '../../models/EmailValidationModel';
import { MailgunSender } from './MailgunSender';
import { SmtpSender } from './mailSender';
import type { IEmailSender } from './types';
import { ValidationCodeEmailTemplate } from './ValidationCodeEmailTemplate';

/**
 * Provider selection via EMAIL_PROVIDER env var.
 *   EMAIL_PROVIDER=mailgun  → MailgunSender (production)
 *   EMAIL_PROVIDER=smtp     → SmtpSender (development / testing)
 *
 * Defaults to 'mailgun' when not set.
 */
function getEmailSender(): IEmailSender {
  const provider = process.env.EMAIL_PROVIDER ?? 'mailgun';
  if (provider === 'smtp') return new SmtpSender();
  return new MailgunSender();
}

export default async function sendValidationCode(
  senderEmail: string,
  userEmail: string,
): Promise<string | false> {
  try {
    // OWASP ASVS V2.2.2: Cryptographically secure random integer for OTP
    const validationCode = crypto.randomInt(1000, 10000).toString();

    const validationDocument = await EmailValidation.create({
      email: userEmail,
      validationCode,
    });

    const html = ValidationCodeEmailTemplate.generateTemplate(validationCode);
    const text = ValidationCodeEmailTemplate.generateTextTemplate(validationCode);

    const sender = getEmailSender();
    await sender.send({
      sender: senderEmail,
      recipient: userEmail,
      subject: `${validationCode} is your activation code`,
      html,
      text,
    });

    return validationDocument._id as string;
  } catch (error) {
    console.error('[sendValidationCode] Failed:', error);
    return false;
  }
}
