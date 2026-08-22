import type { ConfidenceLevel } from '@/lib/types';
import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence?: ConfidenceLevel;
  isHistorical?: boolean;
}

export function ConfidenceIndicator({ confidence, isHistorical }: ConfidenceIndicatorProps) {
  if (!confidence) return null;

  if (confidence === 'high') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>High Confidence</span>
      </div>
    );
  }

  if (confidence === 'moderate' || isHistorical) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-medium">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Moderate Confidence</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
      <span>Low Confidence</span>
    </div>
  );
}
