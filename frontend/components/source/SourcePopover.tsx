'use client';

import type { Source } from '@/lib/types';
import { FileText, Package, Ticket, Building, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

interface SourcePopoverProps {
  source: Source;
  onClose: () => void;
}

export function SourcePopover({ source, onClose }: SourcePopoverProps) {
  const getIcon = () => {
    switch (source.type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'order':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'ticket':
        return <Ticket className="w-4 h-4 text-amber-600" />;
      case 'account':
        return <Building className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg border border-slate-200 shadow-lg p-3 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 min-w-0">
          {getIcon()}
          <span className="truncate">{source.title}</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs p-0.5"
          aria-label="Close popover"
        >
          ✕
        </button>
      </div>

      {/* Section & Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {source.section && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
            {source.section}
          </span>
        )}
        {source.isHistorical && (
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium text-[10px] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Historical
          </span>
        )}
        {source.isDeprecated && (
          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-medium text-[10px]">
            Deprecated
          </span>
        )}
      </div>

      {/* Excerpt */}
      <p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600 italic text-[11px] leading-relaxed mb-2">
        "{source.excerpt}"
      </p>

      {/* Authority Note */}
      {source.authorityNote && (
        <div className="flex items-start gap-1.5 text-[11px] text-blue-700 bg-blue-50/70 p-1.5 rounded border border-blue-100 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span>{source.authorityNote}</span>
        </div>
      )}

      {/* Timestamp */}
      {source.timestamp && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Effective: {new Date(source.timestamp).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
