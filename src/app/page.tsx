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
        {/* Top Section: Form + Recent Incidents (action-first layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <IncidentForm />
          </div>
          <div className="lg:col-span-2">
            <IncidentDashboard incidents={allIncidents} />
          </div>
        </div>

        {/* System Observability Dashboard (below the action area) */}
        <MetricsDashboard />
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

    // P6: Pre-seed with realistic incidents if DB is empty
    const count = dbModule.sqlite.prepare('SELECT COUNT(*) as cnt FROM incidents').get();
    if (count && count.cnt === 0) {
      dbModule.sqlite.exec(`
        -- Seed Incident 1: Critical payment failure (resolved)
        INSERT INTO incidents (id, title, description, severity, component, type, status, reporter_email, created_at)
        VALUES (1, 'Stripe webhook timeout causing payment failures', 'Since 2:30 AM, approximately 30% of payment webhooks from Stripe are timing out after 10 seconds. Customers see "Payment Processing" spinner indefinitely. Error rate spiked from 0.1% to 31%. Affects checkout flow on all products. Revenue impact estimated at $2,000/minute.', 'critical', 'webhooks', 'availability', 'resolved', 'sarah@medusa-store.com', datetime('now', '-2 hours'));

        INSERT INTO traces VALUES (1, 1, 'triage', 'Title: Stripe webhook timeout', 'Severity: critical, Component: webhooks, Type: availability', 920, datetime('now', '-2 hours'));
        INSERT INTO traces VALUES (2, 1, 'code-analyst', 'Component: webhooks', 'Found 10 files, 10 concerns, likelihood: high', 6280, datetime('now', '-2 hours'));
        INSERT INTO traces VALUES (3, 1, 'log-analyst', 'Component: webhooks, Type: availability', 'Found 4 patterns, 20 entries, correlation: 1', 8540, datetime('now', '-2 hours'));
        INSERT INTO traces VALUES (4, 1, 'hypothesis', 'Triage: critical/webhooks', 'Generated 3 hypotheses, top confidence: 0.95', 7120, datetime('now', '-2 hours'));
        INSERT INTO traces VALUES (5, 1, 'router', 'Component: webhooks, Severity: critical', 'Ticket #1 → payments-backend (sarah@medusa-store.com), 3 notifications', 2, datetime('now', '-2 hours'));

        INSERT INTO tickets VALUES (1, 1, 'payments-backend', 'Webhook handler deployment introduced timeout issues and missing idempotency checks causing payment processing failures', '{"rank":1,"confidence":0.95,"description":"Recent webhook handler deployment (commit a3f8c2d) introduced database timeout issues and missing idempotency checks causing webhook processing failures and resource exhaustion.","evidence":["Webhook handler update deployed at 2:30 AM","Database connection pool exhaustion (20/20)","Payment failure rate at 31%"],"blast_radius":"All payment processing and order creation"}', 'Rollback commit a3f8c2d and add database timeouts plus idempotency checks', 'resolved', 'sarah@medusa-store.com', datetime('now', '-2 hours'));

        INSERT INTO notifications VALUES (1, 1, 'assignment', 'sarah@medusa-store.com', '[CRITICAL] Incident #1 assigned to you. Component: webhooks.', datetime('now', '-2 hours'));
        INSERT INTO notifications VALUES (2, 1, 'escalation', 'payments-lead@medusa-store.com', '[ESCALATION] CRITICAL incident #1 on webhooks. Blast radius: All payment processing.', datetime('now', '-2 hours'));
        INSERT INTO notifications VALUES (3, 1, 'resolution', 'sarah@medusa-store.com', 'Incident #1 has been resolved. Thank you for reporting.', datetime('now', '-1 hour'));

        -- Seed Incident 2: Medium search performance (open)
        INSERT INTO incidents (id, title, description, severity, component, type, status, reporter_email, created_at)
        VALUES (2, 'Product search returning stale results after inventory update', 'Search results still show out-of-stock products for 15-20 minutes after inventory depletion. Elasticsearch index refresh interval may be too long. Affecting customer experience on high-traffic categories.', 'medium', 'search', 'performance', 'investigating', 'devops@medusa-store.com', datetime('now', '-45 minutes'));

        INSERT INTO traces VALUES (6, 2, 'triage', 'Title: Product search stale results', 'Severity: medium, Component: search, Type: performance', 780, datetime('now', '-45 minutes'));
        INSERT INTO traces VALUES (7, 2, 'code-analyst', 'Component: search', 'Found 8 files, 6 concerns, likelihood: medium', 5900, datetime('now', '-45 minutes'));
        INSERT INTO traces VALUES (8, 2, 'log-analyst', 'Component: search, Type: performance', 'Found 3 patterns, 15 entries, correlation: 0.8', 7200, datetime('now', '-45 minutes'));
        INSERT INTO traces VALUES (9, 2, 'hypothesis', 'Triage: medium/search', 'Generated 2 hypotheses, top confidence: 0.85', 6800, datetime('now', '-45 minutes'));
        INSERT INTO traces VALUES (10, 2, 'router', 'Component: search, Severity: medium', 'Ticket #2 → search-team (devops@medusa-store.com), 1 notification', 2, datetime('now', '-45 minutes'));

        INSERT INTO tickets VALUES (2, 2, 'search-team', 'Elasticsearch index refresh interval causing stale product search results after inventory changes', '{"rank":1,"confidence":0.85,"description":"Elasticsearch refresh_interval set to 30s default, causing visible staleness during high-frequency inventory updates.","evidence":["Index refresh interval is default 30s","Inventory webhook not triggering force refresh","Cache TTL mismatch between API and search"],"blast_radius":"Customer-facing search on high-traffic categories"}', 'Reduce refresh_interval to 5s for inventory index and add force-refresh webhook on stock changes', 'open', 'devops@medusa-store.com', datetime('now', '-45 minutes'));

        INSERT INTO notifications VALUES (4, 2, 'assignment', 'devops@medusa-store.com', '[MEDIUM] Incident #2 assigned to you. Component: search.', datetime('now', '-45 minutes'));
      `);
    }
  } catch {
    // Tables already exist or seed already ran
  }
}
