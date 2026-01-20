import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Mail, 
  Calendar, 
  MessageCircle, 
  Video, 
  CheckSquare, 
  Gift,
  QrCode,
  Star,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";

interface ServiceStatus {
  name: string;
  connected: boolean;
}

const appCards = [
  {
    id: "gmail",
    name: "Gmail",
    description: "View and manage your emails",
    icon: Mail,
    color: "#EA4335",
    href: "/inbox",
    serviceName: "Gmail"
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Manage your schedule and events",
    icon: Calendar,
    color: "#4285F4",
    href: "/calendar",
    serviceName: "Google Calendar"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team messaging and collaboration",
    icon: MessageCircle,
    color: "#4A154B",
    href: "/inbox",
    serviceName: "Slack"
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Video meetings and conferencing",
    icon: Video,
    color: "#2D8CFF",
    href: "/calendar",
    serviceName: "Zoom"
  },
  {
    id: "projects",
    name: "Projects",
    description: "Native project and task management",
    icon: CheckSquare,
    color: "#FD971E",
    href: "/projects",
    serviceName: null
  },
  {
    id: "qr-tiger",
    name: "QR Tiger",
    description: "Create and track QR codes for events",
    icon: QrCode,
    color: "#6366F1",
    href: "/qr-codes",
    serviceName: "QR Tiger"
  },
  {
    id: "perkville",
    name: "Perkville",
    description: "Rewards program and customer loyalty",
    icon: Star,
    color: "#F59E0B",
    href: "/rewards",
    serviceName: "Perkville"
  },
  {
    id: "yhctime",
    name: "YHCTime",
    description: "Employee time tracking and sessions",
    icon: Clock,
    color: "#10B981",
    href: "/time-tracking",
    serviceName: "YHCTime"
  }
];

export default function Overview() {
  const { data: services, isLoading } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: qrTigerStatus, isLoading: qrTigerLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/qr-tiger/status"],
    queryFn: async () => {
      const res = await fetch("/api/qr-tiger/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const { data: perkvilleStatus, isLoading: perkvilleLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/perkville/status"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const { data: yhcTimeStatus, isLoading: yhcTimeLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/yhctime/status"],
    queryFn: async () => {
      const res = await fetch("/api/yhctime/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const isServiceConnected = (serviceName: string | null) => {
    if (serviceName === null) return true;
    if (serviceName === "QR Tiger") return qrTigerStatus?.connected ?? false;
    if (serviceName === "Perkville") return perkvilleStatus?.connected ?? false;
    if (serviceName === "YHCTime") return yhcTimeStatus?.connected ?? false;
    return services?.find(s => s.name === serviceName)?.connected ?? false;
  };

  const isServiceLoading = (serviceName: string | null) => {
    if (serviceName === "QR Tiger") return qrTigerLoading;
    if (serviceName === "Perkville") return perkvilleLoading;
    if (serviceName === "YHCTime") return yhcTimeLoading;
    return isLoading;
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
        <div className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Overview</h1>
              <p className="text-muted-foreground">
                Your connected apps and integrations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appCards.map((app) => {
                const connected = isServiceConnected(app.serviceName);
                const Icon = app.icon;
                
                return (
                  <Link key={app.id} href={connected ? app.href : "/connect"}>
                    <div 
                      className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      data-testid={`card-app-${app.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                          style={{ backgroundColor: app.color }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        
                        {isServiceLoading(app.serviceName) ? (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        ) : connected ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Not connected</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-base font-semibold text-foreground mb-0.5">
                        {app.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {app.description}
                      </p>
                      
                      <div className="flex items-center text-primary text-xs font-medium group-hover:gap-2 transition-all">
                        {connected ? "Open" : "Connect"} 
                        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    More integrations coming soon
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We're working on adding more apps to help streamline your workflow
                  </p>
                </div>
                <Link href="/connect">
                  <button 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    data-testid="button-manage-connections"
                  >
                    Manage Connections
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
