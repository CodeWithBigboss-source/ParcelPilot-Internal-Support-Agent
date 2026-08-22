import { User } from 'lucide-react';

interface UserMessageProps {
  content: string;
  timestamp?: string;
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <div className="flex justify-end my-3">
      <div className="max-w-xl bg-slate-900 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-xs text-xs space-y-1">
        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pb-1 border-b border-slate-800">
          <span className="font-semibold text-slate-300">Support Agent</span>
          {timestamp && (
            <span>
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap leading-relaxed text-slate-100 font-normal">{content}</p>
      </div>
    </div>
  );
}
