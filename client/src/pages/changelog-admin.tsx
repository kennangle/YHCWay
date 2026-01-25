import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Redirect } from "wouter";
import { Plus, Bell, Megaphone, Clock, CheckCircle, Sparkles, Bug, RefreshCw, Send, MessageSquarePlus, Copy, X, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChangelogEntry {
  id: number;
  summary: string;
  description: string | null;
  entryType: string;
  entryDate: string;
  isManual: boolean;
  announcedAt: string | null;
  author: string | null;
  createdAt: string;
}

export default function ChangelogAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ summary: "", description: "", entryType: "feature" });
  const [quickNotification, setQuickNotification] = useState({ title: "", body: "", type: "feature.announcement" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entriesData, isLoading } = useQuery<{ entries: ChangelogEntry[] }>({
    queryKey: ["/api/admin/changelog"],
    enabled: !!user?.isAdmin,
  });

  const { data: unannouncedData } = useQuery<{ entries: ChangelogEntry[] }>({
    queryKey: ["/api/admin/changelog/unannounced"],
    enabled: !!user?.isAdmin,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: { summary: string; description: string; entryType: string }) => {
      const res = await fetch("/api/admin/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog/unannounced"] });
      setShowAddEntry(false);
      setNewEntry({ summary: "", description: "", entryType: "feature" });
      toast({ title: "Changelog entry created", description: "The entry will be included in the next daily announcement." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create changelog entry", variant: "destructive" });
    },
  });

  const announceNowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/changelog/announce-now", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to announce");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog/unannounced"] });
      toast({ 
        title: "Announcement sent!", 
        description: data.message || `Notified ${data.usersNotified} users about ${data.entriesAnnounced} entries.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send announcement", variant: "destructive" });
    },
  });

  const sendQuickNotificationMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; type: string }) => {
      const res = await fetch("/api/admin/announcements/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send notification");
      return res.json();
    },
    onSuccess: (data) => {
      setQuickNotification({ title: "", body: "", type: "feature.announcement" });
      toast({ 
        title: "Notification sent!", 
        description: `Sent to ${data.usersNotified || 'all'} users successfully.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    },
  });

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const entries = entriesData?.entries || [];
  const unannounced = unannouncedData?.entries || [];

  const generateConsolidatedSummary = (entriesToSummarize: ChangelogEntry[]) => {
    if (entriesToSummarize.length === 0) return "";
    
    const features = entriesToSummarize.filter(e => e.entryType === 'feature');
    const fixes = entriesToSummarize.filter(e => e.entryType === 'fix');
    const improvements = entriesToSummarize.filter(e => e.entryType === 'improvement');
    const changes = entriesToSummarize.filter(e => e.entryType === 'change');
    const others = entriesToSummarize.filter(e => !['feature', 'fix', 'improvement', 'change'].includes(e.entryType));
    
    const sentences: string[] = [];
    
    if (features.length > 0) {
      if (features.length === 1) {
        sentences.push(`We've added a new feature: ${features[0].summary.toLowerCase()}.`);
      } else {
        const lastFeature = features[features.length - 1].summary.toLowerCase();
        const otherFeatures = features.slice(0, -1).map(f => f.summary.toLowerCase()).join(', ');
        sentences.push(`We've added several new features including ${otherFeatures}, and ${lastFeature}.`);
      }
    }
    
    if (improvements.length > 0) {
      if (improvements.length === 1) {
        sentences.push(`We've improved ${improvements[0].summary.toLowerCase()}.`);
      } else {
        const items = improvements.map(i => i.summary.toLowerCase()).join(', ');
        sentences.push(`We've made improvements to ${items}.`);
      }
    }
    
    if (fixes.length > 0) {
      if (fixes.length === 1) {
        sentences.push(`We've fixed an issue with ${fixes[0].summary.toLowerCase()}.`);
      } else {
        const items = fixes.map(f => f.summary.toLowerCase()).join(', ');
        sentences.push(`We've resolved several issues including ${items}.`);
      }
    }
    
    if (changes.length > 0) {
      if (changes.length === 1) {
        sentences.push(`Additionally, ${changes[0].summary.toLowerCase()}.`);
      } else {
        const items = changes.map(c => c.summary.toLowerCase()).join(', ');
        sentences.push(`Other changes include ${items}.`);
      }
    }
    
    if (others.length > 0) {
      const items = others.map(o => o.summary.toLowerCase()).join(', ');
      sentences.push(`Other updates: ${items}.`);
    }
    
    return sentences.join(' ');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Summary copied to clipboard" });
    } catch (err) {
      toast({ title: "Copy failed", description: "Please select and copy manually", variant: "destructive" });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature": return <Sparkles className="w-4 h-4 text-green-600" />;
      case "fix": return <Bug className="w-4 h-4 text-red-600" />;
      case "change": return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "feature": return "Feature";
      case "fix": return "Bug Fix";
      case "change": return "Change";
      case "improvement": return "Improvement";
      default: return "Other";
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Announcements & Notifications</h1>
            <p className="text-muted-foreground">Send notifications and manage changelog entries</p>
          </div>
        </div>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" data-testid="tab-quick-notification">
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Quick Notification
            </TabsTrigger>
            <TabsTrigger value="changelog" data-testid="tab-changelog">
              <Megaphone className="w-4 h-4 mr-2" />
              Changelog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 mt-4">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquarePlus className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold">Send Quick Notification</h2>
                  <p className="text-sm text-muted-foreground">Send a notification directly to all users in production</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Notification Type</label>
                  <Select 
                    value={quickNotification.type} 
                    onValueChange={(v) => setQuickNotification({ ...quickNotification, type: v })}
                  >
                    <SelectTrigger data-testid="select-notification-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature.announcement">Feature Announcement</SelectItem>
                      <SelectItem value="daily.summary">Daily Summary</SelectItem>
                      <SelectItem value="system.announcement">System Announcement</SelectItem>
                      <SelectItem value="tip">Tip / Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="e.g., New: AI Assistant User Guide"
                    value={quickNotification.title}
                    onChange={(e) => setQuickNotification({ ...quickNotification, title: e.target.value })}
                    data-testid="input-notification-title"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Message</label>
                    {entries.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const summary = generateConsolidatedSummary(entries);
                          setQuickNotification({ ...quickNotification, body: summary });
                          toast({ title: "Inserted!", description: "Changelog summary added to message" });
                        }}
                        className="text-xs h-7 text-blue-600 hover:text-blue-700"
                        data-testid="button-insert-changelog"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Insert Changelog Summary ({entries.length})
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder="Write your notification message here..."
                    value={quickNotification.body}
                    onChange={(e) => setQuickNotification({ ...quickNotification, body: e.target.value })}
                    rows={6}
                    data-testid="input-notification-body"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => sendQuickNotificationMutation.mutate(quickNotification)}
                    disabled={!quickNotification.title || !quickNotification.body || sendQuickNotificationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-send-notification"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendQuickNotificationMutation.isPending ? "Sending..." : "Send to All Users"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="changelog" className="space-y-4 mt-4">
            <div className="flex justify-end gap-2">
              {entries.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateConsolidatedSummary(entries))}
                  data-testid="button-copy-all-changelog"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All ({entries.length})
                </Button>
              )}
              {unannounced.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateConsolidatedSummary(unannounced))}
                  data-testid="button-copy-pending-changelog"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Pending ({unannounced.length})
                </Button>
              )}
              <Button onClick={() => setShowAddEntry(true)} data-testid="button-add-changelog">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>

            {unannounced.length > 0 && (
              <div className="glass-panel rounded-xl p-4 border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-foreground">{unannounced.length} pending announcement{unannounced.length !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-muted-foreground">Will be sent at 5 PM PST or you can send now</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => announceNowMutation.mutate()} 
                    disabled={announceNowMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="button-announce-now"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {announceNowMutation.isPending ? "Sending..." : "Announce Now"}
                  </Button>
                </div>
              </div>
            )}

            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Changelog Entries</h2>
          
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground">No changelog entries yet. Add your first entry above.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${entry.announcedAt ? 'bg-white/30' : 'bg-amber-50/50 border border-amber-200/50'}`}
                  data-testid={`changelog-entry-${entry.id}`}
                >
                  {getTypeIcon(entry.entryType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {getTypeLabel(entry.entryType)}
                      </span>
                      {entry.announcedAt ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" /> Announced
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Pending</span>
                      )}
                    </div>
                    <p className="font-medium text-foreground mt-1">{entry.summary}</p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(entry.entryDate), { addSuffix: true })}
                      {entry.author && ` by ${entry.author}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>

      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Changelog Entry</DialogTitle>
            <DialogDescription>Create a new changelog entry to track updates and changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={newEntry.entryType} 
                onValueChange={(v) => setNewEntry({ ...newEntry, entryType: v })}
              >
                <SelectTrigger data-testid="select-entry-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">New Feature</SelectItem>
                  <SelectItem value="fix">Bug Fix</SelectItem>
                  <SelectItem value="change">Change</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Summary</label>
              <Input
                placeholder="Brief description of the change"
                value={newEntry.summary}
                onChange={(e) => setNewEntry({ ...newEntry, summary: e.target.value })}
                data-testid="input-summary"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="More details about this change..."
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                data-testid="input-description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button 
                onClick={() => createEntryMutation.mutate(newEntry)}
                disabled={!newEntry.summary || createEntryMutation.isPending}
                data-testid="button-save-entry"
              >
                {createEntryMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
