import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ExtractedTask {
  title: string;
  description?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  source: string;
}

interface DailyBriefing {
  summary: string;
  priorityTasks: string[];
  upcomingMeetings: string[];
  urgentMessages: string[];
  recommendations: string[];
}

interface MeetingContext {
  summary: string;
  relevantEmails: string[];
  relevantTasks: string[];
  suggestedTopics: string[];
  attendeeContext: string[];
}

interface SmartSearchResult {
  answer: string;
  sources: { type: string; title: string; snippet: string }[];
}

interface DraftedEmail {
  subject: string;
  body: string;
}

interface CalendarInsight {
  overloadedDays: { date: string; meetingCount: number; totalHours: number }[];
  suggestedFocusBlocks: { date: string; startTime: string; endTime: string }[];
  recommendations: string[];
}

interface PrioritizedTask {
  taskId: number;
  title: string;
  score: number;
  reasoning: string;
}

export async function extractTasksFromContent(
  content: string,
  source: "email" | "slack" | "meeting_notes",
  senderName?: string
): Promise<ExtractedTask[]> {
  const systemPrompt = `You are a task extraction assistant. Analyze the given content and extract any actionable tasks or action items.

For each task found:
1. Create a clear, actionable title
2. Add context in the description
3. Infer due dates from phrases like "by Friday", "next week", "ASAP" (use ISO date format YYYY-MM-DD)
4. Assign priority based on urgency cues

Today's date is ${new Date().toISOString().split('T')[0]}.

Respond in JSON format:
{
  "tasks": [
    {
      "title": "Clear actionable task title",
      "description": "Additional context",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "low|medium|high|urgent"
    }
  ]
}

If no actionable tasks are found, return {"tasks": []}`;

  const userPrompt = `Content from ${source}${senderName ? ` (from ${senderName})` : ''}:

${content.slice(0, 3000)}

Extract any actionable tasks from this content.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      return parsed.tasks.map((t: any) => ({
        title: t.title || "Untitled task",
        description: t.description,
        dueDate: t.dueDate,
        priority: t.priority || "medium",
        source,
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error extracting tasks:", error);
    throw error;
  }
}

export async function generateDailyBriefing(context: {
  tasks: { title: string; dueDate?: string; priority?: string; isCompleted: boolean }[];
  meetings: { title: string; start: string; attendees?: string[] }[];
  emails: { subject: string; from: string; snippet: string; isUnread: boolean }[];
  slackMessages: { text: string; userName: string; channelName: string }[];
}): Promise<DailyBriefing> {
  const systemPrompt = `You are a productivity assistant creating a morning briefing. Analyze the user's day and provide:
1. A concise summary of what's ahead
2. Priority tasks that need attention today
3. Key meetings coming up
4. Urgent messages that need responses
5. Actionable recommendations

Be concise and focus on what matters most. Use bullet points.

Respond in JSON format:
{
  "summary": "Brief overview of the day",
  "priorityTasks": ["task 1", "task 2"],
  "upcomingMeetings": ["meeting summary 1", "meeting summary 2"],
  "urgentMessages": ["urgent item 1"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  const today = new Date().toISOString().split('T')[0];
  
  const userPrompt = `Today is ${today}. Here's my context:

TASKS (${context.tasks.length} total):
${context.tasks.slice(0, 20).map(t => 
  `- ${t.title} | Due: ${t.dueDate || 'No date'} | Priority: ${t.priority || 'medium'} | ${t.isCompleted ? 'Done' : 'Pending'}`
).join('\n')}

MEETINGS TODAY:
${context.meetings.slice(0, 10).map(m => 
  `- ${m.title} at ${m.start}`
).join('\n') || 'No meetings scheduled'}

RECENT EMAILS (unread: ${context.emails.filter(e => e.isUnread).length}):
${context.emails.slice(0, 10).map(e => 
  `- From: ${e.from} | Subject: ${e.subject} | ${e.isUnread ? 'UNREAD' : 'Read'}`
).join('\n') || 'No recent emails'}

SLACK MESSAGES:
${context.slackMessages.slice(0, 10).map(m => 
  `- ${m.userName} in ${m.channelName}: ${m.text.slice(0, 100)}`
).join('\n') || 'No recent messages'}

Generate my daily briefing.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      summary: parsed.summary || "No briefing available",
      priorityTasks: parsed.priorityTasks || [],
      upcomingMeetings: parsed.upcomingMeetings || [],
      urgentMessages: parsed.urgentMessages || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error("Error generating daily briefing:", error);
    throw error;
  }
}

export async function generateMeetingPrep(context: {
  meeting: { title: string; start: string; attendees: string[] };
  recentEmails: { subject: string; from: string; snippet: string }[];
  relatedTasks: { title: string; description?: string }[];
  slackMessages: { text: string; userName: string }[];
}): Promise<MeetingContext> {
  const systemPrompt = `You are a meeting preparation assistant. Analyze the context and help the user prepare for their meeting.

Provide:
1. A summary of relevant context
2. Key points from recent emails with attendees
3. Related tasks to discuss
4. Suggested discussion topics
5. Brief context about each attendee based on recent interactions

Be concise and actionable.

Respond in JSON format:
{
  "summary": "Brief meeting prep summary",
  "relevantEmails": ["email point 1", "email point 2"],
  "relevantTasks": ["task to discuss 1"],
  "suggestedTopics": ["topic 1", "topic 2"],
  "attendeeContext": ["Name: context about recent interactions"]
}`;

  const userPrompt = `Prepare me for this meeting:

MEETING: ${context.meeting.title}
TIME: ${context.meeting.start}
ATTENDEES: ${context.meeting.attendees.join(', ')}

RECENT EMAILS WITH ATTENDEES:
${context.recentEmails.slice(0, 10).map(e => 
  `- From: ${e.from} | Subject: ${e.subject} | ${e.snippet.slice(0, 150)}`
).join('\n') || 'No relevant emails'}

RELATED TASKS:
${context.relatedTasks.slice(0, 10).map(t => 
  `- ${t.title}${t.description ? ': ' + t.description.slice(0, 100) : ''}`
).join('\n') || 'No related tasks'}

SLACK MESSAGES WITH ATTENDEES:
${context.slackMessages.slice(0, 10).map(m => 
  `- ${m.userName}: ${m.text.slice(0, 150)}`
).join('\n') || 'No recent Slack messages'}

Generate my meeting prep.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      summary: parsed.summary || "No prep available",
      relevantEmails: parsed.relevantEmails || [],
      relevantTasks: parsed.relevantTasks || [],
      suggestedTopics: parsed.suggestedTopics || [],
      attendeeContext: parsed.attendeeContext || [],
    };
  } catch (error) {
    console.error("Error generating meeting prep:", error);
    throw error;
  }
}

