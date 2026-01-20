import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Webhook, Plus, Trash2, Edit2, Play, CheckCircle, XCircle, ExternalLink, Clock, RefreshCw } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface WebhookType {
  id: number;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookDelivery {
  id: number;
  event: string;
  success: boolean;
  responseStatus: number;
  deliveredAt: string;
}

interface WebhookEvent {
  id: string;
  name: string;
}

export default function Webhooks() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [viewDeliveriesId, setViewDeliveriesId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    secret: "",
    events: [] as string[],
    isActive: true,
  });

  const { data: webhooks = [], isLoading } = useQuery<WebhookType[]>({
    queryKey: ["/api/webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      return res.json();
    },
  });

  const { data: eventsData } = useQuery<{ events: WebhookEvent[] }>({
    queryKey: ["/api/webhooks/events"],
    queryFn: async () => {
      const res = await fetch("/api/webhooks/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const { data: deliveries = [] } = useQuery<WebhookDelivery[]>({
    queryKey: ["/api/webhooks", viewDeliveriesId, "deliveries"],
    queryFn: async () => {
      if (!viewDeliveriesId) return [];
      const res = await fetch(`/api/webhooks/${viewDeliveriesId}/deliveries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json();
    },
    enabled: !!viewDeliveriesId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setIsCreateOpen(false);
      resetForm();
      toast.success("Webhook created successfully");
    },
    onError: () => {
      toast.error("Failed to create webhook");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setEditingWebhook(null);
      resetForm();
      toast.success("Webhook updated successfully");
    },
    onError: () => {
      toast.error("Failed to update webhook");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to test webhook");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Test successful! Status: ${data.status}`);
      } else {
        toast.error(`Test failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: () => {
      toast.error("Failed to test webhook");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      secret: "",
      events: [],
      isActive: true,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingWebhook) return;
    updateMutation.mutate({ id: editingWebhook.id, data: formData });
  };

  const handleEdit = (webhook: WebhookType) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || "",
      events: webhook.events,
      isActive: webhook.isActive,
    });
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const events = eventsData?.events || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `url(${generatedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
        <div className="flex-1 p-8 overflow-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="font-display font-bold text-3xl mb-2">Webhooks</h1>
                <p className="text-muted-foreground">Send notifications to external apps when events happen</p>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} data-testid="button-create-webhook">
                    <Plus className="w-4 h-4 mr-2" /> Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="My Mindbody Webhook"
                        data-testid="input-webhook-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input 
                        id="url" 
                        value={formData.url} 
                        onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                        placeholder="https://your-app.replit.app/webhook"
                        data-testid="input-webhook-url"
                      />
                    </div>
                    <div>
                      <Label htmlFor="secret">Secret (optional)</Label>
                      <Input 
                        id="secret" 
                        type="password"
                        value={formData.secret} 
                        onChange={e => setFormData(p => ({ ...p, secret: e.target.value }))}
                        placeholder="For signature verification"
                        data-testid="input-webhook-secret"
                      />
                    </div>
                    <div>
                      <Label>Events</Label>
                      <div className="mt-2 space-y-2">
                        {events.map(event => (
                          <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.events.includes(event.id)}
                              onChange={() => toggleEvent(event.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={formData.isActive} 
                        onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save-webhook">
                        {createMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading webhooks...</p>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-12 text-center">
                <Webhook className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h2 className="text-xl font-semibold mb-2">No Webhooks Yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create a webhook to send notifications to your Mindbody Analytics app or other services when intro offer statuses change.
                </p>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Webhook
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map(webhook => (
                  <div 
                    key={webhook.id} 
                    className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6"
                    data-testid={`webhook-${webhook.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{webhook.name}</h3>
                          {webhook.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <ExternalLink className="w-3 h-3" />
                          {webhook.url}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map(event => (
                            <span key={event} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                          data-testid={`button-test-${webhook.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setViewDeliveriesId(viewDeliveriesId === webhook.id ? null : webhook.id)}
                          data-testid={`button-deliveries-${webhook.id}`}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(webhook)}
                          data-testid={`button-edit-${webhook.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteMutation.mutate(webhook.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${webhook.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {viewDeliveriesId === webhook.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="font-medium mb-3">Recent Deliveries</h4>
                        {deliveries.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No deliveries yet</p>
                        ) : (
                          <div className="space-y-2">
                            {deliveries.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  {d.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  <span>{d.event}</span>
                                </div>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <span>Status: {d.responseStatus || "N/A"}</span>
                                  <span>{formatDate(d.deliveredAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {editingWebhook && (
              <Dialog open={!!editingWebhook} onOpenChange={(open) => !open && setEditingWebhook(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="edit-name">Name</Label>
                      <Input 
                        id="edit-name" 
                        value={formData.name} 
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-url">URL</Label>
                      <Input 
                        id="edit-url" 
                        value={formData.url} 
                        onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-secret">Secret</Label>
                      <Input 
                        id="edit-secret" 
                        type="password"
                        value={formData.secret} 
                        onChange={e => setFormData(p => ({ ...p, secret: e.target.value }))}
                        placeholder="Leave blank to keep existing"
                      />
                    </div>
                    <div>
                      <Label>Events</Label>
                      <div className="mt-2 space-y-2">
                        {events.map(event => (
                          <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.events.includes(event.id)}
                              onChange={() => toggleEvent(event.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={formData.isActive} 
                        onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingWebhook(null)}>Cancel</Button>
                      <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
    </div>
  );
}
