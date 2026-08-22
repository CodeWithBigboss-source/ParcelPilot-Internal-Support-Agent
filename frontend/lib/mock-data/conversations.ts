import type { Conversation } from '@/lib/types';
import { SCENARIO_1, SCENARIO_2, SCENARIO_3, SCENARIO_4, SCENARIO_5 } from './messages';

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Northstar ORD-1001 cancellation',
    preview: 'Can Northstar cancel ORD-1001 without a fee?',
    timestamp: '2024-08-15T09:14:00Z',
    status: 'resolved',
    messages: SCENARIO_1,
  },
  {
    id: 'conv-002',
    title: 'Northstar historical fee disputes',
    preview: 'Has Northstar had cancellation disputes before?',
    timestamp: '2024-08-15T09:18:00Z',
    status: 'resolved',
    messages: SCENARIO_2,
  },
  {
    id: 'conv-003',
    title: 'TKT-505 — API key exposure P1',
    preview: 'Create P1 escalation for TKT-505.',
    timestamp: '2024-08-15T09:22:00Z',
    status: 'escalated',
    messages: SCENARIO_3,
  },
  {
    id: 'conv-004',
    title: 'ORD-2002 status check',
    preview: "What's the current status of ORD-2002?",
    timestamp: '2024-08-15T09:27:00Z',
    status: 'open',
    messages: SCENARIO_4,
  },
  {
    id: 'conv-005',
    title: 'LumenWorks ORD-2002 service credit',
    preview: 'Is LumenWorks eligible for a credit on ORD-2002?',
    timestamp: '2024-08-15T09:30:00Z',
    status: 'resolved',
    messages: SCENARIO_5,
  },
];
