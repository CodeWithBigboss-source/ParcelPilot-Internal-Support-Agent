'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, ToolStep, Source, PendingAction, ConfidenceLevel } from '@/lib/types';
import { streamAssistantResponse, type StreamChunk } from '@/lib/api-client';
import { MessageList } from './MessageList';
import { ChatComposer } from './ChatComposer';
import { SuggestedPrompts } from './SuggestedPrompts';
import { SUGGESTED_PROMPTS } from '@/lib/mock-data/suggested-prompts';

interface ChatWindowProps {
  conversationId?: string;
  initialMessages?: Message[];
}

export function ChatWindow({ conversationId = 'new', initialMessages = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  async function handleSendMessage(userText: string) {
    if (isStreaming) return;

    const userMessageId = `user-msg-${Date.now()}`;
    const userMsg: Message = {
      id: userMessageId,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = `assistant-msg-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolSteps: [],
      sources: [],
      isStreaming: true,
      streamedContent: '',
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      await streamAssistantResponse(
        conversationId,
        userText,
        (chunk: StreamChunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const targetIdx = updated.findIndex((m) => m.id === assistantMsgId);
            if (targetIdx === -1) return prev;

            const target = { ...updated[targetIdx] };

            if (chunk.type === 'tool_step') {
              const step = chunk.payload as ToolStep;
              const existingSteps = target.toolSteps ? [...target.toolSteps] : [];
              const stepIdx = existingSteps.findIndex((s) => s.id === step.id);
              if (stepIdx !== -1) {
                existingSteps[stepIdx] = step;
              } else {
                existingSteps.push(step);
              }
              target.toolSteps = existingSteps;
            } else if (chunk.type === 'content_delta') {
              target.streamedContent = (target.streamedContent || '') + (chunk.payload as string);
            } else if (chunk.type === 'sources') {
              target.sources = chunk.payload as Source[];
            } else if (chunk.type === 'metadata') {
              const meta = chunk.payload as {
                confidence?: ConfidenceLevel;
                isHistorical?: boolean;
                conflictDetected?: boolean;
                conflictExplanation?: string | null;
                pendingAction?: PendingAction | null;
                escalationRecommended?: boolean;
                escalationReason?: string | null;
                error?: string | null;
              };
              target.confidence = meta.confidence;
              target.isHistorical = meta.isHistorical;
              target.conflictDetected = meta.conflictDetected;
              target.conflictExplanation = meta.conflictExplanation;
              target.pendingAction = meta.pendingAction;
              target.escalationRecommended = meta.escalationRecommended;
              target.escalationReason = meta.escalationReason;
              target.error = meta.error;
            } else if (chunk.type === 'done') {
              target.isStreaming = false;
              target.content = target.streamedContent || target.content;
            } else if (chunk.type === 'error') {
              target.isStreaming = false;
              target.error = chunk.payload as string;
            }

            updated[targetIdx] = target;
            return updated;
          });
        },
        abortControllerRef.current.signal
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const targetIdx = updated.findIndex((m) => m.id === assistantMsgId);
        if (targetIdx !== -1) {
          updated[targetIdx] = {
            ...updated[targetIdx],
            isStreaming: false,
            error: 'Connection interrupted. Please try again.',
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="min-h-full flex flex-col justify-center py-6 sm:py-12 pt-8 sm:pt-14 space-y-8">
            <div className="text-center space-y-2.5 max-w-xl mx-auto px-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                ParcelPilot Support & Operations Agent
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Investigate B2B logistics accounts, orders, tickets, and agreements with full policy
                hierarchy awareness and human confirmation for state-changing actions.
              </p>
            </div>
            <SuggestedPrompts prompts={SUGGESTED_PROMPTS} onSelectPrompt={handleSendMessage} />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Composer Input Area */}
      <ChatComposer onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
