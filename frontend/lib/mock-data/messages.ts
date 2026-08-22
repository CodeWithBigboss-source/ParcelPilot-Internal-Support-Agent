import type { Message } from '@/lib/types';

// ── Scenario 1: Grounded answer — Northstar cancellation ─────────────────────
export const SCENARIO_1: Message[] = [
  {
    id: 'msg-s1-1',
    role: 'user',
    content: 'Can Northstar Logistics cancel ORD-1001 without incurring a cancellation fee?',
    timestamp: '2024-08-15T09:14:00Z',
  },
  {
    id: 'msg-s1-2',
    role: 'assistant',
    content: `**Yes — Northstar Logistics can cancel ORD-1001 without a cancellation fee**, based on the terms in their signed Enterprise Agreement.

**Key finding:** The **Northstar Logistics Enterprise Agreement §2.3** explicitly grants fee-free cancellation at any time before pickup is confirmed, regardless of the default cancellation policy. This customer-specific agreement takes precedence over the standard Cancellation SOP v4.

**Order status:** ORD-1001 is currently in **BOOKED** status — pickup has not yet occurred. The cancellation window is still open.

**Recommended action:** Process the cancellation as fee-free. No credit note required. Notify the carrier (BlueDart) immediately.`,
    timestamp: '2024-08-15T09:14:06Z',
    toolSteps: [
      {
        id: 'ts-s1-1',
        toolName: 'query_structured_data',
        label: 'Lookup ORD-1001',
        status: 'completed',
        durationMs: 312,
        description: 'Queried order status, pickup window, carrier, and account scope.',
        detail: 'Account: ACCT-001 | Status: BOOKED | Carrier: BlueDart | No pickup yet',
      },
      {
        id: 'ts-s1-2',
        toolName: 'search_documents',
        label: 'Search cancellation policy',
        status: 'completed',
        durationMs: 481,
        description: 'Vector search: "cancellation fee pre-pickup Enterprise account".',
        detail: 'Top results: Northstar Agreement §2.3 (score 0.94), Cancellation SOP v4 §3.1 (score 0.81)',
      },
      {
        id: 'ts-s1-3',
        toolName: 'search_documents',
        label: 'Verify agreement authority',
        status: 'completed',
        durationMs: 198,
        description: 'Confirmed agreement supersedes default SOP for account ACCT-001.',
        detail: 'Authority: Customer Agreement > Default Policy. Conflict resolved.',
      },
    ],
    sources: [
      {
        id: 'src-s1-1',
        type: 'document',
        title: 'Northstar Logistics Enterprise Agreement',
        shortLabel: 'NL Agreement §2.3',
        section: '§2.3 — Cancellation Terms',
        excerpt:
          'Northstar Logistics may cancel any booked shipment prior to confirmed carrier pickup without incurring a cancellation charge. This supersedes the standard ParcelPilot Cancellation Policy for the duration of this agreement.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Customer agreement — highest authority. Overrides default SOP.',
        timestamp: '2024-01-15T00:00:00Z',
      },
      {
        id: 'src-s1-2',
        type: 'document',
        title: 'Cancellation SOP v4',
        shortLabel: 'Cancellation SOP §3.1',
        section: '§3.1 — Standard Fee Schedule',
        excerpt:
          'Cancellations within 2 hours of booked pickup incur a ₹150 handling fee. Enterprise accounts are subject to plan-specific terms.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Default policy — superseded by Northstar Agreement for ACCT-001.',
        timestamp: '2024-03-01T00:00:00Z',
      },
      {
        id: 'src-s1-3',
        type: 'order',
        title: 'ORD-1001',
        shortLabel: 'ORD-1001',
        section: null,
        excerpt: 'Status: BOOKED. Pickup not yet confirmed. Account: ACCT-001 (Northstar Logistics). Carrier: BlueDart.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: null,
        timestamp: '2024-08-14T11:00:00Z',
      },
    ],
    confidence: 'high',
    isHistorical: false,
    conflictDetected: true,
    conflictExplanation:
      'Conflict detected between Northstar Agreement §2.3 (fee-free) and Cancellation SOP v4 §3.1 (₹150 fee). Resolved: Customer Agreement takes precedence.',
    pendingAction: null,
    escalationRecommended: false,
  },
];

