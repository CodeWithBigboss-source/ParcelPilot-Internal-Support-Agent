'use client';

import { useState } from 'react';
import type { ToolStep } from '@/lib/types';
import { Search, Database, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Zap } from 'lucide-react';

interface ToolTraceStepProps {
  step: ToolStep;
}

export function ToolTraceStep({ step }: ToolTraceStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = () => {
    switch (step.toolName) {
      case 'search_documents':
        return <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'query_structured_data':
        return <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
      case 'propose_action':
      case 'execute_action':
        return <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    }
  };

  const getStatusBadge = () => {
    switch (step.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium animate-tool-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Running...
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {step.durationMs}ms
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Failed ({step.durationMs}ms)
          </span>
        );
      default:
        return <span className="text-[10px] text-slate-400">Pending</span>;
    }
  };

  return (
    <div className="border-b border-slate-100 last:border-0 py-1.5">
      <button
        onClick={() => step.detail && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between text-left text-xs gap-2 py-0.5 ${
          step.detail ? 'hover:bg-slate-50 rounded px-1 -mx-1 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {step.detail ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            )
          ) : (
            <span className="w-3" />
          )}
          {getToolIcon()}
          <span className="font-medium text-slate-800 truncate">{step.label}</span>
          <span className="text-slate-400 text-[11px] truncate hidden sm:inline">{step.description}</span>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </button>

      {isExpanded && step.detail && (
        <div className="mt-1 ml-7 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px] leading-relaxed break-all">
          {step.detail}
        </div>
      )}
    </div>
  );
}
