import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Mail, 
  Calendar, 
  MessageCircle, 
  Video, 
  CheckSquare, 
  Gift,
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
    id: "mindbody",
    name: "Mindbody",
    description: "Track intro offers and client engagement",
    icon: Gift,
    color: "#00B5AD",
    href: "/intro-offers",
    serviceName: "Mindbody"
  },
  {
    id: "projects",
    name: "Projects",
    description: "Native project and task management",
    icon: CheckSquare,
    color: "#FD971E",
    href: "/projects",
    serviceName: null
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

  const isServiceConnected = (serviceName: string | null) => {
    if (serviceName === null) return true;
    return services?.find(s => s.name === serviceName)?.connected ?? false;
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
      <UnifiedSidebar />
      
      <main className="md:ml-64 min-h-screen">
        <TopBar />
        
        <div className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Overview</h1>
              <p className="text-muted-foreground">
                Your connected apps and integrations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appCards.map((app) => {
                const connected = isServiceConnected(app.serviceName);
                const Icon = app.icon;
                
                return (
                  <Link key={app.id} href={connected ? app.href : "/connect"}>
                    <div 
                      className="glass-card p-6 rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      data-testid={`card-app-${app.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: app.color }}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : connected ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Not connected</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {app.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {app.description}
                      </p>
                      
                      <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                        {connected ? "Open" : "Connect"} 
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
      </main>
    </div>
  );
}
