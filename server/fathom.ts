// @ts-ignore
import fetch from "node-fetch";

const FATHOM_API_BASE = "https://api.fathom.ai/external/v1";

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

export class FathomClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${FATHOM_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fathom API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getMeetings(options?: {
    includeTranscript?: boolean;
    includeSummary?: boolean;
    includeActionItems?: boolean;
    createdAfter?: string;
    createdBefore?: string;
    cursor?: string;
  }): Promise<FathomMeetingsResponse> {
    const params: Record<string, string> = {};
    
    if (options?.includeTranscript) params.include_transcript = "true";
    if (options?.includeSummary) params.include_summary = "true";
    if (options?.includeActionItems) params.include_action_items = "true";
    if (options?.createdAfter) params.created_after = options.createdAfter;
    if (options?.createdBefore) params.created_before = options.createdBefore;
    if (options?.cursor) params.cursor = options.cursor;

    const rawResponse = await this.request<any>("/meetings", params);
    
    // Transform Fathom API response (items) to our expected format (meetings)
    const meetings = (rawResponse.items || []).map((item: any) => ({
      id: item.recording_id?.toString() || item.url?.split('/').pop() || '',
      title: item.meeting_title || item.title || 'Untitled Meeting',
      created_at: item.created_at,
      duration_seconds: item.recording_end_time && item.recording_start_time 
        ? Math.round((new Date(item.recording_end_time).getTime() - new Date(item.recording_start_time).getTime()) / 1000)
        : undefined,
      recording_url: item.url || item.share_url,
      participants: item.calendar_invitees?.map((inv: any) => ({ 
        name: inv.name, 
        email: inv.email 
      })) || [],
      summary: item.default_summary?.markdown_formatted || null,
      action_items: item.action_items?.map((ai: any, idx: number) => ({
        id: `${item.recording_id}-${idx}`,
        text: ai.description,
        assignee: ai.assignee?.name || ai.assignee?.email,
        completed: ai.completed,
      })) || [],
      platform: 'zoom',
    }));

    return {
      meetings,
      cursor: rawResponse.next_cursor || undefined,
      has_more: !!rawResponse.next_cursor,
    };
  }

  async getMeeting(meetingId: string, options?: {
    includeTranscript?: boolean;
    includeSummary?: boolean;
    includeActionItems?: boolean;
  }): Promise<FathomMeeting> {
    const params: Record<string, string> = {};
    
    if (options?.includeTranscript) params.include_transcript = "true";
    if (options?.includeSummary) params.include_summary = "true";
    if (options?.includeActionItems) params.include_action_items = "true";

    return this.request<FathomMeeting>(`/meetings/${meetingId}`, params);
  }

  async getTranscript(recordingId: string): Promise<FathomTranscriptEntry[]> {
    const response = await this.request<{ transcript: FathomTranscriptEntry[] }>(`/recordings/${recordingId}/transcript`);
    return response.transcript || [];
  }
}

let fathomClient: FathomClient | null = null;

export function getFathomClient(): FathomClient | null {
  if (!fathomClient && process.env.FATHOM_API_KEY) {
    fathomClient = new FathomClient(process.env.FATHOM_API_KEY);
  }
  return fathomClient;
}

export function isFathomConfigured(): boolean {
  return !!process.env.FATHOM_API_KEY;
}
