import { NextResponse } from 'next/server';
import { 
  getNotificationSettings, 
  upsertNotificationSetting 
} from '@/lib/db';

export async function GET() {
  try {
    const settings = getNotificationSettings();
    
    // Return current settings with config status (hide secrets)
    const channels = [
      {
        channel: 'email',
        enabled: settings.find(s => s.channel === 'email')?.enabled ?? false,
        configured: !!(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL),
        requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'NOTIFY_EMAIL'],
      },
      {
        channel: 'webhook',
        enabled: settings.find(s => s.channel === 'webhook')?.enabled ?? false,
        configured: !!process.env.NOTIFY_WEBHOOK_URL,
        requiredEnvVars: ['NOTIFY_WEBHOOK_URL'],
      },
      {
        channel: 'telegram',
        enabled: settings.find(s => s.channel === 'telegram')?.enabled ?? false,
        configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        requiredEnvVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      },
    ];

    return NextResponse.json({ success: true, data: channels });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { channel, enabled } = body;

    if (!channel || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    upsertNotificationSetting(channel, enabled, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
