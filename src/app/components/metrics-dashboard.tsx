'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MetricsData {
  incidents_total: number;
  incidents_by_severity: Record<string, number>;
  incidents_by_component: Record<string, number>;
  pipeline_avg_duration_ms: number;
  agent_avg_duration_ms: Record<string, number>;
  errors_total: number;
  uptime_since: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const AGENT_CONFIG: Record<string, { label: string; color: string; colorLight: string }> = {
  'triage':       { label: 'Triage',       color: '#ef4444', colorLight: '#f87171' },
  'log-analyst':  { label: 'Log Analyst',  color: '#eab308', colorLight: '#facc15' },
  'code-analyst': { label: 'Code Analyst', color: '#3b82f6', colorLight: '#60a5fa' },
  'hypothesis':   { label: 'Hypothesis',   color: '#a855f7', colorLight: '#c084fc' },
  'router':       { label: 'Router',       color: '#10b981', colorLight: '#34d399' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
};

const SEVERITY_TW: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-blue-500/20 text-blue-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatUptime(isoString: string): string {
  const start = new Date(isoString);
  if (isNaN(start.getTime())) return '--';
  const elapsed = Math.max(0, Date.now() - start.getTime());
  const s = Math.floor(elapsed / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function pipelineColor(ms: number): string {
  if (ms === 0) return 'text-gray-500';
  if (ms < 10000) return 'text-emerald-400';
  if (ms < 30000) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [uptimeStr, setUptimeStr] = useState('--');
  const [mounted, setMounted] = useState(false);

  // Polling
  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/metrics', { signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMetrics(data);
      setStale(false);
      setLoading(false);
    } catch {
      if (!signal?.aborted) { setStale(true); setLoading(false); }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics(controller.signal);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(controller.signal);
      }
    }, 10_000);

    // Trigger mount animation
    setTimeout(() => setMounted(true), 50);

    return () => { controller.abort(); clearInterval(interval); };
  }, [fetchMetrics]);

  // Uptime counter
  useEffect(() => {
    if (!metrics?.uptime_since) return;
    const update = () => setUptimeStr(formatUptime(metrics.uptime_since));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [metrics?.uptime_since]);

  // Chart data
  const agentData = useMemo(() => {
    if (!metrics?.agent_avg_duration_ms) return [];
    return Object.entries(metrics.agent_avg_duration_ms).map(([name, ms]) => ({
      name,
      label: AGENT_CONFIG[name]?.label || name,
      ms,
      color: AGENT_CONFIG[name]?.color || '#6b7280',
      colorLight: AGENT_CONFIG[name]?.colorLight || '#9ca3af',
    }));
  }, [metrics?.agent_avg_duration_ms]);

  const maxAgentMs = useMemo(() => Math.max(...agentData.map(a => a.ms), 1), [agentData]);

  const severityData = useMemo(() => {
    if (!metrics?.incidents_by_severity) return [];
    return Object.entries(metrics.incidents_by_severity)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: SEVERITY_COLORS[name] || '#4b5563' }));
  }, [metrics?.incidents_by_severity]);

  const totalSeverity = useMemo(() => severityData.reduce((sum, s) => sum + s.value, 0), [severityData]);

  const isEmpty = !metrics || (metrics.incidents_total === 0 && agentData.length === 0);

  // ─── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-900 border border-gray-800 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-56 bg-gray-900 border border-gray-800 rounded-xl" />
          <div className="h-56 bg-gray-900 border border-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Section Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Observability
        </h2>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          {stale && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" title="Data may be stale" />}
          <span className="font-mono">Auto-refresh 10s</span>
        </div>
      </div>

      {/* ─── Pipeline Heartbeat Strip ───────────────────────────────────────── */}
      <div className={`h-14 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center px-4 sm:px-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex items-center w-full">
          {Object.entries(AGENT_CONFIG).map(([key, agent], i, arr) => (
            <div key={key} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className="w-3 h-3 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isEmpty ? '#374151' : agent.color,
                    boxShadow: isEmpty ? 'none' : `0 0 8px ${agent.color}60`,
                  }}
                />
                <span className="text-[9px] font-mono text-gray-500 hidden sm:block">{agent.label}</span>
              </div>
              {/* Connecting line with pulse */}
              {i < arr.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 h-px bg-gray-700 relative overflow-hidden">
                  {!isEmpty && (
                    <div
                      className="absolute top-[-1px] w-2 h-[3px] rounded-full"
                      style={{
                        backgroundColor: agent.color,
                        boxShadow: `0 0 6px ${agent.color}`,
                        animation: `pulseTravel 2.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.5}s`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CSS Keyframes for pulse travel */}
      <style>{`
        @keyframes pulseTravel {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: calc(100% - 8px); opacity: 0; }
        }
      `}</style>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Card 1: Total Incidents */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden hover:border-gray-700 transition-all duration-200">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(239,68,68,0.06) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Total Incidents</div>
            <div className={`text-3xl font-bold font-mono ${isEmpty ? 'text-gray-600' : 'text-white'}`}>
              {metrics?.incidents_total ?? 0}
            </div>
            {!isEmpty && metrics?.incidents_by_severity && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(metrics.incidents_by_severity).filter(([,v]) => v > 0).map(([sev, count]) => (
                  <span key={sev} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${SEVERITY_TW[sev] || 'bg-gray-500/20 text-gray-400'}`}>
                    {count} {sev}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Avg Pipeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden hover:border-gray-700 transition-all duration-200">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Avg Pipeline</div>
            <div className={`text-3xl font-bold font-mono ${pipelineColor(metrics?.pipeline_avg_duration_ms ?? 0)}`}>
              {((metrics?.pipeline_avg_duration_ms ?? 0) / 1000).toFixed(1)}
              <span className="text-lg text-gray-500 ml-0.5">s</span>
            </div>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(100, ((metrics?.pipeline_avg_duration_ms ?? 0) / 60000) * 100)}%`,
                  background: `linear-gradient(90deg, #10b981, #eab308, #ef4444)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Errors */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden hover:border-gray-700 transition-all duration-200">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Errors</div>
            <div className={`text-3xl font-bold font-mono ${(metrics?.errors_total ?? 0) === 0 ? (isEmpty ? 'text-gray-600' : 'text-emerald-400') : 'text-red-400'}`}>
              {metrics?.errors_total ?? 0}
            </div>
            <div className="mt-2">
              {(metrics?.errors_total ?? 0) === 0 ? (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isEmpty ? 'bg-gray-800 text-gray-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  All Clear
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                  {metrics!.errors_total} errors detected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Uptime */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 relative overflow-hidden hover:border-gray-700 transition-all duration-200">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Uptime</div>
            <div className={`text-3xl font-bold font-mono ${isEmpty ? 'text-gray-600' : 'text-blue-400'}`}>
              {uptimeStr}
            </div>
            {metrics?.uptime_since && (
              <div className="text-[10px] font-mono text-gray-600 mt-2 truncate">
                since {new Date(metrics.uptime_since).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Charts ─────────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Agent Latency Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Agent Latency (avg ms)</span>
          </div>
          <div className="p-4">
            {agentData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-gray-600">
                Submit an incident to see agent latency data
              </div>
            ) : (
              <div className="space-y-3">
                {agentData.map((agent, i) => {
                  const pct = (agent.ms / maxAgentMs) * 100;
                  return (
                    <div key={agent.name} className="flex items-center gap-3 group">
                      <span className="text-[11px] font-mono text-gray-400 w-24 shrink-0 text-right">
                        {agent.label}
                      </span>
                      <div className="flex-1 h-7 bg-gray-800 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all ease-out group-hover:brightness-125"
                          style={{
                            width: mounted ? `${Math.max(pct, 2)}%` : '0%',
                            transitionDuration: mounted ? `${1000 + i * 150}ms` : '0ms',
                            background: `linear-gradient(90deg, ${agent.color} 0%, ${agent.colorLight} 100%)`,
                            boxShadow: `0 0 12px ${agent.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 w-16 shrink-0 tabular-nums">
                        {agent.ms >= 1000 ? `${(agent.ms / 1000).toFixed(1)}s` : `${Math.round(agent.ms)}ms`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Severity Donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Severity Distribution</span>
          </div>
          <div className="p-4 flex flex-col items-center">
            {severityData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <svg viewBox="0 0 180 180" className="w-32 h-32">
                  <circle cx="90" cy="90" r="60" fill="none" stroke="#1f2937" strokeWidth="20" />
                </svg>
                <span className="text-[10px] text-gray-600 mt-2">No data</span>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 180 180" className="w-36 h-36">
                  {/* Background ring */}
                  <circle cx="90" cy="90" r="60" fill="none" stroke="#1f2937" strokeWidth="20" />
                  {/* Severity arcs */}
                  {(() => {
                    const circumference = 2 * Math.PI * 60;
                    let offset = 0;
                    return severityData.map((seg) => {
                      const segLen = totalSeverity > 0 ? (seg.value / totalSeverity) * circumference : 0;
                      const gap = severityData.length > 1 ? 4 : 0;
                      const el = (
                        <circle
                          key={seg.name}
                          cx="90" cy="90" r="60"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="20"
                          strokeDasharray={`${Math.max(0, segLen - gap)} ${circumference - segLen + gap}`}
                          strokeDashoffset={mounted ? -offset : circumference}
                          strokeLinecap="round"
                          transform="rotate(-90 90 90)"
                          style={{
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.65, 0, 0.35, 1)',
                            filter: `drop-shadow(0 0 4px ${seg.color}40)`,
                          }}
                        />
                      );
                      offset += segLen;
                      return el;
                    });
                  })()}
                  {/* Center text */}
                  <text x="90" y="85" textAnchor="middle" className="fill-white text-2xl font-bold" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                    {totalSeverity}
                  </text>
                  <text x="90" y="102" textAnchor="middle" className="fill-gray-500 text-[8px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                    incidents
                  </text>
                </svg>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
                  {severityData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
                      <span className="text-[10px] text-gray-400 capitalize">{s.name}</span>
                      <span className="text-[10px] font-mono text-gray-500">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Empty State Overlay ─────────────────────────────────────────────── */}
      {isEmpty && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 font-medium">All Systems Nominal</p>
          <p className="text-xs text-gray-600 mt-1">No incidents reported. Submit one to see the pipeline in action.</p>
        </div>
      )}
    </div>
  );
}
