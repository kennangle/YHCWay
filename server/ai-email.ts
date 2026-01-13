import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface EmailContext {
  subject: string;
  from: string;
  to: string;
  body: string;
  date?: string;
}

interface SuggestedReply {
  tone: "professional" | "friendly" | "brief";
  text: string;
}

interface EmailSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
}

export async function summarizeEmail(email: EmailContext): Promise<EmailSummary> {
  const plainTextBody = email.body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  const systemPrompt = `You are an email summarization assistant. Analyze the email and provide:
1. A concise summary (2-3 sentences max)
2. Key points (up to 5 bullet points)
3. Action items (things the recipient needs to do, if any)
4. Overall sentiment (positive, neutral, negative, or urgent)

Respond in JSON format:
{
  "summary": "Brief summary of the email",
  "keyPoints": ["Point 1", "Point 2"],
  "actionItems": ["Action 1", "Action 2"],
  "sentiment": "positive|neutral|negative|urgent"
}

If there are no action items, return an empty array.
Keep the summary and key points concise and actionable.`;

  const userPrompt = `Summarize this email:

From: ${email.from}
Subject: ${email.subject}
Date: ${email.date || "Unknown"}

Content:
${plainTextBody}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      summary: parsed.summary || "Unable to summarize email.",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      sentiment: ["positive", "neutral", "negative", "urgent"].includes(parsed.sentiment) 
        ? parsed.sentiment 
        : "neutral",
    };
  } catch (error) {
    console.error("Error summarizing email:", error);
    throw error;
  }
}

interface ThreadMessage {
  from: string;
  date: string;
  body: string;
}

interface ThreadSummary {
  overview: string;
  participants: string[];
  keyDiscussionPoints: string[];
  decisions: string[];
  actionItems: string[];
  timeline: string;
}

export async function summarizeEmailThread(
  subject: string,
  messages: ThreadMessage[]
): Promise<ThreadSummary> {
  const formattedMessages = messages.map((msg, idx) => {
    const plainBody = msg.body
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
    return `[Message ${idx + 1}] From: ${msg.from} | Date: ${msg.date}\n${plainBody}`;
  }).join("\n\n---\n\n");

  const systemPrompt = `You are an email thread summarization assistant. Analyze the entire email thread and provide a comprehensive summary.

Respond in JSON format:
{
  "overview": "A comprehensive 3-5 sentence summary of what the thread is about and the current status",
  "participants": ["List of people involved in the thread"],
  "keyDiscussionPoints": ["Main topics discussed (up to 6 points)"],
  "decisions": ["Any decisions that were made in the thread"],
  "actionItems": ["Outstanding action items or next steps"],
  "timeline": "Brief timeline of how the conversation evolved"
}

Focus on:
- The main purpose and context of the thread
- Key decisions made
- Outstanding questions or action items
- Who is responsible for what`;

  const userPrompt = `Summarize this email thread:

Subject: ${subject}
Number of messages: ${messages.length}

Thread content:
${formattedMessages.slice(0, 12000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      overview: parsed.overview || "Unable to summarize thread.",
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      keyDiscussionPoints: Array.isArray(parsed.keyDiscussionPoints) ? parsed.keyDiscussionPoints : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      timeline: parsed.timeline || "",
    };
  } catch (error) {
    console.error("Error summarizing email thread:", error);
    throw error;
  }
}

interface MeetingTranscriptSummary {
  overview: string;
  attendees: string[];
  topicsDiscussed: string[];
  keyDecisions: string[];
  actionItems: { owner: string; task: string; deadline?: string }[];
  followUps: string[];
}

export async function summarizeMeetingTranscript(
  meetingTitle: string,
  transcript: string,
  attendees?: string[]
): Promise<MeetingTranscriptSummary> {
  const cleanedTranscript = transcript
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);

  const systemPrompt = `You are a meeting notes assistant. Analyze the meeting transcript and provide a structured summary.

Respond in JSON format:
{
  "overview": "A comprehensive 3-5 sentence summary of the meeting's purpose, key discussions, and outcomes",
  "attendees": ["List of meeting participants mentioned or identified"],
  "topicsDiscussed": ["Main topics covered (up to 8 points)"],
  "keyDecisions": ["Decisions that were made during the meeting"],
  "actionItems": [
    {"owner": "Person responsible", "task": "What needs to be done", "deadline": "When (if mentioned)"}
  ],
  "followUps": ["Items that need follow-up or future discussion"]
}

Focus on:
- Main purpose and outcomes of the meeting
- Clear action items with owners
- Key decisions and their context
- Important discussion points
- Next steps and follow-ups`;

  const userPrompt = `Summarize this meeting:

Meeting Title: ${meetingTitle}
${attendees?.length ? `Known Attendees: ${attendees.join(", ")}` : ""}

Transcript/Notes:
${cleanedTranscript}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      overview: parsed.overview || "Unable to summarize meeting.",
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : (attendees || []),
      topicsDiscussed: Array.isArray(parsed.topicsDiscussed) ? parsed.topicsDiscussed : [],
      keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
      actionItems: Array.isArray(parsed.actionItems) 
        ? parsed.actionItems.map((item: any) => ({
            owner: item.owner || "Unassigned",
            task: item.task || "",
            deadline: item.deadline || undefined,
          }))
        : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
    };
  } catch (error) {
    console.error("Error summarizing meeting transcript:", error);
    throw error;
  }
}

export async function generateEmailReplySuggestions(
  email: EmailContext
): Promise<SuggestedReply[]> {
  const plainTextBody = email.body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const systemPrompt = `You are an email assistant that helps compose reply suggestions. 
Generate 3 different reply suggestions for the given email:
1. A professional, formal reply
2. A friendly, warm reply  
3. A brief, concise reply

Each reply should be appropriate for the email's context and directly address the sender's message.
Keep replies short (2-4 sentences max).
Do not include greetings like "Dear" or sign-offs like "Best regards" - the user will add those.

Respond in JSON format:
{
  "suggestions": [
    {"tone": "professional", "text": "..."},
    {"tone": "friendly", "text": "..."},
    {"tone": "brief", "text": "..."}
  ]
}`;

  const userPrompt = `Email to reply to:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date || "Unknown"}

Message:
${plainTextBody}

Generate 3 reply suggestions.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      return parsed.suggestions.map((s: { tone?: string; text?: string }) => ({
        tone: s.tone || "professional",
        text: s.text || "",
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error generating email reply suggestions:", error);
    throw error;
  }
}
