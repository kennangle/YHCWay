import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertFeedItemSchema, ADMIN_EMAIL, adminCreateUserSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getRecentEmails, isGmailConnected } from "./gmail";
import { getUpcomingEvents, getEventsForMonth, isCalendarConnected } from "./calendar";
import { getUpcomingMeetings, isZoomConnected } from "./zoom";
import { getRecentMessages as getSlackMessages, getAllMessages as getAllSlackMessages, getDirectMessages as getSlackDMs, getThreadReplies as getSlackThreadReplies, isSlackConnected, getChannels as getSlackChannels, getRecentMessagesFiltered } from "./slack";
import { isAppleCalendarConnected, testAppleCalendarConnection, saveAppleCalendarCredentials, deleteAppleCalendarCredentials, getAppleCalendarEvents, getAppleCalendarEventsForMonth } from "./appleCalendar";
import { appleCalendarConnectSchema, slackPreferencesUpdateSchema } from "@shared/schema";

const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      const allServices = await storage.getAllServices();
      res.json(allServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const newService = await storage.createService(validatedData);
      res.status(201).json(newService);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating service:", error);
        res.status(500).json({ error: "Failed to create service" });
      }
    }
  });

  app.patch("/api/services/:id/connection", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { connected } = req.body;
      
      if (typeof connected !== "boolean") {
        return res.status(400).json({ error: "connected must be a boolean" });
      }
      
      const updatedService = await storage.updateServiceConnection(id, connected);
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service connection:", error);
      res.status(500).json({ error: "Failed to update service connection" });
    }
  });

  app.get("/api/feed", async (req, res) => {
    try {
      const allFeedItems = await storage.getAllFeedItems();
      res.json(allFeedItems);
    } catch (error) {
      console.error("Error fetching feed items:", error);
      res.status(500).json({ error: "Failed to fetch feed items" });
    }
  });

  app.post("/api/feed", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertFeedItemSchema.parse(req.body);
      const newItem = await storage.createFeedItem(validatedData);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating feed item:", error);
        res.status(500).json({ error: "Failed to create feed item" });
      }
    }
  });

  app.delete("/api/feed/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFeedItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feed item:", error);
      res.status(500).json({ error: "Failed to delete feed item" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { isAdmin: adminStatus } = req.body;
      if (typeof adminStatus !== "boolean") {
        return res.status(400).json({ error: "isAdmin must be a boolean" });
      }
      const updatedUser = await storage.updateUserAdmin(req.params.id, adminStatus);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.put("/api/admin/services/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const updatedService = await storage.updateService(id, validatedData);
      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(updatedService);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating service:", error);
        res.status(500).json({ error: "Failed to update service" });
      }
    }
  });

  app.delete("/api/admin/services/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteService(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.put("/api/admin/feed/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertFeedItemSchema.partial().parse(req.body);
      const updatedItem = await storage.updateFeedItem(id, validatedData);
      if (!updatedItem) {
        return res.status(404).json({ error: "Feed item not found" });
      }
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating feed item:", error);
        res.status(500).json({ error: "Failed to update feed item" });
      }
    }
  });

  app.post("/api/admin/users/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const updatedUser = await storage.updateUserPassword(req.params.id, passwordHash);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = adminCreateUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const passwordHash = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        isAdmin: validatedData.isAdmin,
        emailVerified: true,
      });
      
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Gmail integration endpoints
  app.get("/api/gmail/status", isAuthenticated, async (req, res) => {
    try {
      const connected = await isGmailConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/gmail/messages", isAuthenticated, async (req, res) => {
    try {
      const emails = await getRecentEmails(20);
      res.json(emails);
    } catch (error: any) {
      console.error("Error fetching emails:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch emails" });
    }
  });

  // Google Calendar integration endpoints
  app.get("/api/calendar/status", isAuthenticated, async (req, res) => {
    try {
      const connected = await isCalendarConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const events = await getUpcomingEvents(10);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar/month/:year/:month", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const events = await getEventsForMonth(year, month);
      res.json(events);
    } catch (error) {
      console.error("Error fetching month events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // Zoom integration endpoints
  app.get("/api/zoom/status", isAuthenticated, async (req, res) => {
    try {
      const connected = await isZoomConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/zoom/meetings", isAuthenticated, async (req, res) => {
    try {
      const meetings = await getUpcomingMeetings(10);
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching Zoom meetings:", error);
      res.json([]);
    }
  });

  // Slack integration endpoints
  app.get("/api/slack/status", isAuthenticated, async (req, res) => {
    try {
      const connected = await isSlackConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/slack/messages", isAuthenticated, async (req, res) => {
    try {
      const includeDms = req.query.includeDms === 'true';
      const messages = includeDms 
        ? await getAllSlackMessages(30)
        : await getSlackMessages(20);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching Slack messages:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack messages" });
    }
  });

  app.get("/api/slack/dms", isAuthenticated, async (req, res) => {
    try {
      const messages = await getSlackDMs(15);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching Slack DMs:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack DMs" });
    }
  });

  app.get("/api/slack/thread/:channelId/:threadTs", isAuthenticated, async (req, res) => {
    try {
      const { channelId, threadTs } = req.params;
      const replies = await getSlackThreadReplies(channelId, threadTs, 20);
      res.json(replies);
    } catch (error: any) {
      console.error("Error fetching thread replies:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch thread replies" });
    }
  });

  app.get("/api/slack/channels", isAuthenticated, async (req, res) => {
    try {
      const channels = await getSlackChannels();
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching Slack channels:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack channels" });
    }
  });

  app.get("/api/slack/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const preferences = await storage.getSlackChannelPreferences(req.user.id);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error fetching Slack preferences:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack preferences" });
    }
  });

  app.post("/api/slack/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = slackPreferencesUpdateSchema.parse(req.body);
      await storage.saveSlackChannelPreferences(req.user.id, validatedData.channels);
      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error saving Slack preferences:", error?.message || error);
        res.status(500).json({ error: error?.message || "Failed to save Slack preferences" });
      }
    }
  });

  app.get("/api/slack/messages/filtered", isAuthenticated, async (req: any, res) => {
    try {
      const preferences = await storage.getSlackChannelPreferences(req.user.id);
      const enabledChannelIds = preferences
        .filter(p => p.isEnabled)
        .map(p => p.channelId);
      
      if (enabledChannelIds.length === 0) {
        const allMessages = await getAllSlackMessages(30);
        res.json(allMessages);
        return;
      }
      
      const channelMessages = await getRecentMessagesFiltered(enabledChannelIds, 20);
      const dmMessages = await getSlackDMs(10);
      const allMessages = [...channelMessages, ...dmMessages]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);
      res.json(allMessages);
    } catch (error: any) {
      console.error("Error fetching filtered Slack messages:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack messages" });
    }
  });

  // Apple Calendar integration endpoints
  app.get("/api/apple-calendar/status", isAuthenticated, async (req: any, res) => {
    try {
      const connected = await isAppleCalendarConnected(req.user.id);
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.post("/api/apple-calendar/connect", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = appleCalendarConnectSchema.parse(req.body);
      
      const testResult = await testAppleCalendarConnection(
        validatedData.appleId,
        validatedData.appPassword
      );
      
      if (!testResult.success) {
        return res.status(400).json({ error: testResult.error || "Connection failed" });
      }
      
      await saveAppleCalendarCredentials(
        req.user.id,
        validatedData.appleId,
        validatedData.appPassword
      );
      
      res.json({ success: true, message: "Apple Calendar connected successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error connecting Apple Calendar:", error);
        res.status(500).json({ error: error?.message || "Failed to connect Apple Calendar" });
      }
    }
  });

  app.delete("/api/apple-calendar/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      await deleteAppleCalendarCredentials(req.user.id);
      res.json({ success: true, message: "Apple Calendar disconnected" });
    } catch (error) {
      console.error("Error disconnecting Apple Calendar:", error);
      res.status(500).json({ error: "Failed to disconnect Apple Calendar" });
    }
  });

  app.get("/api/apple-calendar/events", isAuthenticated, async (req: any, res) => {
    try {
      const events = await getAppleCalendarEvents(req.user.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching Apple Calendar events:", error);
      res.status(500).json({ error: "Failed to fetch Apple Calendar events" });
    }
  });

  app.get("/api/apple-calendar/month/:year/:month", isAuthenticated, async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const events = await getAppleCalendarEventsForMonth(req.user.id, year, month);
      res.json(events);
    } catch (error) {
      console.error("Error fetching Apple Calendar month events:", error);
      res.status(500).json({ error: "Failed to fetch Apple Calendar events" });
    }
  });

  return httpServer;
}
