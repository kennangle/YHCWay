import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Brain, 
  Sparkles, 
  Calendar, 
  Mail, 
  Search, 
  ListTodo, 
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Copy,
  Users,
  Link2Off
} from "lucide-react";
import { toast } from "sonner";

const AI_TAB_STORAGE_KEY = "yhc-ai-assistant-tab";

interface DailyBriefing {
  summary: string;
  priorityTasks: string[];
  upcomingMeetings: string[];
  urgentMessages: string[];
  recommendations: string[];
}

interface SmartSearchResult {
  answer: string;
  sources: { type: string; title: string; snippet: string }[];
}

interface PrioritizedTask {
  taskId: number;
  title: string;
  score: number;
  reasoning: string;
}

interface CalendarInsight {
  overloadedDays: { date: string; meetingCount: number; totalHours: number }[];
  suggestedFocusBlocks: { date: string; startTime: string; endTime: string }[];
  recommendations: string[];
}

interface DraftedEmail {
  subject: string;
  body: string;
}

interface ExtractedTask {
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  source: string;
}

interface MeetingPrepResult {
  meetingTitle: string;
  meetingTime: string;
  attendees: string[];
  relatedEmails: { subject: string; snippet: string }[];
  relatedTasks: { title: string; status: string }[];
  relatedSlackMessages: { channel: string; message: string }[];
  suggestedTalkingPoints: string[];
  summary: string;
}

type TabId = "briefing" | "search" | "draft" | "calendar" | "tasks" | "extract" | "meeting-prep";