// ── Scenario 2: Historical evidence — Northstar dispute history ───────────────
export const SCENARIO_2: Message[] = [
  {
    id: 'msg-s2-1',
    role: 'user',
    content: 'Has Northstar Logistics had cancellation fee disputes before? Any historical context?',
    timestamp: '2024-08-15T09:18:00Z',
  },
  {
    id: 'msg-s2-2',
    role: 'assistant',
    content: `**Yes — there is relevant historical evidence**, but it requires careful interpretation.

**Historical ticket TKT-450 (closed, 2023-11-02)** records a cancellation fee dispute where Northstar was initially charged ₹150. The ticket resolution noted the fee was "waived as goodwill gesture."

> ⚠️ **Historical evidence — use with caution.** TKT-450 was resolved before Northstar's current Enterprise Agreement was signed (effective 2024-01-15). The waiver was discretionary, not policy-driven. **The current agreement now provides a contractual right to fee-free cancellation** — this is stronger than the historical waiver and should be the primary basis for any current decision.

The historical resolution in TKT-450 was correct in outcome but incorrect in rationale — it cited goodwill rather than contractual entitlement. Do not use TKT-450 as precedent; use the current agreement.`,
    timestamp: '2024-08-15T09:18:08Z',
    toolSteps: [
      {
        id: 'ts-s2-1',
        toolName: 'search_documents',
        label: 'Search historical tickets',
        status: 'completed',
        durationMs: 524,
        description: 'Vector search: "Northstar cancellation fee dispute historical".',
        detail: 'Found TKT-450 (2023-11-02, closed). Flagged as historical evidence.',
      },
      {
        id: 'ts-s2-2',
        toolName: 'search_documents',
        label: 'Verify current agreement date',
        status: 'completed',
        durationMs: 211,
        description: 'Confirmed Northstar Agreement effective date: 2024-01-15 — after TKT-450.',
        detail: 'TKT-450 predates agreement. Historical context only.',
      },
    ],
    sources: [
      {
        id: 'src-s2-1',
        type: 'ticket',
        title: 'TKT-450 — Cancellation Fee Dispute',
        shortLabel: 'TKT-450',
        section: 'Resolution Notes',
        excerpt:
          'Customer disputed ₹150 cancellation fee for ORD-0891. Fee waived as goodwill gesture per agent discretion. Account flagged for VIP handling.',
        isDeprecated: false,
        isHistorical: true,
        authorityNote: 'Historical ticket — predates current Enterprise Agreement. Goodwill waiver, not contractual.',
        timestamp: '2023-11-02T14:30:00Z',
      },
      {
        id: 'src-s2-2',
        type: 'document',
        title: 'Northstar Logistics Enterprise Agreement',
        shortLabel: 'NL Agreement §2.3',
        section: '§2.3 — Cancellation Terms',
        excerpt:
          'Effective 2024-01-15. Supersedes all prior discretionary arrangements. Cancellation before pickup: no charge.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Current authority. Supersedes historical ticket resolutions.',
        timestamp: '2024-01-15T00:00:00Z',
      },
    ],
    confidence: 'moderate',
    isHistorical: true,
    conflictDetected: false,
    pendingAction: null,
    escalationRecommended: false,
  },
];

