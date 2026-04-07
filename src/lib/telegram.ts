/**
 * Real Telegram Alerts via Bot API
 * Uses Penguin Alley's @PenguinAlleyCollaborationBot.
 * Only sends for CRITICAL/HIGH severity — no spam.
 */
import { log } from './logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function sendTelegramAlert(incident: {
  id: number;
  title: string;
  severity: string;
  component: string;
  team: string;
  assignedTo: string;
  hypothesis?: string;
}): Promise<boolean> {
  // Only alert for critical/high — don't spam
  if (!['critical', 'high'].includes(incident.severity)) return false;
  if (!BOT_TOKEN || !CHAT_ID) {
    log('WARN', 'telegram_skip', incident.id, 'Telegram not configured — skipping alert');
    return false;
  }

  const severityEmoji = incident.severity === 'critical' ? '🔴' : '🟠';

  const message = [
    `${severityEmoji} <b>SRE ALERT — ${incident.severity.toUpperCase()}</b>`,
    '',
    `<b>Incident #SRE-${incident.id}</b>`,
    `<b>Title:</b> ${escapeHtml(incident.title)}`,
    `<b>Component:</b> ${incident.component}`,
    `<b>Team:</b> ${incident.team}`,
    `<b>Assigned:</b> ${incident.assignedTo}`,
    incident.hypothesis ? `\n<b>Root Cause:</b> ${escapeHtml(incident.hypothesis)}` : '',
    '',
    `🐧 <i>Incidex — Penguin Alley</i>`,
  ].filter(Boolean).join('\n');

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} — ${error}`);
    }

    log('INFO', 'telegram_sent', incident.id, `Telegram alert sent: ${incident.severity}/${incident.component}`);
    return true;
  } catch (error) {
    log('ERROR', 'telegram_failed', incident.id, `Failed to send Telegram alert: ${error}`);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
