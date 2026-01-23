import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupWebSocket } from "./websocket";
import { startOutboxWorkerInBackground } from "./outboxWorker";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

// OWASP Security Headers middleware (required for Zoom integration)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CSP varies by environment - stricter in production
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-ancestors 'self';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: *.google.com *.googleapis.com *.zoom.us *.slack.com; frame-src 'self' accounts.google.com; frame-ancestors 'self';";
  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Setup WebSocket server for real-time messaging
setupWebSocket(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  startOutboxWorkerInBackground({ idleMs: 500 });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
  
  // Schedule expired notification cleanup every hour
  setInterval(async () => {
    try {
      const count = await storage.cleanupExpiredUserNotifications();
      if (count > 0) {
        log(`[NotificationCleanup] Removed ${count} expired notifications`);
      }
    } catch (error) {
      console.error("[NotificationCleanup] Error:", error);
    }
  }, 60 * 60 * 1000); // Run every hour
  
  // Also run cleanup on startup (after a short delay)
  setTimeout(async () => {
    try {
      const count = await storage.cleanupExpiredUserNotifications();
      if (count > 0) {
        log(`[NotificationCleanup] Initial cleanup removed ${count} expired notifications`);
      }
    } catch (error) {
      console.error("[NotificationCleanup] Initial cleanup error:", error);
    }
  }, 10000); // 10 seconds after startup
  
  // Daily announcement scheduler - runs at 5 PM PST (UTC-8)
  // Check every minute if it's time to send daily announcements
  let lastAnnouncementDate = "";
  setInterval(async () => {
    try {
      const now = new Date();
      const pstOffset = -8 * 60; // PST is UTC-8
      const pstTime = new Date(now.getTime() + (pstOffset + now.getTimezoneOffset()) * 60000);
      const hour = pstTime.getHours();
      const dateStr = pstTime.toISOString().split('T')[0];
      
      // Run at 5 PM PST (17:00) and only once per day
      if (hour === 17 && lastAnnouncementDate !== dateStr) {
        lastAnnouncementDate = dateStr;
        log(`[DailyAnnouncement] Running daily announcement for ${dateStr}`);
        
        // Get unannounced changelog entries
        const entries = await storage.getUnannouncedChangelogEntries();
        
        if (entries.length > 0) {
          // Group by type
          const features = entries.filter(e => e.entryType === 'feature');
          const fixes = entries.filter(e => e.entryType === 'fix');
          const changes = entries.filter(e => e.entryType !== 'feature' && e.entryType !== 'fix');
          
          // Build announcement body
          const parts: string[] = [];
          if (features.length > 0) {
            parts.push(`New Features: ${features.map(f => f.summary).join('; ')}`);
          }
          if (fixes.length > 0) {
            parts.push(`Bug Fixes: ${fixes.map(f => f.summary).join('; ')}`);
          }
          if (changes.length > 0) {
            parts.push(`Changes: ${changes.map(c => c.summary).join('; ')}`);
          }
          
          const body = parts.join(' | ');
          const formattedDate = pstTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          
          // Broadcast to all users
          const count = await storage.broadcastAnnouncement({
            type: 'daily.summary',
            title: `Daily Update: ${formattedDate}`,
            body,
            metadata: { date: dateStr, entriesCount: entries.length },
          });
          
          // Mark entries as announced
          await storage.markChangelogEntriesAnnounced(entries.map(e => e.id));
          
          log(`[DailyAnnouncement] Sent announcement to ${count} users with ${entries.length} changelog entries`);
        } else {
          log(`[DailyAnnouncement] No unannounced changelog entries for ${dateStr}`);
        }
      }
    } catch (error) {
      console.error("[DailyAnnouncement] Error:", error);
    }
  }, 60 * 1000); // Check every minute
})();
