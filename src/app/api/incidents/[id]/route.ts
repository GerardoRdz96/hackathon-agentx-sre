import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { incidents, tickets, traces, notifications } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
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

    const incidentTickets = db.select().from(tickets).where(eq(tickets.incident_id, incidentId)).all();
    const incidentTraces = db.select().from(traces).where(eq(traces.incident_id, incidentId)).all();
    const incidentNotifications = db.select().from(notifications).where(eq(notifications.incident_id, incidentId)).all();

    return NextResponse.json({
      incident,
      tickets: incidentTickets,
      traces: incidentTraces,
      notifications: incidentNotifications,
    });
  } catch (error) {
    console.error('Failed to get incident:', error);
    return NextResponse.json({ error: 'Failed to get incident' }, { status: 500 });
  }
}
