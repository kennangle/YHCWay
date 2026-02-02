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

    return this.request<FathomMeetingsResponse>("/meetings", params);
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
