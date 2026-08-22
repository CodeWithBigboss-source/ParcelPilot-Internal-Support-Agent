'use client';

import { useState } from 'react';
import type { ToolStep } from '@/lib/types';
import { ToolTraceStep } from './ToolTraceStep';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolTraceProps {
  steps: ToolStep[];
}

export function ToolTrace({ steps }: ToolTraceProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!steps.length) return null;

  const totalDuration = steps.reduce((acc, s) => acc + (s.durationMs || 0), 0);
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const runningCount = steps.filter((s) => s.status === 'running').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-white overflow-hidden text-xs shadow-xs">
      {/* Trace Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-800">Agent Reasoning & Tool Calls</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-mono">
            {completedCount}/{steps.length} steps
          </span>
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium animate-tool-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Executing
            </span>
          )}
          {failedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium">
              {failedCount} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[10px] font-mono">{totalDuration}ms total</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Trace Body */}
      {isOpen && (
        <div className="p-2 space-y-0.5 divide-y divide-slate-100">
          {steps.map((step) => (
            <ToolTraceStep key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
