import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { AppleCalendarConnect } from "@/components/apple-calendar-connect";
import { Search, MessageCircle, Mail, Calendar, Video, CheckSquare, FileText, Clock, X, Gift } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface AppIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  category: "productivity" | "calendar" | "communication" | "forms" | "rewards";
  connectType: "configured" | "api-key" | "special" | "oauth";
  apiKeyLabel?: string;
  apiKeyHelp?: string;
  connected?: boolean;
}

const availableApps: AppIntegration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Connect your Slack account to view messages and DMs",
    icon: <MessageCircle className="w-6 h-6" />,
    colorClass: "bg-[#4A154B] text-white",
    category: "communication",
    connectType: "oauth",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync your emails and inbox",
    icon: <Mail className="w-6 h-6" />,
    colorClass: "bg-[#EA4335] text-white",
    category: "communication",
    connectType: "oauth",
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
    description: "Connect your Asana account to track projects and tasks",
    icon: <CheckSquare className="w-6 h-6" />,
    colorClass: "bg-[#F06A6A] text-white",
    category: "productivity",
    connectType: "oauth",
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
  {
    id: "perkville",
    name: "Perkville",
    description: "Connect your loyalty and rewards program",
    icon: <Gift className="w-6 h-6" />,
    colorClass: "bg-[#7B61FF] text-white",
    category: "rewards",
    connectType: "oauth",
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

function AppCard({ app, onConnect, onDisconnect, isConnecting }: { 
  app: AppIntegration; 
  onConnect: (appId: string) => void;
  onDisconnect?: (appId: string) => void;
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
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Connected
            </span>
            {onDisconnect && (
              <button
                onClick={() => onDisconnect(app.id)}
                className="text-xs text-red-500 hover:text-red-600 hover:underline"
                data-testid={`button-disconnect-${app.id}`}
              >
                Disconnect
              </button>
            )}
          </div>
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

  const gmailConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/gmail/connect", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initiate Gmail connection");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
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

  const gmailDisconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/gmail/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disconnect Gmail");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Gmail has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const slackConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/slack/connect", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initiate Slack connection");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
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

  const slackDisconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/slack/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disconnect Slack");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Slack has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const asanaConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/asana/connect", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initiate Asana connection");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
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

  const asanaDisconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/asana/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disconnect Asana");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Asana has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const perkvilleConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/perkville/connect", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initiate Perkville connection");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
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

  const perkvilleDisconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/perkville/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disconnect Perkville");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Perkville has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const apiKeyDisconnectMutation = useMutation({
    mutationFn: async (integrationName: string) => {
      const res = await fetch(`/api/integrations/${integrationName}/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disconnect");
      }
      return res.json();
    },
    onSuccess: (_, integrationName) => {
      const app = availableApps.find(a => a.id === integrationName);
      toast({
        title: "Disconnected",
        description: `${app?.name || integrationName} has been disconnected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = (appId: string) => {
    const app = availableApps.find(a => a.id === appId);
    if (!app) return;

    if (app.connectType === "api-key") {
      setApiKeyModalApp(app);
    } else if (app.connectType === "oauth") {
      setConnectingApp(appId);
      if (appId === "gmail") {
        gmailConnectMutation.mutate();
      } else if (appId === "slack") {
        slackConnectMutation.mutate();
      } else if (appId === "asana") {
        asanaConnectMutation.mutate();
      } else if (appId === "perkville") {
        perkvilleConnectMutation.mutate();
      }
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

  const handleDisconnect = (appId: string) => {
    const app = availableApps.find(a => a.id === appId);
    if (!app) return;

    if (appId === "gmail") {
      gmailDisconnectMutation.mutate();
    } else if (appId === "slack") {
      slackDisconnectMutation.mutate();
    } else if (appId === "asana") {
      asanaDisconnectMutation.mutate();
    } else if (appId === "perkville") {
      perkvilleDisconnectMutation.mutate();
    } else {
      // Use generic disconnect for api-key and configured (system-level) integrations
      apiKeyDisconnectMutation.mutate(appId);
    }
  };

  // Handle OAuth callback URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'gmail') {
      toast({
        title: "Gmail Connected!",
        description: "Your Gmail account has been connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      window.history.replaceState({}, '', '/connect');
    } else if (success === 'slack') {
      toast({
        title: "Slack Connected!",
        description: "Your Slack account has been connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      window.history.replaceState({}, '', '/connect');
    } else if (success === 'asana') {
      toast({
        title: "Asana Connected!",
        description: "Your Asana account has been connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      window.history.replaceState({}, '', '/connect');
    } else if (success === 'perkville') {
      toast({
        title: "Perkville Connected!",
        description: "Your Perkville rewards account has been connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      window.history.replaceState({}, '', '/connect');
    } else if (error) {
      let errorMessage = "An error occurred during connection.";
      if (error === 'gmail_connection_failed') {
        errorMessage = "Failed to connect Gmail. Please try again.";
      } else if (error === 'slack_connection_failed' || error === 'slack_auth_failed') {
        errorMessage = "Failed to connect Slack. Please try again.";
      } else if (error === 'slack_not_configured') {
        errorMessage = "Slack OAuth is not configured. Please contact your administrator.";
      } else if (error === 'asana_connection_failed' || error === 'asana_auth_failed') {
        errorMessage = "Failed to connect Asana. Please try again.";
      } else if (error === 'asana_not_configured') {
        errorMessage = "Asana OAuth is not configured. Please contact your administrator.";
      } else if (error === 'perkville_connection_failed' || error === 'perkville_auth_failed') {
        errorMessage = "Failed to connect Perkville. Please try again.";
      } else if (error === 'perkville_not_configured') {
        errorMessage = "Perkville OAuth is not configured. Please contact your administrator.";
      }
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/connect');
    }
  }, [toast, queryClient]);

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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
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
                  onDisconnect={handleDisconnect}
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
        </div>
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
