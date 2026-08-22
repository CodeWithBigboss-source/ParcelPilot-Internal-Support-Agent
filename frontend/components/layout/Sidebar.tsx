'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Conversation } from '@/lib/types';
import { CONVERSATIONS } from '@/lib/mock-data/conversations';
import {
  Plus,
  MessageSquare,
  Building,
  FileText,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';

interface SidebarProps {
  conversations?: Conversation[];
}

export function Sidebar({ conversations = CONVERSATIONS }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
          <Package className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm tracking-tight leading-none">ParcelPilot</h1>
          <span className="text-[10px] text-slate-400 font-mono">Support & Ops Agent v2.4</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-3">
        <Link
          href="/chat"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation</span>
        </Link>
      </div>

      {/* Main Nav Section */}
      <div className="px-3 py-2 space-y-0.5 border-b border-slate-800 text-xs">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-1">
          Navigation
        </span>
        <Link
          href="/chat"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            pathname === '/chat' ? 'bg-slate-800 text-white font-semibold' : 'hover:bg-slate-800/60 text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span>Active Workspace</span>
        </Link>
      </div>

      {/* Recent Investigations History */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block mb-1">
          Recent Investigations
        </span>

        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          return (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className={`group flex flex-col p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-blue-500'
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-semibold truncate text-xs text-slate-200 group-hover:text-white">
                  {conv.title}
                </span>
                {conv.status === 'escalated' && (
                  <span className="px-1 py-0.2 bg-red-900/60 text-red-300 rounded text-[9px] font-mono shrink-0">
                    P1
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">{conv.preview}</p>
            </Link>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-300">Mock Data Mode</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">10 Scenarios</span>
      </div>
    </aside>
  );
}
