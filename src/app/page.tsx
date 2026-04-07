import { db } from '@/lib/db';
import { incidents, tickets, traces, notifications } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';
import { IncidentForm } from './components/incident-form';
import { IncidentList } from './components/incident-list';
import { MissionControl } from './components/mission-control';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Initialize tables on first load
  initDb();

  const allIncidents = db.select().from(incidents).orderBy(desc(incidents.created_at)).all();

  // Get the latest incident with full details for the mission control view
  const latestIncident = allIncidents[0] || null;
  let latestDetails = null;

  if (latestIncident) {
    const incidentTickets = db.select().from(tickets).where(eq(tickets.incident_id, latestIncident.id)).all();
    const incidentTraces = db.select().from(traces).where(eq(traces.incident_id, latestIncident.id)).all();
    const incidentNotifs = db.select().from(notifications).where(eq(notifications.incident_id, latestIncident.id)).all();
    latestDetails = {
      incident: latestIncident,
      tickets: incidentTickets,
      traces: incidentTraces,
      notifications: incidentNotifs,
    };
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center font-bold text-sm">
              SRE
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SRE Agent</h1>
              <p className="text-xs text-gray-500">Multi-Agent Incident Response for Medusa.js</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              5 Agents Online
            </span>
            <span>{allIncidents.length} incidents</span>
            <span className="border-l border-gray-700 pl-4 flex items-center gap-1.5">
              <span className="text-base">🐧</span>
              <span className="text-gray-400 font-medium">Penguin Alley</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Top Section: Form + Recent Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <IncidentForm />
          </div>
          <div className="lg:col-span-2">
            <IncidentList incidents={allIncidents} />
          </div>
        </div>

        {/* Mission Control: 5-panel view of latest incident */}
        {latestDetails && <MissionControl data={latestDetails} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-4 text-center text-xs text-gray-600">
        Built by PA&middot;co &mdash; A Penguin Alley System | AgentX Hackathon 2026
      </footer>
    </div>
  );
}

function initDb() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dbModule = require('@/lib/db');
    dbModule.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT,
        component TEXT,
        type TEXT,
        image_path TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        reporter_email TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL REFERENCES incidents(id),
        team TEXT NOT NULL,
        summary TEXT NOT NULL,
        hypothesis TEXT,
        suggested_fix TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS traces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL REFERENCES incidents(id),
        agent_name TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        duration_ms REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL REFERENCES incidents(id),
        type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Tables already exist
  }
}
