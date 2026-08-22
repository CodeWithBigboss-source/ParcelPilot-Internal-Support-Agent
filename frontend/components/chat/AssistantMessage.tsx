'use client';

import type { Message } from '@/lib/types';
import { ToolTrace } from '../trace/ToolTrace';
import { SourceBadge } from '../source/SourceBadge';
import { ConfidenceIndicator } from '../source/ConfidenceIndicator';
import { HistoricalEvidenceCallout } from '../source/HistoricalEvidenceCallout';
import { PendingActionCard } from '../action/PendingActionCard';
import { Bot, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AssistantMessageProps {
  message: Message;
  onActionComplete?: (resultId: string) => void;
}

export function AssistantMessage({ message, onActionComplete }: AssistantMessageProps) {
  const isStreaming = message.isStreaming;
  const contentToDisplay = isStreaming ? message.streamedContent ?? '' : message.content;

  return (
    <div className="flex items-start gap-3 my-4">
      {/* Avatar Icon */}
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
        <Bot className="w-4 h-4" />
      </div>

      {/* Main Body */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ParcelPilot Core Engine</span>
            <ConfidenceIndicator confidence={message.confidence} isHistorical={message.isHistorical} />
          </div>
          {message.timestamp && (
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Tool Trace Panel */}
        {message.toolSteps && message.toolSteps.length > 0 && (
          <ToolTrace steps={message.toolSteps} />
        )}

        {/* Conflict Detection Banner */}
        {message.conflictDetected && message.conflictExplanation && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-800">Policy Precedence Applied:</span>{' '}
              {message.conflictExplanation}
            </div>
          </div>
        )}

        {/* Main Content */}
        {contentToDisplay ? (
          <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed space-y-2">
            <ReactMarkdown>{contentToDisplay}</ReactMarkdown>
          </div>
        ) : (
          isStreaming && (
            <div className="flex items-center gap-2 text-slate-400 py-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <span>Analyzing evidence and formulating response...</span>
            </div>
          )
        )}

        {/* Historical Callout if historical ticket used */}
        {message.isHistorical && (
          <HistoricalEvidenceCallout>
            Historical tickets reflect past resolutions that may have predated current agreements or
            contained discretionary goodwill waivers. Verify against active customer agreements.
          </HistoricalEvidenceCallout>
        )}

        {/* Error Display */}
        {message.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Execution Error:</span> {message.error}
            </div>
          </div>
        )}

        {/* Pending Action Card */}
        {message.pendingAction && (
          <PendingActionCard action={message.pendingAction} onActionComplete={onActionComplete} />
        )}

        {/* Sources Footer */}
        {message.sources && message.sources.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Evidence Sources:
            </span>
            {message.sources.map((source) => (
              <SourceBadge key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
