import type {
  Conversation,
  Message,
  UserContext,
  Account,
  ActionConfirmResult,
} from '@/lib/types';
import { CONVERSATIONS } from '@/lib/mock-data/conversations';
import { ACCOUNTS } from '@/lib/mock-data/accounts';
import { USERS, DEFAULT_USER } from '@/lib/mock-data/users';
import { SUGGESTED_PROMPTS } from '@/lib/mock-data/suggested-prompts';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(base: number, spread: number) {
  return base + Math.random() * spread;
}

function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return CONVERSATIONS;
  try {
    const stored = localStorage.getItem('parcelpilot_conversations');
    if (stored) return JSON.parse(stored);
  } catch { /* fallback to default mock */ }
  return CONVERSATIONS;
}

export function saveConversationToStorage(conv: Conversation) {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredConversations();
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx !== -1) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    localStorage.setItem('parcelpilot_conversations', JSON.stringify(list));
    // Trigger custom event so sidebar updates instantly
    window.dispatchEvent(new Event('parcelpilot_storage_update'));
  } catch { /* ignore */ }
}

export async function getConversations(): Promise<Conversation[]> {
  if (USE_MOCK) {
    await delay(jitter(150, 50));
    return getStoredConversations();
  }
  const res = await fetch(`${BASE_URL}/conversations`);
  return res.json();
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (USE_MOCK) {
    await delay(jitter(100, 50));
    const list = getStoredConversations();
    return list.find((c) => c.id === id) ?? null;
  }
  const res = await fetch(`${BASE_URL}/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export interface StreamChunk {
  type: 'tool_step' | 'content_delta' | 'sources' | 'metadata' | 'done' | 'error';
  payload: unknown;
}

export async function streamAssistantResponse(
  conversationId: string,
  userMessage: string,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (USE_MOCK) {
    await mockStreamResponse(userMessage, onChunk, signal);
    return;
  }

  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId, message: userMessage }),
    signal,
  });

  if (!res.ok || !res.body) {
    onChunk({ type: 'error', payload: 'Failed to connect to backend.' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const chunk = JSON.parse(line.slice(5)) as StreamChunk;
          onChunk(chunk);
        } catch { /* ignore malformed lines */ }
      }
    }
  }
}

async function mockStreamResponse(
  userMessage: string,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal,
) {
  const lower = userMessage.toLowerCase();

  let scenario: Message | null = null;
  const isLogisticsRelated =
    lower.includes('northstar') ||
    lower.includes('lumenworks') ||
    lower.includes('swiftship') ||
    lower.includes('cancel') ||
    lower.includes('credit') ||
    lower.includes('sop') ||
    lower.includes('policy') ||
    lower.includes('order') ||
    lower.includes('ticket') ||
    lower.includes('ord-') ||
    lower.includes('tkt-') ||
    lower.includes('acct-') ||
    lower.includes('fee') ||
    lower.includes('pickup') ||
    lower.includes('delay') ||
    lower.includes('escalat') ||
    lower.includes('security') ||
    lower.includes('api key') ||
    lower.includes('dispute') ||
    lower.includes('agreement') ||
    lower.includes('billing') ||
    lower.includes('wire transfer');

  if (lower.includes('northstar') && lower.includes('cancel') && !lower.includes('histor')) {
    const { SCENARIO_1 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_1[1];
  } else if (lower.includes('histor') || lower.includes('dispute') || lower.includes('before')) {
    const { SCENARIO_2 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_2[1];
  } else if (lower.includes('escalat') || lower.includes('tkt-505') || lower.includes('api key')) {
    const { SCENARIO_3 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_3[1];
  } else if (lower.includes('ord-2002') && (lower.includes('status') || lower.includes('check'))) {
    const { SCENARIO_4 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_4[1];
  } else if (lower.includes('lumenworks') || lower.includes('credit') || lower.includes('ord-2002')) {
    const { SCENARIO_5 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_5[1];
  } else if (!isLogisticsRelated || lower.includes('who is') || lower.includes('what is') || lower.includes('weather')) {
    scenario = {
      id: `out-of-scope-${Date.now()}`,
      role: 'assistant',
      content:
        'I am the ParcelPilot AI Internal Support & Operations Agent. I am specifically trained to assist with internal ParcelPilot logistics operations, customer account contracts, order status checks (e.g. ORD-1001), support tickets (e.g. TKT-505), and SOP policies.\n\nYour question does not appear to be related to ParcelPilot logistics operations. Please ask a question related to ParcelPilot orders, tickets, contracts, or support policies.',
      timestamp: new Date().toISOString(),
      confidence: 'low',
      toolSteps: [
        {
          id: 'step-scope-1',
          tool_name: 'evaluate_domain_relevance',
          status: 'completed',
          duration_ms: 12,
          description: 'Evaluated prompt domain relevance against ParcelPilot logistics knowledge base: OUT OF SCOPE',
        },
      ],
      sources: [],
    };
  } else {
    const { SCENARIO_1 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_1[1];
  }

  if (!scenario) return;

  // 1. Tool steps
  if (scenario.toolSteps) {
    for (const step of scenario.toolSteps) {
      if (signal?.aborted) return;
      onChunk({ type: 'tool_step', payload: { ...step, status: 'running' } });
      await delay(jitter(350, 200));
      if (signal?.aborted) return;
      onChunk({ type: 'tool_step', payload: { ...step, status: step.status } });
      await delay(jitter(120, 80));
    }
  }

  // 2. Stream text
  if (scenario.content && !scenario.error) {
    const words = scenario.content.split(' ');
    for (const word of words) {
      if (signal?.aborted) return;
      onChunk({ type: 'content_delta', payload: word + ' ' });
      await delay(jitter(25, 15));
    }
  }

  // 3. Sources
  if (scenario.sources?.length) {
    await delay(150);
    onChunk({ type: 'sources', payload: scenario.sources });
  }

  // 4. Metadata
  await delay(80);
  onChunk({
    type: 'metadata',
    payload: {
      confidence: scenario.confidence,
      isHistorical: scenario.isHistorical,
      conflictDetected: scenario.conflictDetected,
      conflictExplanation: scenario.conflictExplanation,
      pendingAction: scenario.pendingAction,
      escalationRecommended: scenario.escalationRecommended,
      escalationReason: scenario.escalationReason,
      error: scenario.error,
    },
  });

  onChunk({ type: 'done', payload: null });
}

export async function confirmAction(actionId: string): Promise<ActionConfirmResult> {
  if (USE_MOCK) {
    await delay(jitter(600, 300));
    return {
      actionId,
      status: 'confirmed',
      resultId: `ESC-${Math.floor(2000 + Math.random() * 100)}`,
      message: 'Escalation created successfully. Security team notified.',
    };
  }
  const res = await fetch(`${BASE_URL}/actions/${actionId}/confirm`, { method: 'POST' });
  return res.json();
}

export async function cancelAction(actionId: string): Promise<ActionConfirmResult> {
  if (USE_MOCK) {
    await delay(jitter(150, 50));
    return { actionId, status: 'cancelled', message: 'Action cancelled. No changes made.' };
  }
  const res = await fetch(`${BASE_URL}/actions/${actionId}/cancel`, { method: 'POST' });
  return res.json();
}

export async function getRoles(): Promise<UserContext[]> {
  if (USE_MOCK) {
    await delay(30);
    return USERS;
  }
  const res = await fetch(`${BASE_URL}/roles`);
  return res.json();
}

export async function getAccounts(): Promise<Account[]> {
  if (USE_MOCK) {
    await delay(30);
    return ACCOUNTS;
  }
  const res = await fetch(`${BASE_URL}/accounts`);
  return res.json();
}

export async function getSuggestedPrompts(): Promise<typeof SUGGESTED_PROMPTS> {
  return SUGGESTED_PROMPTS;
}
