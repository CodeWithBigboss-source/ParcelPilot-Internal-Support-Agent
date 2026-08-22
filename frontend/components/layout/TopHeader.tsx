'use client';

import { useState } from 'react';
import { RoleSwitcher } from '../context/RoleSwitcher';
import { Search, Building, ShieldCheck, HelpCircle } from 'lucide-react';
import { ACCOUNTS } from '@/lib/mock-data/accounts';

export function TopHeader() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const selectedAccount = ACCOUNTS.find((a) => a.id === selectedAccountId);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 shrink-0 shadow-2xs relative z-20">
      {/* Left: Account Context Scope */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-500 hidden sm:inline">Account Scope:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Accounts (Global Scope)</option>
            {ACCOUNTS.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.plan})
              </option>
            ))}
          </select>
        </div>

        {selectedAccount?.hasAgreement && (
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Signed Agreement Active
          </span>
        )}
      </div>

      {/* Middle: Command Search Simulation */}
      <div className="flex-1 max-w-md hidden lg:block">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders (ORD-1001), tickets (TKT-505), or policies..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>
      </div>

      {/* Right: Role Switcher Context */}
      <div className="flex items-center gap-2">
        <RoleSwitcher />
      </div>
    </header>
  );
}
