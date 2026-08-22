import { AlertTriangle, Clock } from 'lucide-react';

interface HistoricalEvidenceCalloutProps {
  children?: React.ReactNode;
}

export function HistoricalEvidenceCallout({ children }: HistoricalEvidenceCalloutProps) {
  return (
    <div className="my-3 p-3 bg-amber-50/80 border-l-4 border-amber-500 rounded-r-md text-amber-900 text-xs leading-relaxed space-y-1">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Historical Evidence — Handle with Caution</span>
      </div>
      <div className="text-amber-800">{children}</div>
    </div>
  );
}
