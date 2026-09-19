import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import type { IEmailSender, SendMailProps } from './types';

/**
 * Mailgun sender — production email provider.
 *
 * Configure via environment variables:
 *   MAILGUN_API_KEY    Mailgun private API key
 *   MAILGUN_DOMAIN     Your verified Mailgun domain, e.g. mg.yourdomain.com
 *   MAILGUN_API_URL    Optional — set to https://api.eu.mailgun.net for EU domains
 */

// ponytail: client constructed once at module load, not per send()
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string,
  ...(process.env.MAILGUN_API_URL ? { url: process.env.MAILGUN_API_URL } : {}),
});

export class MailgunSender implements IEmailSender {
  async send({ sender, recipient, subject, text, html }: SendMailProps): Promise<unknown> {
    const domain = process.env.MAILGUN_DOMAIN as string;

    return mg.messages.create(domain, {
      from: sender,
      to: [`<${recipient}>`],
      subject,
      text,
      html,
    });
  }
}
