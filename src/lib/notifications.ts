import {
  Certificate,
  getNotificationSettings,
  hasNotificationBeenSent,
  recordNotification,
  clearNotificationsForCertificate,
} from './db';

export interface NotificationChannel {
  name: string;
  send(message: NotificationMessage): Promise<boolean>;
}

export interface NotificationMessage {
  title: string;
  body: string;
  domain: string;
  daysUntilExpiry: number;
  expiresAt: string;
}

// Email notification via SMTP
class EmailChannel implements NotificationChannel {
  name = 'email';

  async send(message: NotificationMessage): Promise<boolean> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const notifyEmail = process.env.NOTIFY_EMAIL;

    if (!smtpHost || !smtpUser || !smtpPass || !notifyEmail) {
      console.log('[Email] Not configured, skipping');
      return false;
    }

    try {
      // Use nodemailer if available, otherwise log
      const nodemailer = await import('nodemailer').catch(() => null);
      if (!nodemailer) {
        console.log('[Email] nodemailer not installed, skipping');
        return false;
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465',
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: smtpUser,
        to: notifyEmail,
        subject: message.title,
        text: message.body,
        html: `<h2>${message.title}</h2><p>${message.body}</p>`,
      });

      console.log(`[Email] Sent notification for ${message.domain}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed:', error);
      return false;
    }
  }
}

// Webhook notification
class WebhookChannel implements NotificationChannel {
  name = 'webhook';

  async send(message: NotificationMessage): Promise<boolean> {
    const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('[Webhook] Not configured, skipping');
      return false;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'certificate_expiring',
          domain: message.domain,
          days_until_expiry: message.daysUntilExpiry,
          expires_at: message.expiresAt,
          title: message.title,
          body: message.body,
        }),
      });

      if (response.ok) {
        console.log(`[Webhook] Sent notification for ${message.domain}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Webhook] Failed:', error);
      return false;
    }
  }
}

// Telegram notification
class TelegramChannel implements NotificationChannel {
  name = 'telegram';

  async send(message: NotificationMessage): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('[Telegram] Not configured, skipping');
      return false;
    }

    try {
      const text = `🔔 *${message.title}*\n\n${message.body}`;
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
          }),
        }
      );

      if (response.ok) {
        console.log(`[Telegram] Sent notification for ${message.domain}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Telegram] Failed:', error);
      return false;
    }
  }
}

// Notification thresholds (days before expiry)
const NOTIFICATION_THRESHOLDS = [30, 14, 7, 3, 1];

function getNotificationType(daysUntilExpiry: number): string | null {
  for (const threshold of NOTIFICATION_THRESHOLDS) {
    if (daysUntilExpiry <= threshold) {
      return `expiry_${threshold}d`;
    }
  }
  return null;
}

function getDaysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const channels: NotificationChannel[] = [
  new EmailChannel(),
  new WebhookChannel(),
  new TelegramChannel(),
];

export async function sendExpiryNotification(cert: Certificate): Promise<void> {
  if (!cert.expires_at) return;

  const daysUntilExpiry = getDaysUntilExpiry(cert.expires_at);
  const notificationType = getNotificationType(daysUntilExpiry);

  if (!notificationType) return;

  // Check if already sent
  if (hasNotificationBeenSent(cert.id, notificationType)) {
    return;
  }

  const message: NotificationMessage = {
    title: `Certificate Expiring: ${cert.domain}`,
    body: `Your SSL certificate for ${cert.domain} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} (${new Date(cert.expires_at).toLocaleDateString()}).`,
    domain: cert.domain,
    daysUntilExpiry,
    expiresAt: cert.expires_at,
  };

  // Send to all configured channels
  for (const channel of channels) {
    const sent = await channel.send(message);
    if (sent) {
      recordNotification(cert.id, notificationType, channel.name);
    }
  }
}

export function resetNotificationsAfterRenewal(certId: number): void {
  clearNotificationsForCertificate(certId);
}
