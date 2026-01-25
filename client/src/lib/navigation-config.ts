import {
  LayoutDashboard,
  BarChart3,
  Gift,
  Mail,
  Calendar,
  MessageCircle,
  MessageSquare,
  ListTodo,
  FolderKanban,
  GitBranch,
  Zap,
  HardDrive,
  FileSpreadsheet,
  File,
  Megaphone,
  Star,
  FileText,
  QrCode,
  ExternalLink,
  Dumbbell,
  Settings,
  PlusCircle,
  Wrench,
  Building2,
  Shield,
  ClipboardList,
  BookOpen,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  isExternal?: boolean;
  adminOnly?: boolean;
}

export interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  items: NavItem[];
  adminOnly?: boolean;
}

export const navigationTabs: NavTab[] = [
  {
    id: "home",
    label: "Home",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: FolderKanban,
    items: [
      { id: "mailbox", icon: Mail, label: "Mailbox", href: "/inbox" },
      { id: "calendar", icon: Calendar, label: "Calendar", href: "/calendar" },
      { id: "daily-hub", icon: ClipboardList, label: "Daily Hub", href: "/daily-hub" },
      { id: "intro-offers", icon: Gift, label: "Intro Offers", href: "/intro-offers" },
      { id: "projects", icon: FolderKanban, label: "Projects", href: "/projects" },
      { id: "tasks", icon: ListTodo, label: "Tasks", href: "/tasks" },
      { id: "scoreboard", icon: BarChart3, label: "Scoreboard", href: "/scoreboard" },
    ],
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: FileText,
    items: [
      { id: "chat", icon: MessageCircle, label: "Chat", href: "/chat" },
      { id: "dependencies", icon: GitBranch, label: "Dependencies", href: "/dependency-tracker" },
      { id: "google-docs", icon: File, label: "Google Docs", href: "/google-docs" },
      { id: "google-sheets", icon: FileSpreadsheet, label: "Google Sheets", href: "/google-sheets" },
      { id: "google-drive", icon: HardDrive, label: "Google Drive", href: "/google-drive" },
      { id: "ai-summarize", icon: Zap, label: "AI Summarize", href: "/ai-summarize" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { id: "email-builder", icon: Mail, label: "Email Builder", href: "/email-builder" },
      { id: "brevo", icon: BarChart3, label: "Brevo", href: "/email-activity" },
      { id: "perkville", icon: Star, label: "Perkville", href: "/rewards" },
      { id: "typeform", icon: FileText, label: "Typeform", href: "/typeform" },
      { id: "qr-codes", icon: QrCode, label: "QR Codes", href: "/qr-codes" },
    ],
  },
  {
    id: "external",
    label: "External Sites",
    icon: ExternalLink,
    items: [
      { id: "netgym", icon: Dumbbell, label: "NetGym", href: "https://netgym.com", isExternal: true },
      { id: "mindbody", icon: BarChart3, label: "Mindbody Analytics", href: "https://mindbodyanalytics.com", isExternal: true },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { id: "settings", icon: Settings, label: "Settings", href: "/settings" },
      { id: "connect", icon: PlusCircle, label: "Connect App", href: "/connect" },
      { id: "setup-guide", icon: BookOpen, label: "Setup Guide", href: "/setup-guide" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Wrench,
    adminOnly: true,
    items: [
      { id: "gusto", icon: Building2, label: "HR & Payroll", href: "/gusto", adminOnly: true },
      { id: "announcements", icon: Megaphone, label: "Announcements", href: "/changelog-admin", adminOnly: true },
      { id: "feedback", icon: MessageSquare, label: "Feedback", href: "/feedback", adminOnly: true },
      { id: "system-health", icon: BarChart3, label: "System Health", href: "/system-health", adminOnly: true },
      { id: "admin", icon: Shield, label: "Admin", href: "/admin", adminOnly: true },
    ],
  },
];

export function getNavigationTabs(isAdmin: boolean): NavTab[] {
  return navigationTabs
    .filter(tab => !tab.adminOnly || isAdmin)
    .map(tab => ({
      ...tab,
      items: tab.items.filter(item => !item.adminOnly || isAdmin),
    }));
}
