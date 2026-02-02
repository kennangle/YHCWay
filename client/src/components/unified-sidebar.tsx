import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Inbox, 
  Calendar as CalendarIcon, 
  MessageCircle,
  FolderKanban,
  ListTodo,
  FileText,
  File,
  FileSpreadsheet,
  HardDrive,
  Settings, 
  PlusCircle,
  Shield,
  Mail,
  Gift,
  BookOpen,
  QrCode,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Zap,
  Wrench,
  Star,
  Rocket,
  Clock,
  BarChart3,
  Building2,
  PanelLeftClose,
  PanelLeft,
  History,
  Presentation,
  Megaphone,
  Users,
  ExternalLink,
  Dumbbell,
  GitBranch,
  MessageSquare,
  Video
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarContext } from "@/hooks/useSidebarCollapse";
import yhcLogo from "@assets/logo_bug_1024_1767889616107.jpg";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
  kenOnly?: boolean;
  isExternal?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
  defaultCollapsed?: boolean;
}

export function UnifiedSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isCollapsed, toggle: toggleSidebar } = useSidebarContext();
  
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed-groups');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return { operations: true };
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed-groups', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const topNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", tourId: "nav-dashboard" },
    { icon: BarChart3, label: "Scoreboard", href: "/scoreboard", tourId: "nav-scoreboard" },
    { icon: Gift, label: "Intro Offers", href: "/intro-offers", tourId: "nav-intro-offers" },
    { icon: Mail, label: "Mailbox", href: "/inbox", tourId: "nav-inbox" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar", tourId: "nav-calendar" },
    { icon: Zap, label: "AI Summarize", href: "/ai-summarize", tourId: "nav-ai-summarize" },
    { icon: Rocket, label: "Setup Guide", href: "/setup-guide", tourId: "nav-setup-guide" },
    { icon: Presentation, label: "Presentation", href: "/presentation", tourId: "nav-presentation", adminOnly: true },
  ];

  const navGroups: NavGroup[] = [
    {
      id: 'productivity',
      label: 'Productivity',
      icon: FileText,
      defaultCollapsed: false,
      items: [
        { icon: MessageCircle, label: "Chat", href: "/chat", tourId: "nav-chat" },
        { icon: Video, label: "Fathom Meetings", href: "/fathom", tourId: "nav-fathom" },
        { icon: ListTodo, label: "Tasks", href: "/tasks", tourId: "nav-tasks" },
        { icon: FolderKanban, label: "Projects", href: "/projects", tourId: "nav-projects" },
        { icon: HardDrive, label: "Google Drive", href: "/google-drive", tourId: "nav-google-drive" },
        { icon: FileSpreadsheet, label: "Google Sheets", href: "/google-sheets", tourId: "nav-google-sheets" },
        { icon: File, label: "Google Docs", href: "/google-docs", tourId: "nav-google-docs" },
        { icon: GitBranch, label: "Dependencies", href: "/dependency-tracker", tourId: "nav-dependencies" },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: Megaphone,
      defaultCollapsed: false,
      items: [
        { icon: Mail, label: "Email Builder", href: "/email-builder", tourId: "nav-email-builder" },
        { icon: BarChart3, label: "Brevo", href: "/email-activity", tourId: "nav-email-activity" },
        { icon: Star, label: "Perkville", href: "/rewards", tourId: "nav-rewards" },
        { icon: FileText, label: "Typeform", href: "/typeform", tourId: "nav-typeform" },
        { icon: QrCode, label: "QR Codes", href: "/qr-codes", tourId: "nav-qr-codes" },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Wrench,
      defaultCollapsed: true,
      items: [
        { icon: Building2, label: "HR & Payroll", href: "/gusto", tourId: "nav-gusto", adminOnly: true },
        { icon: Megaphone, label: "Announcements", href: "/changelog-admin", tourId: "nav-announcements", adminOnly: true },
        { icon: MessageSquare, label: "Feedback", href: "/feedback", tourId: "nav-feedback", adminOnly: true },
        { icon: PlusCircle, label: "Connect App", href: "/connect", tourId: "nav-connect" },
        { icon: Settings, label: "Settings", href: "/settings", tourId: "nav-settings" },
        { icon: Shield, label: "Admin", href: "/admin", tourId: "nav-admin", adminOnly: true },
        ...(import.meta.env.DEV ? [{ icon: History, label: "Development Log", href: "/changelog", tourId: "nav-changelog", kenOnly: true }] : []),
      ],
    },
    {
      id: 'external',
      label: 'External Sites',
      icon: ExternalLink,
      defaultCollapsed: true,
      items: [
        { icon: Dumbbell, label: "NetGym", href: "https://netgym.com", tourId: "nav-netgym", isExternal: true },
        { icon: BarChart3, label: "Mindbody Analytics", href: "https://mindbodyanalytics.com", tourId: "nav-mindbody-analytics", isExternal: true },
      ],
    },
  ];

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      const parts = user.firstName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const initials = getInitials();

  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Inbox, label: "Dashboard", href: "/dashboard" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
    { icon: FolderKanban, label: "Projects", href: "/projects" },
    { icon: ListTodo, label: "Tasks", href: "/tasks" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !user?.isAdmin) return null;
    if (item.kenOnly && user?.email !== "ken@yogahealthcenter.com") return null;
    
    const isActive = !item.isExternal && location === item.href;
    
    const navContent = (
      <div 
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
          isActive 
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
            : "text-muted-foreground hover:bg-white/50 hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )}
        data-tour={item.tourId}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        {!isCollapsed && (
          <span className="text-sm font-medium flex items-center gap-1">
            {item.label}
            {item.isExternal && <ExternalLink className="w-3 h-3 opacity-50" />}
          </span>
        )}
      </div>
    );

    if (item.isExternal) {
      if (isCollapsed) {
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <a href={item.href} target="_blank" rel="noopener noreferrer">{navContent}</a>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label} (opens in new tab)</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return (
        <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
          {navContent}
        </a>
      );
    }

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={item.href}>{navContent}</Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link key={item.href} href={item.href}>
        {navContent}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex h-screen glass-panel flex-col border-r border-white/20 fixed left-0 top-0 z-50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn("p-4 flex items-center gap-3", isCollapsed ? "justify-center" : "p-6")} data-tour="sidebar-logo">
          <img src={yhcLogo} alt="YHC Logo" className={cn("rounded-xl object-cover shadow-lg transition-all", isCollapsed ? "w-8 h-8" : "w-10 h-10")} />
          {!isCollapsed && (
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              The YHC Way
            </span>
          )}
        </div>

        <div className={cn("flex-1 py-4 space-y-4 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
          {/* Top-level navigation items */}
          <div className="space-y-1">
            {topNavItems.filter(item => !item.adminOnly || user?.isAdmin).map(renderNavItem)}
          </div>

          {navGroups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id] ?? group.defaultCollapsed;
            const visibleItems = group.items.filter(item => !item.adminOnly || user?.isAdmin);
            
            if (visibleItems.length === 0) return null;
            
            if (isCollapsed) {
              return (
                <div key={group.id} className="space-y-1">
                  {visibleItems.map(renderNavItem)}
                </div>
              );
            }
            
            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-white/30"
                  data-testid={`toggle-group-${group.id}`}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5" />
                    <span>{group.label}</span>
                  </div>
                  {isGroupCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                
                {!isGroupCollapsed && (
                  <div className="space-y-1 ml-1">
                    {visibleItems.map(renderNavItem)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={cn("p-4 mt-auto", isCollapsed && "p-2")}>
          <div className={cn("pt-4 border-t border-border", isCollapsed ? "px-0" : "px-2")}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/setup-guide">
                      <div className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Setup Guide</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {user?.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={initials}
                        className="w-8 h-8 rounded-full ring-2 ring-white object-cover cursor-pointer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 ring-2 ring-white flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
                        {initials}
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right">{user?.email}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleSidebar}
                      className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="toggle-sidebar"
                    >
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <Link href="/setup-guide">
                    <div className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Setup Guide">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </Link>
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt={initials}
                      className="w-8 h-8 rounded-full ring-2 ring-white object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 ring-2 ring-white flex items-center justify-center text-white text-sm font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate">{initials}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/30 rounded-lg transition-colors"
                  data-testid="toggle-sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                  <span>Collapse</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-2 py-2 safe-area-pb">
        <div className="flex justify-around items-center">
          {mobileNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}>
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
