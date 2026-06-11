import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface DigestEmailData {
  trendTitle: string;
  trendUrl?: string;
  variations: Array<{ label: string; content: string }>;
  draftId: string;
  webUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('email.resendApiKey');
    this.from = config.get<string>('email.from') ?? 'SYNAPSE <noreply@synapse.app>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — email delivery is disabled');
    }
  }

  async sendOrgInvite(to: string, data: {
    orgName: string;
    inviterName: string;
    role: string;
    inviteToken: string;
    webUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email skipped (no API key) — would have sent org invite to ${to}`);
      return;
    }

    const acceptUrl = `${data.webUrl}/organizations/accept?token=${data.inviteToken}`;
    const expiryStr = data.expiresAt.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `${data.inviterName} invited you to ${data.orgName} on SYNAPSE`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 24px;">
    <span style="font-size:12px;font-weight:700;letter-spacing:.2em;color:#3b82f6;text-transform:uppercase">SYNAPSE</span>
    <h1 style="margin:14px 0 8px;font-size:22px;color:#f8fafc;font-weight:700;line-height:1.3">
      You're invited to join <span style="color:#3b82f6">${data.orgName}</span>
    </h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 28px">
      ${data.inviterName} has invited you as a <strong style="color:#94a3b8">${data.role}</strong>.
    </p>
    <a href="${acceptUrl}"
       style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600">
      Accept invitation →
    </a>
    <p style="color:#334155;font-size:12px;margin:24px 0 0">
      This invite expires on ${expiryStr}. If you weren't expecting this, ignore it.
    </p>
  </div>
</body>
</html>`,
    });

    if (error) throw new Error(`Resend error: ${error.message}`);
    this.logger.log(`Org invite sent to ${to} for ${data.orgName}`);
  }

  async sendDailyDigest(to: string, data: DigestEmailData): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email skipped (no API key) — would have sent digest to ${to}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Your daily LinkedIn post — ${data.trendTitle}`,
      html: this.buildHtml(data),
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(`Digest email sent to ${to}`);
  }

  private buildHtml(data: DigestEmailData): string {
    const ACCENT = ['#3b82f6', '#8b5cf6', '#06b6d4'];

    const variationsHtml = data.variations
      .map(
        (v, i) => `
      <div style="margin-bottom:20px;background:#1e293b;border-radius:10px;padding:20px 24px;border-left:3px solid ${ACCENT[i] ?? '#475569'}">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:0 0 10px 0">${v.label}</p>
        <p style="color:#e2e8f0;font-size:14px;line-height:1.75;margin:0;white-space:pre-wrap">${v.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>`,
      )
      .join('');

    const trendLink = data.trendUrl
      ? `<a href="${data.trendUrl}" style="color:#64748b;font-size:12px;text-decoration:none;">View original article ↗</a>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px;">

    <!-- Header -->
    <div style="margin-bottom:36px;">
      <span style="font-size:12px;font-weight:700;letter-spacing:.2em;color:#3b82f6;text-transform:uppercase">SYNAPSE</span>
      <h1 style="margin:10px 0 4px;font-size:24px;color:#f8fafc;font-weight:700;line-height:1.3">Your daily post is ready</h1>
      <p style="margin:0;font-size:13px;color:#64748b">
        Trending on HackerNews:
        <span style="color:#94a3b8;font-style:italic">${data.trendTitle}</span>
      </p>
    </div>

    <!-- Variations -->
    ${variationsHtml}

    <!-- CTA -->
    <div style="text-align:center;margin-top:36px;">
      <a href="${data.webUrl}/drafts/${data.draftId}"
         style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:.02em">
        Open draft in SYNAPSE →
      </a>
      <p style="margin:14px 0 4px;font-size:12px;color:#475569">
        Pick the variation you like, edit if needed, then post to LinkedIn.
      </p>
      ${trendLink}
    </div>

    <!-- Footer -->
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #1e293b;text-align:center;">
      <p style="font-size:11px;color:#334155;margin:0">
        You're receiving this because email notifications are enabled in SYNAPSE.
        <br>To stop: go to Settings → turn off Email Notifications.
      </p>
    </div>

  </div>
</body>
</html>`;
  }
}
