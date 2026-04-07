/**
 * Real Email Notifications via Resend
 * Uses Penguin Alley's production Resend infrastructure.
 * Branded HTML emails for incident lifecycle events.
 */
import { Resend } from 'resend';
import { log } from './logger';

// Lazy initialization — Resend constructor throws if key is empty at build time
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.RESEND_FROM || 'SRE Agent <hello@penguinalley.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function brandedHtml(title: string, body: string, accentColor: string = '#E53935'): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Calibri,'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;">
  <div style="background:#1a1a2e;padding:16px 24px;text-align:left;">
    <span style="color:#ffffff;font-size:16px;font-weight:bold;">🔴 SRE Agent</span>
    <span style="color:#888;font-size:12px;margin-left:8px;">Multi-Agent Incident Response</span>
  </div>
  <div style="height:4px;background:${accentColor};"></div>
  <div style="background:#ffffff;padding:24px;">
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;font-size:18px;">${title}</h2>
    ${body}
  </div>
  <div style="padding:12px 24px;text-align:center;color:#888;font-size:11px;">
    SRE Agent — A <a href="https://penguinalley.com" style="color:#E53935;text-decoration:none;">Penguin Alley</a> System | AgentX Hackathon 2026
  </div>
</div></body></html>`;
}

function severityBadge(severity: string): string {
  const colors: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#2563eb' };
  const color = colors[severity] || '#6b7280';
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${severity.toUpperCase()}</span>`;
}

export async function sendEngineerAssignment(to: string, incident: {
  id: number; title: string; severity: string; component: string;
  hypothesis?: string; suggestedFix?: string; team: string;
}): Promise<boolean> {
  try {
    const body = `
      <p style="color:#333;">You've been assigned to investigate this incident:</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:6px 0;color:#666;width:120px;">Incident</td><td style="padding:6px 0;font-weight:bold;">#SRE-${incident.id}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Severity</td><td style="padding:6px 0;">${severityBadge(incident.severity)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Component</td><td style="padding:6px 0;">${incident.component}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Team</td><td style="padding:6px 0;">${incident.team}</td></tr>
      </table>
      <p style="color:#333;"><strong>Title:</strong> ${incident.title}</p>
      ${incident.hypothesis ? `<p style="color:#333;"><strong>Root Cause Hypothesis:</strong> ${incident.hypothesis}</p>` : ''}
      ${incident.suggestedFix ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:12px 0;"><strong>Suggested Fix:</strong> ${incident.suggestedFix}</div>` : ''}
      <a href="${APP_URL}" style="display:inline-block;background:#E53935;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px;">Open Dashboard</a>`;

    const client = getResend();
    if (!client) { log('WARN', 'email_skip', incident.id, 'Resend not configured — skipping email'); return false; }
    await client.emails.send({ from: FROM, to, subject: `[SRE-${incident.id}] ${incident.severity.toUpperCase()}: ${incident.title}`, html: brandedHtml(`Incident Assigned — ${incident.title}`, body) });
    log('INFO', 'email_sent', incident.id, `Engineer assignment email sent to ${to}`, { agent: 'router' });
    return true;
  } catch (error) {
    log('ERROR', 'email_failed', incident.id, `Failed to send engineer email to ${to}: ${error}`, { agent: 'router' });
    return false;
  }
}

export async function sendEscalation(to: string, incident: {
  id: number; title: string; severity: string; component: string; team: string;
}): Promise<boolean> {
  try {
    const body = `
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin:0 0 16px 0;">
        <strong style="color:#dc2626;">ESCALATION — Immediate attention required</strong>
      </div>
      <p style="color:#333;">${severityBadge(incident.severity)} incident on <strong>${incident.component}</strong> has been escalated to your team.</p>
      <p style="color:#333;"><strong>${incident.title}</strong></p>
      <p style="color:#333;">An engineer has been assigned. Review the incident dashboard for full analysis.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px;">Open Dashboard</a>`;

    const client = getResend();
    if (!client) { log('WARN', 'email_skip', incident.id, 'Resend not configured — skipping email'); return false; }
    await client.emails.send({ from: FROM, to, subject: `🔴 ESCALATION [SRE-${incident.id}]: ${incident.title}`, html: brandedHtml(`Escalation — ${incident.title}`, body, '#dc2626') });
    log('INFO', 'email_sent', incident.id, `Escalation email sent to ${to}`, { agent: 'router' });
    return true;
  } catch (error) {
    log('ERROR', 'email_failed', incident.id, `Failed to send escalation to ${to}: ${error}`, { agent: 'router' });
    return false;
  }
}

export async function sendReporterAcknowledgment(to: string, incident: {
  id: number; title: string; severity: string; team: string; ticketId: number;
}): Promise<boolean> {
  try {
    const body = `
      <p style="color:#333;">Your incident report has been received and processed by our AI-powered SRE Agent pipeline.</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:6px 0;color:#666;width:120px;">Ticket</td><td style="padding:6px 0;font-weight:bold;">#SRE-${incident.ticketId}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Severity</td><td style="padding:6px 0;">${severityBadge(incident.severity)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Assigned to</td><td style="padding:6px 0;">${incident.team}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Status</td><td style="padding:6px 0;">🔍 Investigating</td></tr>
      </table>
      <p style="color:#333;">You will receive an update when this incident is resolved.</p>`;

    const client = getResend();
    if (!client) { log('WARN', 'email_skip', incident.id, 'Resend not configured — skipping email'); return false; }
    await client.emails.send({ from: FROM, to, subject: `[SRE-${incident.ticketId}] Received: ${incident.title}`, html: brandedHtml(`Incident Acknowledged — ${incident.title}`, body, '#2563eb') });
    log('INFO', 'email_sent', incident.id, `Reporter acknowledgment sent to ${to}`, { agent: 'router' });
    return true;
  } catch (error) {
    log('ERROR', 'email_failed', incident.id, `Failed to send acknowledgment to ${to}: ${error}`, { agent: 'router' });
    return false;
  }
}

export async function sendResolutionEmail(to: string, incident: {
  id: number; title: string; ticketId?: number;
}): Promise<boolean> {
  try {
    const body = `
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:0 0 16px 0;">
        <strong style="color:#22c55e;">✅ RESOLVED</strong>
      </div>
      <p style="color:#333;">Incident <strong>${incident.title}</strong> has been resolved.</p>
      <p style="color:#333;">Ticket #SRE-${incident.ticketId || incident.id} is now closed. If you experience further issues, please submit a new incident report.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px;">View Resolution</a>`;

    const client = getResend();
    if (!client) { log('WARN', 'email_skip', incident.id, 'Resend not configured — skipping email'); return false; }
    await client.emails.send({ from: FROM, to, subject: `✅ Resolved: ${incident.title}`, html: brandedHtml(`Incident Resolved — ${incident.title}`, body, '#22c55e') });
    log('INFO', 'email_sent', incident.id, `Resolution email sent to ${to}`, { agent: 'router' });
    return true;
  } catch (error) {
    log('ERROR', 'email_failed', incident.id, `Failed to send resolution to ${to}: ${error}`, { agent: 'router' });
    return false;
  }
}
