import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  Video, 
  Users,
  CheckCircle2,
  Clock,
  ListTodo,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

interface MeetingSummary {
  overview: string;
  attendees: string[];
  topicsDiscussed: string[];
  keyDecisions: string[];
  actionItems: { owner: string; task: string; deadline?: string }[];
  followUps: string[];
}

interface ThreadSummary {
  overview: string;
  participants: string[];
  keyDiscussionPoints: string[];
  decisions: string[];
  actionItems: string[];
  timeline: string;
}

export default function AISummarize() {
  const [activeTab, setActiveTab] = useState("meeting");
  
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [meetingTranscript, setMeetingTranscript] = useState("");
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);
  
  const [threadSubject, setThreadSubject] = useState("");
  const [threadContent, setThreadContent] = useState("");
  const [threadSummary, setThreadSummary] = useState<ThreadSummary | null>(null);

  const meetingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/meeting-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: meetingTitle,
          transcript: meetingTranscript,
          attendees: meetingAttendees ? meetingAttendees.split(",").map(a => a.trim()).filter(Boolean) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to summarize meeting");
      return res.json();
    },
    onSuccess: (data) => {
      setMeetingSummary(data);
      toast.success("Meeting summarized successfully");
    },
    onError: () => {
      toast.error("Failed to summarize meeting");
    },
  });

  const threadMutation = useMutation({
    mutationFn: async () => {
      const messages = threadContent.split(/\n(?=From:|---)/g).filter(Boolean).map(block => {
        const fromMatch = block.match(/From:\s*(.+)/);
        const dateMatch = block.match(/Date:\s*(.+)/);
        return {
          from: fromMatch ? fromMatch[1].trim() : "Unknown",
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          body: block,
        };
      });
      
      const res = await fetch("/api/ai/thread-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: threadSubject,
          messages: messages.length > 0 ? messages : [{ from: "Unknown", date: new Date().toISOString(), body: threadContent }],
        }),
      });
      if (!res.ok) throw new Error("Failed to summarize thread");
      return res.json();
    },
    onSuccess: (data) => {
      setThreadSummary(data);
      toast.success("Content summarized successfully");
    },
    onError: () => {
      toast.error("Failed to summarize content");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">AI Summarization Tool</h1>
              <p className="text-muted-foreground">Summarize meeting transcripts, notes, and long content</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="meeting" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Meeting Transcript
              </TabsTrigger>
              <TabsTrigger value="thread" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Email/Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meeting" className="space-y-6">
              <div className="glass-panel p-6 rounded-xl">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-purple-600" />
                  Meeting Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="meeting-title">Meeting Title</Label>
                    <Input
                      id="meeting-title"
                      placeholder="e.g., Weekly Team Standup"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      data-testid="input-meeting-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="attendees">Attendees (comma-separated)</Label>
                    <Input
                      id="attendees"
                      placeholder="e.g., John, Sarah, Mike"
                      value={meetingAttendees}
                      onChange={(e) => setMeetingAttendees(e.target.value)}
                      data-testid="input-meeting-attendees"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transcript">Meeting Transcript or Notes</Label>
                    <Textarea
                      id="transcript"
                      placeholder="Paste your meeting transcript, notes, or recording transcription here..."
                      value={meetingTranscript}
                      onChange={(e) => setMeetingTranscript(e.target.value)}
                      className="min-h-[200px]"
                      data-testid="input-meeting-transcript"
                    />
                  </div>
                  <Button
                    onClick={() => meetingMutation.mutate()}
                    disabled={!meetingTranscript.trim() || meetingMutation.isPending}
                    className="w-full"
                    data-testid="button-summarize-meeting"
                  >
                    {meetingMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Summarize Meeting
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {meetingSummary && (
                <div className="glass-panel p-6 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Meeting Summary
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-purple-800 mb-2">Overview</h3>
                      <p className="text-gray-700">{meetingSummary.overview}</p>
                    </div>

                    {meetingSummary.attendees.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Attendees
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {meetingSummary.attendees.map((attendee, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                              {attendee}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {meetingSummary.topicsDiscussed.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Topics Discussed
                        </h3>
                        <ul className="space-y-1">
                          {meetingSummary.topicsDiscussed.map((topic, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-purple-500 mt-0.5">•</span>
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {meetingSummary.keyDecisions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Key Decisions
                        </h3>
                        <ul className="space-y-1">
                          {meetingSummary.keyDecisions.map((decision, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✓</span>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {meetingSummary.actionItems.length > 0 && (
                      <div className="bg-white/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-1">
                          <ListTodo className="w-4 h-4" />
                          Action Items
                        </h3>
                        <div className="space-y-2">
                          {meetingSummary.actionItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-orange-500 mt-0.5">→</span>
                              <div>
                                <span className="font-medium text-gray-800">{item.owner}:</span>
                                <span className="text-gray-700 ml-1">{item.task}</span>
                                {item.deadline && (
                                  <span className="text-orange-600 ml-2 flex items-center gap-1 inline-flex">
                                    <Clock className="w-3 h-3" />
                                    {item.deadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {meetingSummary.followUps.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Follow-ups</h3>
                        <ul className="space-y-1">
                          {meetingSummary.followUps.map((followUp, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">◦</span>
                              {followUp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="thread" className="space-y-6">
              <div className="glass-panel p-6 rounded-xl">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Content to Summarize
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="thread-subject">Subject/Title (optional)</Label>
                    <Input
                      id="thread-subject"
                      placeholder="e.g., Project Discussion"
                      value={threadSubject}
                      onChange={(e) => setThreadSubject(e.target.value)}
                      data-testid="input-thread-subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="thread-content">Email Thread, Notes, or Long Content</Label>
                    <Textarea
                      id="thread-content"
                      placeholder="Paste your email thread, long notes, or any content you want summarized..."
                      value={threadContent}
                      onChange={(e) => setThreadContent(e.target.value)}
                      className="min-h-[250px]"
                      data-testid="input-thread-content"
                    />
                  </div>
                  <Button
                    onClick={() => threadMutation.mutate()}
                    disabled={!threadContent.trim() || threadMutation.isPending}
                    className="w-full"
                    data-testid="button-summarize-thread"
                  >
                    {threadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Summarize Content
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {threadSummary && (
                <div className="glass-panel p-6 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Summary
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-purple-800 mb-2">Overview</h3>
                      <p className="text-gray-700">{threadSummary.overview}</p>
                    </div>

                    {threadSummary.participants.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Participants
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {threadSummary.participants.map((p, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {threadSummary.keyDiscussionPoints.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-purple-800 mb-2">Key Discussion Points</h3>
                        <ul className="space-y-1">
                          {threadSummary.keyDiscussionPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-purple-500 mt-0.5">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {threadSummary.decisions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Decisions Made
                        </h3>
                        <ul className="space-y-1">
                          {threadSummary.decisions.map((decision, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✓</span>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {threadSummary.actionItems.length > 0 && (
                      <div className="bg-white/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-1">
                          <ListTodo className="w-4 h-4" />
                          Action Items
                        </h3>
                        <ul className="space-y-1">
                          {threadSummary.actionItems.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-orange-500 mt-0.5">→</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {threadSummary.timeline && (
                      <div>
                        <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Timeline
                        </h3>
                        <p className="text-sm text-gray-700">{threadSummary.timeline}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}
