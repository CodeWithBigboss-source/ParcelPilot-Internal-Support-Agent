'use client';

import { useState } from 'react';
import type { PendingAction } from '@/lib/types';
import { confirmAction, cancelAction } from '@/lib/api-client';
import { AlertOctagon, ShieldAlert, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface PendingActionCardProps {
  action: PendingAction;
  onActionComplete?: (resultId: string) => void;
}

export function PendingActionCard({ action: initialAction, onActionComplete }: PendingActionCardProps) {
  const [action, setAction] = useState(initialAction);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const isP1 = action.priority === 'P1';

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await confirmAction(action.actionId);
      setAction((prev) => ({ ...prev, status: 'confirmed', resultId: res.resultId }));
      setResultMessage(res.message);
      if (res.resultId) onActionComplete?.(res.resultId);
    } catch {
      setAction((prev) => ({ ...prev, status: 'failed' }));
      setResultMessage('Failed to execute action. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await cancelAction(action.actionId);
      setAction((prev) => ({ ...prev, status: 'cancelled' }));
      setResultMessage(res.message);
    } finally {
      setLoading(false);
    }
  }

  if (action.status === 'confirmed') {
    return (
      <div className="my-3 p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1.5 animate-in fade-in">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Action Executed — Escalation Created</span>
          {action.resultId && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px]">
              {action.resultId}
            </span>
          )}
        </div>
        <p className="text-emerald-800 leading-relaxed">{resultMessage}</p>
      </div>
    );
  }

  if (action.status === 'cancelled') {
    return (
      <div className="my-3 p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Action Cancelled</span>
        </div>
        <p className="text-slate-600">{resultMessage ?? 'No changes were made to the system.'}</p>
      </div>
    );
  }

  return (
    <div
      className={`my-4 p-4 rounded-xl border-2 shadow-sm text-xs space-y-3 ${
        isP1 ? 'bg-red-50/90 border-red-400' : 'bg-amber-50/90 border-amber-400'
      }`}
    >
      {/* Action Header */}
      <div className="flex items-start justify-between gap-2 border-b pb-2 border-slate-200">
        <div className="flex items-center gap-2">
          {isP1 ? (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{action.actionLabel}</span>
              {action.priority && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isP1 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {action.priority}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">Target: {action.targetEntityId}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white border border-slate-300 text-slate-700 text-[10px] font-medium uppercase tracking-wide">
          Awaiting Confirmation
        </span>
      </div>

      {/* Reason */}
      <div>
        <span className="font-semibold text-slate-800">Reason for Action:</span>
        <p className="mt-0.5 text-slate-700 leading-relaxed bg-white/70 p-2 rounded border border-slate-200/80">
          {action.reason}
        </p>
      </div>

      {/* Action Parameters Table */}
      {Object.keys(action.details).length > 0 && (
        <div className="bg-white/90 rounded-lg border border-slate-200 p-2.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Action Parameters
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(action.details).map(([key, val]) => (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] text-slate-500">{key}</span>
                <span className="font-mono text-slate-800 text-[11px] truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Control Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-slate-600 italic">
          ⚠️ Human confirmation required per ParcelPilot Safety Protocol.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-1.5 rounded-lg text-white font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
              isP1 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
