import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, RefreshCw, Users, Clock, FileText, CheckSquare, ChevronDown, ChevronRight, Calendar, User, ExternalLink } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

interface FathomParticipant {
  name: string;
  email?: string;
}

interface FathomActionItem {
  id: string;
  text: string;
  assignee?: string;
  completed?: boolean;
}

interface FathomTranscriptEntry {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
}

interface FathomMeeting {
  id: string;
  title: string;
  created_at: string;
  duration_seconds?: number;
  recording_url?: string;
  participants?: FathomParticipant[];
  transcript?: FathomTranscriptEntry[];
  summary?: string;
  action_items?: FathomActionItem[];
  platform?: string;
}

interface FathomMeetingsResponse {
  meetings: FathomMeeting[];
  cursor?: string;
  has_more?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FathomMeetings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<FathomMeeting | null>(null);
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());

  const { data: statusData } = useQuery<{ configured: boolean; connected: boolean; error?: string }>({
    queryKey: ["/api/fathom/status"],
    queryFn: async () => {
      const res = await fetch("/api/fathom/status", { credentials: "include" });
      if (!res.ok) return { configured: false, connected: false };
      return res.json();
    },
  });

  const { data: meetingsData, isLoading, refetch, isRefetching, error: meetingsError } = useQuery<FathomMeetingsResponse>({
    queryKey: ["/api/fathom/meetings"],
    queryFn: async () => {
      const res = await fetch("/api/fathom/meetings?include_summary=true&include_action_items=true", { 
        credentials: "include" 
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch meetings");
      }
      return res.json();
    },
    enabled: statusData?.configured && statusData?.connected,
    retry: false,
  });

  const { data: meetingDetail, isLoading: detailLoading } = useQuery<FathomMeeting>({
    queryKey: ["/api/fathom/meetings", selectedMeeting?.id],
    queryFn: async () => {
      const res = await fetch(`/api/fathom/meetings/${selectedMeeting?.id}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch meeting details");
      return res.json();
    },
    enabled: !!selectedMeeting?.id,
  });

  const meetings = meetingsData?.meetings || [];
  
  const filteredMeetings = meetings.filter(meeting => 
    meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.participants?.some(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleMeetingExpanded = (id: string) => {
    setExpandedMeetings(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!statusData?.configured || !statusData?.connected) {
    const isAuthError = statusData?.error === "invalid_api_key";
    const isConnectionError = statusData?.configured && !statusData?.connected;
    
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${generatedBg})` }}
      >
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-6 h-6 text-primary" />
                  Fathom Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  {isAuthError ? (
                    <>
                      <h3 className="text-lg font-medium text-red-600 mb-2">Invalid API Key</h3>
                      <p className="text-gray-500 mb-4">
                        The Fathom API key is invalid or has expired. Please contact your administrator.
                      </p>
                    </>
                  ) : isConnectionError ? (
                    <>
                      <h3 className="text-lg font-medium text-yellow-600 mb-2">Connection Failed</h3>
                      <p className="text-gray-500 mb-4">
                        Unable to connect to Fathom. Please try again later or contact your administrator.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Fathom Not Configured</h3>
                      <p className="text-gray-500 mb-4">
                        Connect your Fathom account to view meeting recordings, transcripts, and AI summaries.
                      </p>
                      <p className="text-sm text-gray-400">
                        Contact your administrator to set up the Fathom API key.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Video className="w-7 h-7 text-primary" />
                Fathom Meetings
              </h1>
              <p className="text-gray-600 mt-1">
                View your recorded meetings, transcripts, and AI-generated summaries
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              variant="outline"
              className="bg-white/80"
              data-testid="button-refresh-meetings"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Meetings</CardTitle>
                    <Badge variant="secondary">{filteredMeetings.length}</Badge>
                  </div>
                  <Input
                    placeholder="Search meetings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                    data-testid="input-search-meetings"
                  />
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : meetingsError ? (
                      <div className="text-center py-12 px-4">
                        <Video className="w-12 h-12 text-red-300 mx-auto mb-3" />
                        <p className="text-red-600 font-medium mb-2">Failed to load meetings</p>
                        <p className="text-gray-500 text-sm mb-4">{(meetingsError as Error).message}</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                          Try Again
                        </Button>
                      </div>
                    ) : filteredMeetings.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No meetings found</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredMeetings.map((meeting) => (
                          <button
                            key={meeting.id}
                            onClick={() => setSelectedMeeting(meeting)}
                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                              selectedMeeting?.id === meeting.id ? "bg-primary/5 border-l-2 border-primary" : ""
                            }`}
                            data-testid={`meeting-item-${meeting.id}`}
                          >
                            <div className="font-medium text-gray-800 truncate mb-1">
                              {meeting.title || "Untitled Meeting"}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(meeting.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(meeting.duration_seconds)}
                              </span>
                            </div>
                            {meeting.participants && meeting.participants.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                <span className="truncate">
                                  {meeting.participants.slice(0, 3).map(p => p.name).join(", ")}
                                  {meeting.participants.length > 3 && ` +${meeting.participants.length - 3}`}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {selectedMeeting ? (
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">
                          {selectedMeeting.title || "Untitled Meeting"}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(selectedMeeting.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(selectedMeeting.duration_seconds)}
                          </span>
                          {selectedMeeting.platform && (
                            <Badge variant="outline">{selectedMeeting.platform}</Badge>
                          )}
                        </div>
                      </div>
                      {selectedMeeting.recording_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid="button-view-recording"
                        >
                          <a href={selectedMeeting.recording_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Recording
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="summary" data-testid="tab-summary">
                          <FileText className="w-4 h-4 mr-1" />
                          Summary
                        </TabsTrigger>
                        <TabsTrigger value="transcript" data-testid="tab-transcript">
                          <FileText className="w-4 h-4 mr-1" />
                          Transcript
                        </TabsTrigger>
                        <TabsTrigger value="action-items" data-testid="tab-action-items">
                          <CheckSquare className="w-4 h-4 mr-1" />
                          Action Items
                        </TabsTrigger>
                        <TabsTrigger value="participants" data-testid="tab-participants">
                          <Users className="w-4 h-4 mr-1" />
                          Participants
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary">
                        <ScrollArea className="h-[400px]">
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          ) : meetingDetail?.summary ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap">{meetingDetail.summary}</p>
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No AI summary available for this meeting</p>
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="transcript">
                        <ScrollArea className="h-[400px]">
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          ) : meetingDetail?.transcript && meetingDetail.transcript.length > 0 ? (
                            <div className="space-y-3">
                              {meetingDetail.transcript.map((entry, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0">
                                    <Badge variant="secondary" className="font-medium">
                                      {entry.speaker}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-700 text-sm">{entry.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No transcript available for this meeting</p>
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="action-items">
                        <ScrollArea className="h-[400px]">
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          ) : meetingDetail?.action_items && meetingDetail.action_items.length > 0 ? (
                            <div className="space-y-2">
                              {meetingDetail.action_items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className={`flex items-start gap-3 p-3 rounded-lg ${
                                    item.completed ? "bg-green-50" : "bg-gray-50"
                                  }`}
                                >
                                  <CheckSquare
                                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                      item.completed ? "text-green-500" : "text-gray-400"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <p className={`text-sm ${item.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                                      {item.text}
                                    </p>
                                    {item.assignee && (
                                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {item.assignee}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No action items extracted from this meeting</p>
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="participants">
                        <ScrollArea className="h-[400px]">
                          {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                            <div className="space-y-2">
                              {selectedMeeting.participants.map((participant, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">{participant.name}</p>
                                    {participant.email && (
                                      <p className="text-sm text-gray-500">{participant.email}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No participant information available</p>
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/90 backdrop-blur-sm h-full">
                  <CardContent className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">Select a Meeting</h3>
                      <p className="text-gray-500">
                        Choose a meeting from the list to view its details, transcript, and AI summary
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