export async function smartSearch(
  query: string,
  context: {
    emails: { id: string; subject: string; from: string; snippet: string; date: string }[];
    tasks: { id: number; title: string; description?: string }[];
    meetings: { id: string; title: string; start: string }[];
    slackMessages: { id: string; text: string; userName: string; channelName: string }[];
  }
): Promise<SmartSearchResult> {
  const systemPrompt = `You are a smart search assistant. The user is searching across their emails, tasks, calendar, and Slack messages.

Answer their query by finding relevant information from the provided context. Cite your sources.

Respond in JSON format:
{
  "answer": "Direct answer to their question",
  "sources": [
    {"type": "email|task|meeting|slack", "title": "Item title/subject", "snippet": "Relevant excerpt"}
  ]
}

If you can't find relevant information, say so clearly.`;

  const userPrompt = `Search query: "${query}"

EMAILS:
${context.emails.slice(0, 15).map(e => 
  `[email:${e.id}] From: ${e.from} | Subject: ${e.subject} | Date: ${e.date} | ${e.snippet}`
).join('\n') || 'No emails'}

TASKS:
${context.tasks.slice(0, 15).map(t => 
  `[task:${t.id}] ${t.title}${t.description ? ' - ' + t.description.slice(0, 100) : ''}`
).join('\n') || 'No tasks'}

MEETINGS:
${context.meetings.slice(0, 15).map(m => 
  `[meeting:${m.id}] ${m.title} at ${m.start}`
).join('\n') || 'No meetings'}

SLACK:
${context.slackMessages.slice(0, 15).map(m => 
  `[slack:${m.id}] ${m.userName} in ${m.channelName}: ${m.text.slice(0, 150)}`
).join('\n') || 'No Slack messages'}

Find information relevant to my query.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      answer: parsed.answer || "No results found",
      sources: parsed.sources || [],
    };
  } catch (error) {
    console.error("Error in smart search:", error);
    throw error;
  }
}

export async function draftEmail(
  prompt: string,
  context?: { replyTo?: { from: string; subject: string; body: string } }
): Promise<DraftedEmail> {
  const isReply = !!context?.replyTo;
  
  const systemPrompt = `You are an email drafting assistant. ${isReply ? 'Compose a reply to the given email.' : 'Compose a new email based on the user\'s prompt.'}

Guidelines:
- Be professional but approachable
- Keep it concise
- Include appropriate greeting and sign-off
- Match the tone requested by the user

Respond in JSON format:
{
  "subject": "Email subject line${isReply ? ' (use Re: prefix for replies)' : ''}",
  "body": "Full email body with greeting and sign-off"
}`;

  let userPrompt = `User request: ${prompt}`;
  
  if (context?.replyTo) {
    const plainBody = context.replyTo.body
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
      
    userPrompt += `\n\nReplying to email:
From: ${context.replyTo.from}
Subject: ${context.replyTo.subject}
Body: ${plainBody}`;
  }

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      subject: parsed.subject || (isReply ? `Re: ${context?.replyTo?.subject}` : "No subject"),
      body: parsed.body || "",
    };
  } catch (error) {
    console.error("Error drafting email:", error);
    throw error;
  }
}

export async function analyzeCalendar(
  meetings: { title: string; start: string; end: string; duration: number }[]
): Promise<CalendarInsight> {
  const systemPrompt = `You are a calendar optimization assistant. Analyze the user's calendar and provide insights.

Look for:
1. Overloaded days (>4 hours of meetings or >5 meetings)
2. Opportunities for focus time blocks (2+ hours free)
3. Recommendations for better time management

Today's date is ${new Date().toISOString().split('T')[0]}.

Respond in JSON format:
{
  "overloadedDays": [{"date": "YYYY-MM-DD", "meetingCount": 5, "totalHours": 6.5}],
  "suggestedFocusBlocks": [{"date": "YYYY-MM-DD", "startTime": "09:00", "endTime": "11:00"}],
  "recommendations": ["Specific recommendation 1", "Recommendation 2"]
}`;

  const userPrompt = `Analyze my calendar for the next 7 days:

MEETINGS:
${meetings.map(m => 
  `- ${m.title} | ${m.start} to ${m.end} (${m.duration} min)`
).join('\n') || 'No meetings scheduled'}

Provide calendar optimization insights.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      overloadedDays: parsed.overloadedDays || [],
      suggestedFocusBlocks: parsed.suggestedFocusBlocks || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error("Error analyzing calendar:", error);
    throw error;
  }
}

