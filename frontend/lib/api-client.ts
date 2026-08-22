/**
 * api-client.ts — Real backend integration for ParcelPilot Support Agent.
 *
 * All calls go to the FastAPI backend at NEXT_PUBLIC_API_URL (default: http://localhost:8000).
 * The mock layer is kept only as a fallback when NEXT_PUBLIC_USE_MOCK=true (dev/demo only).
 */

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
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Conversation persistence (always local for the demo — backend has no /conversations)
// ---------------------------------------------------------------------------

function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return CONVERSATIONS;
  try {
    const stored = localStorage.getItem('parcelpilot_conversations');
    if (stored) return JSON.parse(stored);
  } catch { /* fallback */ }
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
    window.dispatchEvent(new Event('parcelpilot_storage_update'));
  } catch { /* ignore */ }
}

export async function getConversations(): Promise<Conversation[]> {
  return getStoredConversations();
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const list = getStoredConversations();
  return list.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Stream chunk protocol (mirrors ChatWindow expectations)
// ---------------------------------------------------------------------------

export interface StreamChunk {
  type: 'tool_step' | 'content_delta' | 'sources' | 'metadata' | 'done' | 'error';
  payload: unknown;
}

// ---------------------------------------------------------------------------
// Main chat call — POST /chat
// ---------------------------------------------------------------------------

export async function streamAssistantResponse(
  conversationId: string,
  userMessage: string,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal,
  userContext?: { role: string; account_scope: string | null; user_name: string },
): Promise<void> {
  if (USE_MOCK) {
    await mockStreamResponse(userMessage, onChunk, signal);
    return;
  }

  // Show a "running" tool step immediately so the UI feels responsive
  onChunk({
    type: 'tool_step',
    payload: {
      id: 'step-search-1',
      toolName: 'search_documents',
      label: 'Searching knowledge base',
      status: 'running',
      durationMs: 0,
      description: `Searching documents for: "${userMessage}"`,
    },
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: [],
        user_context: userContext ?? {
          role: 'support_agent',
          account_scope: null,
          user_name: 'support_user',
        },
      }),
      signal,
    });
  } catch {
    onChunk({
      type: 'error',
      payload: 'Failed to connect to backend. Make sure the backend server is running on port 8000.',
    });
    return;
  }

  if (!res.ok) {
    onChunk({ type: 'error', payload: `Backend error: ${res.status} ${res.statusText}` });
    return;
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    onChunk({ type: 'error', payload: 'Backend returned invalid JSON.' });
    return;
  }

  // Emit real tool trace steps from the backend
  const toolTrace = (data.tool_trace as Array<Record<string, unknown>>) ?? [];
  if (toolTrace.length > 0) {
    for (const step of toolTrace) {
      onChunk({
        type: 'tool_step',
        payload: {
          id: `step-${step.tool_name}-${Date.now()}`,
          toolName: step.tool_name,
          label: String(step.description ?? step.tool_name),
          status: step.status === 'completed' ? 'completed' : 'error',
          durationMs: step.duration_ms ?? 0,
          description: String(step.description ?? ''),
        },
      });
    }
  } else {
    // Close the opening step we emitted above
    onChunk({
      type: 'tool_step',
      payload: {
        id: 'step-search-1',
        toolName: 'search_documents',
        label: 'Knowledge base search complete',
        status: 'completed',
        durationMs: 0,
        description: `Searched knowledge base for: "${userMessage}"`,
      },
    });
  }

  // Stream answer word-by-word for a natural feel
  const answer = String(data.answer ?? '');
  const words = answer.split(' ');
  for (const word of words) {
    if (signal?.aborted) return;
    onChunk({ type: 'content_delta', payload: word + ' ' });
    await delay(18);
  }

  // Sources
  const sources = (data.sources as unknown[]) ?? [];
  if (sources.length) {
    onChunk({ type: 'sources', payload: sources });
  }

  // Metadata / pending action
  const pending = (data.pending_action as Record<string, unknown> | null) ?? null;
  onChunk({
    type: 'metadata',
    payload: {
      confidence: data.confidence,
      isHistorical: data.is_historical,
      conflictDetected: data.conflict_detected,
      conflictExplanation: data.conflict_explanation ?? null,
      pendingAction: pending
        ? {
            actionId: pending.action_id,
            actionType: pending.action_type,
            targetEntityId: pending.target_entity_id,
            priority: pending.priority ?? null,
            reason: pending.reason ?? null,
          }
        : null,
      escalationRecommended: data.escalation_recommended ?? false,
      escalationReason: data.escalation_reason ?? null,
      error: null,
    },
  });

  onChunk({ type: 'done', payload: null });
}

