export type Role = 'support_agent' | 'senior_support' | 'operations_manager' | 'admin';

export interface Account {
  id: string;
  name: string;
  plan: 'Enterprise' | 'Growth' | 'Standard';
  status: 'active' | 'at_risk' | 'churned';
  csm: string;
  hasAgreement: boolean;
  contractFile: string | null;
  premiumSupport: boolean;
  notes: string;
}

export interface UserContext {
  id: string;
  name: string;
  role: Role;
  roleLabel: string;
  accountScope: Account | null;
  permissions: string[];
}

export interface Order {
  id: string;
  accountId: string;
  carrier: string;
  status: 'BOOKED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  bookedAt: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  pickupActualAt: string | null;
  shipmentFeeInr: number;
  carrierFault: boolean;
  customerFault: boolean;
  cancellationRequestedAt: string | null;
  notes: string;
}

export interface Ticket {
  id: string;
  accountId: string;
  createdAt: string;
  status: 'open' | 'closed' | 'escalated';
  subject: string;
  description: string;
  channel: string;
  assignedTo: string;
  severity: 'P1' | 'P2' | 'P3' | null;
  historicalResolution: string | null;
  isHistoricalTrap: boolean;
}

export type DocType = 'policy' | 'sop' | 'product_guide' | 'agreement';
export type DocStatus = 'current' | 'deprecated';

export interface Document {
  id: string;
  displayTitle: string;
  docType: DocType;
  status: DocStatus;
  effectiveDate: string;
  accountScope: string | null;
}

export type ToolName = 'search_documents' | 'query_structured_data' | 'propose_action' | 'execute_action';
export type ToolStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ToolStep {
  id: string;
  toolName: ToolName;
  label: string;
  status: ToolStepStatus;
  durationMs: number;
  description: string;
  detail?: string;
}

export type SourceType = 'document' | 'order' | 'ticket' | 'account';
export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  shortLabel: string;
  section: string | null;
  excerpt: string;
  isDeprecated: boolean;
  isHistorical: boolean;
  authorityNote: string | null;
  timestamp: string | null;
}

export type ActionType = 'create_escalation' | 'update_ticket' | 'create_followup_task';
export type ActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';

export interface PendingAction {
  actionId: string;
  actionType: ActionType;
  actionLabel: string;
  targetEntityId: string;
  priority: string | null;
  reason: string;
  details: Record<string, string>;
  status: ActionStatus;
  resultId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolSteps?: ToolStep[];
  sources?: Source[];
  confidence?: ConfidenceLevel;
  isHistorical?: boolean;
  conflictDetected?: boolean;
  conflictExplanation?: string | null;
  pendingAction?: PendingAction | null;
  escalationRecommended?: boolean;
  escalationReason?: string | null;
  isStreaming?: boolean;
  streamedContent?: string;
  error?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  status?: 'open' | 'escalated' | 'resolved';
  messages: Message[];
}

export interface ActionConfirmResult {
  actionId: string;
  status: 'confirmed' | 'cancelled' | 'failed';
  resultId?: string;
  message: string;
}
