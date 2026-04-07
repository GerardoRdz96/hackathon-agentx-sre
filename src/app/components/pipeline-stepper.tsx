'use client';

import { useState, useEffect } from 'react';

const AGENTS = [
  { name: 'Triage', model: 'Haiku', icon: '🎯', color: 'red', parallel: false },
  { name: 'Log Analyst', model: 'Sonnet', icon: '📋', color: 'yellow', parallel: true },
  { name: 'Code Analyst', model: 'Sonnet', icon: '🔍', color: 'blue', parallel: true },
  { name: 'Hypothesis', model: 'Sonnet', icon: '🧠', color: 'purple', parallel: false },
  { name: 'Router', model: 'Haiku', icon: '📡', color: 'emerald', parallel: false },
];

const COLOR_MAP: Record<string, { bg: string; glow: string }> = {
  red: { bg: 'bg-red-500', glow: 'shadow-red-500/30' },
  yellow: { bg: 'bg-yellow-500', glow: 'shadow-yellow-500/30' },
  blue: { bg: 'bg-blue-500', glow: 'shadow-blue-500/30' },
  purple: { bg: 'bg-purple-500', glow: 'shadow-purple-500/30' },
  emerald: { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/30' },
};

interface PipelineStepperProps {
  active: boolean;
}

export function PipelineStepper({ active }: PipelineStepperProps) {
  const [activeAgent, setActiveAgent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setActiveAgent(0);
      setElapsed(0);
      setDone(false);
      return;
    }

    const startTime = Date.now();

    // Cycle through agents progressively — each agent gets longer
    // because we don't know exact timing, we advance every few seconds
    const agentTimings = [2000, 4000, 4000, 8000, 2000]; // rough estimates
    let currentAgent = 0;
    let accumulated = 0;

    const timers: NodeJS.Timeout[] = [];

    agentTimings.forEach((timing, i) => {
      accumulated += timing;
      const timer = setTimeout(() => {
        if (i < AGENTS.length - 1) {
          currentAgent = i + 1;
          setActiveAgent(i + 1);
        }
      }, accumulated);
      timers.push(timer);
    });

    // Elapsed timer
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [active]);

  // When pipeline finishes (active goes false), mark done briefly
  useEffect(() => {
    if (!active && elapsed > 0) {
      setDone(true);
      setActiveAgent(AGENTS.length); // all done
      const timer = setTimeout(() => setDone(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [active, elapsed]);

  if (!active && !done) return null;

  return (
    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          {done ? (
            <><span className="text-emerald-400">✓</span> Pipeline Complete</>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Agents Working</>
          )}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>

      <div className="space-y-1.5">
        {AGENTS.map((agent, i) => {
          const isDone = i < activeAgent;
          const isActive = i === activeAgent && active;
          // For parallel agents (1,2), both activate at same step
          const isParallelActive = agent.parallel && active && (activeAgent === 1 || activeAgent === 2) && (i === 1 || i === 2);
          const isParallelDone = agent.parallel && activeAgent > 2;
          const showActive = isActive || isParallelActive;
          const showDone = isDone || isParallelDone || done;
          const colors = COLOR_MAP[agent.color];

          return (
            <div key={agent.name} className="flex items-center gap-3">
              {/* Status dot */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                showDone
                  ? `${colors.bg} text-white shadow-lg ${colors.glow}`
                  : showActive
                  ? `${colors.bg} text-white animate-pulse shadow-lg ${colors.glow}`
                  : 'bg-gray-700/50 text-gray-600'
              }`}>
                {showDone ? '✓' : showActive ? agent.icon : '·'}
              </div>

              {/* Agent name + model */}
              <div className="flex-1 flex items-center gap-2">
                <span className={`text-xs font-medium transition-colors duration-300 ${
                  showDone ? 'text-gray-200' : showActive ? 'text-white' : 'text-gray-500'
                }`}>
                  {agent.name}
                </span>
                <span className="text-[10px] text-gray-600">{agent.model}</span>
                {agent.parallel && (
                  <span className="text-[9px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">PARALLEL</span>
                )}
              </div>

              {/* Status text */}
              <span className={`text-[10px] font-mono ${
                showDone ? 'text-emerald-400' : showActive ? 'text-yellow-400 animate-pulse' : 'text-gray-600'
              }`}>
                {showDone ? 'done' : showActive ? 'working...' : 'waiting'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Flow diagram */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 mt-3 pt-2 border-t border-gray-700/50">
        <span>Triage</span><span className="text-gray-700">→</span>
        <span className="text-blue-400">[Log ∥ Code]</span><span className="text-gray-700">→</span>
        <span>Hypothesis</span><span className="text-gray-700">→</span>
        <span>Router</span>
      </div>
    </div>
  );
}