export async function prioritizeTasks(
  tasks: { id: number; title: string; description?: string; dueDate?: string; priority?: string }[]
): Promise<PrioritizedTask[]> {
  const systemPrompt = `You are a task prioritization assistant. Analyze the given tasks and rank them by importance.

Consider:
1. Due dates (overdue and soon-due tasks are urgent)
2. Stated priority levels
3. Keywords suggesting importance (urgent, ASAP, critical, important)
4. Dependencies implied in descriptions

Score each task 1-100 (100 = most urgent) and explain briefly.

Today's date is ${new Date().toISOString().split('T')[0]}.

Respond in JSON format:
{
  "prioritizedTasks": [
    {"taskId": 1, "title": "Task title", "score": 95, "reasoning": "Brief explanation"}
  ]
}

Return tasks sorted by score (highest first).`;

  const userPrompt = `Prioritize these tasks:

${tasks.slice(0, 30).map(t => 
  `[ID:${t.id}] ${t.title} | Due: ${t.dueDate || 'No date'} | Priority: ${t.priority || 'medium'}${t.description ? ' | ' + t.description.slice(0, 100) : ''}`
).join('\n')}

Rank and score these tasks.`;

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

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    if (parsed.prioritizedTasks && Array.isArray(parsed.prioritizedTasks)) {
      return parsed.prioritizedTasks.map((t: any) => ({
        taskId: t.taskId,
        title: t.title || "Unknown",
        score: t.score || 50,
        reasoning: t.reasoning || "",
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error prioritizing tasks:", error);
    throw error;
  }
}