export function AIAssistantPanel() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = localStorage.getItem(AI_TAB_STORAGE_KEY);
    return (saved as TabId) || "briefing";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [emailPrompt, setEmailPrompt] = useState("");
  const [extractContent, setExtractContent] = useState("");
  const [extractSource, setExtractSource] = useState<"email" | "slack" | "meeting_notes">("email");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tasks: true,
    meetings: true,
    messages: true,
    recommendations: true,
  });

  useEffect(() => {
    localStorage.setItem(AI_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const { data: briefing, isLoading: briefingLoading, refetch: refetchBriefing } = useQuery<DailyBriefing>({
    queryKey: ["ai-daily-briefing"],
    queryFn: async () => {
      const res = await fetch("/api/ai/daily-briefing", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get briefing");
      return res.json();
    },
    enabled: activeTab === "briefing",
    staleTime: 5 * 60 * 1000,
  });

  const searchMutation = useMutation<SmartSearchResult, Error, string>({
    mutationFn: async (query: string) => {
      const res = await fetch("/api/ai/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const draftMutation = useMutation<DraftedEmail, Error, string>({
    mutationFn: async (prompt: string) => {
      const res = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Draft failed");
      return res.json();
    },
  });

  const extractMutation = useMutation<{ tasks: ExtractedTask[] }, Error, { content: string; source: string }>({
    mutationFn: async ({ content, source }) => {
      const res = await fetch("/api/ai/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, source }),
      });
      if (!res.ok) throw new Error("Extraction failed");
      return res.json();
    },
  });

  const meetingPrepMutation = useMutation<MeetingPrepResult, Error, string>({
    mutationFn: async (meetingId: string) => {
      const res = await fetch("/api/ai/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok) throw new Error("Meeting prep failed");
      return res.json();
    },
  });

  const { data: calendarInsights, isLoading: calendarLoading, refetch: refetchCalendar } = useQuery<CalendarInsight>({
    queryKey: ["ai-calendar-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/calendar-insights", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get insights");
      return res.json();
    },
    enabled: activeTab === "calendar",
    staleTime: 10 * 60 * 1000,
  });

  const { data: prioritizedTasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery<{ prioritizedTasks: PrioritizedTask[] }>({
    queryKey: ["ai-prioritized-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/ai/prioritize-tasks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to prioritize");
      return res.json();
    },
    enabled: activeTab === "tasks",
    staleTime: 5 * 60 * 1000,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  const handleDraft = () => {
    if (emailPrompt.trim()) {
      draftMutation.mutate(emailPrompt);
    }
  };

  const handleExtract = () => {
    if (extractContent.trim()) {
      extractMutation.mutate({ content: extractContent, source: extractSource });
    }
  };

  const handleMeetingPrep = () => {
    if (selectedMeetingId.trim()) {
      meetingPrepMutation.mutate(selectedMeetingId);
    }
  };

  const tabs = [
    { id: "briefing", label: "Daily Briefing", icon: Sparkles },
    { id: "search", label: "Smart Search", icon: Search },
    { id: "draft", label: "Draft Email", icon: Mail },
    { id: "meeting-prep", label: "Meeting Prep", icon: Users },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "tasks", label: "Task Priority", icon: TrendingUp },
    { id: "extract", label: "Extract Tasks", icon: ListTodo },
  ];

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-purple-100">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>
      </div>

      <div className="flex border-b flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "text-primary border-b-2 border-primary bg-primary/5" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            data-testid={`tab-ai-${tab.id}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "briefing" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Your Day at a Glance</h3>
              <button 
                onClick={() => refetchBriefing()}
                disabled={briefingLoading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-refresh-briefing"
              >
                <RefreshCw className={`w-4 h-4 ${briefingLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {briefingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-500">Generating your briefing...</span>
              </div>
            ) : briefing ? (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-blue-50 rounded-xl relative group">
                  <p className="text-gray-800 pr-8" data-testid="text-briefing-summary">{briefing.summary}</p>
                  <button 
                    onClick={() => copyToClipboard(briefing.summary)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy summary"
                    data-testid="button-copy-briefing"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <CollapsibleSection
                  title="Priority Tasks"
                  icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                  expanded={expandedSections.tasks}
                  onToggle={() => toggleSection("tasks")}
                  count={briefing.priorityTasks.length}
                >
                  <ul className="space-y-2">
                    {briefing.priorityTasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                          {i + 1}
                        </span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Upcoming Meetings"
                  icon={<Calendar className="w-4 h-4 text-blue-600" />}
                  expanded={expandedSections.meetings}
                  onToggle={() => toggleSection("meetings")}
                  count={briefing.upcomingMeetings.length}
                >
                  <ul className="space-y-2">
                    {briefing.upcomingMeetings.map((meeting, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{meeting}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>

                {briefing.urgentMessages.length > 0 && (
                  <CollapsibleSection
                    title="Urgent Messages"
                    icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                    expanded={expandedSections.messages}
                    onToggle={() => toggleSection("messages")}
                    count={briefing.urgentMessages.length}
                  >
                    <ul className="space-y-2">
                      {briefing.urgentMessages.map((msg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-orange-800 bg-orange-50 p-2 rounded-lg">
                          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                )}

                <CollapsibleSection
                  title="Recommendations"
                  icon={<Sparkles className="w-4 h-4 text-purple-600" />}
                  expanded={expandedSections.recommendations}
                  onToggle={() => toggleSection("recommendations")}
                  count={briefing.recommendations.length}
                >
                  <ul className="space-y-2">
                    {briefing.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-purple-800 bg-purple-50 p-2 rounded-lg">
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Click refresh to generate your daily briefing</p>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask anything about your emails, tasks, or calendar..."
                className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-smart-search"
              />
              <button
                onClick={handleSearch}
                disabled={searchMutation.isPending || !searchQuery.trim()}
                className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                data-testid="button-smart-search"
              >
                {searchMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            {searchMutation.data && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl relative group">
                  <p className="text-gray-800 pr-8" data-testid="text-search-answer">{searchMutation.data.answer}</p>
                  <button 
                    onClick={() => copyToClipboard(searchMutation.data!.answer)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy answer"
                    data-testid="button-copy-search"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {searchMutation.data.sources.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Sources</h4>
                    <div className="space-y-2">
                      {searchMutation.data.sources.map((source, i) => (
                        <div key={i} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              source.type === "email" ? "bg-blue-100 text-blue-700" :
                              source.type === "task" ? "bg-green-100 text-green-700" :
                              source.type === "meeting" ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {source.type}
                            </span>
                            <span className="font-medium">{source.title}</span>
                          </div>
                          <p className="text-gray-600">{source.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {searchMutation.isError && (
              <p className="text-red-500 text-sm">Search failed. Please try again.</p>
            )}
          </div>
        )}

        {activeTab === "draft" && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2 text-sm">
              <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800">
                Tip: Connect your Gmail account on the <a href="/connect" className="underline font-medium">Connect page</a> to send drafts directly.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe the email you want to write
              </label>
              <textarea
                value={emailPrompt}
                onChange={(e) => setEmailPrompt(e.target.value)}
                placeholder="e.g., Write a follow-up email to the team about the project deadline next week..."
                className="w-full h-32 px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-email-prompt"
              />
            </div>

            <button
              onClick={handleDraft}
              disabled={draftMutation.isPending || !emailPrompt.trim()}
              className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="button-draft-email"
            >
              {draftMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Generate Draft
            </button>

            {draftMutation.data && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-sm font-medium text-gray-600">Subject</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="flex-1 font-medium" data-testid="text-draft-subject">{draftMutation.data.subject}</p>
                    <button 
                      onClick={() => copyToClipboard(draftMutation.data!.subject)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Body</label>
                  <div className="flex items-start gap-2 mt-1">
                    <p className="flex-1 whitespace-pre-wrap text-sm" data-testid="text-draft-body">{draftMutation.data.body}</p>
                    <button 
                      onClick={() => copyToClipboard(draftMutation.data!.body)}
                      className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Calendar Optimization</h3>
              <button 
                onClick={() => refetchCalendar()}
                disabled={calendarLoading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-refresh-calendar"
              >
                <RefreshCw className={`w-4 h-4 ${calendarLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {calendarLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : calendarInsights ? (
              <div className="space-y-4">
                {calendarInsights.overloadedDays.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Overloaded Days
                    </h4>
                    <ul className="space-y-2">
                      {calendarInsights.overloadedDays.map((day, i) => (
                        <li key={i} className="text-sm text-red-700">
                          {day.date}: {day.meetingCount} meetings ({day.totalHours}h)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {calendarInsights.suggestedFocusBlocks.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Suggested Focus Time
                    </h4>
                    <ul className="space-y-2">
                      {calendarInsights.suggestedFocusBlocks.map((block, i) => (
                        <li key={i} className="text-sm text-green-700">
                          {block.date}: {block.startTime} - {block.endTime}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {calendarInsights.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {calendarInsights.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-blue-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Click refresh to analyze your calendar</p>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">AI-Prioritized Tasks</h3>
              <button 
                onClick={() => refetchTasks()}
                disabled={tasksLoading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="button-refresh-tasks"
              >
                <RefreshCw className={`w-4 h-4 ${tasksLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : prioritizedTasks?.prioritizedTasks.length ? (
              <div className="space-y-3">
                {prioritizedTasks.prioritizedTasks.map((task, i) => (
                  <div 
                    key={task.taskId} 
                    className={`p-4 rounded-xl border-l-4 ${
                      task.score >= 80 ? "bg-red-50 border-red-500" :
                      task.score >= 60 ? "bg-orange-50 border-orange-500" :
                      task.score >= 40 ? "bg-yellow-50 border-yellow-500" :
                      "bg-gray-50 border-gray-300"
                    }`}
                    data-testid={`task-prioritized-${task.taskId}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        task.score >= 80 ? "bg-red-200 text-red-800" :
                        task.score >= 60 ? "bg-orange-200 text-orange-800" :
                        task.score >= 40 ? "bg-yellow-200 text-yellow-800" :
                        "bg-gray-200 text-gray-800"
                      }`}>
                        Score: {task.score}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{task.reasoning}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No tasks to prioritize</p>
            )}
          </div>
        )}

        {activeTab === "extract" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Type
              </label>
              <div className="flex gap-2">
                {["email", "slack", "meeting_notes"].map((source) => (
                  <button
                    key={source}
                    onClick={() => setExtractSource(source as any)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      extractSource === source
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    data-testid={`button-source-${source}`}
                  >
                    {source === "meeting_notes" ? "Meeting Notes" : source.charAt(0).toUpperCase() + source.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste content to extract tasks from
              </label>
              <textarea
                value={extractContent}
                onChange={(e) => setExtractContent(e.target.value)}
                placeholder="Paste an email, Slack message, or meeting notes here..."
                className="w-full h-40 px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-extract-content"
              />
            </div>

            <button
              onClick={handleExtract}
              disabled={extractMutation.isPending || !extractContent.trim()}
              className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="button-extract-tasks"
            >
              {extractMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ListTodo className="w-5 h-5" />
              )}
              Extract Tasks
            </button>

            {extractMutation.data?.tasks.length ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Extracted Tasks</h4>
                {extractMutation.data.tasks.map((task, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        task.priority === "urgent" ? "bg-red-100 text-red-700" :
                        task.priority === "high" ? "bg-orange-100 text-orange-700" :
                        task.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-1">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : extractMutation.data?.tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No actionable tasks found in this content</p>
            ) : null}
          </div>
        )}

        {activeTab === "meeting-prep" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Meeting ID or Title
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedMeetingId}
                  onChange={(e) => setSelectedMeetingId(e.target.value)}
                  placeholder="Meeting ID or title..."
                  className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleMeetingPrep()}
                  data-testid="input-meeting-id"
                />
                <button
                  onClick={handleMeetingPrep}
                  disabled={meetingPrepMutation.isPending || !selectedMeetingId.trim()}
                  className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  data-testid="button-meeting-prep"
                >
                  {meetingPrepMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                  Prepare
                </button>
              </div>
            </div>

            {meetingPrepMutation.data && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <h4 className="font-semibold text-lg text-gray-800 mb-1">{meetingPrepMutation.data.meetingTitle}</h4>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {meetingPrepMutation.data.meetingTime}
                  </p>
                  {meetingPrepMutation.data.attendees.length > 0 && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4" />
                      {meetingPrepMutation.data.attendees.join(", ")}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-white border rounded-xl">
                  <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">{meetingPrepMutation.data.summary}</p>
                </div>

                {meetingPrepMutation.data.suggestedTalkingPoints.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Suggested Talking Points
                    </h4>
                    <ul className="space-y-2">
                      {meetingPrepMutation.data.suggestedTalkingPoints.map((point, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meetingPrepMutation.data.relatedEmails.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Related Emails ({meetingPrepMutation.data.relatedEmails.length})
                    </h4>
                    <ul className="space-y-2">
                      {meetingPrepMutation.data.relatedEmails.map((email, i) => (
                        <li key={i} className="text-sm text-blue-700">
                          <span className="font-medium">{email.subject}</span>
                          <p className="text-blue-600 text-xs">{email.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meetingPrepMutation.data.relatedTasks.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Related Tasks ({meetingPrepMutation.data.relatedTasks.length})
                    </h4>
                    <ul className="space-y-2">
                      {meetingPrepMutation.data.relatedTasks.map((task, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-center justify-between">
                          <span>{task.title}</span>
                          <span className="text-xs bg-orange-100 px-2 py-0.5 rounded">{task.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meetingPrepMutation.data.relatedSlackMessages.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <h4 className="font-medium text-purple-800 mb-2">
                      Related Slack Messages ({meetingPrepMutation.data.relatedSlackMessages.length})
                    </h4>
                    <ul className="space-y-2">
                      {meetingPrepMutation.data.relatedSlackMessages.map((msg, i) => (
                        <li key={i} className="text-sm text-purple-700">
                          <span className="font-medium">#{msg.channel}</span>
                          <p className="text-purple-600 text-xs">{msg.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!meetingPrepMutation.data && !meetingPrepMutation.isPending && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Enter a meeting ID or title to get AI-powered preparation</p>
                <p className="text-sm mt-1">Includes related emails, tasks, and Slack messages</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon, 
  expanded, 
  onToggle, 
  count, 
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  expanded: boolean; 
  onToggle: () => void; 
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="p-3 pt-0 border-t bg-gray-50/50">
          {count > 0 ? children : <p className="text-sm text-gray-500">None</p>}
        </div>
      )}
    </div>
  );
}
