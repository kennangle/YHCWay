import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/App";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { User, Bell, Shield, Palette, HelpCircle, ChevronLeft, Check, Globe, Mail, MessageSquare, Calendar, Video, CheckSquare, MessageCircle, Volume2, Moon, Sun, ExternalLink, Trash2, Download, Eye, EyeOff, FileText, Plus, Pencil, Webhook, Bug, Play, CheckCircle, XCircle, Clock, RefreshCw, Edit2, Lightbulb, Building, Copy, Users, UserPlus, Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";

interface UserPreferences {
  googleCalendarColor: string;
  appleCalendarColor: string;
  zoomColor: string;
  theme: string;
  notifyGmail: boolean;
  notifySlack: boolean;
  notifyCalendar: boolean;
  notifyZoom: boolean;
  notifyAsana: boolean;
  notifyChat: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifySound: boolean;
  notificationSoundType: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  showOnlineStatus: boolean;
  timezone: string;
  dateFormat: string;
  firstDayOfWeek: string;
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface ConnectedService {
  name: string;
  connected: boolean;
  icon: any;
  description: string;
}

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Pink" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const playNotificationSound = (soundType: string) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  switch (soundType) {
    case "chime":
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.2);
      oscillator.type = "sine";
      break;
    case "bell":
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = "triangle";
      break;
    case "ping":
      oscillator.frequency.setValueAtTime(1400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.3);
      oscillator.type = "sine";
      break;
    case "pop":
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      oscillator.type = "square";
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      break;
    default:
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.type = "sine";
  }
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

type SettingsSection = "main" | "account" | "notifications" | "privacy" | "appearance" | "language" | "help" | "templates" | "webhooks" | "feedback" | "organization" | "extension" | "email-signatures" | "gmail-accounts";

interface TaskTemplate {
  id: number;
  name: string;
  description: string | null;
  defaultPriority: string;
  estimatedMinutes: number | null;
}

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

