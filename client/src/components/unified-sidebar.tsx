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
  LogOut,
  Shield,
  Mail,
  Gift,
  BookOpen,
  Webhook,
  Archive,
  QrCode
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
    { icon: LayoutDashboard, label: "Overview", href: "/", tourId: "nav-overview" },
    { icon: Inbox, label: "Dashboard", href: "/dashboard", tourId: "nav-dashboard" },
    { icon: Mail, label: "Unified Inbox", href: "/inbox", tourId: "nav-inbox" },
    { icon: MessageCircle, label: "Chat", href: "/chat", tourId: "nav-chat" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar", tourId: "nav-calendar" },
    { icon: FolderKanban, label: "Projects", href: "/projects", tourId: "nav-projects" },
    { icon: ListTodo, label: "Tasks", href: "/tasks", tourId: "nav-tasks" },
    { icon: Gift, label: "Intro Offers", href: "/intro-offers", tourId: "nav-intro-offers" },
    { icon: QrCode, label: "QR Codes", href: "/qr-codes", tourId: "nav-qr-codes" },
    { icon: Archive, label: "Archive", href: "/archive", tourId: "nav-archive" },
  ];

  const bottomItems = [
    { icon: Mail, label: "Email Builder", href: "/email-builder", tourId: "nav-email-builder" },
    ...(user?.isAdmin ? [{ icon: FileText, label: "Typeform", href: "/typeform", tourId: "nav-typeform" }] : []),
    { icon: PlusCircle, label: "Connect App", href: "/connect", tourId: "nav-connect" },
    { icon: Settings, label: "Settings", href: "/settings", tourId: "nav-settings" },
    ...(user?.isAdmin ? [{ icon: Shield, label: "Admin", href: "/admin", tourId: "nav-admin" }] : []),
  ];

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
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

      <div className="flex-1 px-4 py-6 space-y-2">
        <div className="text-xs font-medium text-muted-foreground px-4 mb-2 uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                )}
                data-tour={item.tourId}
              >
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
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-white/50 hover:text-foreground transition-all duration-200 cursor-pointer"
              data-tour={item.tourId}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        ))}

        <div className="mt-4 pt-4 border-t border-border px-2">
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
