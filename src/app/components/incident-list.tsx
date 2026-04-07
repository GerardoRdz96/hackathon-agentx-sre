'use client';

import type { Incident } from '@/lib/schema';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors: Record<string, string> = {
  open: 'bg-gray-500/20 text-gray-400',
  triaged: 'bg-purple-500/20 text-purple-400',
  investigating: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
};

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No incidents reported yet</p>
        <p className="text-xs text-gray-600 mt-1">Submit an incident to see the agent pipeline in action</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Incidents</h2>
      </div>
      <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
        {incidents.map((incident) => (
          <div key={incident.id} className="px-5 py-3 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-mono">#{incident.id}</span>
                  {incident.severity && (
                    <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${severityColors[incident.severity] || severityColors.low}`}>
                      {incident.severity}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[incident.status] || statusColors.open}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200 truncate">{incident.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{incident.description}</p>
              </div>
              <div className="text-right shrink-0">
                {incident.component && (
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                    {incident.component}
                  </span>
                )}
                <p className="text-[10px] text-gray-600 mt-1">{incident.created_at}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
