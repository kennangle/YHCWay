import { UnifiedSidebar } from "@/components/unified-sidebar";
import { AppleCalendarConnect } from "@/components/apple-calendar-connect";
import { Search, MessageCircle, Mail, Calendar, Video, CheckSquare, FileText, Clock, X } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AppIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  category: "productivity" | "calendar" | "communication" | "forms";
  connectType: "configured" | "api-key" | "special";
  apiKeyLabel?: string;
  apiKeyHelp?: string;
  connected?: boolean;
}

const availableApps: AppIntegration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Connect your workspace messages and channels",
    icon: <MessageCircle className="w-6 h-6" />,
    colorClass: "bg-[#4A154B] text-white",
    category: "communication",
    connectType: "configured",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync your emails and inbox",
    icon: <Mail className="w-6 h-6" />,
    colorClass: "bg-[#EA4335] text-white",
    category: "communication",
    connectType: "configured",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "View and manage your calendar events",
    icon: <Calendar className="w-6 h-6" />,
    colorClass: "bg-[#4285F4] text-white",
    category: "calendar",
    connectType: "configured",
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Join and manage your video meetings",
    icon: <Video className="w-6 h-6" />,
    colorClass: "bg-[#2D8CFF] text-white",
    category: "communication",
    connectType: "configured",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Track your projects and tasks",
    icon: <CheckSquare className="w-6 h-6" />,
    colorClass: "bg-[#F06A6A] text-white",
    category: "productivity",
    connectType: "configured",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Manage your scheduling and appointments",
    icon: <Clock className="w-6 h-6" />,
    colorClass: "bg-[#006BFF] text-white",
    category: "calendar",
    connectType: "api-key",
    apiKeyLabel: "Personal Access Token",
    apiKeyHelp: "Get your token from Calendly Settings > Integrations > API & Webhooks",
  },
  {
    id: "typeform",
    name: "Typeform",
    description: "View form responses and submissions",
    icon: <FileText className="w-6 h-6" />,
    colorClass: "bg-[#262627] text-white",
    category: "forms",
    connectType: "api-key",
    apiKeyLabel: "Personal Access Token",
    apiKeyHelp: "Get your token from Typeform Account Settings > Personal tokens",
  },
];

function ApiKeyModal({ 
  app, 
  onClose, 
  onSave,
  isSaving
}: { 
  app: AppIntegration; 
  onClose: () => void;
  onSave: (apiKey: string) => void;
  isSaving: boolean;
}) {
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative z-10 p-6 rounded-xl w-full max-w-md mx-4" data-testid="modal-api-key">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${app.colorClass} flex items-center justify-center`}>
              {app.icon}
            </div>
            <h2 className="font-display font-semibold text-xl">Connect {app.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {app.apiKeyLabel || "API Key"}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-api-key"
              autoFocus
            />
            {app.apiKeyHelp && (
              <p className="text-xs text-muted-foreground mt-2">{app.apiKeyHelp}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
              data-testid="button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim() || isSaving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-save-api-key"
            >
              {isSaving ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppCard({ app, onConnect, isConnecting }: { 
  app: AppIntegration; 
  onConnect: (appId: string) => void;
  isConnecting: boolean;
}) {
  return (
    <div 
      className="glass-panel p-6 rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col"
      data-testid={`card-app-${app.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${app.colorClass} flex items-center justify-center`}>
          {app.icon}
        </div>
        {app.connected ? (
          <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Connected
          </span>
        ) : (
          <button
            onClick={() => onConnect(app.id)}
            disabled={isConnecting}
            className="flex items-center gap-1.5 text-sm text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 transition-colors disabled:opacity-50"
            data-testid={`button-connect-${app.id}`}
          >
            {isConnecting ? "Connecting..." : "+ Connect"}
          </button>
        )}
      </div>
      <h3 className="font-semibold text-lg mb-1">{app.name}</h3>
      <p className="text-muted-foreground text-sm flex-1">{app.description}</p>
    </div>
  );
}

export default function Connect() {
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [apiKeyModalApp, setApiKeyModalApp] = useState<AppIntegration | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: connectionStatus = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["connection-status"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/status", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ integrationName, apiKey }: { integrationName: string; apiKey: string }) => {
      const res = await fetch("/api/integrations/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ integrationName, apiKey }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save API key");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Connected!",
        description: `${apiKeyModalApp?.name} has been connected successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      setApiKeyModalApp(null);
      setConnectingApp(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
      setConnectingApp(null);
    },
  });

  const handleConnect = (appId: string) => {
    const app = availableApps.find(a => a.id === appId);
    if (!app) return;

    if (app.connectType === "api-key") {
      setApiKeyModalApp(app);
    } else if (app.connectType === "configured") {
      toast({
        title: "System Integration",
        description: `${app.name} is configured at the system level. Contact your administrator if you need access.`,
      });
    }
  };

  const handleSaveApiKey = (apiKey: string) => {
    if (!apiKeyModalApp) return;
    setConnectingApp(apiKeyModalApp.id);
    saveApiKeyMutation.mutate({ 
      integrationName: apiKeyModalApp.id, 
      apiKey 
    });
  };

  const appsWithStatus = availableApps.map(app => ({
    ...app,
    connected: connectionStatus[app.id] || false,
  }));

  const filteredApps = appsWithStatus.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedApps = filteredApps.filter(app => app.connected);
  const availableToConnect = filteredApps.filter(app => !app.connected);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 ml-64 p-8 relative z-10">
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Connect Apps</h1>
          <p className="text-muted-foreground">Manage your connected services and add new integrations.</p>
        </header>

        <div className="glass-panel p-4 rounded-xl mb-8 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search for apps..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground"
            data-testid="input-search-apps"
          />
        </div>

        {connectedApps.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display font-semibold text-xl mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Connected Apps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {connectedApps.map((app) => (
                <AppCard 
                  key={app.id}
                  app={app}
                  onConnect={handleConnect}
                  isConnecting={connectingApp === app.id}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="font-display font-semibold text-xl mb-4">Available Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableToConnect.map((app) => (
              <AppCard 
                key={app.id}
                app={app}
                onConnect={handleConnect}
                isConnecting={connectingApp === app.id}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display font-semibold text-xl mb-4">Special Integrations</h2>
          <p className="text-muted-foreground mb-4">These integrations require additional credentials.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AppleCalendarConnect variant="card" />
          </div>
        </section>
      </main>

      {apiKeyModalApp && (
        <ApiKeyModal
          app={apiKeyModalApp}
          onClose={() => setApiKeyModalApp(null)}
          onSave={handleSaveApiKey}
          isSaving={saveApiKeyMutation.isPending}
        />
      )}
    </div>
  );
}
