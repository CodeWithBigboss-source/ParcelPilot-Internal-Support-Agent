export interface SuggestedPrompt {
  id: string;
  category: 'Contract & SOP' | 'Historical Audit' | 'Incident & Security' | 'System Error' | 'SLA & Credit';
  title: string;
  prompt: string;
  description: string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'sp-1',
    category: 'Contract & SOP',
    title: 'Northstar Cancellation Fee',
    prompt: 'Can Northstar Logistics cancel ORD-1001 without incurring a cancellation fee?',
    description: 'Verifies Northstar Enterprise Agreement §2.3 precedence over Cancellation SOP v4.',
  },
  {
    id: 'sp-2',
    category: 'Historical Audit',
    title: 'Historical Fee Disputes',
    prompt: 'Has Northstar Logistics had cancellation fee disputes before? Any historical context?',
    description: 'Surfaces TKT-450 historical ticket evidence with amber caution callout.',
  },
  {
    id: 'sp-3',
    category: 'Incident & Security',
    title: 'API Key Exposure (P1)',
    prompt: 'Create a P1 escalation for TKT-505 — possible API key exposure.',
    description: 'Triggers P1 security incident workflow and Pending Action confirmation card.',
  },
  {
    id: 'sp-4',
    category: 'SLA & Credit',
    title: 'LumenWorks Service Credit',
    prompt: 'Is LumenWorks eligible for a service credit on ORD-2002? Pickup was delayed 5 hours.',
    description: 'Evaluates fixed ₹300 agreement terms vs default sliding scale policy.',
  },
  {
    id: 'sp-5',
    category: 'System Error',
    title: 'Test Tool Failure Recovery',
    prompt: "What's the current status of ORD-2002?",
    description: 'Demonstrates tool failure handling with retry option when data lookup times out.',
  },
];