// ---------------------------------------------------------------------------
// Action confirmation — POST /actions/{id}/confirm
// ---------------------------------------------------------------------------

export async function confirmAction(actionId: string): Promise<ActionConfirmResult> {
  if (USE_MOCK) {
    await delay(600);
    return {
      actionId,
      status: 'confirmed',
      resultId: `ESC-${Math.floor(2000 + Math.random() * 100)}`,
      message: 'Escalation created successfully. Security team notified.',
    };
  }
  const res = await fetch(`${BASE_URL}/actions/${actionId}/confirm`, { method: 'POST' });
  if (!res.ok) {
    return { actionId, status: 'error', message: `Server error: ${res.status}` };
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Action cancel — POST /actions/{id}/cancel
// ---------------------------------------------------------------------------

export async function cancelAction(actionId: string): Promise<ActionConfirmResult> {
  if (USE_MOCK) {
    await delay(150);
    return { actionId, status: 'cancelled', message: 'Action cancelled. No changes made.' };
  }
  const res = await fetch(`${BASE_URL}/actions/${actionId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    return { actionId, status: 'error', message: `Server error: ${res.status}` };
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Roles / Accounts — use local mock data (no backend endpoint for these)
// ---------------------------------------------------------------------------

export async function getRoles(): Promise<UserContext[]> {
  return USERS;
}

export async function getAccounts(): Promise<Account[]> {
  return ACCOUNTS;
}

export async function getSuggestedPrompts(): Promise<typeof SUGGESTED_PROMPTS> {
  return SUGGESTED_PROMPTS;
}

// ---------------------------------------------------------------------------
// Mock stream (only active when NEXT_PUBLIC_USE_MOCK=true)
// ---------------------------------------------------------------------------

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
    lower.includes('agreement') ||
    lower.includes('billing') ||
    lower.includes('wire transfer');

  if (lower.includes('northstar') && lower.includes('cancel') && !lower.includes('histor')) {
    const { SCENARIO_1 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_1[1];
  } else if (lower.includes('histor') || lower.includes('before')) {
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
  } else if (!isLogisticsRelated || lower.includes('who is') || lower.includes('weather')) {
    scenario = {
      id: `out-of-scope-${Date.now()}`,
      role: 'assistant',
      content:
        'I am the ParcelPilot AI Internal Support & Operations Agent. Your question does not appear to be related to ParcelPilot logistics operations. Please ask a question related to orders, tickets, contracts, or support policies.',
      timestamp: new Date().toISOString(),
      confidence: 'low',
      toolSteps: [
        {
          id: 'step-scope-1',
          toolName: 'search_documents',
          label: 'Domain Relevance Check',
          status: 'completed',
          durationMs: 12,
          description: 'Evaluated prompt domain relevance: OUT OF SCOPE',
        },
      ],
      sources: [],
    };
  } else {
    const { SCENARIO_1 } = await import('@/lib/mock-data/messages');
    scenario = SCENARIO_1[1];
  }

  if (!scenario) return;

  if (scenario.toolSteps) {
    for (const step of scenario.toolSteps) {
      if (signal?.aborted) return;
      onChunk({ type: 'tool_step', payload: { ...step, status: 'running' } });
      await delay(350);
      if (signal?.aborted) return;
      onChunk({ type: 'tool_step', payload: { ...step, status: step.status } });
      await delay(120);
    }
  }

  if (scenario.content && !scenario.error) {
    const words = scenario.content.split(' ');
    for (const word of words) {
      if (signal?.aborted) return;
      onChunk({ type: 'content_delta', payload: word + ' ' });
      await delay(25);
    }
  }

  if (scenario.sources?.length) {
    await delay(150);
    onChunk({ type: 'sources', payload: scenario.sources });
  }

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
