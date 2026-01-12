import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Redirect } from "wouter";
import { History, RefreshCw, Plus, GitCommit, FileText, Bug, Rocket, BookOpen, Wrench, Sparkles, Copy, X, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface ChangelogEntry {
  id: number;
  commitHash: string | null;
  author: string | null;
  summary: string;
  description: string | null;
  entryType: string | null;
  entryDate: string;
  isManual: boolean | null;
  createdAt: string | null;
}

const entryTypeIcons: Record<string, React.ReactNode> = {
  feature: <Rocket className="w-4 h-4 text-green-500" />,
  fix: <Bug className="w-4 h-4 text-red-500" />,
  improvement: <Wrench className="w-4 h-4 text-blue-500" />,
  docs: <BookOpen className="w-4 h-4 text-purple-500" />,
  deploy: <GitCommit className="w-4 h-4 text-orange-500" />,
  other: <FileText className="w-4 h-4 text-gray-500" />,
};

const entryTypeLabels: Record<string, string> = {
  feature: "Feature",
  fix: "Bug Fix",
  improvement: "Improvement",
  docs: "Documentation",
  deploy: "Deployment",
  other: "Other",
};

export default function Changelog() {
  const { user, isLoading: authLoading } = useAuth();
  const mainContentClass = useMainContentClass();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [newEntry, setNewEntry] = useState({
    summary: "",
    description: "",
    entryType: "other",
    entryDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: changelogData, isLoading, refetch } = useQuery<{ entries: ChangelogEntry[] }>({
    queryKey: ["/api/changelog", dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await fetch(`/api/changelog?from=${dateRange.from}&to=${dateRange.to}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch changelog");
      return res.json();
    },
    enabled: user?.email === "ken@yogahealthcenter.com",
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/changelog/sync");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      toast({ title: "Sync complete", description: data.message });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not sync git commits", variant: "destructive" });
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async (entry: typeof newEntry) => {
      return apiRequest("POST", "/api/changelog", entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      toast({ title: "Entry added", description: "Manual changelog entry created" });
      setShowAddEntry(false);
      setNewEntry({ summary: "", description: "", entryType: "other", entryDate: format(new Date(), "yyyy-MM-dd") });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not add entry", variant: "destructive" });
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/changelog/summarize");
      return res.json();
    },
    onSuccess: (data: any) => {
      setSummary(data.summary);
      setShowSummary(true);
      setCopied(false);
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not generate summary", variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast({ title: "Copied!", description: "Summary copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.email !== "ken@yogahealthcenter.com") {
    return <Redirect to="/dashboard" />;
  }

  const entries = changelogData?.entries || [];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <UnifiedSidebar />
      <main className={mainContentClass}>
        <TopBar />
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">Development Activity Log</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur rounded-lg px-3 py-2 shadow-sm">
                <label className="text-sm text-gray-600">From:</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                  className="border-0 bg-transparent text-sm focus:outline-none"
                  data-testid="date-from"
                />
                <label className="text-sm text-gray-600 ml-2">To:</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                  className="border-0 bg-transparent text-sm focus:outline-none"
                  data-testid="date-to"
                />
              </div>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                data-testid="button-sync"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync Commits
              </button>
              <button
                onClick={() => setShowAddEntry(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                data-testid="button-add-entry"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
              <button
                onClick={() => summarizeMutation.mutate()}
                disabled={summarizeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                data-testid="button-summarize"
              >
                <Sparkles className={`w-4 h-4 ${summarizeMutation.isPending ? "animate-pulse" : ""}`} />
                {summarizeMutation.isPending ? "Generating..." : "Summarize Today"}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-lg text-gray-900">Today's Activity Summary</h3>
                  </div>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                    data-testid="button-close-summary"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{summary}</pre>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    data-testid="button-copy-summary"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    data-testid="button-done"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAddEntry && (
            <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Add Manual Entry</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <input
                    type="text"
                    value={newEntry.summary}
                    onChange={(e) => setNewEntry((p) => ({ ...p, summary: e.target.value }))}
                    placeholder="What was done?"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-summary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newEntry.entryType}
                      onChange={(e) => setNewEntry((p) => ({ ...p, entryType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="select-type"
                    >
                      <option value="feature">Feature</option>
                      <option value="fix">Bug Fix</option>
                      <option value="improvement">Improvement</option>
                      <option value="docs">Documentation</option>
                      <option value="deploy">Deployment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newEntry.entryDate}
                      onChange={(e) => setNewEntry((p) => ({ ...p, entryDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="input-date"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={newEntry.description}
                    onChange={(e) => setNewEntry((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Additional details..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-description"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowAddEntry(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addEntryMutation.mutate(newEntry)}
                    disabled={!newEntry.summary || addEntryMutation.isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    data-testid="button-save"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-12 text-center">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
              <p className="text-gray-500 mb-4">Click "Sync Commits" to import git history or add entries manually.</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y">
                {entries.map((entry) => (
                  <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors" data-testid={`entry-${entry.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {entryTypeIcons[entry.entryType || "other"]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {entryTypeLabels[entry.entryType || "other"]}
                          </span>
                          {entry.isManual && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{entry.summary}</p>
                        {entry.description && (
                          <p className="mt-1 text-sm text-gray-600">{entry.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
