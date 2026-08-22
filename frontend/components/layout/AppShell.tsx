'use client';

import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Right Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopHeader />
        <main className="flex-1 min-h-0 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}
