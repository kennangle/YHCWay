import { UnifiedSidebar } from "@/components/unified-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Redirect } from "wouter";
import { Users, Server, Rss, Trash2, Edit2, Shield, ShieldOff, Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User, Service, FeedItem, InsertService, InsertFeedItem } from "@shared/schema";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";

type TabType = "users" | "services" | "feed";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingFeed, setEditingFeed] = useState<FeedItem | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user?.isAdmin,
  });

  const { data: feedItems = [] } = useQuery<FeedItem[]>({
    queryKey: ["/api/feed"],
    enabled: !!user?.isAdmin,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, { isAdmin });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: InsertService) => {
      return apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowAddService(false);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertService> }) => {
      return apiRequest("PUT", `/api/admin/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditingService(null);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/services/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/services"] }),
  });

  const createFeedMutation = useMutation({
    mutationFn: async (data: InsertFeedItem) => {
      return apiRequest("POST", "/api/feed", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setShowAddFeed(false);
    },
  });

  const updateFeedMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertFeedItem> }) => {
      return apiRequest("PUT", `/api/admin/feed/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setEditingFeed(null);
    },
  });

  const deleteFeedMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/feed/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] }),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const tabs = [
    { id: "users" as TabType, label: "Users", icon: Users, count: users.length },
    { id: "services" as TabType, label: "Services", icon: Server, count: services.length },
    { id: "feed" as TabType, label: "Feed Items", icon: Rss, count: feedItems.length },
  ];

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
          <h1 className="font-display font-bold text-3xl mb-2" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, services, and feed items.</p>
        </header>

        <div className="flex gap-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "glass-card hover:bg-white/60"
              }`}
              data-testid={`button-tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-users">
            <h2 className="font-semibold text-lg mb-4">User Management</h2>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-user-${u.id}`}>
                  <div className="flex items-center gap-3">
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {(u.firstName?.[0] || u.email?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isAdmin && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">Admin</span>
                    )}
                    <button
                      onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                      className={`p-2 rounded-lg transition-all ${
                        u.isAdmin ? "hover:bg-red-50 text-red-500" : "hover:bg-green-50 text-green-500"
                      }`}
                      title={u.isAdmin ? "Remove admin" : "Make admin"}
                      data-testid={`button-toggle-admin-${u.id}`}
                    >
                      {u.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-services">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Service Management</h2>
              <button
                onClick={() => setShowAddService(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                data-testid="button-add-service"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>
            <div className="space-y-3">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-service-${s.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.colorClass} flex items-center justify-center text-white`}>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.connected ? "Connected" : "Disconnected"}
                    </span>
                    <button
                      onClick={() => setEditingService(s)}
                      className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                      data-testid={`button-edit-service-${s.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteServiceMutation.mutate(s.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      data-testid={`button-delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-feed">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Feed Management</h2>
              <button
                onClick={() => setShowAddFeed(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                data-testid="button-add-feed"
              >
                <Plus className="w-4 h-4" />
                Add Feed Item
              </button>
            </div>
            <div className="space-y-3">
              {feedItems.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-feed-${f.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.title}</span>
                      {f.urgent && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Urgent</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{f.subtitle}</div>
                    <div className="text-xs text-muted-foreground mt-1">Type: {f.type} | Time: {f.time}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFeed(f)}
                      className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                      data-testid={`button-edit-feed-${f.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFeedMutation.mutate(f.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      data-testid={`button-delete-feed-${f.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddService && (
          <ServiceModal
            onClose={() => setShowAddService(false)}
            onSave={(data) => createServiceMutation.mutate(data)}
          />
        )}

        {editingService && (
          <ServiceModal
            service={editingService}
            onClose={() => setEditingService(null)}
            onSave={(data) => updateServiceMutation.mutate({ id: editingService.id, data })}
          />
        )}

        {showAddFeed && (
          <FeedModal
            onClose={() => setShowAddFeed(false)}
            onSave={(data) => createFeedMutation.mutate(data)}
          />
        )}

        {editingFeed && (
          <FeedModal
            feedItem={editingFeed}
            onClose={() => setEditingFeed(null)}
            onSave={(data) => updateFeedMutation.mutate({ id: editingFeed.id, data })}
          />
        )}
      </main>
    </div>
  );
}

function ServiceModal({
  service,
  onClose,
  onSave,
}: {
  service?: Service;
  onClose: () => void;
  onSave: (data: InsertService) => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [icon, setIcon] = useState(service?.icon || "");
  const [colorClass, setColorClass] = useState(service?.colorClass || "bg-blue-500");
  const [connected, setConnected] = useState(service?.connected || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, icon, colorClass, connected });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-service">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{service ? "Edit Service" : "Add Service"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon (emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-icon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color Class</label>
            <select
              value={colorClass}
              onChange={(e) => setColorClass(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="select-service-color"
            >
              <option value="bg-blue-500">Blue</option>
              <option value="bg-red-500">Red</option>
              <option value="bg-green-500">Green</option>
              <option value="bg-purple-500">Purple</option>
              <option value="bg-orange-500">Orange</option>
              <option value="bg-yellow-500">Yellow</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="connected"
              checked={connected}
              onChange={(e) => setConnected(e.target.checked)}
              data-testid="input-service-connected"
            />
            <label htmlFor="connected" className="text-sm">Connected</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg" data-testid="button-save-service">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeedModal({
  feedItem,
  onClose,
  onSave,
}: {
  feedItem?: FeedItem;
  onClose: () => void;
  onSave: (data: InsertFeedItem) => void;
}) {
  const [type, setType] = useState(feedItem?.type || "slack");
  const [title, setTitle] = useState(feedItem?.title || "");
  const [subtitle, setSubtitle] = useState(feedItem?.subtitle || "");
  const [time, setTime] = useState(feedItem?.time || "");
  const [sender, setSender] = useState(feedItem?.sender || "");
  const [urgent, setUrgent] = useState(feedItem?.urgent || false);
  const [sortOrder, setSortOrder] = useState(feedItem?.sortOrder || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, title, subtitle, time, sender, urgent, sortOrder });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-feed">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{feedItem ? "Edit Feed Item" : "Add Feed Item"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="select-feed-type"
            >
              <option value="slack">Slack</option>
              <option value="email">Email</option>
              <option value="calendar">Calendar</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-feed-title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-subtitle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              placeholder="e.g., 2:30 PM"
              data-testid="input-feed-time"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sender</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-sender"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-sortorder"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgent"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              data-testid="input-feed-urgent"
            />
            <label htmlFor="urgent" className="text-sm">Urgent</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg" data-testid="button-save-feed">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
