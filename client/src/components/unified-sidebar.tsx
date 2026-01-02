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
  Settings, 
  PlusCircle,
  Command,
  Shield,
  Mail,
  Gift,
  BookOpen,
  Archive,
  QrCode,
  ChevronDown,
  ChevronRight,
  Zap,
  Wrench,
  Star,
  Rocket
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
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

  const navGroups: NavGroup[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: LayoutDashboard,
      defaultCollapsed: false,
      items: [
        { icon: LayoutDashboard, label: "Overview", href: "/", tourId: "nav-overview" },
        { icon: Inbox, label: "Dashboard", href: "/dashboard", tourId: "nav-dashboard" },
        { icon: Mail, label: "Unified Inbox", href: "/inbox", tourId: "nav-inbox" },
        { icon: CalendarIcon, label: "Calendar", href: "/calendar", tourId: "nav-calendar" },
        { icon: FolderKanban, label: "Projects", href: "/projects", tourId: "nav-projects" },
        { icon: ListTodo, label: "Tasks", href: "/tasks", tourId: "nav-tasks" },
        { icon: Rocket, label: "Setup Guide", href: "/setup-guide", tourId: "nav-setup-guide" },
      ],
    },
    {
      id: 'engage',
      label: 'Engage & Automate',
      icon: Zap,
      defaultCollapsed: false,
      items: [
        { icon: MessageCircle, label: "Chat", href: "/chat", tourId: "nav-chat" },
        { icon: Gift, label: "Intro Offers", href: "/intro-offers", tourId: "nav-intro-offers" },
        { icon: QrCode, label: "QR Codes", href: "/qr-codes", tourId: "nav-qr-codes" },
        { icon: Mail, label: "Email Builder", href: "/email-builder", tourId: "nav-email-builder" },
        { icon: Star, label: "Rewards", href: "/rewards", tourId: "nav-rewards" },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Wrench,
      defaultCollapsed: true,
      items: [
        { icon: Archive, label: "Archive", href: "/archive", tourId: "nav-archive" },
        { icon: PlusCircle, label: "Connect App", href: "/connect", tourId: "nav-connect" },
        { icon: Settings, label: "Settings", href: "/settings", tourId: "nav-settings" },
        { icon: FileText, label: "Typeform", href: "/typeform", tourId: "nav-typeform", adminOnly: true },
        { icon: Shield, label: "Admin", href: "/admin", tourId: "nav-admin", adminOnly: true },
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
    
    const isActive = location === item.href;
    return (
      <Link key={item.href} href={item.href}>
        <div 
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
            isActive 
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
              : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
          )}
          data-tour={item.tourId}
        >
          <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen glass-panel flex-col border-r border-white/20 fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3" data-tour="sidebar-logo">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Command className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            The YHC Way
          </span>
        </div>

        <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id] ?? group.defaultCollapsed;
            const visibleItems = group.items.filter(item => !item.adminOnly || user?.isAdmin);
            
            if (visibleItems.length === 0) return null;
            
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
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                
                {!isCollapsed && (
                  <div className="space-y-1 ml-1">
                    {visibleItems.map(renderNavItem)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 mt-auto">
          <div className="pt-4 border-t border-border px-2">
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
