'use client';

import type { Incident } from '@/lib/schema';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const severityBorderColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

const statusColors: Record<string, string> = {
  open: 'bg-gray-500/20 text-gray-400',
  triaged: 'bg-purple-500/20 text-purple-400',
  investigating: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
};

interface IncidentListProps {
  incidents: Incident[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}

export function IncidentList({ incidents, selectedId, onSelect }: IncidentListProps) {
  if (incidents.length === 0) {
    return null; // Empty state handled by dashboard
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Incidents</h2>
      </div>
      <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
        {incidents.map((incident) => {
          const isSelected = selectedId === incident.id;
          const isResolved = incident.status === 'resolved';
          const borderColor = severityBorderColors[incident.severity || 'low'] || 'border-l-gray-500';

          return (
            <div
              key={incident.id}
              onClick={() => onSelect?.(incident.id)}
              className={`px-5 py-3 cursor-pointer transition-all duration-200 border-l-3 ${
                isSelected
                  ? `${borderColor} bg-gray-800/70 border-l-[3px]`
                  : 'border-l-[3px] border-l-transparent hover:bg-gray-800/40'
              } ${isResolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-mono">#{incident.id}</span>
                    {isResolved ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        ✓ resolved
                      </span>
                    ) : incident.severity ? (
                      <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${severityColors[incident.severity] || severityColors.low}`}>
                        {incident.severity}
                      </span>
                    ) : null}
                    {!isResolved && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[incident.status] || statusColors.open}`}>
                        {incident.status}
                      </span>
                    )}
                    {incident.image_path && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
                        👁 Vision
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-medium truncate ${isResolved ? 'text-gray-400 line-through decoration-gray-600' : 'text-gray-200'}`}>
                    {incident.title}
                  </p>
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
          );
        })}
      </div>
    </div>
  );
}
