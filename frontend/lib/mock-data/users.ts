import type { UserContext } from '@/lib/types';
import { ACCOUNTS } from './accounts';

export const USERS: UserContext[] = [
  {
    id: 'user-001',
    name: 'Aisha Khan',
    role: 'support_agent',
    roleLabel: 'Support Agent',
    accountScope: null,
    permissions: ['read_tickets', 'read_orders', 'read_policies', 'propose_actions'],
  },
  {
    id: 'user-002',
    name: 'Rahul Sharma',
    role: 'senior_support',
    roleLabel: 'Senior Support',
    accountScope: null,
    permissions: [
      'read_tickets',
      'read_orders',
      'read_policies',
      'read_agreements',
      'propose_actions',
      'execute_actions',
      'create_escalations',
    ],
  },
  {
    id: 'user-003',
    name: 'Priya Mehta',
    role: 'operations_manager',
    roleLabel: 'Operations Manager',
    accountScope: null,
    permissions: [
      'read_tickets',
      'read_orders',
      'read_policies',
      'read_agreements',
      'read_all_accounts',
      'propose_actions',
      'execute_actions',
      'create_escalations',
      'override_decisions',
    ],
  },
  {
    id: 'user-004',
    name: 'Vikram Singh',
    role: 'admin',
    roleLabel: 'Admin',
    accountScope: null,
    permissions: ['*'],
  },
];

export const DEFAULT_USER = USERS[1]; // Senior Support as default
