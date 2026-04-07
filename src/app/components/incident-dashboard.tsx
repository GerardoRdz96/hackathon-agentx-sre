'use client';

import { useState, useEffect, useCallback } from 'react';
import { IncidentList } from './incident-list';
import { MissionControl } from './mission-control';
import type { Incident, Ticket, Trace, Notification } from '@/lib/schema';

interface IncidentDetails {
  incident: Incident;
  tickets: Ticket[];
  traces: Trace[];
  notifications: Notification[];
}

export function IncidentDashboard({ incidents }: { incidents: Incident[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<IncidentDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch {
      // Silently fail — Mission Control will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-select first incident on mount, or when new incident appears
  useEffect(() => {
    if (incidents.length > 0) {
      const latestId = incidents[0].id;
      // If no selection, or a new incident appeared (list grew), select the latest
      if (selectedId === null || !incidents.find(i => i.id === selectedId)) {
        setSelectedId(latestId);
        fetchDetails(latestId);
      }
    } else {
      setSelectedId(null);
      setDetails(null);
    }
  }, [incidents, selectedId, fetchDetails]);

  function handleSelect(id: number) {
    setSelectedId(id);
    fetchDetails(id);
  }

  async function handleRefreshSelected() {
    if (selectedId) {
      await fetchDetails(selectedId);
    }
  }

  return (
    <div className="space-y-6">
      {/* Incident List */}
      <IncidentList
        incidents={incidents}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      {/* Mission Control */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 w-48 bg-gray-700 rounded" />
            <div className="h-8 w-28 bg-gray-700 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-40 bg-gray-800 rounded-lg" />
            <div className="h-40 bg-gray-800 rounded-lg" />
            <div className="h-40 bg-gray-800 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-800 rounded-lg" />
            <div className="h-48 bg-gray-800 rounded-lg" />
          </div>
        </div>
      ) : details ? (
        <MissionControl data={details} onResolve={handleRefreshSelected} />
      ) : incidents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <img src="/incidex-icon.svg" alt="" className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-sm text-gray-400 font-medium">No incidents yet</p>
          <p className="text-xs text-gray-600 mt-1">Submit an incident to see the 5-agent pipeline in action</p>
        </div>
      ) : null}
    </div>
  );
}
