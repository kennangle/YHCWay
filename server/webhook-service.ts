import { storage } from "./storage";
import crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function triggerWebhook(
  event: string, 
  data: Record<string, unknown>,
  tenantId?: string
): Promise<void> {
  const activeWebhooks = await storage.getActiveWebhooksForEvent(event, tenantId);
  
  if (activeWebhooks.length === 0) {
    console.log(`[Webhook] No active webhooks for event: ${event}`);
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  for (const webhook of activeWebhooks) {
    deliverWebhook(webhook.id, webhook.url, webhook.secret, payload);
  }
}

async function deliverWebhook(
  webhookId: number,
  url: string,
  secret: string | null,
  payload: WebhookPayload
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await response.text().catch(() => "");
    
    await storage.logWebhookDelivery({
      webhookId,
      event: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      success: response.ok,
      attempts: 1,
    });

    console.log(`[Webhook] Delivered to ${url}: ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await storage.logWebhookDelivery({
      webhookId,
      event: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      responseStatus: 0,
      responseBody: errorMessage,
      success: false,
      attempts: 1,
    });

    console.error(`[Webhook] Failed to deliver to ${url}: ${errorMessage}`);
  }
}

export async function testWebhook(
  url: string,
  secret?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const testPayload: WebhookPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: { message: "This is a test webhook from The YHC Way" },
  };

  const body = JSON.stringify(testPayload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": "test",
    "X-Webhook-Timestamp": testPayload.timestamp,
  };

  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
