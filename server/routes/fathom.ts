import { Router } from "express";
import { getFathomClient, isFathomConfigured } from "../fathom";

const router = Router();

router.get("/status", async (req, res) => {
  const configured = isFathomConfigured();
  
  if (!configured) {
    return res.json({ configured: false, connected: false });
  }
  
  try {
    const client = getFathomClient();
    if (client) {
      await client.getMeetings({ createdAfter: new Date(Date.now() - 86400000).toISOString() });
    }
    res.json({ configured: true, connected: true });
  } catch (error: any) {
    const isAuthError = error.message?.includes("401") || error.message?.includes("403");
    res.json({ 
      configured: true, 
      connected: false,
      error: isAuthError ? "invalid_api_key" : "connection_failed"
    });
  }
});

function mapFathomError(error: any): { status: number; code: string; message: string } {
  const msg = error.message || "";
  if (msg.includes("401") || msg.includes("403")) {
    return { status: 401, code: "FATHOM_AUTH_ERROR", message: "Invalid or expired Fathom API key" };
  }
  if (msg.includes("404")) {
    return { status: 404, code: "FATHOM_NOT_FOUND", message: "Resource not found" };
  }
  if (msg.includes("429")) {
    return { status: 429, code: "FATHOM_RATE_LIMIT", message: "Rate limit exceeded" };
  }
  return { status: 502, code: "FATHOM_API_ERROR", message: msg || "Failed to communicate with Fathom" };
}

router.get("/meetings", async (req, res) => {
  try {
    const client = getFathomClient();
    if (!client) {
      return res.status(400).json({ error: "Fathom is not configured", code: "NOT_CONFIGURED" });
    }

    const { 
      include_transcript, 
      include_summary, 
      include_action_items,
      created_after,
      created_before,
      cursor 
    } = req.query;

    const meetings = await client.getMeetings({
      includeTranscript: include_transcript === "true",
      includeSummary: include_summary === "true",
      includeActionItems: include_action_items === "true",
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      cursor: cursor as string,
    });

    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching Fathom meetings:", error);
    const mapped = mapFathomError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

router.get("/meetings/:id", async (req, res) => {
  try {
    const client = getFathomClient();
    if (!client) {
      return res.status(400).json({ error: "Fathom is not configured", code: "NOT_CONFIGURED" });
    }

    const meeting = await client.getMeeting(req.params.id, {
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
    });

    res.json(meeting);
  } catch (error: any) {
    console.error("Error fetching Fathom meeting:", error);
    const mapped = mapFathomError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

router.get("/recordings/:id/transcript", async (req, res) => {
  try {
    const client = getFathomClient();
    if (!client) {
      return res.status(400).json({ error: "Fathom is not configured", code: "NOT_CONFIGURED" });
    }

    const transcript = await client.getTranscript(req.params.id);
    res.json({ transcript });
  } catch (error: any) {
    console.error("Error fetching Fathom transcript:", error);
    const mapped = mapFathomError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }
});

export default router;
