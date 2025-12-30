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
