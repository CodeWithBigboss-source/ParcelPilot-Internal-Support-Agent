'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, CornerDownLeft, Loader2, Sparkles } from 'lucide-react';

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, disabled = false, placeholder }: ChatComposerProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  function handleSubmit() {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3 shadow-lg">
      <div className="max-w-4xl mx-auto space-y-1.5">
        <div className="relative flex items-end rounded-xl border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              placeholder ??
              'Investigate an order, policy, ticket, or agreement (e.g. "Can Northstar cancel ORD-1001?")'
            }
            rows={1}
            className="w-full resize-none border-0 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 max-h-40 min-h-[38px] py-1 px-1"
          />

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:bg-slate-300 transition-colors ml-2 cursor-pointer"
            title="Send Message (Enter)"
          >
            {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Footer shortcuts & helper info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-slate-400" /> <kbd className="font-mono">Enter</kbd> to send
            </span>
            <span>
              <kbd className="font-mono">Shift+Enter</kbd> for newline
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Deterministic Policy Hierarchy Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
