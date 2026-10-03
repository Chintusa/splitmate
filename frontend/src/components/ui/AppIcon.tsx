import React from 'react';
import {
  Mail,
  Lock,
  KeyRound,
  User,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCircle2,
  CheckCheck,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
  Receipt,
  Wallet,
  CreditCard,
  PiggyBank,
  IndianRupee,
  Search,
  Send,
  Download,
  Trash2,
  RefreshCw,
  ArrowLeftRight,
  Clock,
  History,
  FileText,
  Calendar,
  Pencil,
  Menu,
  Settings,
  LayoutGrid,
  Home,
  LogOut,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  PlayCircle,
  QrCode,
  MailCheck,
  Hash,
  Key,
  Utensils,
  Car,
  Plane,
  PlaneTakeoff,
  Briefcase,
  FolderOpen,
  FolderSync,
  Network,
  Scale,
  SlidersHorizontal,
  Plus,
  PlusCircle,
  HelpCircle,
  PieChart,
  Split,
  PartyPopper,
  CalendarX,
  UserX,
  LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  // Auth & User
  mail: Mail,
  email: Mail,
  mark_email_read: MailCheck,
  lock: Lock,
  lock_reset: KeyRound,
  key: Key,
  person: User,
  user: User,
  person_add: UserPlus,
  group: Users,
  groups: Users,
  group_add: UserPlus,
  users: Users,
  visibility: Eye,
  visibility_off: EyeOff,
  verified_user: ShieldCheck,

  // Directional & Navigation
  arrow_forward: ArrowRight,
  arrow_back: ArrowLeft,
  arrow_outward: ArrowUpRight,
  arrow_upward_alt: ArrowUp,
  arrow_downward: ArrowDown,
  arrow_downward_alt: ArrowDown,
  chevron_right: ChevronRight,
  expand_more: ChevronDown,

  // Status & Feedback
  check: Check,
  check_circle: CheckCircle2,
  verified: CheckCheck,
  close: X,
  cancel: XCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  priority_high: AlertCircle,
  help: HelpCircle,

  // Actions & Utilities
  search: Search,
  send: Send,
  download: Download,
  delete: Trash2,
  edit: Pencil,
  refresh: RefreshCw,
  sync: RefreshCw,
  sync_alt: ArrowLeftRight,
  menu: Menu,
  settings: Settings,
  add: Plus,
  add_circle: PlusCircle,
  dialpad: Hash,

  // Financial & Commerce
  account_balance_wallet: Wallet,
  wallet: Wallet,
  payments: CreditCard,
  credit_card: CreditCard,
  savings: PiggyBank,
  currency_rupee: IndianRupee,
  receipt: Receipt,
  receipt_long: Receipt,
  pie_chart: PieChart,
  splitscreen: Split,
  split: Split,
  balance: Scale,
  tune: SlidersHorizontal,

  // Activity & Time
  bolt: Zap,
  zap: Zap,
  timer: Clock,
  schedule: Clock,
  history: History,
  history_toggle_off: History,
  history_edu: FileText,
  calendar_today: Calendar,
  calendar_month: Calendar,
  event_busy: CalendarX,
  calendar_x: CalendarX,
  group_off: UserX,
  groups_off: UserX,

  // General & Layout
  grid_view: LayoutGrid,
  dashboard: LayoutGrid,
  home: Home,
  logout: LogOut,
  auto_mode: Sparkles,
  auto_fix_high: Sparkles,
  insights: TrendingUp,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  trending_flat: Minus,
  play_circle: PlayCircle,
  celebration: PartyPopper,
  qr_code_scanner: QrCode,
  restaurant: Utensils,
  villa: Home,
  directions_car: Car,
  flight: Plane,
  flight_takeoff: PlaneTakeoff,
  luggage: Briefcase,
  folder_open: FolderOpen,
  folder_shared: FolderSync,
  hub: Network,
};

export interface AppIconProps {
  name: string;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size,
  className = '',
  strokeWidth = 2,
}) => {
  // Normalize icon name: lowercase and trim
  const cleanName = (name || '').trim().toLowerCase();
  const IconComponent = ICON_MAP[cleanName];

  // Derive pixel size from class or fallback to 18
  let resolvedSize: number = typeof size === 'number' ? size : 18;
  if (typeof size === 'string') {
    const parsed = parseInt(size, 10);
    if (!isNaN(parsed)) resolvedSize = parsed;
  } else if (!size) {
    if (className.includes('text-[14px]') || className.includes('w-3.5')) resolvedSize = 14;
    else if (className.includes('text-[16px]') || className.includes('w-4')) resolvedSize = 16;
    else if (className.includes('text-[18px]') || className.includes('w-4.5')) resolvedSize = 18;
    else if (className.includes('text-[20px]') || className.includes('w-5')) resolvedSize = 20;
    else if (className.includes('text-[22px]')) resolvedSize = 22;
    else if (className.includes('text-[24px]') || className.includes('w-6')) resolvedSize = 24;
    else if (className.includes('text-[26px]')) resolvedSize = 26;
    else if (className.includes('text-[32px]') || className.includes('w-8')) resolvedSize = 32;
    else if (className.includes('text-[34px]')) resolvedSize = 34;
    else if (className.includes('text-[36px]')) resolvedSize = 36;
  }

  if (IconComponent) {
    return (
      <IconComponent
        size={resolvedSize}
        strokeWidth={strokeWidth}
        className={`inline-block shrink-0 align-middle ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Graceful fallback: render Material Symbols ligature if available
  return (
    <span
      className={`material-symbols-outlined inline-block shrink-0 align-middle ${className}`}
      style={{ fontSize: `${resolvedSize}px` }}
      aria-hidden="true"
    >
      {cleanName}
    </span>
  );
};

export default AppIcon;
