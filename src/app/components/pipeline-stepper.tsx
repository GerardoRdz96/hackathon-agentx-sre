'use client';

import { useState, useEffect } from 'react';

const AGENTS = [
  { name: 'Triage', model: 'Haiku', icon: '🎯', color: 'from-red-500 to-red-600', delay: 0, duration: 1500 },
  { name: 'Log Analyst', model: 'Sonnet', icon: '📋', color: 'from-yellow-500 to-amber-600', delay: 1500, duration: 2500 },
  { name: 'Code Analyst', model: 'Sonnet', icon: '🔍', color: 'from-blue-500 to-indigo-600', delay: 1500, duration: 3000 },
  { name: 'Hypothesis', model: 'Sonnet', icon: '🧠', color: 'from-purple-500 to-violet-600', delay: 4500, duration: 2000 },
  { name: 'Router', model: 'Haiku', icon: '📡', color: 'from-emerald-500 to-green-600', delay: 6500, duration: 1000 },
];

interface PipelineStepperProps {
  active: boolean;
}

export function PipelineStepper({ active }: PipelineStepperProps) {
  const [agentStates, setAgentStates] = useState<('waiting' | 'running' | 'done')[]>(
    AGENTS.map(() => 'waiting')
  );
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setAgentStates(AGENTS.map(() => 'waiting'));
      setElapsed(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now() - startTime;
      setElapsed(now);

      setAgentStates(AGENTS.map((agent) => {
        if (now < agent.delay) return 'waiting';
        if (now < agent.delay + agent.duration) return 'running';
        return 'done';
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Agent Pipeline Active
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Pipeline visualization */}
      <div className="space-y-2">
        {AGENTS.map((agent, i) => {
          const state = agentStates[i];
          const isParallel = i === 1 || i === 2;

          return (
            <div key={agent.name} className={`flex items-center gap-3 ${isParallel && i === 2 ? '-mt-1' : ''}`}>
              {/* Status indicator */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300 ${
                state === 'done'
                  ? `bg-gradient-to-br ${agent.color} shadow-lg shadow-${agent.color.split(' ')[0].replace('from-', '')}/20`
                  : state === 'running'
                  ? `bg-gradient-to-br ${agent.color} animate-pulse shadow-lg`
                  : 'bg-gray-700/50'
              }`}>
                {state === 'done' ? '✓' : state === 'running' ? agent.icon : '·'}
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium transition-colors duration-300 ${
                    state === 'done' ? 'text-gray-200' : state === 'running' ? 'text-white' : 'text-gray-500'
                  }`}>
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-gray-600">{agent.model}</span>
                  {isParallel && (
                    <span className="text-[9px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">PARALLEL</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${agent.color} ${
                      state === 'running' ? 'animate-pulse' : ''
                    }`}
                    style={{
                      width: state === 'done' ? '100%' : state === 'running'
                        ? `${Math.min(95, ((elapsed - agent.delay) / agent.duration) * 100)}%`
                        : '0%',
                      background: state === 'waiting' ? 'transparent'
                        : `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`,
                    }}
                  />
                </div>
              </div>

              {/* Timing */}
              <span className={`text-[10px] font-mono w-10 text-right ${
                state === 'done' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {state === 'done'
                  ? `${(agent.duration / 1000).toFixed(1)}s`
                  : state === 'running'
                  ? '...'
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Connection lines showing parallel execution */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 mt-1">
        <span>Triage</span>
        <span>→</span>
        <span className="text-blue-400">[Log + Code]</span>
        <span>→</span>
        <span>Hypothesis</span>
        <span>→</span>
        <span>Router</span>
      </div>
    </div>
  );
}