// ── Scenario 3: Pending action — Escalate TKT-505 ────────────────────────────
export const SCENARIO_3: Message[] = [
  {
    id: 'msg-s3-1',
    role: 'user',
    content: 'Create a P1 escalation for TKT-505 — possible API key exposure.',
    timestamp: '2024-08-15T09:22:00Z',
  },
  {
    id: 'msg-s3-2',
    role: 'assistant',
    content: `**Security incident identified — immediate escalation required.**

TKT-505 involves a suspected API key exposure for account ACCT-001 (Northstar Logistics). Per the Security Incident Response SOP, any suspected credential exposure must be escalated to P1 within 15 minutes of identification and routed to the Security team.

**Proposed action:** Create P1 escalation ticket.

⚠️ **This action requires your confirmation before execution.**`,
    timestamp: '2024-08-15T09:22:07Z',
    toolSteps: [
      {
        id: 'ts-s3-1',
        toolName: 'query_structured_data',
        label: 'Lookup TKT-505',
        status: 'completed',
        durationMs: 287,
        description: 'Retrieved ticket details, current status, and account scope.',
        detail: 'TKT-505 | Status: open | Account: ACCT-001 | Severity: unset | Channel: email',
      },
      {
        id: 'ts-s3-2',
        toolName: 'search_documents',
        label: 'Check security incident policy',
        status: 'completed',
        durationMs: 398,
        description: 'Retrieved Security Incident Response SOP — P1 escalation criteria.',
        detail: 'Credential exposure → P1, escalate within 15 min, assign Security team.',
      },
      {
        id: 'ts-s3-3',
        toolName: 'propose_action',
        label: 'Propose P1 escalation',
        status: 'completed',
        durationMs: 91,
        description: 'Action proposed — awaiting human confirmation.',
        detail: 'Action: create_escalation | Target: TKT-505 | Priority: P1',
      },
    ],
    sources: [
      {
        id: 'src-s3-1',
        type: 'document',
        title: 'Security Incident Response SOP v2',
        shortLabel: 'Security SOP §4.1',
        section: '§4.1 — Credential Exposure Protocol',
        excerpt:
          'Any suspected API key, password, or credential exposure must be classified P1 immediately. Assign to Security team. Notify CSM and account within 1 hour.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Mandatory procedure — no discretion permitted for P1 classification.',
        timestamp: '2024-06-01T00:00:00Z',
      },
      {
        id: 'src-s3-2',
        type: 'ticket',
        title: 'TKT-505 — Suspected API Key Exposure',
        shortLabel: 'TKT-505',
        section: 'Description',
        excerpt: 'Customer reported API key may have been exposed in a debug log. Currently open, unassigned. Account: ACCT-001.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: null,
        timestamp: '2024-08-15T08:55:00Z',
      },
    ],
    confidence: 'high',
    isHistorical: false,
    conflictDetected: false,
    pendingAction: {
      actionId: 'act-001',
      actionType: 'create_escalation',
      actionLabel: 'Create P1 Escalation',
      targetEntityId: 'TKT-505',
      priority: 'P1',
      reason: 'Suspected API key / credential exposure — Security Incident Response SOP §4.1 requires immediate P1 escalation.',
      details: {
        'Target Ticket': 'TKT-505',
        'Account': 'ACCT-001 (Northstar Logistics)',
        'Priority': 'P1',
        'Assign To': 'Security Team',
        'CSM Notification': 'Priya Mehta',
        'SLA': 'Respond within 15 minutes',
      },
      status: 'pending',
    },
    escalationRecommended: true,
    escalationReason: 'Security incident — P1 per Security Incident Response SOP §4.1',
  },
];

// ── Scenario 4: Tool failure — ORD-2002 status ───────────────────────────────
export const SCENARIO_4: Message[] = [
  {
    id: 'msg-s4-1',
    role: 'user',
    content: "What's the current status of ORD-2002?",
    timestamp: '2024-08-15T09:27:00Z',
  },
  {
    id: 'msg-s4-2',
    role: 'assistant',
    content: '',
    timestamp: '2024-08-15T09:27:05Z',
    toolSteps: [
      {
        id: 'ts-s4-1',
        toolName: 'query_structured_data',
        label: 'Lookup ORD-2002',
        status: 'failed',
        durationMs: 2103,
        description: 'Database query timed out. Order record may be temporarily unavailable.',
        detail: 'Error: Connection timeout after 2000ms. Retry may succeed.',
      },
    ],
    sources: [],
    confidence: undefined,
    error:
      'Could not retrieve ORD-2002 data — the structured data tool returned a timeout error. This is likely transient. Please retry or check the order directly in the operations dashboard.',
    pendingAction: null,
  },
];