interface FeedbackEntry {
  id: number;
  type: "bug" | "feature";
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

function TemplatesSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultPriority: "medium",
    estimatedMinutes: "",
  });
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const res = await fetch("/api/task-templates", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          defaultPriority: data.defaultPriority,
          estimatedMinutes: data.estimatedMinutes ? parseInt(data.estimatedMinutes) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      setIsCreating(false);
      setFormData({ name: "", description: "", defaultPriority: "medium", estimatedMinutes: "" });
      toast.success("Template created!");
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/task-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          defaultPriority: data.defaultPriority,
          estimatedMinutes: data.estimatedMinutes ? parseInt(data.estimatedMinutes) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      setEditingTemplate(null);
      setFormData({ name: "", description: "", defaultPriority: "medium", estimatedMinutes: "" });
      toast.success("Template updated!");
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/task-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      // Clear editing state if the deleted template was being edited
      if (editingTemplate?.id === deletedId) {
        setEditingTemplate(null);
        setFormData({ name: "", description: "", defaultPriority: "medium", estimatedMinutes: "" });
      }
      toast.success("Template deleted!");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      defaultPriority: template.defaultPriority,
      estimatedMinutes: template.estimatedMinutes?.toString() || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormData({ name: "", description: "", defaultPriority: "medium", estimatedMinutes: "" });
  };

  const priorityLabels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Task Templates</h2>
        <p className="text-muted-foreground">Create reusable templates for common tasks. Use them from the command palette (Cmd+K).</p>
      </div>

      <div className="space-y-4">
        {/* Create/Edit Form */}
        {(isCreating || editingTemplate) && (
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">
              {editingTemplate ? "Edit Template" : "New Template"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Report"
                  className="mt-1"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What this template is used for"
                  className="mt-1"
                  data-testid="input-template-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Default Priority</Label>
                  <Select
                    value={formData.defaultPriority}
                    onValueChange={(val) => setFormData({ ...formData, defaultPriority: val })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-template-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estimatedMinutes">Est. Time (minutes)</Label>
                  <Input
                    id="estimatedMinutes"
                    type="number"
                    value={formData.estimatedMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                    placeholder="30"
                    className="mt-1"
                    data-testid="input-template-time"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Add Button */}
        {!isCreating && !editingTemplate && (
          <Button
            onClick={() => setIsCreating(true)}
            className="w-full"
            data-testid="button-add-template"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>
        )}

        {/* Templates List */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Your Templates</h3>
          {isLoading ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground">No templates yet. Create one to get started!</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-white/50 rounded-lg"
                  data-testid={`template-item-${template.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Priority: {priorityLabels[template.defaultPriority] || template.defaultPriority}</span>
                      {template.estimatedMinutes && (
                        <span>Est: {template.estimatedMinutes} min</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WebhooksSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
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
    onError: () => toast.error("Failed to create webhook"),
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
    onError: () => toast.error("Failed to update webhook"),
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
    onError: () => toast.error("Failed to delete webhook"),
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
        toast.success("Webhook test successful!");
      } else {
        toast.error(`Webhook test failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: () => toast.error("Failed to test webhook"),
  });

  const resetForm = () => {
    setFormData({ name: "", url: "", secret: "", events: [], isActive: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
        : [...prev.events, eventId]
    }));
  };

  const events = eventsData?.events || [];

  return (
    <div className="max-w-4xl">
      {renderBackButton()}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="font-display font-bold text-2xl mb-2">Webhooks</h2>
          <p className="text-muted-foreground">Configure webhooks to send real-time notifications to external services.</p>
        </div>
        <Dialog open={isCreateOpen || !!editingWebhook} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingWebhook(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-webhook">
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Webhook"
                  required
                  data-testid="input-webhook-name"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  required
                  data-testid="input-webhook-url"
                />
              </div>
              <div>
                <Label>Secret (optional)</Label>
                <Input
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="Optional signing secret"
                  data-testid="input-webhook-secret"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {events.map(event => (
                    <label key={event.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.events.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        data-testid={`checkbox-event-${event.id}`}
                      />
                      {event.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-webhook-active"
                />
                <Label>Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingWebhook(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-webhook">
                  {editingWebhook ? "Save Changes" : "Create Webhook"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading webhooks...</p>
      ) : webhooks.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <Webhook className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No webhooks configured</h3>
          <p className="text-muted-foreground mb-4">Create your first webhook to start receiving notifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="glass-card p-6 rounded-2xl" data-testid={`webhook-item-${webhook.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <p className="text-sm text-muted-foreground truncate max-w-md">{webhook.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => testMutation.mutate(webhook.id)} data-testid={`button-test-webhook-${webhook.id}`}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewDeliveriesId(viewDeliveriesId === webhook.id ? null : webhook.id)} data-testid={`button-deliveries-webhook-${webhook.id}`}>
                    <Clock className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(webhook)} data-testid={`button-edit-webhook-${webhook.id}`}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(webhook.id)} data-testid={`button-delete-webhook-${webhook.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {webhook.events.map(event => (
                  <span key={event} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{event}</span>
                ))}
              </div>
              {viewDeliveriesId === webhook.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Recent Deliveries</h4>
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deliveries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {deliveries.slice(0, 5).map(delivery => (
                        <div key={delivery.id} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            {delivery.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <span>{delivery.event}</span>
                          </div>
                          <span className="text-muted-foreground">{new Date(delivery.deliveredAt).toLocaleString()}</span>
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
    </div>
  );
}

function FeedbackSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: feedback = [], isLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ["/api/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/feedback", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/feedback/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const filteredFeedback = feedback.filter(item => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "bug" ? <Bug className="w-4 h-4 text-red-500" /> : <Lightbulb className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="max-w-4xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Feedback</h2>
        <p className="text-muted-foreground">View and manage bug reports and feature requests from your team.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">Bug Reports</SelectItem>
            <SelectItem value="feature">Feature Requests</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading feedback...</p>
      ) : filteredFeedback.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <Bug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No feedback yet</h3>
          <p className="text-muted-foreground">Bug reports and feature requests from your team will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map(item => (
            <div key={item.id} className="glass-card p-6 rounded-2xl" data-testid={`feedback-item-${item.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getTypeIcon(item.type)}
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.user?.firstName || item.user?.email?.split('@')[0]} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Select 
                  value={item.status} 
                  onValueChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                >
                  <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(item.status)}`} data-testid={`select-status-${item.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  maxUsers: number;
  createdAt: string;
}

interface TenantUser {
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

function OrganizationSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: tenants, isLoading } = useQuery<TenantData[]>({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: tenantUsers, refetch: refetchUsers } = useQuery<TenantUser[]>({
    queryKey: ["/api/tenants/users", tenants?.[0]?.id],
    queryFn: async () => {
      if (!tenants?.[0]?.id) return [];
      const res = await fetch(`/api/tenants/${tenants[0].id}/users`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenants?.[0]?.id,
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create organization");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Organization created!");
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setShowCreateDialog(false);
      setNewOrgName("");
      setNewOrgSlug("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      if (!tenants?.[0]?.id) throw new Error("No organization selected");
      const res = await fetch(`/api/tenants/${tenants[0].id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/users", tenants?.[0]?.id] });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currentTenant = tenants?.[0];

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!currentTenant?.id) throw new Error("No organization selected");
      const res = await fetch(`/api/tenants/${currentTenant.id}/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role updated!");
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/users", currentTenant?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTenant?.id) throw new Error("No organization selected");
      const res = await fetch(`/api/tenants/${currentTenant.id}/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member removed!");
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/users", currentTenant?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <div className="max-w-2xl">
      {renderBackButton()}
      
      <h2 className="text-2xl font-bold mb-6">Organization</h2>

      {isLoading ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : !currentTenant ? (
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-2xl text-center">
            <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Organization</h3>
            <p className="text-muted-foreground mb-6">
              Create an organization to collaborate with your team. Organizations allow you to share projects, tasks, and data with team members.
            </p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-org">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={newOrgName}
                      onChange={(e) => {
                        setNewOrgName(e.target.value);
                        setNewOrgSlug(generateSlug(e.target.value));
                      }}
                      placeholder="My Company"
                      data-testid="input-org-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-slug">URL Slug</Label>
                    <Input
                      id="org-slug"
                      value={newOrgSlug}
                      onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-company"
                      data-testid="input-org-slug"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only lowercase letters, numbers, and hyphens
                    </p>
                  </div>
                  <Button
                    onClick={() => createTenantMutation.mutate({ name: newOrgName, slug: newOrgSlug })}
                    disabled={!newOrgName || !newOrgSlug || createTenantMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-create-org"
                  >
                    {createTenantMutation.isPending ? "Creating..." : "Create Organization"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Building className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{currentTenant.name}</h3>
                <p className="text-sm text-muted-foreground">/{currentTenant.slug}</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                {currentTenant.role}
              </span>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Organization ID</span>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-black/5 rounded text-xs font-mono">{currentTenant.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(currentTenant.id)}
                    data-testid="button-copy-tenant-id"
                  >
                    {copiedId === currentTenant.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium capitalize">{currentTenant.plan || "Free"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(currentTenant.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Team Members</h3>
              </div>
              {(currentTenant.role === "owner" || currentTenant.role === "admin") && (
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-invite-member">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                          data-testid="input-invite-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                        disabled={!inviteEmail || inviteMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-invite"
                      >
                        {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {tenantUsers && tenantUsers.length > 0 ? (
              <div className="space-y-3">
                {tenantUsers.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {(member.user.firstName?.[0] || member.user.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {member.user.firstName ? `${member.user.firstName} ${member.user.lastName || ''}`.trim() : member.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentTenant.role === "owner" && member.role !== "owner" ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => updateRoleMutation.mutate({ userId: member.userId, role: newRole })}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs" data-testid={`select-role-${member.userId}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="px-2 py-1 bg-black/5 rounded text-xs capitalize">{member.role}</span>
                      )}
                      {(currentTenant.role === "owner" || currentTenant.role === "admin") && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remove ${member.user.email} from the organization?`)) {
                              removeMemberMutation.mutate(member.userId);
                            }
                          }}
                          data-testid={`button-remove-member-${member.userId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No team members yet</p>
            )}
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Using Tenant ID
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              The Organization ID (Tenant ID) is used to scope your data. When working with the API or sharing access, you may need this ID.
            </p>
            <p className="text-sm text-muted-foreground">
              All projects, tasks, and team data are isolated to your organization for security and privacy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface EmailSignature {
  id: number;
  userId: string;
  name: string;
  htmlContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function EmailSignaturesSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureContent, setSignatureContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const queryClient = useQueryClient();

  const { data: signatures = [], isLoading } = useQuery<EmailSignature[]>({
    queryKey: ["/api/email-signatures"],
    queryFn: async () => {
      const res = await fetch("/api/email-signatures", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signatures");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; htmlContent: string; isDefault: boolean }) => {
      const res = await fetch("/api/email-signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create signature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-signatures"] });
      setIsCreating(false);
      setSignatureName("");
      setSignatureContent("");
      setIsDefault(false);
      toast.success("Signature created!");
    },
    onError: () => {
      toast.error("Failed to create signature");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; htmlContent?: string; isDefault?: boolean }) => {
      const res = await fetch(`/api/email-signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update signature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-signatures"] });
      setEditingSignature(null);
      toast.success("Signature updated!");
    },
    onError: () => {
      toast.error("Failed to update signature");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/email-signatures/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete signature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-signatures"] });
      toast.success("Signature deleted!");
    },
    onError: () => {
      toast.error("Failed to delete signature");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/email-signatures/${id}/set-default`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set default signature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-signatures"] });
      toast.success("Default signature updated!");
    },
    onError: () => {
      toast.error("Failed to set default signature");
    },
  });

  const handleCreate = () => {
    if (!signatureName.trim() || !signatureContent.trim()) {
      toast.error("Please provide a name and content for your signature");
      return;
    }
    createMutation.mutate({ name: signatureName, htmlContent: signatureContent, isDefault });
  };

  const handleUpdate = () => {
    if (!editingSignature || !signatureName.trim() || !signatureContent.trim()) {
      toast.error("Please provide a name and content for your signature");
      return;
    }
    updateMutation.mutate({
      id: editingSignature.id,
      name: signatureName,
      htmlContent: signatureContent,
      isDefault,
    });
  };

  const startEditing = (signature: EmailSignature) => {
    setEditingSignature(signature);
    setSignatureName(signature.name);
    setSignatureContent(signature.htmlContent);
    setIsDefault(signature.isDefault);
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingSignature(null);
    setSignatureName("");
    setSignatureContent("");
    setIsDefault(signatures.length === 0);
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingSignature(null);
    setSignatureName("");
    setSignatureContent("");
    setIsDefault(false);
  };

  const SignatureEditor = () => (
    <div className="glass-card p-6 rounded-2xl space-y-4">
      <h3 className="font-semibold text-lg">
        {isCreating ? "Create New Signature" : "Edit Signature"}
      </h3>
      
      <div>
        <Label htmlFor="signature-name" className="mb-2 block">Signature Name</Label>
        <Input
          id="signature-name"
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          placeholder="e.g., Work Signature"
          data-testid="input-signature-name"
        />
      </div>

      <div>
        <Label className="mb-2 block">Signature Content</Label>
        <div className="border rounded-lg bg-white dark:bg-slate-900 min-h-[200px]">
          <SignatureRichTextEditor
            content={signatureContent}
            onChange={setSignatureContent}
            placeholder="Create your email signature..."
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Use the toolbar to add formatting, links, and more
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is-default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(!!checked)}
          data-testid="checkbox-default-signature"
        />
        <Label htmlFor="is-default" className="text-sm cursor-pointer">
          Set as default signature
        </Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={isCreating ? handleCreate : handleUpdate}
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save-signature"
        >
          {(createMutation.isPending || updateMutation.isPending) ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {isCreating ? "Create Signature" : "Save Changes"}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={cancelEdit} data-testid="button-cancel-signature">
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      {renderBackButton()}
      
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Signatures</h2>
          <p className="text-muted-foreground">Create and manage signatures for your emails</p>
        </div>
        {!isCreating && !editingSignature && (
          <Button onClick={startCreating} data-testid="button-create-signature">
            <Plus className="w-4 h-4 mr-2" />
            New Signature
          </Button>
        )}
      </div>

      {(isCreating || editingSignature) && <SignatureEditor />}

      {!isCreating && !editingSignature && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading signatures...</p>
            </div>
          ) : signatures.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No signatures yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create a signature to automatically add to your emails
              </p>
              <Button onClick={startCreating} data-testid="button-create-first-signature">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Signature
              </Button>
            </div>
          ) : (
            signatures.map((signature) => (
              <div
                key={signature.id}
                className="glass-card p-4 rounded-2xl"
                data-testid={`signature-card-${signature.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{signature.name}</h3>
                    {signature.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!signature.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(signature.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${signature.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(signature)}
                      data-testid={`button-edit-signature-${signature.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this signature?")) {
                          deleteMutation.mutate(signature.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-signature-${signature.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div
                  className="text-sm text-muted-foreground border-t pt-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: signature.htmlContent }}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SignatureRichTextEditor({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder?: string }) {
  const initialContentRef = useRef(content);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { style: 'color: #2563eb; text-decoration: underline;' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: initialContentRef.current || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${active ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-0.5 p-2 border-b bg-gray-50 dark:bg-slate-800 rounded-t-lg">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Add Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarBtn>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ExtensionSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<{ connected: boolean; deviceLabel?: string; lastUsedAt?: string; expiresAt?: string }>({
    queryKey: ["/api/auth/extension/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/extension/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/extension/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceLabel: "Chrome Extension" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate token");
      return res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      setShowToken(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/extension/status"] });
      toast.success("Extension token generated!");
    },
    onError: () => {
      toast.error("Failed to generate token");
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/extension/revoke", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke token");
      return res.json();
    },
    onSuccess: () => {
      setToken(null);
      setShowToken(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/extension/status"] });
      toast.success("Extension disconnected");
    },
    onError: () => {
      toast.error("Failed to revoke token");
    },
  });

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl">
      {renderBackButton()}
      
      <div className="space-y-6">
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Chrome Extension
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Connect your Chrome extension to access The YHC Way directly from your browser. Quick capture tasks, view your calendar, track time, and more.
          </p>

          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Extension Connected</span>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                {status.deviceLabel && <p>Device: {status.deviceLabel}</p>}
                {status.lastUsedAt && (
                  <p>Last used: {new Date(status.lastUsedAt).toLocaleString()}</p>
                )}
                {status.expiresAt && (
                  <p>Expires: {new Date(status.expiresAt).toLocaleDateString()}</p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => revokeTokenMutation.mutate()}
                disabled={revokeTokenMutation.isPending}
                className="text-red-600 border-red-300 hover:bg-red-50"
                data-testid="button-revoke-extension"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect Extension
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {!token ? (
                <Button
                  onClick={() => generateTokenMutation.mutate()}
                  disabled={generateTokenMutation.isPending}
                  data-testid="button-generate-token"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Generate Connection Token
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Your Extension Token</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={token}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyToken}
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                    <p className="font-medium mb-2">How to connect:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Copy the token above</li>
                      <li>Click the YHC Way extension icon in Chrome</li>
                      <li>Click "Connect" and paste your token</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-semibold mb-3">Install the Extension</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Don't have the extension yet? Download it from the Chrome Web Store or install it manually.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer">
                Chrome Web Store
              </a>
            </Button>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-semibold mb-3">Extension Features</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Quick task capture from any webpage
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              View upcoming calendar events
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Start/stop time tracking
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              AI assistant for quick questions
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Create tasks from Gmail emails
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Right-click context menu integration
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface GmailAccount {
  id: number;
  email: string;
  label: string | null;
  isPrimary: boolean | null;
  createdAt: string;
}

function GmailAccountsSectionContent({ renderBackButton }: { renderBackButton: () => React.ReactNode }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery<GmailAccount[]>({
    queryKey: ["/api/gmail/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/accounts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Gmail accounts");
      return res.json();
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (label?: string) => {
      const url = label ? `/api/gmail/connect?label=${encodeURIComponent(label)}` : "/api/gmail/connect";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to initiate Gmail connection");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/gmail/accounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/accounts"] });
      toast.success("Gmail account removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }) => {
      const res = await fetch(`/api/gmail/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error("Failed to update label");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/accounts"] });
      setEditingId(null);
      toast.success("Label updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/gmail/accounts/${id}/primary`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set primary account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/accounts"] });
      toast.success("Primary account updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddAccount = () => {
    connectMutation.mutate(newLabel || undefined);
    setIsAdding(false);
    setNewLabel("");
  };

  const startEditing = (account: GmailAccount) => {
    setEditingId(account.id);
    setEditLabel(account.label || account.email.split("@")[0]);
  };

  return (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Gmail Accounts</h2>
        <p className="text-muted-foreground">
          Connect multiple Gmail accounts to view all your emails in one unified inbox. You can add up to 10 accounts.
        </p>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Connected Accounts ({accounts.length}/10)</h3>
            {accounts.length < 10 && (
              <Button
                onClick={() => setIsAdding(true)}
                size="sm"
                className="gap-2"
                data-testid="button-add-gmail-account"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            )}
          </div>

          {isAdding && (
            <div className="mb-4 p-4 rounded-lg bg-white/50 border border-white/20">
              <Label className="block mb-2">Account Label (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Work, Personal"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  data-testid="input-gmail-label"
                />
                <Button onClick={handleAddAccount} disabled={connectMutation.isPending} data-testid="button-connect-gmail">
                  {connectMutation.isPending ? "Connecting..." : "Connect"}
                </Button>
                <Button variant="ghost" onClick={() => setIsAdding(false)} data-testid="button-cancel-add-gmail">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No Gmail accounts connected yet.</p>
              <Button onClick={() => setIsAdding(true)} data-testid="button-connect-first-gmail">
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/30 border border-white/20"
                  data-testid={`gmail-account-${account.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === account.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8"
                            data-testid={`input-edit-label-${account.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateLabelMutation.mutate({ id: account.id, label: editLabel })}
                            disabled={updateLabelMutation.isPending}
                            data-testid={`button-save-label-${account.id}`}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            data-testid={`button-cancel-edit-${account.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{account.label || account.email.split("@")[0]}</p>
                            {account.isPrimary && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Primary</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{account.email}</p>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId !== account.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(account)}
                        data-testid={`button-edit-${account.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!account.isPrimary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPrimaryMutation.mutate(account.id)}
                          disabled={setPrimaryMutation.isPending}
                          data-testid={`button-set-primary-${account.id}`}
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(account.id)}
                        disabled={removeMutation.isPending}
                        className="text-red-500 hover:text-red-600"
                        data-testid={`button-remove-${account.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            How It Works
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Emails from all connected accounts appear in one unified inbox
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Each email shows which account it belongs to
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Choose which account to send from when composing
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-green-600" />
              Your primary account is used by default for sending
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const mainContentClass = useMainContentClass();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: user } = useQuery<UserData>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });

  const { data: services } = useQuery<{ name: string; connected: boolean }[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["/api/preferences"] });
      const previousPreferences = queryClient.getQueryData<UserPreferences>(["/api/preferences"]);
      queryClient.setQueryData<UserPreferences>(["/api/preferences"], (old) => ({
        ...old!,
        ...updates,
      }));
      return { previousPreferences };
    },
    onSuccess: () => {
      toast.success("Preferences saved!");
    },
    onError: (err, updates, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(["/api/preferences"], context.previousPreferences);
      }
      toast.error("Failed to save preferences");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
    },
  });

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  const isSaving = updatePreferencesMutation.isPending;

  const settingsSections = [
    {
      id: "account" as const,
      icon: User,
      title: "Account",
      description: "Manage your profile and account details",
    },
    {
      id: "notifications" as const,
      icon: Bell,
      title: "Notifications",
      description: "Control how you receive alerts",
    },
    {
      id: "privacy" as const,
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your data and connected services",
    },
    {
      id: "appearance" as const,
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel",
    },
    {
      id: "language" as const,
      icon: Globe,
      title: "Language & Region",
      description: "Set your timezone and date preferences",
    },
    {
      id: "templates" as const,
      icon: FileText,
      title: "Task Templates",
      description: "Create reusable task templates for common workflows",
    },
    {
      id: "webhooks" as const,
      icon: Webhook,
      title: "Webhooks",
      description: "Manage webhooks for external integrations",
    },
    {
      id: "feedback" as const,
      icon: Bug,
      title: "Feedback",
      description: "View bug reports and feature requests",
    },
    {
      id: "organization" as const,
      icon: Building,
      title: "Organization",
      description: "Manage your team and organization settings",
    },
    {
      id: "extension" as const,
      icon: ExternalLink,
      title: "Browser Extension",
      description: "Connect the YHC Way Chrome extension",
    },
    {
      id: "email-signatures" as const,
      icon: Mail,
      title: "Email Signatures",
      description: "Create and manage your email signatures",
    },
    {
      id: "gmail-accounts" as const,
      icon: Mail,
      title: "Gmail Accounts",
      description: "Manage your connected Gmail mailboxes",
    },
    {
      id: "help" as const,
      icon: HelpCircle,
      title: "Help & Support",
      description: "Get help or contact support",
    },
  ];

  const renderBackButton = () => (
    <Button
      variant="ghost"
      onClick={() => setActiveSection("main")}
      className="mb-6 -ml-2"
      data-testid="button-back-to-main"
    >
      <ChevronLeft className="w-4 h-4 mr-1" />
      Back to Settings
    </Button>
  );

  const renderMainMenu = () => (
    <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
      {settingsSections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className="w-full glass-card p-5 rounded-2xl flex items-center gap-4 text-left hover:bg-white/60 transition-all"
          data-testid={`button-settings-${section.id}`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <section.icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{section.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{section.description}</p>
          </div>
          <div className="text-muted-foreground shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );

  const renderToggle = (
    icon: any,
    label: string,
    description: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    testId: string
  ) => {
    const Icon = icon;
    return (
      <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={isSaving}
          data-testid={testId}
        />
      </div>
    );
  };

  const renderAccountSection = () => (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Account</h2>
        <p className="text-muted-foreground">Manage your profile and account details.</p>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.firstName} {user?.lastName}</p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">First Name</Label>
              <Input 
                value={user?.firstName || ""} 
                disabled 
                className="mt-1 bg-white/50"
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Last Name</Label>
              <Input 
                value={user?.lastName || ""} 
                disabled 
                className="mt-1 bg-white/50"
                data-testid="input-last-name"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <Input 
                value={user?.email || ""} 
                disabled 
                className="mt-1 bg-white/50"
                data-testid="input-email"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Profile information is managed through your login provider.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <ExternalLink className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Notifications</h2>
        <p className="text-muted-foreground">Control how and when you receive alerts.</p>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-2">Service Notifications</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose which services can send you notifications.</p>
            
            {renderToggle(Mail, "Gmail", "New emails and important updates", 
              preferences?.notifyGmail ?? true, 
              (v) => handlePreferenceChange("notifyGmail", v),
              "toggle-notify-gmail"
            )}
            {renderToggle(MessageSquare, "Slack", "Messages and mentions", 
              preferences?.notifySlack ?? true, 
              (v) => handlePreferenceChange("notifySlack", v),
              "toggle-notify-slack"
            )}
            {renderToggle(Calendar, "Calendar", "Event reminders and invites", 
              preferences?.notifyCalendar ?? true, 
              (v) => handlePreferenceChange("notifyCalendar", v),
              "toggle-notify-calendar"
            )}
            {renderToggle(Video, "Zoom", "Meeting starting alerts", 
              preferences?.notifyZoom ?? true, 
              (v) => handlePreferenceChange("notifyZoom", v),
              "toggle-notify-zoom"
            )}
            {renderToggle(CheckSquare, "Asana", "Task updates and assignments", 
              preferences?.notifyAsana ?? true, 
              (v) => handlePreferenceChange("notifyAsana", v),
              "toggle-notify-asana"
            )}
            {renderToggle(MessageCircle, "The YHC Way Chat", "Direct messages from teammates", 
              preferences?.notifyChat ?? true, 
              (v) => handlePreferenceChange("notifyChat", v),
              "toggle-notify-chat"
            )}
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-2">Delivery Method</h3>
            <p className="text-sm text-muted-foreground mb-4">How do you want to receive notifications?</p>
            
            {renderToggle(Bell, "In-App Notifications", "Show alerts within The YHC Way", 
              preferences?.notifyInApp ?? true, 
              (v) => handlePreferenceChange("notifyInApp", v),
              "toggle-notify-inapp"
            )}
            {renderToggle(Mail, "Email Digest", "Receive a daily summary email", 
              preferences?.notifyEmail ?? false, 
              (v) => handlePreferenceChange("notifyEmail", v),
              "toggle-notify-email"
            )}
            {renderToggle(Volume2, "Sound", "Play a sound for new notifications", 
              preferences?.notifySound ?? true, 
              (v) => handlePreferenceChange("notifySound", v),
              "toggle-notify-sound"
            )}
            
            {preferences?.notifySound && (
              <div className="ml-13 mt-3 pl-13">
                <div className="flex items-center gap-4">
                  <Label className="text-sm text-muted-foreground min-w-[100px]">Sound Type</Label>
                  <Select
                    value={preferences?.notificationSoundType || "chime"}
                    onValueChange={(v) => handlePreferenceChange("notificationSoundType", v)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-40 bg-white/50" data-testid="select-sound-type">
                      <SelectValue placeholder="Select sound" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chime">Chime</SelectItem>
                      <SelectItem value="bell">Bell</SelectItem>
                      <SelectItem value="ping">Ping</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playNotificationSound(preferences?.notificationSoundType || "chime")}
                    disabled={isSaving}
                    data-testid="button-preview-sound"
                  >
                    Preview
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-2">Quiet Hours</h3>
            <p className="text-sm text-muted-foreground mb-4">Silence notifications during specific times.</p>
            
            <div className="flex items-center justify-between py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Enable Quiet Hours</p>
                  <p className="text-sm text-muted-foreground">Pause all notifications during set times</p>
                </div>
              </div>
              <Switch
                checked={preferences?.quietHoursEnabled ?? false}
                onCheckedChange={(v) => handlePreferenceChange("quietHoursEnabled", v)}
                disabled={isSaving}
                data-testid="toggle-quiet-hours"
              />
            </div>
            
            {preferences?.quietHoursEnabled && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    value={preferences?.quietHoursStart || "22:00"}
                    onChange={(e) => handlePreferenceChange("quietHoursStart", e.target.value)}
                    className="mt-1 bg-white/50"
                    disabled={isSaving}
                    data-testid="input-quiet-start"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    value={preferences?.quietHoursEnd || "08:00"}
                    onChange={(e) => handlePreferenceChange("quietHoursEnd", e.target.value)}
                    className="mt-1 bg-white/50"
                    disabled={isSaving}
                    data-testid="input-quiet-end"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPrivacySection = () => {
    const connectedServices = services?.filter(s => s.connected) || [];
    
    return (
      <div className="max-w-2xl">
        {renderBackButton()}
        <div className="mb-8">
          <h2 className="font-display font-bold text-2xl mb-2">Privacy & Security</h2>
          <p className="text-muted-foreground">Manage your connected services and data.</p>
        </div>

        {isLoading ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-muted-foreground">Loading preferences...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Online Status</h3>
              <p className="text-sm text-muted-foreground mb-4">Control who can see when you're active.</p>
              
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {preferences?.showOnlineStatus ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Show Online Status</p>
                    <p className="text-sm text-muted-foreground">Others can see when you're active in The YHC Way Chat</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.showOnlineStatus ?? true}
                  onCheckedChange={(v) => handlePreferenceChange("showOnlineStatus", v)}
                  disabled={isSaving}
                  data-testid="toggle-online-status"
                />
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Connected Services</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Services you've connected to The YHC Way. You can manage connections on the Connect page.
              </p>
              
              {connectedServices.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No services connected yet.</p>
              ) : (
                <div className="space-y-3">
                  {connectedServices.map((service) => (
                    <div key={service.name} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-green-600">Connected</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = "/connect"}
                        data-testid={`button-manage-${service.name.toLowerCase()}`}
                      >
                        Manage
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => window.location.href = "/connect"}
                data-testid="button-go-to-connect"
              >
                Manage All Connections
              </Button>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Your Data</h3>
              <p className="text-sm text-muted-foreground mb-4">Download or delete your data from The YHC Way.</p>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => toast.info("Data export feature coming soon!")}
                  data-testid="button-download-data"
                >
                  <Download className="w-4 h-4" />
                  Download My Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => toast.info("Please contact support to delete your account.")}
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderColorPicker = (
    label: string, 
    description: string,
    currentColor: string, 
    onChange: (color: string) => void
  ) => (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Label className="text-base font-semibold">{label}</Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div 
          className="w-8 h-8 rounded-lg border-2 border-white/50 shadow-md"
          style={{ backgroundColor: currentColor }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className="relative w-10 h-10 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            style={{ backgroundColor: color.value }}
            data-testid={`color-${label.toLowerCase().replace(/\s+/g, '-')}-${color.label.toLowerCase()}`}
            title={color.label}
          >
            {currentColor === color.value && (
              <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Appearance</h2>
        <p className="text-muted-foreground">Customize how The YHC Way looks for you.</p>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Theme</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {mounted && theme === "dark" ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
              </div>
              {mounted && (
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  data-testid="switch-dark-mode"
                />
              )}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Calendar Colors</h3>
            <div className="space-y-4">
              {renderColorPicker(
                "Google Calendar",
                "Color for events from Google Calendar",
                preferences?.googleCalendarColor || "#3b82f6",
                (color) => handlePreferenceChange("googleCalendarColor", color)
              )}

              {renderColorPicker(
                "Apple Calendar",
                "Color for events from Apple iCloud Calendar",
                preferences?.appleCalendarColor || "#22c55e",
                (color) => handlePreferenceChange("appleCalendarColor", color)
              )}

              {renderColorPicker(
                "Zoom Meetings",
                "Color for Zoom meetings on the calendar",
                preferences?.zoomColor || "#a855f7",
                (color) => handlePreferenceChange("zoomColor", color)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLanguageSection = () => (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Language & Region</h2>
        <p className="text-muted-foreground">Set your timezone and formatting preferences.</p>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Time & Date</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Timezone</Label>
                <p className="text-sm text-muted-foreground mb-2">Used for displaying times throughout The YHC Way</p>
                <Select
                  value={preferences?.timezone || "America/New_York"}
                  onValueChange={(v) => handlePreferenceChange("timezone", v)}
                >
                  <SelectTrigger className="bg-white/50" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Date Format</Label>
                <p className="text-sm text-muted-foreground mb-2">How dates are displayed</p>
                <Select
                  value={preferences?.dateFormat || "MM/DD/YYYY"}
                  onValueChange={(v) => handlePreferenceChange("dateFormat", v)}
                >
                  <SelectTrigger className="bg-white/50" data-testid="select-date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/25/2024)</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (25/12/2024)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-25)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">First Day of Week</Label>
                <p className="text-sm text-muted-foreground mb-2">Used in calendar views</p>
                <Select
                  value={preferences?.firstDayOfWeek || "sunday"}
                  onValueChange={(v) => handlePreferenceChange("firstDayOfWeek", v)}
                >
                  <SelectTrigger className="bg-white/50" data-testid="select-first-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const [helpExpanded, setHelpExpanded] = useState<string | null>(null);

  const helpTopics = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: `Welcome to The YHC Way! Here's how to get started:

1. **Connect Your Services** - Go to "Connect App" in the sidebar to link your Gmail, Google Calendar, Slack, Zoom, and other tools.

2. **View Your Dashboard** - The Overview page shows all your recent activity from connected services in one unified feed.

3. **Check Your Calendar** - The Calendar page combines events from Google Calendar, Apple Calendar, and Zoom meetings.

4. **Chat with Teammates** - Use the built-in Chat feature to message other The YHC Way users directly.

5. **Customize Settings** - Visit Settings to personalize notifications, appearance, and more.`
    },
    {
      id: "connecting-services",
      title: "Connecting Services",
      content: `The YHC Way integrates with the following services:

**Gmail & Google Calendar**
Click "Connect" next to Gmail or Google Calendar and sign in with your Google account. You'll be asked to grant The YHC Way permission to read your emails and calendar events.

**Slack**
Slack integration uses a shared workspace connection. Your admin configures the Slack bot token, and you can then view messages from channels you're part of.

**Zoom**
Zoom meetings are automatically synced when your admin configures the Zoom integration. Your upcoming meetings will appear on the Calendar page.

**Apple Calendar**
To connect Apple Calendar, you'll need to create an app-specific password in your Apple ID settings. Go to appleid.apple.com, sign in, and generate an app-specific password under Security.

**Asana**
Connect Asana by providing your personal access token from the Asana developer console. This lets The YHC Way show your tasks and project updates.`
    },
    {
      id: "notifications",
      title: "Managing Notifications",
      content: `Control how The YHC Way alerts you about new activity:

**Service Notifications**
Toggle notifications on or off for each connected service (Gmail, Slack, Calendar, Zoom, Asana, Chat).

**Delivery Methods**
- In-App: See notifications within The YHC Way
- Email Digest: Get a daily summary email
- Sound: Play a sound when new notifications arrive

**Quiet Hours**
Set times when you don't want to be disturbed. During quiet hours, all notifications are silenced.`
    },
    {
      id: "calendar",
      title: "Using the Calendar",
      content: `The Calendar page shows events from all your connected calendar services:

**Viewing Events**
- Switch between Month, Week, and Day views
- Events are color-coded by source (customize colors in Appearance settings)
- Click any event to see details

**Event Sources**
- Blue (default): Google Calendar events
- Green (default): Apple Calendar events  
- Purple (default): Zoom meetings

**Tips**
- Use the "Today" button to jump back to the current date
- Navigate with the arrow buttons or click directly on dates`
    },
    {
      id: "chat",
      title: "The YHC Way Chat",
      content: `Chat with other The YHC Way users in your organization:

**Starting a Conversation**
Click the "+" button to start a new chat with any The YHC Way user.

**Messaging**
Type your message and press Enter or click Send. Messages are delivered instantly.

**Privacy**
Your online status can be toggled in Privacy settings. When hidden, others won't see when you're active.`
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: `Having issues? Try these common fixes:

**Service Not Loading**
- Check if the service is properly connected on the Connect page
- Try disconnecting and reconnecting the service
- Refresh the page

**Emails Not Showing**
- Ensure you've granted Gmail read permissions
- Check if the Gmail toggle is enabled in Notifications settings

**Calendar Events Missing**
- Verify your calendar is connected
- Check that the calendar contains events (some shared calendars may be empty)

**Slack Messages Empty**
- The Slack bot needs to be added to channels to see messages
- Contact your admin to ensure proper Slack configuration`
    }
  ];

  const renderHelpSection = () => (
    <div className="max-w-2xl">
      {renderBackButton()}
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Help & Support</h2>
        <p className="text-muted-foreground">Learn how to use The YHC Way effectively.</p>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Documentation</h3>
          <div className="space-y-2">
            {helpTopics.map((topic) => (
              <div key={topic.id} className="border border-white/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setHelpExpanded(helpExpanded === topic.id ? null : topic.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors text-left"
                  data-testid={`help-topic-${topic.id}`}
                >
                  <span className="font-medium">{topic.title}</span>
                  <svg 
                    className={`w-5 h-5 text-muted-foreground transition-transform ${helpExpanded === topic.id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {helpExpanded === topic.id && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">
                    {topic.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Contact Support</h3>
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Button 
            className="w-full"
            onClick={() => window.location.href = "mailto:support@uniwork.app"}
            data-testid="button-contact-support"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Support
          </Button>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">About The YHC Way</h3>
          <p className="text-muted-foreground">
            The YHC Way brings all your work tools together in one unified dashboard. View emails, calendar events, chat messages, and tasks from Gmail, Google Calendar, Slack, Zoom, Apple Calendar, Asana, and more — all in one place.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );

  const renderTemplatesSection = () => (
    <TemplatesSectionContent renderBackButton={renderBackButton} />
  );

  const renderWebhooksSection = () => (
    <WebhooksSectionContent renderBackButton={renderBackButton} />
  );

  const renderFeedbackSection = () => (
    <FeedbackSectionContent renderBackButton={renderBackButton} />
  );

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return renderAccountSection();
      case "notifications":
        return renderNotificationsSection();
      case "privacy":
        return renderPrivacySection();
      case "appearance":
        return renderAppearanceSection();
      case "language":
        return renderLanguageSection();
      case "templates":
        return renderTemplatesSection();
      case "webhooks":
        return renderWebhooksSection();
      case "feedback":
        return renderFeedbackSection();
      case "organization":
        return <OrganizationSectionContent renderBackButton={renderBackButton} />;
      case "extension":
        return <ExtensionSectionContent renderBackButton={renderBackButton} />;
      case "email-signatures":
        return <EmailSignaturesSectionContent renderBackButton={renderBackButton} />;
      case "gmail-accounts":
        return <GmailAccountsSectionContent renderBackButton={renderBackButton} />;
      case "help":
        return renderHelpSection();
      default:
        return renderMainMenu();
    }
  };

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

      <main className={`flex-1 ml-0 ${mainContentClass} relative z-10 flex flex-col transition-all duration-300`}>
        <TopBar />
        <div className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace preferences.</p>
        </header>

        {renderContent()}
        </div>
      </main>
    </div>
  );
}
