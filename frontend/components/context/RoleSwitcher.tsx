'use client';

import { useState, useRef, useEffect } from 'react';
import type { UserContext } from '@/lib/types';
import { USERS } from '@/lib/mock-data/users';
import { ACCOUNTS } from '@/lib/mock-data/accounts';
import { Shield, ChevronDown, Check, UserCheck, Lock } from 'lucide-react';

interface RoleSwitcherProps {
  currentUser?: UserContext;
  onUserChange?: (user: UserContext) => void;
}

export function RoleSwitcher({ currentUser = USERS[1], onUserChange }: RoleSwitcherProps) {
  const [selectedUser, setSelectedUser] = useState<UserContext>(currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(user: UserContext) {
    setSelectedUser(user);
    onUserChange?.(user);
    setIsOpen(false);
  }

  const getRoleBadgeStyle = (role: UserContext['role']) => {
    switch (role) {
      case 'support_agent':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'senior_support':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'operations_manager':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
      >
        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-900">{selectedUser.name}</span>
          <span
            className={`px-1.5 py-0.2 rounded border text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(
              selectedUser.role
            )}`}
          >
            {selectedUser.roleLabel}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-2 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active User & Role Context
            </span>
            <p className="text-[11px] text-slate-500">
              Role permissions determine scope enforcement & execution rights.
            </p>
          </div>

          {USERS.map((u) => {
            const isSelected = u.id === selectedUser.id;
            return (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                className={`w-full flex items-start justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{u.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded border text-[10px] font-bold uppercase ${getRoleBadgeStyle(
                        u.role
                      )}`}
                    >
                      {u.roleLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span className="truncate">
                      {u.permissions.includes('*')
                        ? 'All permissions (*)'
                        : `${u.permissions.length} active permissions`}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
