'use client';

import { useState, useRef, useEffect } from 'react';
import type { Source } from '@/lib/types';
import { SourcePopover } from './SourcePopover';
import { FileText, Package, Ticket, Building, AlertTriangle } from 'lucide-react';

interface SourceBadgeProps {
  source: Source;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBadgeStyle = () => {
    if (source.isHistorical) {
      return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
    }
    if (source.isDeprecated) {
      return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    }
    switch (source.type) {
      case 'document':
        return 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
      case 'order':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100';
      case 'ticket':
        return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
      case 'account':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    }
  };

  const getIcon = () => {
    if (source.isHistorical) {
      return <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />;
    }
    switch (source.type) {
      case 'document':
        return <FileText className="w-3 h-3 text-blue-600 shrink-0" />;
      case 'order':
        return <Package className="w-3 h-3 text-indigo-600 shrink-0" />;
      case 'ticket':
        return <Ticket className="w-3 h-3 text-amber-600 shrink-0" />;
      case 'account':
        return <Building className="w-3 h-3 text-emerald-600 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block" ref={badgeRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${getBadgeStyle()}`}
        title="Click to view source detail"
      >
        {getIcon()}
        <span>{source.shortLabel}</span>
      </button>

      {isOpen && <SourcePopover source={source} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
