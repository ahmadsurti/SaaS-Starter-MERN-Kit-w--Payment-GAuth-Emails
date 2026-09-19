import * as nodemailer from 'nodemailer';
import type { IEmailSender, SendMailProps } from './types';

/**
 * Generic SMTP sender — development / testing provider.
 *
 * Configure via environment variables:
 *   SMTP_HOST      e.g. localhost (MailHog) or sandbox.smtp.mailtrap.io
 *   SMTP_PORT      e.g. 1025 (MailHog) or 2525 (Mailtrap)
 *   SMTP_USER      SMTP username (leave blank for MailHog)
 *   SMTP_PASSWORD  SMTP password (leave blank for MailHog)
 *   SMTP_FROM      Default from address, e.g. no-reply@localhost
 *   SMTP_SECURE    'true' for TLS (port 465), 'false' otherwise (default)
 */
export class SmtpSender implements IEmailSender {
  private transport: nodemailer.Transporter;

  constructor() {
    const secure = process.env.SMTP_SECURE === 'true';
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure,
      // Only supply auth when credentials are provided (MailHog needs none)
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          }
        : {}),
    });
  }

  async send({ sender, recipient, subject, text, html }: SendMailProps): Promise<unknown> {
    const from = sender || process.env.SMTP_FROM || 'no-reply@localhost';
    const info = await this.transport.sendMail({
      from,
      to: recipient,
      subject,
      text,
      html,
    });
    console.log(`[SMTP] Message sent: ${info.messageId}`);
    return info;
  }
}
