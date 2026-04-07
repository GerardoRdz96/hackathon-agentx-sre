import { db } from '../db';
import { tickets, notifications } from '../schema';
import { startTrace, endTrace } from '../traces';
import { logAgentStart, logAgentEnd, logTicketCreated, logNotification } from '../logger';
import { recordAgentDuration } from '../metrics';
import { sendEngineerAssignment, sendEscalation, sendReporterAcknowledgment } from '../email';
import { sendTelegramAlert } from '../telegram';
import type { TriageResult } from './triage';
import type { HypothesisResult } from './hypothesis';

export interface RouterInput {
  incidentId: number;
  triage: TriageResult;
  hypothesisResult: HypothesisResult;
  reporterEmail?: string;
}

export interface RouterResult {
  ticket_id: number;
  team: string;
  assigned_to: string;
  notifications_sent: Array<{
    type: string;
    recipient: string;
    message: string;
  }>;
}

// Team assignment based on component and severity
const TEAM_MAP: Record<string, { team: string; oncall: string }> = {
  payments: { team: 'payments-team', oncall: 'sarah@medusa-store.com' },
  inventory: { team: 'fulfillment-team', oncall: 'marcus@medusa-store.com' },
  auth: { team: 'platform-team', oncall: 'alex@medusa-store.com' },
  webhooks: { team: 'integrations-team', oncall: 'sarah@medusa-store.com' },
  api: { team: 'platform-team', oncall: 'alex@medusa-store.com' },
  database: { team: 'infrastructure-team', oncall: 'carlos@medusa-store.com' },
  frontend: { team: 'frontend-team', oncall: 'emma@medusa-store.com' },
  infrastructure: { team: 'infrastructure-team', oncall: 'carlos@medusa-store.com' },
};

export async function runRouterAgent(input: RouterInput): Promise<RouterResult> {
  logAgentStart(input.incidentId, 'router');
  const agentStart = performance.now();
  const traceKey = startTrace(input.incidentId, 'router', `Component: ${input.triage.component}, Severity: ${input.triage.severity}`);

  try {
    const topHypothesis = input.hypothesisResult.hypotheses[0];
    const teamInfo = TEAM_MAP[input.triage.component] || TEAM_MAP.api;

    // Confidence-weighted escalation: if triage confidence is low, auto-escalate
    let effectiveSeverity = input.triage.severity;
    let escalationReason: string | null = null;
    if (input.triage.confidence < 0.5 && !['critical', 'high'].includes(input.triage.severity)) {
      effectiveSeverity = 'high';
      escalationReason = `Auto-escalated: triage confidence ${(input.triage.confidence * 100).toFixed(0)}% below threshold (50%)`;
    }

    // Create ticket
    const ticketResult = db.insert(tickets).values({
      incident_id: input.incidentId,
      team: teamInfo.team,
      summary: topHypothesis?.description || 'Incident requires investigation',
      hypothesis: topHypothesis ? JSON.stringify(topHypothesis) : null,
      suggested_fix: topHypothesis?.suggested_fix || null,
      status: 'open',
      assigned_to: teamInfo.oncall,
    }).returning().get();
    logTicketCreated(input.incidentId, ticketResult.id, teamInfo.team, teamInfo.oncall);

    // Send notifications
    const notificationsList: RouterResult['notifications_sent'] = [];

    // Notify assigned engineer (DB + real email)
    const engineerNotif = {
      type: 'assignment',
      recipient: teamInfo.oncall,
      message: `[${effectiveSeverity.toUpperCase()}] Incident #${input.incidentId} assigned to you. Component: ${input.triage.component}. ${topHypothesis?.description || 'Investigation needed.'}${escalationReason ? ' (' + escalationReason + ')' : ''}`,
    };
    db.insert(notifications).values({ incident_id: input.incidentId, ...engineerNotif }).run();
    logNotification(input.incidentId, engineerNotif.type, engineerNotif.recipient);
    notificationsList.push(engineerNotif);

    // Real email — fire and forget (don't block pipeline)
    sendEngineerAssignment(teamInfo.oncall, {
      id: input.incidentId, title: engineerNotif.message, severity: input.triage.severity,
      component: input.triage.component, team: teamInfo.team,
      hypothesis: topHypothesis?.description, suggestedFix: topHypothesis?.suggested_fix,
    }).catch(() => {});

    // For critical/high severity (or auto-escalated), notify team lead (DB + real email + Telegram)
    if (effectiveSeverity === 'critical' || effectiveSeverity === 'high') {
      const escalationNotif = {
        type: 'escalation',
        recipient: `${teamInfo.team}-lead@medusa-store.com`,
        message: `[ESCALATION] ${effectiveSeverity.toUpperCase()} incident #${input.incidentId} on ${input.triage.component}. Blast radius: ${topHypothesis?.blast_radius || 'unknown'}${escalationReason ? '. ' + escalationReason : ''}`,
      };
      db.insert(notifications).values({ incident_id: input.incidentId, ...escalationNotif }).run();
      logNotification(input.incidentId, escalationNotif.type, escalationNotif.recipient);
      notificationsList.push(escalationNotif);

      // Real email + Telegram for escalations
      sendEscalation(escalationNotif.recipient, {
        id: input.incidentId, title: topHypothesis?.description || 'Incident requires investigation',
        severity: input.triage.severity, component: input.triage.component, team: teamInfo.team,
      }).catch(() => {});
      sendTelegramAlert({
        id: input.incidentId, title: topHypothesis?.description || 'Incident requires investigation',
        severity: input.triage.severity, component: input.triage.component,
        team: teamInfo.team, assignedTo: teamInfo.oncall,
        hypothesis: topHypothesis?.description,
      }).catch(() => {});
    }

    // Notify reporter if email provided (DB + real email)
    if (input.reporterEmail) {
      const reporterNotif = {
        type: 'acknowledgment',
        recipient: input.reporterEmail,
        message: `Your incident report has been received and assigned to the ${teamInfo.team}. Ticket #${ticketResult.id}. We're investigating.`,
      };
      db.insert(notifications).values({ incident_id: input.incidentId, ...reporterNotif }).run();
      logNotification(input.incidentId, reporterNotif.type, reporterNotif.recipient);
      notificationsList.push(reporterNotif);

      // Real email to reporter
      sendReporterAcknowledgment(input.reporterEmail, {
        id: input.incidentId, title: topHypothesis?.description || 'Incident under investigation',
        severity: input.triage.severity, team: teamInfo.team, ticketId: ticketResult.id,
      }).catch(() => {});
    }

    const result: RouterResult = {
      ticket_id: ticketResult.id,
      team: teamInfo.team,
      assigned_to: teamInfo.oncall,
      notifications_sent: notificationsList,
    };

    endTrace(traceKey, `Ticket #${result.ticket_id} → ${result.team} (${result.assigned_to}), ${result.notifications_sent.length} notifications`);
    const dur = performance.now() - agentStart;
    logAgentEnd(input.incidentId, 'router', dur, `ticket_id=${result.ticket_id} team=${result.team}`);
    recordAgentDuration('router', dur);
    return result;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
