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
  Building2,
  Shield,
  ClipboardList,
  BookOpen,
  Video,
  LucideIcon,
} from "lucide-react";

export type UserRole = 'admin' | 'user' | 'staff';

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  isExternal?: boolean;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
}

export interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  items: NavItem[];
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
}

export const navigationTabs: NavTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [
      { id: "mailbox", icon: Mail, label: "Mailbox", href: "/inbox", allowedRoles: ['admin', 'user', 'staff'] },
      { id: "calendar", icon: Calendar, label: "Calendar", href: "/calendar", allowedRoles: ['admin', 'user', 'staff'] },
      { id: "daily-hub", icon: ClipboardList, label: "Daily Hub", href: "/daily-hub", allowedRoles: ['admin', 'user', 'staff'] },
      { id: "intro-offers", icon: Gift, label: "Intro Offers", href: "/intro-offers", allowedRoles: ['admin', 'user'] },
      { id: "projects", icon: FolderKanban, label: "Projects", href: "/projects", allowedRoles: ['admin', 'user', 'staff'] },
      { id: "tasks", icon: ListTodo, label: "Tasks", href: "/tasks", allowedRoles: ['admin', 'user', 'staff'] },
      { id: "scoreboard", icon: BarChart3, label: "Scoreboard", href: "/scoreboard", allowedRoles: ['admin', 'user'] },
    ],
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: FileText,
    allowedRoles: ['admin', 'user'],
    items: [
      { id: "chat", icon: MessageCircle, label: "Chat", href: "/chat", allowedRoles: ['admin', 'user'] },
      { id: "fathom", icon: Video, label: "Fathom Meetings", href: "/fathom", allowedRoles: ['admin', 'user'] },
      { id: "dependencies", icon: GitBranch, label: "Dependencies", href: "/dependency-tracker", allowedRoles: ['admin', 'user'] },
      { id: "google-docs", icon: File, label: "Google Docs", href: "/google-docs", allowedRoles: ['admin', 'user'] },
      { id: "google-sheets", icon: FileSpreadsheet, label: "Google Sheets", href: "/google-sheets", allowedRoles: ['admin', 'user'] },
      { id: "google-drive", icon: HardDrive, label: "Google Drive", href: "/google-drive", allowedRoles: ['admin', 'user'] },
      { id: "ai-summarize", icon: Zap, label: "AI Summarize", href: "/ai-summarize", allowedRoles: ['admin', 'user'] },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    allowedRoles: ['admin', 'user'],
    items: [
      { id: "email-builder", icon: Mail, label: "Email Builder", href: "/email-builder", allowedRoles: ['admin', 'user'] },
      { id: "brevo", icon: BarChart3, label: "Brevo", href: "/email-activity", allowedRoles: ['admin', 'user'] },
      { id: "perkville", icon: Star, label: "Perkville", href: "/rewards", allowedRoles: ['admin', 'user'] },
      { id: "typeform", icon: FileText, label: "Typeform", href: "/typeform", allowedRoles: ['admin', 'user'] },
      { id: "qr-codes", icon: QrCode, label: "QR Codes", href: "/qr-codes", allowedRoles: ['admin', 'user'] },
    ],
  },
  {
    id: "external",
    label: "External Sites",
    icon: ExternalLink,
    allowedRoles: ['admin', 'user'],
    items: [
      { id: "netgym", icon: Dumbbell, label: "NetGym", href: "https://netgym.com", isExternal: true, allowedRoles: ['admin', 'user'] },
      { id: "mindbody", icon: BarChart3, label: "Mindbody Analytics", href: "https://mindbodyanalytics.com", isExternal: true, allowedRoles: ['admin', 'user'] },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    allowedRoles: ['admin', 'user'],
    items: [
      { id: "settings", icon: Settings, label: "Settings", href: "/settings", allowedRoles: ['admin', 'user'] },
      { id: "connect", icon: PlusCircle, label: "Connect App", href: "/connect", allowedRoles: ['admin', 'user'] },
      { id: "setup-guide", icon: BookOpen, label: "Setup Guide", href: "/setup-guide", allowedRoles: ['admin', 'user'] },
      // Admin-only items below
      { id: "admin", icon: Shield, label: "Admin Panel", href: "/admin", allowedRoles: ['admin'] },
      { id: "gusto", icon: Building2, label: "HR & Payroll", href: "/gusto", allowedRoles: ['admin'] },
      { id: "announcements", icon: Megaphone, label: "Announcements", href: "/changelog-admin", allowedRoles: ['admin'] },
      { id: "feedback", icon: MessageSquare, label: "Feedback", href: "/feedback", allowedRoles: ['admin'] },
      { id: "system-health", icon: BarChart3, label: "System Health", href: "/system-health", allowedRoles: ['admin'] },
    ],
  },
];

export function getNavigationTabs(isAdmin: boolean, role?: UserRole): NavTab[] {
  const userRole = role || (isAdmin ? 'admin' : 'user');
  
  return navigationTabs
    .filter(tab => {
      if (tab.allowedRoles) {
        return tab.allowedRoles.includes(userRole);
      }
      return !tab.adminOnly || isAdmin;
    })
    .map(tab => ({
      ...tab,
      items: tab.items.filter(item => {
        if (item.allowedRoles) {
          return item.allowedRoles.includes(userRole);
        }
        return !item.adminOnly || isAdmin;
      }),
    }))
    .filter(tab => tab.items.length > 0);
}
