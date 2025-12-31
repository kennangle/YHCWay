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
