'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Incident, Ticket, Trace, Notification } from '@/lib/schema';

interface MissionControlData {
  incident: Incident;
  tickets: Ticket[];
  traces: Trace[];
  notifications: Notification[];
}

export function MissionControl({ data, onResolve }: { data: MissionControlData; onResolve?: () => void }) {
  const { incident, tickets: tix, traces: trc, notifications: notifs } = data;
  const router = useRouter();
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    try {
      await fetch(`/api/incidents/${incident.id}/resolve`, { method: 'POST' });
      router.refresh();
      onResolve?.();
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  }

  const severityGradient: Record<string, string> = {
    critical: 'from-red-600 to-red-800',
    high: 'from-orange-600 to-orange-800',
    medium: 'from-yellow-600 to-yellow-800',
    low: 'from-blue-600 to-blue-800',
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Mission Control &mdash; Incident #{incident.id}
        </h2>
        {incident.status !== 'resolved' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}
      </div>

      {/* 5-Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Panel 1: Incident Overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${severityGradient[incident.severity || 'low'] || severityGradient.low} px-4 py-2`}>
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">
              {incident.severity || 'UNCLASSIFIED'} - {incident.type || 'unknown'}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <h3 className="font-medium text-gray-100">{incident.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{incident.description}</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {incident.component && (
                <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                  Component: {incident.component}
                </span>
              )}
              <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                Status: {incident.status}
              </span>
              {incident.reporter_email && (
                <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                  Reporter: {incident.reporter_email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Ticket */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Ticket
            </span>
          </div>
          <div className="p-4 space-y-3">
            {tix.length === 0 ? (
              <p className="text-xs text-gray-500">No ticket created yet</p>
            ) : (
              tix.map(ticket => (
                <div key={ticket.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">TKT-{ticket.id}</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{ticket.summary}</p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Team: <span className="text-gray-300">{ticket.team}</span></p>
                    <p>Assigned: <span className="text-gray-300">{ticket.assigned_to || 'Unassigned'}</span></p>
                    {ticket.suggested_fix && (
                      <div className="mt-2 bg-gray-800 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500 uppercase mb-1">Suggested Fix</p>
                        <p className="text-xs text-emerald-400">{ticket.suggested_fix}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Notifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Notifications ({notifs.length})
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-[250px] overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-xs text-gray-500">No notifications sent yet</p>
            ) : (
              notifs.map(notif => (
                <div key={notif.id} className="bg-gray-800/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      notif.type === 'escalation' ? 'bg-red-500/20 text-red-400' :
                      notif.type === 'resolution' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {notif.type}
                    </span>
                    <span className="text-[10px] text-gray-500">{notif.recipient}</span>
                  </div>
                  <p className="text-xs text-gray-400">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 4: Agent Trace Timeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden md:col-span-2 lg:col-span-2">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Agent Trace Timeline
            </span>
          </div>
          <div className="p-4">
            {trc.length === 0 ? (
              <p className="text-xs text-gray-500">No traces recorded yet</p>
            ) : (
              <div className="space-y-1">
                {trc.map((trace, i) => {
                  const agentColors: Record<string, string> = {
                    'triage': 'border-red-500 bg-red-500/10',
                    'log-analyst': 'border-yellow-500 bg-yellow-500/10',
                    'code-analyst': 'border-blue-500 bg-blue-500/10',
                    'hypothesis': 'border-purple-500 bg-purple-500/10',
                    'router': 'border-emerald-500 bg-emerald-500/10',
                  };
                  const color = agentColors[trace.agent_name] || 'border-gray-500 bg-gray-500/10';

                  return (
                    <div key={trace.id} className="flex items-stretch gap-3">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center w-5 shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 ${color} shrink-0 mt-2`} />
                        {i < trc.length - 1 && <div className="w-px flex-1 bg-gray-800" />}
                      </div>
                      {/* Content */}
                      <div className={`flex-1 border-l-2 ${color} rounded-r-lg px-3 py-2 mb-1`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-300 capitalize">
                            {trace.agent_name.replace('-', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {trace.duration_ms ? `${Math.round(trace.duration_ms)}ms` : '-'}
                          </span>
                        </div>
                        {trace.input_summary && (
                          <p className="text-[10px] text-gray-500 mt-0.5">In: {trace.input_summary}</p>
                        )}
                        {trace.output_summary && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Out: {trace.output_summary}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel 5: Hypothesis Details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Hypotheses
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {tix.length === 0 || !tix[0].hypothesis ? (
              <p className="text-xs text-gray-500">No hypotheses generated yet</p>
            ) : (() => {
              try {
                const hyp = JSON.parse(tix[0].hypothesis);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">#{hyp.rank || 1}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                        {Math.round((hyp.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-300">{hyp.description}</p>
                    {hyp.evidence && hyp.evidence.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">Evidence</p>
                        <ul className="space-y-0.5">
                          {hyp.evidence.map((e: string, i: number) => (
                            <li key={i} className="text-[10px] text-gray-400 flex gap-1.5">
                              <span className="text-gray-600 shrink-0">-</span>
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hyp.blast_radius && (
                      <p className="text-[10px] text-red-400">
                        Blast radius: {hyp.blast_radius}
                      </p>
                    )}
                  </div>
                );
              } catch {
                return <p className="text-xs text-gray-500">Could not parse hypothesis data</p>;
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
