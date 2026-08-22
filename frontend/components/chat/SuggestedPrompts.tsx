'use client';

import type { SuggestedPrompt } from '@/lib/mock-data/suggested-prompts';
import { ArrowUpRight, FileText, Clock, ShieldAlert, AlertTriangle, CreditCard } from 'lucide-react';

interface SuggestedPromptsProps {
  prompts: SuggestedPrompt[];
  onSelectPrompt: (promptText: string) => void;
}

export function SuggestedPrompts({ prompts, onSelectPrompt }: SuggestedPromptsProps) {
  const getCategoryIcon = (category: SuggestedPrompt['category']) => {
    switch (category) {
      case 'Contract & SOP':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'Historical Audit':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'Incident & Security':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
      case 'SLA & Credit':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'System Error':
        return <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
        Suggested Investigation Scenarios
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {prompts.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left cursor-pointer"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {getCategoryIcon(item.category)}
                  {item.category}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
