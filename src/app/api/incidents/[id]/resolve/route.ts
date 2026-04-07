import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { incidents, tickets, notifications } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { sendResolutionEmail } from '@/lib/email';
import { logResolved } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = parseInt(id, 10);
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const incident = db.select().from(incidents).where(eq(incidents.id, incidentId)).get();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Update incident status
    db.update(incidents).set({ status: 'resolved' }).where(eq(incidents.id, incidentId)).run();

    // Update all tickets for this incident
    db.update(tickets).set({ status: 'resolved' }).where(eq(tickets.incident_id, incidentId)).run();

    // Send resolution notification to reporter
    const notificationsSent: Array<{ type: string; recipient: string; message: string }> = [];

    if (incident.reporter_email) {
      const notif = {
        type: 'resolution',
        recipient: incident.reporter_email,
        message: `Incident #${incidentId} "${incident.title}" has been resolved. Thank you for reporting.`,
      };
      db.insert(notifications).values({ incident_id: incidentId, ...notif }).run();
      notificationsSent.push(notif);

    }

    // Notify assigned engineers
    const incidentTickets = db.select().from(tickets).where(eq(tickets.incident_id, incidentId)).all();

    // Real email to reporter (after tickets query so we have ticketId)
    if (incident.reporter_email) {
      sendResolutionEmail(incident.reporter_email, {
        id: incidentId, title: incident.title, ticketId: incidentTickets[0]?.id,
      }).catch(() => {});
    }
    logResolved(incidentId);
    for (const ticket of incidentTickets) {
      if (ticket.assigned_to) {
        const notif = {
          type: 'resolution',
          recipient: ticket.assigned_to,
          message: `Incident #${incidentId} has been marked as resolved.`,
        };
        db.insert(notifications).values({
          incident_id: incidentId,
          ...notif,
        }).run();
        notificationsSent.push(notif);
      }
    }

    return NextResponse.json({
      status: 'resolved',
      incident_id: incidentId,
      notifications_sent: notificationsSent,
    });
  } catch (error) {
    console.error('Failed to resolve incident:', error);
    return NextResponse.json({ error: 'Failed to resolve incident' }, { status: 500 });
  }
}