// ── Scenario 5: LumenWorks credit eligibility ─────────────────────────────────
export const SCENARIO_5: Message[] = [
  {
    id: 'msg-s5-1',
    role: 'user',
    content: 'Is LumenWorks eligible for a service credit on ORD-2002? Pickup was delayed 5 hours.',
    timestamp: '2024-08-15T09:30:00Z',
  },
  {
    id: 'msg-s5-2',
    role: 'assistant',
    content: `**Yes — LumenWorks is eligible for a ₹300 fixed service credit** on ORD-2002.

**Basis:** The **LumenWorks Service Agreement §3.2** specifies a fixed ₹300 credit when carrier pickup delay exceeds 4 hours and the delay is not customer-caused. ORD-2002 shows a 5-hour delay attributed to carrier (BlueDart) — not to LumenWorks.

**Note:** The Default Service Credit Policy v2 uses a sliding scale (₹50 per hour, max ₹400). However, the LumenWorks agreement's fixed ₹300 credit supersedes this calculation. Use the fixed amount.

**Recommended next step:** Issue ₹300 credit to ACCT-002 account balance, referencing ORD-2002 and LumenWorks Agreement §3.2.`,
    timestamp: '2024-08-15T09:30:09Z',
    toolSteps: [
      {
        id: 'ts-s5-1',
        toolName: 'query_structured_data',
        label: 'Lookup ORD-2002',
        status: 'completed',
        durationMs: 301,
        description: 'Retrieved order record, pickup timeline, and fault attribution.',
        detail: 'Account: ACCT-002 | Delay: 5.1hr | Carrier fault: true | Customer fault: false',
      },
      {
        id: 'ts-s5-2',
        toolName: 'search_documents',
        label: 'Search credit policy',
        status: 'completed',
        durationMs: 463,
        description: 'Vector search: "service credit pickup delay LumenWorks".',
        detail: 'Top: LumenWorks Agreement §3.2 (0.91), Service Credit Policy v2 §2 (0.79)',
      },
    ],
    sources: [
      {
        id: 'src-s5-1',
        type: 'document',
        title: 'LumenWorks Service Agreement',
        shortLabel: 'LW Agreement §3.2',
        section: '§3.2 — Service Level Credits',
        excerpt:
          'In the event of carrier pickup delay exceeding 4 hours where the delay is not attributable to LumenWorks, ParcelPilot shall issue a fixed credit of ₹300 to the account balance within 5 business days.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Customer agreement — higher authority than default credit policy.',
        timestamp: '2024-02-01T00:00:00Z',
      },
      {
        id: 'src-s5-2',
        type: 'document',
        title: 'Default Service Credit Policy v2',
        shortLabel: 'Credit Policy §2',
        section: '§2 — Pickup Delay Credits',
        excerpt:
          'For pickup delays > 2hr: ₹50 per hour delay, maximum ₹400. Applicable to all accounts without specific agreement terms.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: 'Default policy — superseded by LumenWorks Agreement for ACCT-002.',
        timestamp: '2024-04-01T00:00:00Z',
      },
      {
        id: 'src-s5-3',
        type: 'order',
        title: 'ORD-2002',
        shortLabel: 'ORD-2002',
        section: null,
        excerpt: 'Account: ACCT-002 (LumenWorks). Carrier: BlueDart. Delay: 5.1 hours. Carrier fault: yes. Customer fault: no.',
        isDeprecated: false,
        isHistorical: false,
        authorityNote: null,
        timestamp: '2024-08-14T10:00:00Z',
      },
    ],
    confidence: 'high',
    isHistorical: false,
    conflictDetected: true,
    conflictExplanation:
      'Conflict between LumenWorks Agreement §3.2 (₹300 fixed) and Default Credit Policy (sliding scale). Resolved: Customer Agreement takes precedence.',
    pendingAction: null,
    escalationRecommended: false,
  },
];
