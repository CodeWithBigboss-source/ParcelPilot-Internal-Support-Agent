'use client';

import type { Message } from '@/lib/types';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface MessageListProps {
  messages: Message[];
  onActionComplete?: (resultId: string) => void;
}

export function MessageList({ messages, onActionComplete }: MessageListProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto py-4">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} content={msg.content} timestamp={msg.timestamp} />
        ) : (
          <AssistantMessage key={msg.id} message={msg} onActionComplete={onActionComplete} />
        )
      )}
    </div>
  );
}
