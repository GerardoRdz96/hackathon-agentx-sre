import { db } from '@/lib/db';
import { incidents } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { IncidentForm } from './components/incident-form';
import { IncidentDashboard } from './components/incident-dashboard';
import { MetricsDashboard } from './components/metrics-dashboard';

export const dynamic = 'force-dynamic';

export default function Home() {
  initDb();

  const allIncidents = db.select().from(incidents).orderBy(desc(incidents.created_at)).all();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/incidex-icon.svg" alt="Incidex" className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Incid<span className="text-red-500">ex</span></h1>
              <p className="text-xs text-gray-500">AI-Powered SRE Agent by Penguin Alley</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              5 Agents Online
            </span>
            <span>{allIncidents.length} incidents</span>
            <span className="border-l border-gray-700 pl-4 flex items-center gap-1.5">
              <img src="/penguin-alley-icon.png" alt="Penguin Alley" className="w-5 h-5 opacity-70" />
              <span className="text-gray-400 font-medium">Penguin Alley</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* System Observability Dashboard */}
        <MetricsDashboard />

        {/* Top Section: Form + Recent Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <IncidentForm />
          </div>
          <div className="lg:col-span-2">
            {/* Incident list + Mission Control with selection */}
            <IncidentDashboard incidents={allIncidents} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-4 text-center text-xs text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <img src="/penguin-alley-icon.png" alt="Penguin Alley" className="w-4 h-4 opacity-50" />
          <span>Incidex — A <a href="https://penguinalley.com" target="_blank" rel="noopener" className="text-gray-400 hover:text-gray-300 underline">Penguin Alley</a> Product | AgentX Hackathon 2026</span>
        </div>
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
