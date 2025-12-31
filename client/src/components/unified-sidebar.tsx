import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Inbox, 
  Calendar as CalendarIcon, 
  MessageCircle,
  CheckSquare,
  FolderKanban,
  ListTodo,
  FileText,
  Settings, 
  PlusCircle,
  Command,
  LogOut,
  Shield,
  Mail,
  Gift,
  BookOpen,
  Webhook,
  Archive,
  Bug,
  Lightbulb
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export function UnifiedSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Inbox, label: "Unified Inbox", href: "/inbox" },
    { icon: MessageCircle, label: "Chat", href: "/chat" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
    { icon: FolderKanban, label: "Projects", href: "/projects" },
    { icon: ListTodo, label: "Tasks", href: "/tasks" },
    { icon: CheckSquare, label: "Asana (Temp)", href: "/asana" },
    { icon: Gift, label: "Intro Offers", href: "/intro-offers" },
    { icon: Archive, label: "Archive", href: "/archive" },
  ];

  const bottomItems = [
    { icon: BookOpen, label: "Setup Guide", href: "/setup-guide" },
    { icon: Mail, label: "Email Builder", href: "/email-builder" },
    ...(user?.isAdmin ? [{ icon: FileText, label: "Typeform", href: "/typeform" }] : []),
    { icon: PlusCircle, label: "Connect App", href: "/connect" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Webhook, label: "Webhooks", href: "/webhooks" },
    ...(user?.isAdmin ? [{ icon: Shield, label: "Admin", href: "/admin" }] : []),
  ];

  const feedbackItems = [
    { icon: Bug, label: "Report a Bug", href: "mailto:support@uniwork360.com?subject=Bug Report" },
    { icon: Lightbulb, label: "Request Feature", href: "mailto:support@uniwork360.com?subject=Feature Request" },
  ];

  const displayName = user?.firstName 
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email?.split('@')[0] || 'User';

  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Home", href: "/" },
    { icon: Inbox, label: "Inbox", href: "/inbox" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
    { icon: FolderKanban, label: "Projects", href: "/projects" },
    { icon: ListTodo, label: "Tasks", href: "/tasks" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen glass-panel flex-col border-r border-white/20 fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Command className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            UniWork360
          </span>
        </div>

      <div className="flex-1 px-4 py-6 space-y-2">
        <div className="text-xs font-medium text-muted-foreground px-4 mb-2 uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 space-y-2 mt-auto">
        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-white/50 hover:text-foreground transition-all duration-200 cursor-pointer">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        ))}

        <div className="pt-2 mt-2 border-t border-border/50">
          {feedbackItems.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-muted-foreground hover:bg-white/50 hover:text-foreground transition-all duration-200 cursor-pointer">
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </a>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border px-2">
          <div className="flex items-center gap-3 mb-3">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt={displayName}
                className="w-8 h-8 rounded-full ring-2 ring-white object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 ring-2 ring-white flex items-center justify-center text-white text-sm font-semibold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-200 cursor-pointer w-full"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
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
