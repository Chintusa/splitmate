export interface User {
  id: number;
  email: string;
  name: string;
  created_at?: string;
}

export interface Group {
  id: number;
  name: string;
  owner: User;
  members: User[];
  created_at: string;
}

export interface ExpenseSplit {
  id: number;
  user: User;
  share_minor: number;
}

export interface Expense {
  id: number;
  group_id: number;
  created_by: User | null;
  payer: User;
  description: string;
  amount_minor: number;
  date: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: number;
  group_id: number;
  from_user: User;
  to_user: User;
  amount_minor: number;
  created_at: string;
}

export interface Activity {
  id: number;
  group_id: number;
  actor: User | null;
  type: string;
  payload: any;
  created_at: string;
}

export interface NetBalance {
  user_id: number;
  user_name: string;
  user_email: string;
  net_minor: number;
}

export interface SimplifiedDebt {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount_minor: number;
}

export interface GroupBalances {
  net_balances: NetBalance[];
  simplified_debts: SimplifiedDebt[];
}

export interface DashboardSummary {
  total_owed_by_me: number;
  total_owed_to_me: number;
  net_balance: number;
  group_count: number;
  group_where_i_owe_most: {
    id: number;
    name: string;
    amount_minor: number;
  } | null;
  recent_activities: Activity[];
}

export interface HistoryItem {
  type: 'expense' | 'settlement';
  created_at: string;
  data: Expense | Settlement;
  group_name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  group: number | null;
  group_name?: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  action_url: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPreference {
  email_security_alerts: boolean;
  email_expense_updates: boolean;
  email_group_activity: boolean;
  email_settlement_updates: boolean;
  email_balance_reminders: boolean;
  email_product_news: boolean;
  in_app_notifications: boolean;
  updated_at?: string;
}
