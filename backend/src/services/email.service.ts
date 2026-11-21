import { env } from '../config/env';
import logger from '../utils/logger.util';

type EmailUser = { name: string; email: string };

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function redactEmailText(text: string): string {
  return text
    .replace(/(password|pin|code|otp)[^\n:]*[:-]?\s*\S+/gi, '$1 [redacted]')
    .replace(/\b\d{4,8}\b/g, '[redacted]');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class EmailService {
  /** Sends via Resend when configured; otherwise logs the full email. Never throws. */
  async send(input: SendEmailInput): Promise<boolean> {
    if (!env.RESEND_API_KEY) {
      const safeText = redactEmailText(input.text);
      logger.info(
        `[EMAIL][CONSOLE] to=${input.to} subject="${input.subject}"\n${safeText}`
      );
      // eslint-disable-next-line no-console
      console.log(`\n[EMAIL][CONSOLE]\nTo: ${input.to}\nSubject: ${input.subject}\n\n${safeText}\n`);
      return true;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        logger.error(`Email send failed (${res.status}): ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error('Email send failed', err);
      return false;
    }
  }

  async sendWelcomeEmail(user: EmailUser, tempPassword: string): Promise<boolean> {
    const name = escapeHtml(user.name);
    const subject = 'Karibu Mwaminifu — Akaunti yako imefunguliwa / Your account is ready';
    const text = [
      `Habari ${user.name},`,
      '',
      'Akaunti yako ya Mwaminifu imefunguliwa.',
      `Email: ${user.email}`,
      `Password ya muda: ${tempPassword}`,
      '',
      'Ingia kwenye mfumo na ubadilishe password kwenye login yako ya kwanza.',
      '',
      `Hello ${user.name},`,
      '',
      'Your Mwaminifu account has been created.',
      `Email: ${user.email}`,
      `Temporary password: ${tempPassword}`,
      '',
      'Sign in and change your password on your first login.',
      '',
      'Mwaminifu ERP',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0d1b3d;max-width:560px;margin:0 auto">
        <h2 style="color:#0d1b3d">Karibu Mwaminifu / Welcome to Mwaminifu</h2>
        <p>Habari <strong>${name}</strong>,</p>
        <p>Akaunti yako imefunguliwa. Tumia taarifa hizi kuingia:</p>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:6px 12px;background:#f1f5f9"><strong>Email</strong></td><td style="padding:6px 12px">${escapeHtml(user.email)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f1f5f9"><strong>Password ya muda</strong></td><td style="padding:6px 12px"><code>${escapeHtml(tempPassword)}</code></td></tr>
        </table>
        <p>Badilisha password kwenye login yako ya kwanza.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
        <p><strong>Your Mwaminifu account is ready.</strong></p>
        <p>Email: <strong>${escapeHtml(user.email)}</strong><br/>Temporary password: <code>${escapeHtml(tempPassword)}</code></p>
        <p>Please change your password on first login.</p>
      </div>`;

    return this.send({ to: user.email, subject, text, html });
  }

  async sendPasswordResetEmail(user: EmailUser, resetLink: string): Promise<boolean> {
    const name = escapeHtml(user.name);
    const subject = 'Mwaminifu — Weka password mpya / Reset your password';
    const text = [
      `Habari ${user.name},`,
      '',
      'Tumepokea ombi la kubadilisha password yako.',
      `Bofya link hii (dakika 60): ${resetLink}`,
      'Kama hukuomba, puuza email hii.',
      '',
      `Hello ${user.name},`,
      '',
      'We received a request to reset your password.',
      `Open this link (valid 60 minutes): ${resetLink}`,
      'If you did not request this, ignore this email.',
      '',
      'Mwaminifu ERP',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0d1b3d;max-width:560px;margin:0 auto">
        <h2 style="color:#0d1b3d">Weka password mpya / Reset password</h2>
        <p>Habari <strong>${name}</strong>,</p>
        <p>Bofya kitufe hapa chini kubadilisha password. Link ni halali kwa dakika 60.</p>
        <p><a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#17b8b8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Badilisha password</a></p>
        <p style="font-size:12px;color:#64748b">${escapeHtml(resetLink)}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
        <p>We received a request to reset your password. This link is valid for 60 minutes. If you did not request it, ignore this email.</p>
      </div>`;

    return this.send({ to: user.email, subject, text, html });
  }
}

export const emailService = new EmailService();
