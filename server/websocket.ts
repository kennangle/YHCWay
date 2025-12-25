import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import crypto from "crypto";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

// Store valid auth tokens (userId -> token) with short expiry
const authTokens: Map<string, { userId: string; expiresAt: number }> = new Map();

// Generate a secure token for WebSocket authentication
export function generateWsAuthToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  authTokens.set(token, { 
    userId, 
    expiresAt: Date.now() + 60000 // 1 minute expiry
  });
  return token;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of authTokens.entries()) {
    if (data.expiresAt < now) {
      authTokens.delete(token);
    }
  }
}, 60000);

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let userId: string | null = null;
    let authenticated = false;

    // Set a timeout for authentication
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(4001, "Authentication timeout");
      }
    }, 10000);

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "auth" && message.token) {
          const tokenData = authTokens.get(message.token);
          
          if (tokenData && tokenData.expiresAt > Date.now()) {
            userId = tokenData.userId;
            authenticated = true;
            clearTimeout(authTimeout);
            
            // Delete the token after use (one-time use)
            authTokens.delete(message.token);
            
            if (!clients.has(userId)) {
              clients.set(userId, []);
            }
            clients.get(userId)!.push({ ws, userId });
            
            ws.send(JSON.stringify({ type: "auth_success" }));
          } else {
            ws.send(JSON.stringify({ type: "auth_failed", error: "Invalid or expired token" }));
            ws.close(4002, "Invalid token");
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          const index = userClients.findIndex(c => c.ws === ws);
          if (index !== -1) {
            userClients.splice(index, 1);
          }
          if (userClients.length === 0) {
            clients.delete(userId);
          }
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}

export function broadcastToUser(userId: string, message: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    const messageStr = JSON.stringify(message);
    userClients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

export function broadcastToUsers(userIds: string[], message: any) {
  userIds.forEach(userId => broadcastToUser(userId, message));
}
