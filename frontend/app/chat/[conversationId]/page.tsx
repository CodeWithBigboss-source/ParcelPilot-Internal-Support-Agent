import { getConversation } from '@/lib/api-client';
import { ChatWindow } from '@/components/chat/ChatWindow';

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const conversation = await getConversation(conversationId);

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={conversation?.messages ?? []}
    />
  );
}
