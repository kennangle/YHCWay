import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertFeedItemSchema, ADMIN_EMAIL, adminCreateUserSchema, integrationApiKeySchema, sendMessageSchema, createConversationSchema, createTenantSchema, inviteUserSchema, createProjectSchema, createTaskSchema, updateTaskSchema, createSubtaskSchema, createCommentSchema, type User } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { tenantMiddleware, requireTenant, requireTenantRole } from "./tenantMiddleware";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getRecentEmails, isGmailConnected } from "./gmail";
import { getGmailAuthUrl, handleGmailCallback, getRecentEmailsForUser, isGmailConnectedForUser, disconnectGmailForUser, getGmailClientForUser, getEmailById, sendEmail, deleteEmailById } from "./gmail-oauth";
import { getUpcomingEvents, getEventsForMonth, isCalendarConnected, createCalendarEvent } from "./calendar";
import { getUpcomingMeetings, isZoomConnected } from "./zoom";
import { getRecentMessages as getSlackMessages, getAllMessages as getAllSlackMessages, getDirectMessages as getSlackDMs, getThreadReplies as getSlackThreadReplies, isSlackConnected, getChannels as getSlackChannels, getRecentMessagesFiltered, isUserSlackConnected, getUserAllMessages, getUserDirectMessages, getUserChannels, sendSlackNotification, sendSlackBlockNotification, formatYHCWayNotification, sendUserSlackMessage } from "./slack";
import { isAppleCalendarConnected, testAppleCalendarConnection, saveAppleCalendarCredentials, deleteAppleCalendarCredentials, getAppleCalendarEvents, getAppleCalendarEventsForMonth } from "./appleCalendar";
import { isAsanaConnected, getMyTasks, getProjects, getUpcomingTasks, isUserAsanaConnected, getUserMyTasks, getUserProjects, getUserUpcomingTasks, getAsanaProjectsForImport, getProjectSections, getProjectTasksForImport } from "./asana";
import { getTypeformForms, getTypeformForm, createTypeformForm, updateTypeformForm, deleteTypeformForm, getTypeformResponses, isTypeformConfigured } from "./typeform";
import { sendInvitationEmail, getTemplateTypes, getDefaultTemplate, sendTaskAssignedNotification } from "./email";
import { appleCalendarConnectSchema, slackPreferencesUpdateSchema, emailTemplateSchema, updateNotificationPrefsSchema, createTimeEntrySchema, updateTimeEntrySchema } from "@shared/schema";
import { broadcastToUsers, generateWsAuthToken } from "./websocket";
import { getIntroOffers, getIntroOfferSummary, updateIntroOffer, getStudents, isMindbodyAnalyticsConfigured } from "./mindbodyAnalytics";
import { generateEmailReplySuggestions, summarizeEmail } from "./ai-email";
import { extractTasksFromContent, generateDailyBriefing, generateMeetingPrep, smartSearch, draftEmail, analyzeCalendar, prioritizeTasks } from "./ai-assistant";
import { isQrTigerConfigured, createDynamicQRCode, createStaticQRCode, listQRCodes, getQRCodeAnalytics, deleteQRCode } from "./qr-tiger";
import { isPerkvilleConfigured, authenticateWithPerkville, isUserPerkvilleConnected, validatePerkvilleToken, getPerkvilleCustomerInfo, getPerkvillePoints, getPerkvilleRewards, getPerkvilleActivity, disconnectPerkville, getPerkvilleBusinesses, getPerkvilleCustomers, getPerkvilleConnectionBalances, searchPerkvilleCustomerByEmail, getPerkvilleCustomerById } from "./perkville";
import { yhcTimeClient } from "./yhctime";
import { getCalendlyEvents, getCalendlyEventsForMonth, isCalendlyConnected } from "./calendly";

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
  
  app.use(tenantMiddleware);

  // =============================================================================
  // TENANT MANAGEMENT ROUTES
  // =============================================================================
  
  app.get('/api/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenants = await storage.getUserTenants(userId);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.post('/api/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const validatedData = createTenantSchema.parse(req.body);
      
      const existingTenant = await storage.getTenantBySlug(validatedData.slug);
      if (existingTenant) {
        return res.status(400).json({ error: "Organization slug already exists" });
      }
      
      const tenant = await storage.createTenant(validatedData.name, validatedData.slug, userId);
      
      await storage.createAuditLog({
        tenantId: tenant.id,
        userId,
        action: "tenant.created",
        resourceType: "tenant",
        resourceId: tenant.id,
        metadata: { name: tenant.name, slug: tenant.slug },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating tenant:", error);
        res.status(500).json({ error: "Failed to create organization" });
      }
    }
  });

  app.get('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.params.id;
      
      const role = await storage.getUserTenantRole(tenantId, userId);
      if (!role) {
        return res.status(403).json({ error: "You don't have access to this organization" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      res.json({ ...tenant, role });
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  app.patch('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.params.id;
      
      const role = await storage.getUserTenantRole(tenantId, userId);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ error: "Only owners and admins can update the organization" });
      }
      
      const { name, logoUrl, settings } = req.body;
      const updated = await storage.updateTenant(tenantId, { name, logoUrl, settings });
      
      await storage.createAuditLog({
        tenantId,
        userId,
        action: "tenant.updated",
        resourceType: "tenant",
        resourceId: tenantId,
        metadata: { changes: req.body },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  app.get('/api/tenants/:id/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.params.id;
      
      const role = await storage.getUserTenantRole(tenantId, userId);
      if (!role) {
        return res.status(403).json({ error: "You don't have access to this organization" });
      }
      
      const users = await storage.getTenantUsers(tenantId);
      res.json(users.map(u => ({
        userId: u.userId,
        role: u.role,
        joinedAt: u.joinedAt,
        user: {
          id: u.user.id,
          email: u.user.email,
          firstName: u.user.firstName,
          lastName: u.user.lastName,
          profileImageUrl: u.user.profileImageUrl,
        },
      })));
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      res.status(500).json({ error: "Failed to fetch organization members" });
    }
  });

  app.post('/api/tenants/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.params.id;
      
      const role = await storage.getUserTenantRole(tenantId, userId);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ error: "Only owners and admins can invite members" });
      }
      
      const validatedData = inviteUserSchema.parse(req.body);
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitation = await storage.createTenantInvitation(
        tenantId,
        validatedData.email,
        validatedData.role,
        userId,
        token,
        expiresAt
      );
      
      await storage.createAuditLog({
        tenantId,
        userId,
        action: "tenant.user_invited",
        resourceType: "invitation",
        resourceId: String(invitation.id),
        metadata: { email: validatedData.email, role: validatedData.role },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json({ message: "Invitation sent", invitationId: invitation.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error inviting user:", error);
        res.status(500).json({ error: "Failed to send invitation" });
      }
    }
  });

  app.post('/api/tenants/join/:token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { token } = req.params;
      
      const invitation = await storage.getTenantInvitation(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }
      
      if (invitation.acceptedAt) {
        return res.status(400).json({ error: "Invitation already accepted" });
      }
      
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ error: "Invitation has expired" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.email !== invitation.email) {
        return res.status(403).json({ error: "This invitation was sent to a different email address" });
      }
      
      await storage.addUserToTenant(invitation.tenantId, userId, invitation.role, invitation.invitedBy);
      await storage.acceptTenantInvitation(token);
      
      await storage.createAuditLog({
        tenantId: invitation.tenantId,
        userId,
        action: "tenant.user_joined",
        resourceType: "tenant_user",
        resourceId: userId,
        metadata: { role: invitation.role },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      const tenant = await storage.getTenant(invitation.tenantId);
      res.json({ message: "Successfully joined organization", tenant });
    } catch (error) {
      console.error("Error joining tenant:", error);
      res.status(500).json({ error: "Failed to join organization" });
    }
  });

  app.patch('/api/tenants/:id/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.id || req.user?.claims?.sub;
      const { id: tenantId, userId: targetUserId } = req.params;
      const { role: newRole } = req.body;
      
      const currentUserRole = await storage.getUserTenantRole(tenantId, currentUserId);
      if (currentUserRole !== "owner") {
        return res.status(403).json({ error: "Only owners can change member roles" });
      }
      
      if (!["admin", "member", "guest"].includes(newRole)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const updated = await storage.updateTenantUserRole(tenantId, targetUserId, newRole);
      if (!updated) {
        return res.status(404).json({ error: "User not found in organization" });
      }
      
      await storage.createAuditLog({
        tenantId,
        userId: currentUserId,
        action: "tenant.user_role_changed",
        resourceType: "tenant_user",
        resourceId: targetUserId,
        metadata: { newRole },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json({ message: "Role updated", role: newRole });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete('/api/tenants/:id/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.id || req.user?.claims?.sub;
      const { id: tenantId, userId: targetUserId } = req.params;
      
      const currentUserRole = await storage.getUserTenantRole(tenantId, currentUserId);
      if (!currentUserRole || !["owner", "admin"].includes(currentUserRole)) {
        return res.status(403).json({ error: "Only owners and admins can remove members" });
      }
      
      const targetUserRole = await storage.getUserTenantRole(tenantId, targetUserId);
      if (targetUserRole === "owner") {
        return res.status(403).json({ error: "Cannot remove the owner" });
      }
      
      await storage.removeUserFromTenant(tenantId, targetUserId);
      
      await storage.createAuditLog({
        tenantId,
        userId: currentUserId,
        action: "tenant.user_removed",
        resourceType: "tenant_user",
        resourceId: targetUserId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json({ message: "Member removed from organization" });
    } catch (error) {
      console.error("Error removing user:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.get('/api/tenants/:id/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const role = await storage.getUserTenantRole(tenantId, userId);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ error: "Only owners and admins can view audit logs" });
      }
      
      const logs = await storage.getAuditLogs(tenantId, limit, offset);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // =============================================================================
  // USERS ENDPOINT (for autocomplete)
  // =============================================================================

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // =============================================================================
  // MINDBODY ANALYTICS ROUTES
  // =============================================================================

  app.get('/api/mindbody-analytics/status', isAuthenticated, async (req: any, res) => {
    try {
      res.json({ configured: isMindbodyAnalyticsConfigured() });
    } catch (error) {
      console.error("Error checking Mindbody Analytics status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.get('/api/mindbody-analytics/intro-offers', isAuthenticated, async (req: any, res) => {
    try {
      if (!isMindbodyAnalyticsConfigured()) {
        return res.status(400).json({ error: "Mindbody Analytics is not configured" });
      }
      const { status, since, limit, offset } = req.query;
      const offers = await getIntroOffers({
        status: status as string,
        since: since as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(offers);
    } catch (error) {
      console.error("Error fetching intro offers:", error);
      res.status(500).json({ error: "Failed to fetch intro offers" });
    }
  });

  app.get('/api/mindbody-analytics/intro-offers/summary', isAuthenticated, async (req: any, res) => {
    try {
      if (!isMindbodyAnalyticsConfigured()) {
        return res.status(400).json({ error: "Mindbody Analytics is not configured" });
      }
      const summary = await getIntroOfferSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching intro offers summary:", error);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  const introOfferUpdateSchema = z.object({
    status: z.enum(["active", "converted", "expired"]).optional(),
    notes: z.string().max(500).optional(),
  });

  app.patch('/api/mindbody-analytics/intro-offers/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!isMindbodyAnalyticsConfigured()) {
        return res.status(400).json({ error: "Mindbody Analytics is not configured" });
      }
      const { id } = req.params;
      const tenantId = req.tenantId;
      const parseResult = introOfferUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: parseResult.error.errors });
      }
      const { status, notes } = parseResult.data;
      const updated = await updateIntroOffer(id, { status, notes });
      
      // Trigger webhook for intro offer status change
      if (status) {
        const { triggerWebhook } = await import("./webhook-service");
        triggerWebhook("intro_offer.status_changed", {
          offerId: id,
          newStatus: status,
          notes: notes || null,
          studentName: updated.firstName && updated.lastName 
            ? `${updated.firstName} ${updated.lastName}` 
            : undefined,
          offerName: updated.offerName,
          updatedAt: new Date().toISOString(),
        }, tenantId).catch(err => console.error("[Webhook] Error triggering intro offer webhook:", err));
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating intro offer:", error);
      res.status(500).json({ error: "Failed to update intro offer" });
    }
  });

  app.get('/api/mindbody-analytics/students', isAuthenticated, async (req: any, res) => {
    try {
      if (!isMindbodyAnalyticsConfigured()) {
        return res.status(400).json({ error: "Mindbody Analytics is not configured" });
      }
      const { limit, offset, search } = req.query;
      const students = await getStudents({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
      });
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // =============================================================================
  // AUTH ROUTES
  // =============================================================================

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-approve and set admin for the admin email if not already approved
      if (user.email === ADMIN_EMAIL && (user.approvalStatus !== "approved" || !user.isAdmin)) {
        if (user.approvalStatus !== "approved") {
          await storage.updateUserApprovalStatus(userId, "approved");
        }
        if (!user.isAdmin) {
          await storage.updateUserAdmin(userId, true);
        }
        user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/tour-completed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.markTourCompleted(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking tour completed:", error);
      res.status(500).json({ message: "Failed to mark tour completed" });
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

  // Unified search across all integrated services
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase().trim();
      const userId = req.user?.id;
      
      if (!query) {
        return res.json({ results: [], query: "" });
      }

      const results: Array<{
        id: string;
        type: "email" | "slack" | "calendar" | "zoom" | "task" | "project";
        title: string;
        snippet: string;
        timestamp: string;
        source: string;
        url?: string;
        metadata?: Record<string, unknown>;
      }> = [];

      // Search Gmail messages (only if user has personal connection)
      try {
        if (userId) {
          const customConnected = await isGmailConnectedForUser(userId);
          if (customConnected) {
            const emails = await getRecentEmailsForUser(userId, 50);
            for (const email of emails) {
              const subject = (email.subject || "").toLowerCase();
              const from = (email.from || "").toLowerCase();
              const snippet = (email.snippet || "").toLowerCase();
              
              if (subject.includes(query) || from.includes(query) || snippet.includes(query)) {
                results.push({
                  id: email.id,
                  type: "email",
                  title: email.subject || "(No subject)",
                  snippet: email.snippet || "",
                  timestamp: email.date || new Date().toISOString(),
                  source: "Gmail",
                  metadata: { from: email.from, threadId: email.threadId }
                });
              }
            }
          }
        }
      } catch (e) {
        console.log("[Search] Gmail search skipped:", (e as Error).message);
      }

      // Search Slack messages (only if user has personal connection)
      try {
        if (userId && await isUserSlackConnected(userId)) {
          const slackMessages = await getUserAllMessages(userId, 100);
          for (const msg of slackMessages) {
            const text = (msg.text || "").toLowerCase();
            const channel = (msg.channelName || "").toLowerCase();
            const user = (msg.userName || "").toLowerCase();
            
            if (text.includes(query) || channel.includes(query) || user.includes(query)) {
              results.push({
                id: msg.id,
                type: "slack",
                title: msg.channelName || "Slack Message",
                snippet: msg.text || "",
                timestamp: msg.timestamp || new Date().toISOString(),
                source: "Slack",
                metadata: { channelId: msg.channelId, userName: msg.userName, isDm: msg.isDm }
              });
            }
          }
        }
      } catch (e) {
        console.log("[Search] Slack search skipped:", (e as Error).message);
      }

      // Search Calendar events (uses shared connector - OK for single-tenant)
      try {
        const events = await getUpcomingEvents();
        for (const event of events) {
          const title = (event.title || "").toLowerCase();
          const location = (event.location || "").toLowerCase();
          const description = (event.description || "").toLowerCase();
          
          if (title.includes(query) || location.includes(query) || description.includes(query)) {
            results.push({
              id: event.id,
              type: "calendar",
              title: event.title,
              snippet: event.location || event.description || "",
              timestamp: event.start,
              source: "Calendar",
              metadata: { end: event.end, isAllDay: event.isAllDay }
            });
          }
        }
      } catch (e) {
        console.log("[Search] Calendar search skipped:", (e as Error).message);
      }

      // Search Zoom meetings (uses shared connector - OK for single-tenant)
      try {
        const meetings = await getUpcomingMeetings();
        for (const meeting of meetings) {
          const topic = (meeting.topic || "").toLowerCase();
          
          if (topic.includes(query)) {
            results.push({
              id: String(meeting.id),
              type: "zoom",
              title: meeting.topic,
              snippet: `Duration: ${meeting.duration} minutes`,
              timestamp: meeting.startTime,
              source: "Zoom",
              url: meeting.joinUrl,
              metadata: { duration: meeting.duration }
            });
          }
        }
      } catch (e) {
        console.log("[Search] Zoom search skipped:", (e as Error).message);
      }

      // Search native tasks
      try {
        if (userId) {
          const userTasks = await storage.getUserTasks(userId);
          for (const task of userTasks) {
            const title = (task.title || "").toLowerCase();
            const description = (task.description || "").toLowerCase();
            
            if (title.includes(query) || description.includes(query)) {
              results.push({
                id: String(task.id),
                type: "task",
                title: task.title,
                snippet: task.description || "",
                timestamp: task.createdAt?.toISOString() || new Date().toISOString(),
                source: "Tasks",
                metadata: { priority: task.priority, dueDate: task.dueDate, completed: task.isCompleted }
              });
            }
          }
        }
      } catch (e) {
        console.log("[Search] Tasks search skipped:", (e as Error).message);
      }

      // Search native projects
      try {
        if (userId) {
          const userProjects = await storage.getUserProjects(userId);
          for (const project of userProjects) {
            const name = (project.name || "").toLowerCase();
            const description = (project.description || "").toLowerCase();
            
            if (name.includes(query) || description.includes(query)) {
              results.push({
                id: String(project.id),
                type: "project",
                title: project.name,
                snippet: project.description || "",
                timestamp: project.createdAt?.toISOString() || new Date().toISOString(),
                source: "Projects",
                metadata: { isArchived: project.isArchived }
              });
            }
          }
        }
      } catch (e) {
        console.log("[Search] Projects search skipped:", (e as Error).message);
      }

      // Sort by timestamp (most recent first)
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ results: results.slice(0, 50), query });
    } catch (error: any) {
      console.error("[Search] Error:", error?.message || error);
      res.status(500).json({ error: "Search failed" });
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

  app.get("/api/admin/active-sessions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const activeSessions = await storage.getActiveSessions();
      res.json(activeSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
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

  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }
      // Prevent deleting yourself
      const currentUserId = req.user?.id || req.user?.claims?.sub;
      if (req.params.id === currentUserId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
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

  app.patch("/api/admin/users/:id/profile", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { firstName, lastName } = req.body;
      if (typeof firstName !== 'string' || typeof lastName !== 'string') {
        return res.status(400).json({ error: "First name and last name are required" });
      }
      const updatedUser = await storage.updateUserProfile(req.params.id, firstName, lastName);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
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

  app.get("/api/admin/users/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });

  app.post("/api/admin/users/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      const updatedUser = await storage.updateUserApprovalStatus(req.params.id, "approved", user.id);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Failed to approve user" });
    }
  });

  app.post("/api/admin/users/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      const updatedUser = await storage.updateUserApprovalStatus(req.params.id, "rejected", user.id);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ error: "Failed to reject user" });
    }
  });

  // Email templates admin routes
  app.get("/api/admin/email-templates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  app.get("/api/admin/email-templates/:type", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.type);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ error: "Failed to fetch email template" });
    }
  });

  app.put("/api/admin/email-templates/:type", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = emailTemplateSchema.parse({
        ...req.body,
        templateType: req.params.type
      });
      const template = await storage.upsertEmailTemplate(
        validatedData.templateType,
        validatedData.subject,
        validatedData.htmlContent
      );
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error updating email template:", error);
        res.status(500).json({ error: "Failed to update email template" });
      }
    }
  });

  app.get("/api/admin/email-template-types", isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.json(getTemplateTypes());
    } catch (error) {
      console.error("Error fetching template types:", error);
      res.status(500).json({ error: "Failed to fetch template types" });
    }
  });

  app.get("/api/admin/email-templates/:type/default", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const defaultTemplate = getDefaultTemplate(req.params.type);
      if (!defaultTemplate) {
        return res.status(404).json({ error: "Template type not found" });
      }
      res.json(defaultTemplate);
    } catch (error) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ error: "Failed to fetch default template" });
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
        approvalStatus: "approved",
      });
      
      // Send invitation email with login credentials
      const host = req.get('host') || 'localhost:5000';
      const loginUrl = `${req.protocol}://${host}/login`;
      const emailSent = await sendInvitationEmail(
        validatedData.email,
        validatedData.firstName || 'there',
        validatedData.password,
        loginUrl
      );
      
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ ...safeUser, invitationEmailSent: emailSent });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Gmail integration endpoints - Custom OAuth flow
  app.get("/api/gmail/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const authUrl = getGmailAuthUrl(userId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Error generating Gmail auth URL:", error);
      res.status(500).json({ error: error?.message || "Failed to initiate Gmail connection" });
    }
  });

  app.get("/api/gmail/callback", async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      
      if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
        return res.redirect('/connect?error=invalid_callback');
      }
      
      await handleGmailCallback(code, userId);
      res.redirect('/connect?success=gmail');
    } catch (error: any) {
      console.error("Error in Gmail OAuth callback:", error);
      res.redirect('/connect?error=gmail_connection_failed');
    }
  });

  app.post("/api/gmail/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await disconnectGmailForUser(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      res.status(500).json({ error: error?.message || "Failed to disconnect Gmail" });
    }
  });

  app.get("/api/gmail/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ connected: false });
      }
      // Check custom OAuth first, then fall back to connector
      const customConnected = await isGmailConnectedForUser(userId);
      if (customConnected) {
        return res.json({ connected: true, type: 'custom' });
      }
      const connectorConnected = await isGmailConnected();
      res.json({ connected: connectorConnected, type: 'connector' });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Test endpoint to check Gmail API access
  app.get("/api/gmail/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ error: "No user ID" });
      }
      
      // Try to get the Gmail client and make a simple API call
      const gmail = await getGmailClientForUser(userId);
      
      // Try to list just 1 message
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
      });
      
      return res.json({
        success: true,
        messageCount: response.data.messages?.length || 0,
        resultSizeEstimate: response.data.resultSizeEstimate,
      });
    } catch (error: any) {
      return res.json({ 
        error: error?.message,
        code: error?.code,
        errors: error?.errors,
        response: error?.response?.data,
        stack: error?.stack?.split('\n').slice(0, 5)
      });
    }
  });

  // Debug endpoint to check Gmail connection details
  app.get("/api/gmail/debug", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ error: "No user ID" });
      }
      
      const account = await storage.getOAuthAccount(userId, 'gmail');
      
      if (!account) {
        return res.json({ 
          connected: false, 
          message: "No Gmail OAuth account found for this user",
          userId 
        });
      }
      
      return res.json({
        connected: true,
        hasAccessToken: !!account.accessToken,
        hasRefreshToken: !!account.refreshToken,
        providerAccountId: account.providerAccountId,
        expiresAt: account.expiresAt,
        isExpired: account.expiresAt ? new Date(account.expiresAt).getTime() < Date.now() : 'unknown',
        userId
      });
    } catch (error: any) {
      res.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 3) });
    }
  });

  app.get("/api/gmail/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      console.log("[Gmail Messages] Fetching for user:", userId);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Try custom OAuth first
      const customConnected = await isGmailConnectedForUser(userId);
      console.log("[Gmail Messages] Custom OAuth connected:", customConnected);
      
      if (customConnected) {
        console.log("[Gmail Messages] Fetching emails via custom OAuth...");
        try {
          const emails = await getRecentEmailsForUser(userId, 20);
          console.log("[Gmail Messages] Fetched", emails.length, "emails");
          return res.json(emails);
        } catch (emailError: any) {
          console.error("[Gmail Messages] Error fetching via custom OAuth:", emailError?.message);
          console.error("[Gmail Messages] Error details:", emailError?.response?.data || emailError);
          return res.status(500).json({ 
            error: emailError?.message || "Failed to fetch emails",
            details: emailError?.response?.data?.error || null
          });
        }
      }
      
      // Fall back to connector
      console.log("[Gmail Messages] Falling back to connector...");
      const emails = await getRecentEmails(20);
      console.log("[Gmail Messages] Fetched", emails.length, "emails via connector");
      res.json(emails);
    } catch (error: any) {
      console.error("[Gmail Messages] Error fetching emails:", error?.message || error);
      console.error("[Gmail Messages] Full error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch emails" });
    }
  });

  // Get single email with full content
  app.get("/api/gmail/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const messageId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const email = await getEmailById(userId, messageId);
      res.json(email);
    } catch (error: any) {
      console.error("[Gmail] Error fetching email:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to fetch email" });
    }
  });

  // Send/reply to email
  app.post("/api/gmail/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { to, subject, body, inReplyTo, threadId } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }
      
      await sendEmail(userId, to, subject, body, inReplyTo, threadId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Gmail] Error sending email:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to send email" });
    }
  });

  // Delete email (move to trash)
  app.delete("/api/gmail/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const messageId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      await deleteEmailById(userId, messageId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Gmail] Error deleting email:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to delete email" });
    }
  });

  // AI Email Reply Suggestions
  app.post("/api/ai/email-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { messageId } = req.body;
      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }
      
      const email = await getEmailById(userId, messageId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      
      const suggestions = await generateEmailReplySuggestions({
        subject: email.subject,
        from: email.from,
        to: email.to,
        body: email.body,
        date: email.date,
      });
      
      res.json({ suggestions });
    } catch (error: any) {
      console.error("[AI] Error generating email suggestions:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to generate suggestions" });
    }
  });

  // AI Email Summarization
  app.post("/api/ai/email-summarize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { messageId } = req.body;
      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }
      
      const email = await getEmailById(userId, messageId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
      
      const summary = await summarizeEmail({
        subject: email.subject,
        from: email.from,
        to: email.to,
        body: email.body,
        date: email.date,
      });
      
      res.json(summary);
    } catch (error: any) {
      console.error("[AI] Error summarizing email:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to summarize email" });
    }
  });

  // AI Extract Tasks from Content
  app.post("/api/ai/extract-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { content, source, senderName } = req.body;
      if (!content || !source) {
        return res.status(400).json({ error: "Missing content or source" });
      }
      
      const tasks = await extractTasksFromContent(content, source, senderName);
      res.json({ tasks });
    } catch (error: any) {
      console.error("[AI] Error extracting tasks:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to extract tasks" });
    }
  });

  // AI Daily Briefing
  app.get("/api/ai/daily-briefing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userTasks = await storage.getUserTasks(userId);
      const meetings = await getUpcomingEvents(10);
      
      let emails: any[] = [];
      try {
        if (await isGmailConnectedForUser(userId)) {
          emails = await getRecentEmailsForUser(userId, 20);
        }
      } catch (e) {
        console.log("[AI Briefing] Gmail not available");
      }
      
      let slackMessages: any[] = [];
      try {
        if (await isUserSlackConnected(userId)) {
          slackMessages = await getUserDirectMessages(userId, 20);
        }
      } catch (e) {
        console.log("[AI Briefing] Slack not available");
      }
      
      const briefing = await generateDailyBriefing({
        tasks: userTasks.map(t => ({
          title: t.title,
          dueDate: t.dueDate?.toISOString(),
          priority: t.priority || "medium",
          isCompleted: t.isCompleted || false,
        })),
        meetings: meetings.map((m: any) => ({
          title: m.title,
          start: m.start,
          attendees: m.attendees || [],
        })),
        emails: emails.map((e: any) => ({
          subject: e.subject,
          from: e.from,
          snippet: e.snippet,
          isUnread: e.isUnread,
        })),
        slackMessages: slackMessages.map((m: any) => ({
          text: m.text,
          userName: m.userName,
          channelName: m.channelName,
        })),
      });
      
      res.json(briefing);
    } catch (error: any) {
      console.error("[AI] Error generating daily briefing:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to generate briefing" });
    }
  });

  // AI Meeting Prep
  app.post("/api/ai/meeting-prep", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { meetingTitle, meetingStart, attendees } = req.body;
      if (!meetingTitle) {
        return res.status(400).json({ error: "Missing meeting title" });
      }
      
      let recentEmails: any[] = [];
      try {
        if (await isGmailConnectedForUser(userId)) {
          recentEmails = await getRecentEmailsForUser(userId, 20);
        }
      } catch (e) {
        console.log("[AI Meeting Prep] Gmail not available");
      }
      
      const userTasks = await storage.getUserTasks(userId);
      
      let slackMessages: any[] = [];
      try {
        if (await isUserSlackConnected(userId)) {
          slackMessages = await getUserDirectMessages(userId, 20);
        }
      } catch (e) {
        console.log("[AI Meeting Prep] Slack not available");
      }
      
      const prep = await generateMeetingPrep({
        meeting: {
          title: meetingTitle,
          start: meetingStart || new Date().toISOString(),
          attendees: attendees || [],
        },
        recentEmails: recentEmails.map((e: any) => ({
          subject: e.subject,
          from: e.from,
          snippet: e.snippet,
        })),
        relatedTasks: userTasks.slice(0, 20).map(t => ({
          title: t.title,
          description: t.description || undefined,
        })),
        slackMessages: slackMessages.map((m: any) => ({
          text: m.text,
          userName: m.userName,
        })),
      });
      
      res.json(prep);
    } catch (error: any) {
      console.error("[AI] Error generating meeting prep:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to generate meeting prep" });
    }
  });

  // AI Smart Search
  app.post("/api/ai/smart-search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Missing search query" });
      }
      
      let emails: any[] = [];
      try {
        if (await isGmailConnectedForUser(userId)) {
          emails = await getRecentEmailsForUser(userId, 30);
        }
      } catch (e) {
        console.log("[AI Smart Search] Gmail not available");
      }
      
      const userTasks = await storage.getUserTasks(userId);
      const meetings = await getUpcomingEvents(20);
      
      let slackMessages: any[] = [];
      try {
        if (await isUserSlackConnected(userId)) {
          slackMessages = await getUserAllMessages(userId, 30);
        }
      } catch (e) {
        console.log("[AI Smart Search] Slack not available");
      }
      
      const result = await smartSearch(query, {
        emails: emails.map((e: any) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          snippet: e.snippet,
          date: e.date,
        })),
        tasks: userTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
        })),
        meetings: meetings.map((m: any) => ({
          id: m.id,
          title: m.title,
          start: m.start,
        })),
        slackMessages: slackMessages.map((m: any) => ({
          id: m.id,
          text: m.text,
          userName: m.userName,
          channelName: m.channelName,
        })),
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("[AI] Error in smart search:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to search" });
    }
  });

  // AI Email Drafting
  app.post("/api/ai/draft-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { prompt, replyToMessageId } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }
      
      let context: { replyTo?: { from: string; subject: string; body: string } } | undefined;
      
      if (replyToMessageId) {
        try {
          const email = await getEmailById(userId, replyToMessageId);
          context = {
            replyTo: {
              from: email.from,
              subject: email.subject,
              body: email.body,
            }
          };
        } catch (e) {
          console.log("[AI Draft Email] Could not fetch reply-to email");
        }
      }
      
      const draft = await draftEmail(prompt, context);
      res.json(draft);
    } catch (error: any) {
      console.error("[AI] Error drafting email:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to draft email" });
    }
  });

  // AI Calendar Analysis
  app.get("/api/ai/calendar-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const meetings = await getUpcomingEvents(50);
      
      const insights = await analyzeCalendar(
        meetings.map((m: any) => ({
          title: m.title,
          start: m.start,
          end: m.end,
          duration: m.duration || 60,
        }))
      );
      
      res.json(insights);
    } catch (error: any) {
      console.error("[AI] Error analyzing calendar:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to analyze calendar" });
    }
  });

  // AI Task Prioritization
  app.get("/api/ai/prioritize-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userTasks = await storage.getUserTasks(userId);
      const incompleteTasks = userTasks.filter(t => !t.isCompleted);
      
      if (incompleteTasks.length === 0) {
        return res.json({ prioritizedTasks: [] });
      }
      
      const prioritized = await prioritizeTasks(
        incompleteTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          dueDate: t.dueDate?.toISOString(),
          priority: t.priority || "medium",
        }))
      );
      
      res.json({ prioritizedTasks: prioritized });
    } catch (error: any) {
      console.error("[AI] Error prioritizing tasks:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to prioritize tasks" });
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

  app.get("/api/calendar/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const googleEvents = await getUpcomingEvents(10).catch(() => []);
      const calendlyEvents = userId ? await getCalendlyEvents(userId, 10).catch(() => []) : [];
      const mergedEvents = [...googleEvents.map(e => ({ ...e, source: "google" as const })), ...calendlyEvents]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 15);
      res.json(mergedEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar/month/:year/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const googleEvents = await getEventsForMonth(year, month).catch(() => []);
      const calendlyEvents = userId ? await getCalendlyEventsForMonth(userId, year, month).catch(() => []) : [];
      const mergedEvents = [...googleEvents.map(e => ({ ...e, source: "google" as const })), ...calendlyEvents]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      res.json(mergedEvents);
    } catch (error) {
      console.error("Error fetching month events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const { title, start, end, description, location, isAllDay } = req.body;
      if (!title || !start || !end) {
        return res.status(400).json({ error: "Title, start, and end are required" });
      }
      const event = await createCalendarEvent({ title, start, end, description, location, isAllDay });
      res.json(event);
    } catch (error: any) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: error?.message || "Failed to create calendar event" });
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
  app.get("/api/slack/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      // Check user OAuth first, then fall back to bot token
      if (userId) {
        const userConnected = await isUserSlackConnected(userId);
        if (userConnected) {
          return res.json({ connected: true, type: 'user' });
        }
      }
      const botConnected = await isSlackConnected();
      res.json({ connected: botConnected, type: 'bot' });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/slack/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const includeDms = req.query.includeDms === 'true';
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserSlackConnected(userId);
        if (userConnected) {
          const messages = await getUserAllMessages(userId, 30);
          return res.json(messages);
        }
      }
      
      // Fall back to bot token
      const messages = includeDms 
        ? await getAllSlackMessages(30)
        : await getSlackMessages(20);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching Slack messages:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack messages" });
    }
  });

  app.get("/api/slack/dms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserSlackConnected(userId);
        if (userConnected) {
          const messages = await getUserDirectMessages(userId, 15);
          return res.json(messages);
        }
      }
      
      // Fall back to bot token
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

  app.get("/api/slack/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserSlackConnected(userId);
        if (userConnected) {
          const channels = await getUserChannels(userId);
          return res.json(channels);
        }
      }
      
      // Fall back to bot token
      const channels = await getSlackChannels();
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching Slack channels:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack channels" });
    }
  });

  app.get("/api/slack/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const preferences = await storage.getSlackChannelPreferences(userId);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error fetching Slack preferences:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack preferences" });
    }
  });

  app.post("/api/slack/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = slackPreferencesUpdateSchema.parse(req.body);
      await storage.saveSlackChannelPreferences(userId, validatedData.channels);
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
      const userId = req.user.claims?.sub || req.user.id;
      const preferences = await storage.getSlackChannelPreferences(userId);
      const enabledChannelIds = preferences
        .filter(p => p.isEnabled)
        .map(p => p.channelId);
      
      // Check if user has personal Slack OAuth connected
      const userConnected = await isUserSlackConnected(userId);
      
      // Fetch DMs - use user token if available for personal DMs, otherwise bot token
      let dmMessages;
      if (userConnected) {
        dmMessages = await getUserDirectMessages(userId, 15);
      } else {
        dmMessages = await getSlackDMs(15);
      }
      
      if (preferences.length === 0) {
        // No channel preferences set - return DMs only (or all messages if user connected)
        if (userConnected) {
          const allMessages = await getUserAllMessages(userId, 30);
          res.json(allMessages);
        } else {
          const allMessages = await getAllSlackMessages(30);
          res.json(allMessages);
        }
        return;
      }
      
      if (enabledChannelIds.length === 0) {
        res.json(dmMessages);
        return;
      }
      
      const channelMessages = await getRecentMessagesFiltered(enabledChannelIds, 20);
      const allMessages = [...channelMessages, ...dmMessages]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30);
      res.json(allMessages);
    } catch (error: any) {
      console.error("Error fetching filtered Slack messages:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Slack messages" });
    }
  });

  // Slack OAuth - per-user authentication
  app.get("/api/slack/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const clientId = process.env.SLACK_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "Slack OAuth not configured" });
      }
      
      const host = req.get('host') || 'localhost:5000';
      const redirectUri = `${req.protocol}://${host}/api/slack/callback`;
      
      // User scopes for accessing their own messages
      const userScopes = [
        'channels:read',
        'channels:history',
        'groups:read',
        'groups:history',
        'im:read',
        'im:history',
        'mpim:read',
        'mpim:history',
        'users:read'
      ].join(',');
      
      const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
      
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Error generating Slack auth URL:", error);
      res.status(500).json({ error: error?.message || "Failed to initiate Slack connection" });
    }
  });

  app.get("/api/slack/callback", async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      
      if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
        return res.redirect('/connect?error=invalid_callback');
      }
      
      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.redirect('/connect?error=slack_not_configured');
      }
      
      const host = req.get('host') || 'localhost:5000';
      const redirectUri = `${req.protocol}://${host}/api/slack/callback`;
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
      
      const tokenData = await tokenResponse.json() as any;
      
      if (!tokenData.ok) {
        console.error('Slack OAuth error:', tokenData.error);
        return res.redirect('/connect?error=slack_auth_failed');
      }
      
      // Extract user token (not bot token)
      const userToken = tokenData.authed_user?.access_token;
      const slackUserId = tokenData.authed_user?.id;
      const teamId = tokenData.team?.id;
      const scope = tokenData.authed_user?.scope;
      
      if (!userToken || !slackUserId || !teamId) {
        console.error('Missing user token in Slack response:', tokenData);
        return res.redirect('/connect?error=slack_missing_token');
      }
      
      // Save user credentials and enable the integration
      await storage.saveSlackUserCredentials(userId, slackUserId, teamId, userToken, scope);
      await storage.enableIntegration(userId, 'slack');
      
      res.redirect('/connect?success=slack');
    } catch (error: any) {
      console.error("Error in Slack OAuth callback:", error);
      res.redirect('/connect?error=slack_connection_failed');
    }
  });

  app.post("/api/slack/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      // Delete user OAuth credentials and add to disabled list
      await storage.deleteSlackUserCredentials(userId);
      await storage.disableIntegration(userId, 'slack');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Slack:", error);
      res.status(500).json({ error: error?.message || "Failed to disconnect Slack" });
    }
  });

  app.get("/api/slack/user-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ connected: false });
      }
      const creds = await storage.getSlackUserCredentials(userId);
      res.json({ connected: !!creds });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Slack notifications - send messages to channels
  app.post("/api/slack/notify", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId, message, type, data } = req.body;
      
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      let result;
      
      if (type && data) {
        // Use formatted notification with blocks
        const notification = formatYHCWayNotification(type, data);
        result = await sendSlackBlockNotification(channelId, notification.blocks, notification.text);
      } else if (message) {
        // Simple text message
        result = await sendSlackNotification(channelId, message);
      } else {
        return res.status(400).json({ error: "Either message or (type and data) is required" });
      }

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error || "Failed to send notification" });
      }
    } catch (error: any) {
      console.error("Error sending Slack notification:", error);
      res.status(500).json({ error: error?.message || "Failed to send Slack notification" });
    }
  });

  // Slack reply - send message using user's OAuth token
  app.post("/api/slack/reply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user has Slack credentials
      const isConnected = await isUserSlackConnected(userId);
      if (!isConnected) {
        return res.status(403).json({ error: "Slack not connected. Please connect your Slack account in Settings." });
      }
      
      const { channelId, message, threadTs } = req.body;
      
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "message is required" });
      }

      const result = await sendUserSlackMessage(userId, channelId, message.trim(), { threadTs });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error || "Failed to send reply" });
      }
    } catch (error: any) {
      console.error("Error sending Slack reply:", error);
      res.status(500).json({ error: error?.message || "Failed to send Slack reply" });
    }
  });

  // Asana OAuth - per-user authentication
  app.get("/api/asana/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const clientId = process.env.ASANA_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "Asana OAuth not configured" });
      }
      
      const host = req.get('host') || 'localhost:5000';
      const redirectUri = `${req.protocol}://${host}/api/asana/callback`;
      
      const authUrl = `https://app.asana.com/-/oauth_authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${userId}`;
      
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Error generating Asana auth URL:", error);
      res.status(500).json({ error: error?.message || "Failed to initiate Asana connection" });
    }
  });

  app.get("/api/asana/callback", async (req, res) => {
    console.log('[Asana Callback] Starting callback handler');
    console.log('[Asana Callback] Query params:', req.query);
    try {
      const { code, state: userId } = req.query;
      
      if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
        console.log('[Asana Callback] Invalid params - code:', !!code, 'userId:', userId);
        return res.redirect('/connect?error=invalid_callback');
      }
      
      console.log('[Asana Callback] Valid params - userId:', userId);
      
      const clientId = process.env.ASANA_CLIENT_ID;
      const clientSecret = process.env.ASANA_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.log('[Asana Callback] Missing credentials');
        return res.redirect('/connect?error=asana_not_configured');
      }
      
      const host = req.get('host') || 'localhost:5000';
      const redirectUri = `${req.protocol}://${host}/api/asana/callback`;
      console.log('[Asana Callback] Using redirect URI:', redirectUri);
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://app.asana.com/-/oauth_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
      
      console.log('[Asana Callback] Token response status:', tokenResponse.status);
      const tokenData = await tokenResponse.json() as any;
      console.log('[Asana Callback] Token response keys:', Object.keys(tokenData));
      
      if (tokenData.error) {
        console.error('[Asana Callback] Token error:', tokenData.error, tokenData.error_description);
        return res.redirect('/connect?error=asana_auth_failed');
      }
      
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in;
      const asanaUserId = tokenData.data?.gid || tokenData.data?.id;
      
      if (!accessToken) {
        console.error('[Asana Callback] Missing access token in response');
        return res.redirect('/connect?error=asana_missing_token');
      }
      
      // Calculate expiry date
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
      
      // Save user credentials and enable the integration
      console.log('[Asana Callback] Saving credentials for user:', userId);
      const savedCreds = await storage.saveAsanaUserCredentials(userId, asanaUserId || '', accessToken, refreshToken, expiresAt);
      console.log('[Asana Callback] Saved credentials:', savedCreds?.id);
      
      await storage.enableIntegration(userId, 'asana');
      console.log('[Asana Callback] Enabled integration, redirecting to success');
      
      res.redirect('/connect?success=asana');
    } catch (error: any) {
      console.error("[Asana Callback] Error:", error);
      res.redirect('/connect?error=asana_connection_failed');
    }
  });

  app.post("/api/asana/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      // Delete user OAuth credentials and add to disabled list
      await storage.deleteAsanaUserCredentials(userId);
      await storage.disableIntegration(userId, 'asana');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Asana:", error);
      res.status(500).json({ error: error?.message || "Failed to disconnect Asana" });
    }
  });

  app.get("/api/asana/user-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ connected: false });
      }
      const creds = await storage.getAsanaUserCredentials(userId);
      res.json({ connected: !!creds });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Perkville Resource Owner Grant - authenticate with admin credentials
  app.post("/api/perkville/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      console.log("[Perkville] Connect initiated for user:", userId);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!isPerkvilleConfigured()) {
        console.error("[Perkville] Not configured - missing client ID or secret");
        return res.status(400).json({ error: "Perkville integration not configured" });
      }
      
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const tokenData = await authenticateWithPerkville(username, password);
      
      if (!tokenData.access_token) {
        return res.status(400).json({ error: "Failed to obtain access token" });
      }
      
      await storage.upsertOAuthAccount({
        userId,
        provider: 'perkville',
        providerAccountId: userId,
        accessToken: tokenData.access_token,
      });
      
      await storage.enableIntegration(userId, 'perkville');
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Perkville] Authentication error:", error);
      res.status(401).json({ error: error?.message || "Invalid Perkville credentials" });
    }
  });

  app.post("/api/perkville/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await disconnectPerkville(userId);
      await storage.disableIntegration(userId, 'perkville');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Perkville:", error);
      res.status(500).json({ error: error?.message || "Failed to disconnect Perkville" });
    }
  });

  app.get("/api/perkville/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.json({ connected: false, configured: isPerkvilleConfigured() });
      }
      const hasToken = await isUserPerkvilleConnected(userId);
      if (!hasToken) {
        return res.json({ connected: false, configured: isPerkvilleConfigured() });
      }
      
      // Validate the token is still valid with Perkville
      const validation = await validatePerkvilleToken(userId);
      if (!validation.valid) {
        // Token is invalid - auto-disconnect so user sees correct status
        console.log("[Perkville] Token invalid, auto-disconnecting:", validation.error);
        await disconnectPerkville(userId);
        return res.json({ connected: false, configured: isPerkvilleConfigured(), tokenExpired: true });
      }
      
      res.json({ connected: true, configured: isPerkvilleConfigured() });
    } catch (error) {
      res.json({ connected: false, configured: isPerkvilleConfigured() });
    }
  });

  app.get("/api/perkville/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const info = await getPerkvilleCustomerInfo(userId);
      console.log("[Perkville] /me response:", JSON.stringify(info, null, 2));
      res.json(info);
    } catch (error: any) {
      console.error("Error fetching Perkville customer info:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch customer info" });
    }
  });

  app.get("/api/perkville/points", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const pointsData = await getPerkvillePoints(userId);
      const normalized = {
        total: Array.isArray(pointsData) ? pointsData.reduce((sum: number, p: any) => sum + (p.total || p.points || 0), 0) : (pointsData?.total || 0),
        available: Array.isArray(pointsData) ? pointsData.reduce((sum: number, p: any) => sum + (p.available || p.points || 0), 0) : (pointsData?.available || 0),
        pending: Array.isArray(pointsData) ? pointsData.reduce((sum: number, p: any) => sum + (p.pending || 0), 0) : (pointsData?.pending || 0),
      };
      res.json(normalized);
    } catch (error: any) {
      console.error("Error fetching Perkville points:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch points" });
    }
  });

  app.get("/api/perkville/rewards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const rewardsData = await getPerkvilleRewards(userId);
      const normalized = Array.isArray(rewardsData) ? rewardsData.map((r: any) => ({
        id: r.id || r.reward_id || String(Math.random()),
        name: r.name || r.title || "Reward",
        description: r.description || "",
        pointsCost: r.points_cost || r.pointsCost || r.points || 0,
        available: r.available !== false,
      })) : [];
      res.json(normalized);
    } catch (error: any) {
      console.error("Error fetching Perkville rewards:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch rewards" });
    }
  });

  app.get("/api/perkville/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activityData = await getPerkvilleActivity(userId);
      const normalized = Array.isArray(activityData) ? activityData.map((a: any) => ({
        id: a.id || a.activity_id || String(Math.random()),
        type: a.type || a.activity_type || "activity",
        description: a.description || a.message || a.name || "Activity",
        points: a.points || a.point_value || 0,
        date: a.date || a.created_at || a.timestamp || new Date().toISOString(),
      })) : [];
      res.json(normalized);
    } catch (error: any) {
      console.error("Error fetching Perkville activity:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch activity" });
    }
  });

  app.get("/api/perkville/businesses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const businesses = await getPerkvilleBusinesses(userId);
      res.json(businesses);
    } catch (error: any) {
      console.error("Error fetching Perkville businesses:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch businesses" });
    }
  });

  app.get("/api/perkville/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const businessId = parseInt(req.query.businessId as string);
      if (!businessId || isNaN(businessId)) {
        return res.status(400).json({ error: "businessId is required" });
      }
      
      const [customers, balances] = await Promise.all([
        getPerkvilleCustomers(userId, businessId),
        getPerkvilleConnectionBalances(userId, businessId),
      ]);
      
      const balanceMap = new Map<number, number>();
      for (const b of balances) {
        // Extract numeric ID from connection path like "/v2/connections/6523892/"
        let connId = b.connection || b.id;
        if (typeof connId === 'string' && connId.includes('/connections/')) {
          const match = connId.match(/\/connections\/(\d+)/);
          if (match) connId = parseInt(match[1]);
        }
        if (typeof connId === 'number') {
          balanceMap.set(connId, b.balance || b.points || 0);
        }
      }
      
      const normalized = customers.map((c: any) => {
        // Extract numeric connection ID from customer if needed
        let custId = c.id || c.connection_id;
        if (typeof custId === 'string' && custId.includes('/connections/')) {
          const match = custId.match(/\/connections\/(\d+)/);
          if (match) custId = parseInt(match[1]);
        }
        // Get points from V1 balance field, V2 point_balance, or balanceMap
        const points = c.balance ?? c.point_balance ?? balanceMap.get(custId) ?? c.points ?? 0;
        // V1 API has first_name/last_name/email at top level
        return {
          id: c.id || c.connection_id,
          connectionId: custId,
          userId: c.user_id || c.user?.id || c.user,
          firstName: c.first_name || c.user?.first_name || "",
          lastName: c.last_name || c.user?.last_name || "",
          email: c.email || c.user?.emails?.[0]?.email || "",
          status: c.status || "active",
          joinDate: c.rewards_program_join_dt || c.join_dt || c.created_at,
          points: points,
          lifetimePoints: c.lifetime_earned_points || c.balance || 0,
        };
      });
      res.json(normalized);
    } catch (error: any) {
      console.error("Error fetching Perkville customers:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch customers" });
    }
  });

  app.get("/api/perkville/balances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const businessId = parseInt(req.query.businessId as string);
      if (!businessId || isNaN(businessId)) {
        return res.status(400).json({ error: "businessId is required" });
      }
      const balances = await getPerkvilleConnectionBalances(userId, businessId);
      const totalPoints = balances.reduce((sum: number, b: any) => sum + (b.balance || b.points || 0), 0);
      const customerCount = balances.length;
      res.json({
        totalPoints,
        customerCount,
        balances: balances.map((b: any) => ({
          connectionId: b.connection || b.id,
          balance: b.balance || b.points || 0,
          lastModified: b.last_mod_dt || b.modified_at,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching Perkville balances:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch balances" });
    }
  });

  app.get("/api/perkville/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }
      const customer = await searchPerkvilleCustomerByEmail(userId, email);
      if (!customer) {
        return res.json(null);
      }
      
      let points = customer.balance || customer.points || 0;
      if (customer.business?.id) {
        try {
          const balances = await getPerkvilleConnectionBalances(userId, customer.business.id);
          const balance = balances.find((b: any) => (b.connection || b.id) === customer.id);
          if (balance) {
            points = balance.balance || balance.points || 0;
          }
        } catch (e) {}
      }
      
      res.json({
        id: customer.id,
        userId: customer.user?.id || customer.user,
        firstName: customer.user?.first_name || customer.first_name || "",
        lastName: customer.user?.last_name || customer.last_name || "",
        email: customer.user?.emails?.[0]?.email || email,
        status: customer.status || "active",
        joinDate: customer.join_dt || customer.created_at,
        points,
      });
    } catch (error: any) {
      console.error("Error searching Perkville customer:", error);
      res.status(500).json({ error: error?.message || "Failed to search customer" });
    }
  });

  app.get("/api/perkville/customers/:connectionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const connectionId = parseInt(req.params.connectionId);
      if (!connectionId || isNaN(connectionId)) {
        return res.status(400).json({ error: "Invalid connection ID" });
      }
      const customer = await getPerkvilleCustomerById(userId, connectionId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({
        id: customer.id,
        userId: customer.user?.id || customer.user,
        firstName: customer.user?.first_name || customer.first_name || "",
        lastName: customer.user?.last_name || customer.last_name || "",
        email: customer.user?.emails?.[0]?.email || customer.email || "",
        status: customer.status || "active",
        joinDate: customer.join_dt || customer.created_at,
        points: customer.balance || customer.points || 0,
        membershipType: customer.external_membership_type,
        membershipStatus: customer.external_membership_status,
      });
    } catch (error: any) {
      console.error("Error fetching Perkville customer:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch customer" });
    }
  });

  // Apple Calendar integration endpoints
  app.get("/api/apple-calendar/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const connected = await isAppleCalendarConnected(userId);
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.post("/api/apple-calendar/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = appleCalendarConnectSchema.parse(req.body);
      
      const testResult = await testAppleCalendarConnection(
        validatedData.appleId,
        validatedData.appPassword
      );
      
      if (!testResult.success) {
        return res.status(400).json({ error: testResult.error || "Connection failed" });
      }
      
      await saveAppleCalendarCredentials(
        userId,
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
      const userId = req.user.claims?.sub || req.user.id;
      await deleteAppleCalendarCredentials(userId);
      res.json({ success: true, message: "Apple Calendar disconnected" });
    } catch (error) {
      console.error("Error disconnecting Apple Calendar:", error);
      res.status(500).json({ error: "Failed to disconnect Apple Calendar" });
    }
  });

  app.get("/api/apple-calendar/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const events = await getAppleCalendarEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching Apple Calendar events:", error);
      res.status(500).json({ error: "Failed to fetch Apple Calendar events" });
    }
  });

  app.get("/api/apple-calendar/month/:year/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const events = await getAppleCalendarEventsForMonth(userId, year, month);
      res.json(events);
    } catch (error) {
      console.error("Error fetching Apple Calendar month events:", error);
      res.status(500).json({ error: "Failed to fetch Apple Calendar events" });
    }
  });

  // Integration status endpoint - returns connection status for all apps
  app.get("/api/integrations/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      const [
        gmailConnected,
        calendarConnected, 
        zoomConnected, 
        slackBotConnected,
        slackUserConnected,
        appleCalendarConnected,
        asanaSystemConnected,
        asanaUserConnected,
        perkvilleConnected,
        userIntegrations,
        disabledIntegrations
      ] = await Promise.all([
        isGmailConnectedForUser(userId).catch(() => false),
        isCalendarConnected().catch(() => false),
        isZoomConnected().catch(() => false),
        isSlackConnected().catch(() => false),
        isUserSlackConnected(userId).catch(() => false),
        isAppleCalendarConnected(userId).catch(() => false),
        isAsanaConnected().catch(() => false),
        isUserAsanaConnected(userId).catch(() => false),
        isUserPerkvilleConnected(userId).catch(() => false),
        storage.getUserIntegrations(userId).catch(() => []),
        storage.getUserDisabledIntegrations(userId).catch((): string[] => []),
      ]);

      const calendlyKey = userIntegrations.find(i => i.integrationName === 'calendly');
      const typeformKey = userIntegrations.find(i => i.integrationName === 'typeform');

      // Check if integration is disabled by user
      const isEnabled = (name: string, connected: boolean) => 
        connected && !disabledIntegrations.includes(name);

      res.json({
        gmail: isEnabled('gmail', gmailConnected),
        "google-calendar": isEnabled('google-calendar', calendarConnected),
        zoom: isEnabled('zoom', zoomConnected),
        slack: isEnabled('slack', slackUserConnected || slackBotConnected),
        "apple-calendar": isEnabled('apple-calendar', appleCalendarConnected),
        asana: isEnabled('asana', asanaUserConnected || asanaSystemConnected),
        calendly: isEnabled('calendly', !!calendlyKey),
        typeform: isEnabled('typeform', !!typeformKey),
        perkville: isEnabled('perkville', perkvilleConnected),
        "qr-tiger": isQrTigerConfigured(),
      });
    } catch (error) {
      console.error("Error checking integration status:", error);
      res.json({
        gmail: false,
        "google-calendar": false,
        zoom: false,
        slack: false,
        "apple-calendar": false,
        asana: false,
        calendly: false,
        typeform: false,
        perkville: false,
        "qr-tiger": false,
      });
    }
  });

  // Save API key for integrations (Calendly, Typeform)
  app.post("/api/integrations/api-key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = integrationApiKeySchema.parse(req.body);
      
      await storage.saveIntegrationApiKey(userId, validatedData.integrationName, validatedData.apiKey);
      res.json({ success: true, message: `${validatedData.integrationName} connected successfully` });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error saving integration API key:", error);
        res.status(500).json({ error: "Failed to save API key" });
      }
    }
  });

  // Delete API key for integrations or disable system-level integrations
  // Support both DELETE and POST for disconnect
  const systemLevelIntegrations = ['google-calendar', 'zoom', 'asana'];
  
  const handleIntegrationDisconnect = async (req: any, res: any) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { integrationName } = req.params;
      
      // For system-level integrations, add to disabled list
      if (systemLevelIntegrations.includes(integrationName)) {
        await storage.disableIntegration(userId, integrationName);
      } else {
        // For API-key integrations, delete the key
        await storage.deleteIntegrationApiKey(userId, integrationName);
      }
      
      res.json({ success: true, message: `${integrationName} disconnected` });
    } catch (error) {
      console.error("Error disconnecting integration:", error);
      res.status(500).json({ error: "Failed to disconnect integration" });
    }
  };
  
  // Re-enable a disabled integration
  app.post("/api/integrations/:integrationName/enable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { integrationName } = req.params;
      
      await storage.enableIntegration(userId, integrationName);
      res.json({ success: true, message: `${integrationName} enabled` });
    } catch (error) {
      console.error("Error enabling integration:", error);
      res.status(500).json({ error: "Failed to enable integration" });
    }
  });
  
  app.delete("/api/integrations/:integrationName/disconnect", isAuthenticated, handleIntegrationDisconnect);
  app.post("/api/integrations/:integrationName/disconnect", isAuthenticated, handleIntegrationDisconnect);

  // Asana integration endpoints
  app.get("/api/asana/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      // Check user OAuth first, then fall back to system connector
      if (userId) {
        const userConnected = await isUserAsanaConnected(userId);
        if (userConnected) {
          return res.json({ connected: true, type: 'user' });
        }
      }
      const systemConnected = await isAsanaConnected();
      res.json({ connected: systemConnected, type: 'system' });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/asana/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserAsanaConnected(userId);
        if (userConnected) {
          const tasks = await getUserMyTasks(userId, 20);
          return res.json(tasks);
        }
      }
      
      // Fall back to system connector
      const tasks = await getMyTasks(20);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching Asana tasks:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Asana tasks" });
    }
  });

  app.get("/api/asana/tasks/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const days = parseInt(req.query.days as string) || 7;
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserAsanaConnected(userId);
        if (userConnected) {
          const tasks = await getUserUpcomingTasks(userId, days, 20);
          return res.json(tasks);
        }
      }
      
      // Fall back to system connector
      const tasks = await getUpcomingTasks(days, 20);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching upcoming Asana tasks:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Asana tasks" });
    }
  });

  app.get("/api/asana/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Use user token if available
      if (userId) {
        const userConnected = await isUserAsanaConnected(userId);
        if (userConnected) {
          const projects = await getUserProjects(userId, 20);
          return res.json(projects);
        }
      }
      
      // Fall back to system connector
      const projects = await getProjects(20);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching Asana projects:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to fetch Asana projects" });
    }
  });

  // ============== CHAT SYSTEM ROUTES ==============

  // Get WebSocket auth token (secure token-based auth for WS connections)
  app.get("/api/chat/ws-token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const token = generateWsAuthToken(userId);
      res.json({ token });
    } catch (error) {
      console.error("Error generating WS token:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // Get all conversations for current user
  app.get("/api/chat/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get unread message count
  app.get("/api/chat/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Create a new conversation
  app.post("/api/chat/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { participantIds, name, isGroup } = createConversationSchema.parse(req.body);
      
      // Include current user in participants
      const allParticipants = Array.from(new Set([userId, ...participantIds]));
      
      // For 1:1 DMs, check if conversation already exists
      if (!isGroup && allParticipants.length === 2) {
        const existing = await storage.findExistingDM(userId, participantIds[0]);
        if (existing) {
          const conversations = await storage.getUserConversations(userId);
          const fullConvo = conversations.find(c => c.id === existing.id);
          return res.json(fullConvo || existing);
        }
      }
      
      const conversation = await storage.createConversation(allParticipants, name, isGroup);
      const fullConvo = (await storage.getUserConversations(userId)).find(c => c.id === conversation.id);
      res.status(201).json(fullConvo || conversation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  });

  // Get messages for a conversation
  app.get("/api/chat/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const conversationId = parseInt(req.params.id);
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Verify user is in conversation
      const isParticipant = await storage.isUserInConversation(userId, conversationId);
      if (!isParticipant) {
        return res.status(403).json({ error: "Not a participant of this conversation" });
      }
      
      const messages = await storage.getConversationMessages(conversationId, limit, before);
      
      // Mark as read
      await storage.markConversationRead(userId, conversationId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { conversationId, recipientId, parentId, content } = sendMessageSchema.parse(req.body);
      
      let targetConversationId = conversationId;
      
      // If recipientId is provided, find or create the DM conversation
      if (!targetConversationId && recipientId) {
        let conversation = await storage.findExistingDM(userId, recipientId);
        if (!conversation) {
          conversation = await storage.createConversation([userId, recipientId]);
        }
        targetConversationId = conversation.id;
      }
      
      if (!targetConversationId) {
        return res.status(400).json({ error: "Either conversationId or recipientId is required" });
      }
      
      // Verify user is in conversation
      const isParticipant = await storage.isUserInConversation(userId, targetConversationId);
      if (!isParticipant) {
        return res.status(403).json({ error: "Not a participant of this conversation" });
      }
      
      const message = await storage.sendMessage(targetConversationId, userId, content, parentId);
      
      // Broadcast to all participants
      const participants = await storage.getConversationParticipants(targetConversationId);
      const sender = await storage.getUser(userId);
      broadcastToUsers(
        participants.map(p => p.id),
        { 
          type: "new_message", 
          message,
          conversationId: targetConversationId,
          parentId,
          sender: sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, email: sender.email } : null
        }
      );
      
      res.status(201).json(message);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || "Validation failed" });
      } else {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Get thread replies
  app.get("/api/chat/messages/:id/replies", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const replies = await storage.getThreadReplies(parentId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching thread replies:", error);
      res.status(500).json({ error: "Failed to fetch thread replies" });
    }
  });

  // Get list of users for starting new conversations
  app.get("/api/chat/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const allUsers = await storage.getAllUsers();
      // Filter out current user and remove sensitive fields
      const users = allUsers
        .filter(u => u.id !== userId)
        .map(({ passwordHash, ...user }) => user);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // User preferences endpoints
  app.get("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const prefs = await storage.getUserPreferences(userId);
      
      const defaults = {
        googleCalendarColor: "#3b82f6",
        appleCalendarColor: "#22c55e",
        zoomColor: "#a855f7",
        theme: "light",
        notifyGmail: true,
        notifySlack: true,
        notifyCalendar: true,
        notifyZoom: true,
        notifyAsana: true,
        notifyChat: true,
        notifyInApp: true,
        notifyEmail: false,
        notifySound: true,
        notificationSoundType: "chime",
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        showOnlineStatus: true,
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        firstDayOfWeek: "sunday"
      };
      
      if (!prefs) {
        return res.json(defaults);
      }
      
      res.json({
        googleCalendarColor: prefs.googleCalendarColor ?? defaults.googleCalendarColor,
        appleCalendarColor: prefs.appleCalendarColor ?? defaults.appleCalendarColor,
        zoomColor: prefs.zoomColor ?? defaults.zoomColor,
        theme: prefs.theme ?? defaults.theme,
        notifyGmail: prefs.notifyGmail ?? defaults.notifyGmail,
        notifySlack: prefs.notifySlack ?? defaults.notifySlack,
        notifyCalendar: prefs.notifyCalendar ?? defaults.notifyCalendar,
        notifyZoom: prefs.notifyZoom ?? defaults.notifyZoom,
        notifyAsana: prefs.notifyAsana ?? defaults.notifyAsana,
        notifyChat: prefs.notifyChat ?? defaults.notifyChat,
        notifyInApp: prefs.notifyInApp ?? defaults.notifyInApp,
        notifyEmail: prefs.notifyEmail ?? defaults.notifyEmail,
        notifySound: prefs.notifySound ?? defaults.notifySound,
        notificationSoundType: prefs.notificationSoundType ?? defaults.notificationSoundType,
        quietHoursEnabled: prefs.quietHoursEnabled ?? defaults.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart ?? defaults.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd ?? defaults.quietHoursEnd,
        showOnlineStatus: prefs.showOnlineStatus ?? defaults.showOnlineStatus,
        timezone: prefs.timezone ?? defaults.timezone,
        dateFormat: prefs.dateFormat ?? defaults.dateFormat,
        firstDayOfWeek: prefs.firstDayOfWeek ?? defaults.firstDayOfWeek
      });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.get("/api/typeform/forms", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      const forms = await getTypeformForms(accessToken);
      res.json(forms);
    } catch (error: any) {
      console.error("[Typeform] Error fetching forms:", error);
      res.status(500).json({ error: error.message || "Failed to fetch forms" });
    }
  });

  app.get("/api/typeform/forms/:formId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      const form = await getTypeformForm(accessToken, req.params.formId);
      res.json(form);
    } catch (error: any) {
      console.error("[Typeform] Error fetching form:", error);
      res.status(500).json({ error: error.message || "Failed to fetch form" });
    }
  });

  app.post("/api/typeform/forms", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const form = await createTypeformForm(accessToken, title);
      res.status(201).json(form);
    } catch (error: any) {
      console.error("[Typeform] Error creating form:", error);
      res.status(500).json({ error: error.message || "Failed to create form" });
    }
  });

  app.put("/api/typeform/forms/:formId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      const form = await updateTypeformForm(accessToken, req.params.formId, req.body);
      res.json(form);
    } catch (error: any) {
      console.error("[Typeform] Error updating form:", error);
      res.status(500).json({ error: error.message || "Failed to update form" });
    }
  });

  app.delete("/api/typeform/forms/:formId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      await deleteTypeformForm(accessToken, req.params.formId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Typeform] Error deleting form:", error);
      res.status(500).json({ error: error.message || "Failed to delete form" });
    }
  });

  app.get("/api/typeform/forms/:formId/responses", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const accessToken = process.env.TYPEFORM_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(401).json({ error: "Typeform not configured" });
      }
      
      const responses = await getTypeformResponses(accessToken, req.params.formId, {
        pageSize: 100,
      });
      res.json(responses);
    } catch (error: any) {
      console.error("[Typeform] Error fetching responses:", error);
      res.status(500).json({ error: error.message || "Failed to fetch responses" });
    }
  });

  app.patch("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const {
        googleCalendarColor, appleCalendarColor, zoomColor, theme,
        notifyGmail, notifySlack, notifyCalendar, notifyZoom, notifyAsana, notifyChat,
        notifyInApp, notifyEmail, notifySound, notificationSoundType,
        quietHoursEnabled, quietHoursStart, quietHoursEnd,
        showOnlineStatus, timezone, dateFormat, firstDayOfWeek
      } = req.body;
      
      const updates: Record<string, any> = {};
      if (googleCalendarColor !== undefined) updates.googleCalendarColor = googleCalendarColor;
      if (appleCalendarColor !== undefined) updates.appleCalendarColor = appleCalendarColor;
      if (zoomColor !== undefined) updates.zoomColor = zoomColor;
      if (theme !== undefined) updates.theme = theme;
      if (notifyGmail !== undefined) updates.notifyGmail = notifyGmail;
      if (notifySlack !== undefined) updates.notifySlack = notifySlack;
      if (notifyCalendar !== undefined) updates.notifyCalendar = notifyCalendar;
      if (notifyZoom !== undefined) updates.notifyZoom = notifyZoom;
      if (notifyAsana !== undefined) updates.notifyAsana = notifyAsana;
      if (notifyChat !== undefined) updates.notifyChat = notifyChat;
      if (notifyInApp !== undefined) updates.notifyInApp = notifyInApp;
      if (notifyEmail !== undefined) updates.notifyEmail = notifyEmail;
      if (notifySound !== undefined) updates.notifySound = notifySound;
      if (notificationSoundType !== undefined) updates.notificationSoundType = notificationSoundType;
      if (quietHoursEnabled !== undefined) updates.quietHoursEnabled = quietHoursEnabled;
      if (quietHoursStart !== undefined) updates.quietHoursStart = quietHoursStart;
      if (quietHoursEnd !== undefined) updates.quietHoursEnd = quietHoursEnd;
      if (showOnlineStatus !== undefined) updates.showOnlineStatus = showOnlineStatus;
      if (timezone !== undefined) updates.timezone = timezone;
      if (dateFormat !== undefined) updates.dateFormat = dateFormat;
      if (firstDayOfWeek !== undefined) updates.firstDayOfWeek = firstDayOfWeek;
      
      const prefs = await storage.updateUserPreferences(userId, updates);
      
      res.json({
        googleCalendarColor: prefs.googleCalendarColor,
        appleCalendarColor: prefs.appleCalendarColor,
        zoomColor: prefs.zoomColor,
        theme: prefs.theme,
        notifyGmail: prefs.notifyGmail,
        notifySlack: prefs.notifySlack,
        notifyCalendar: prefs.notifyCalendar,
        notifyZoom: prefs.notifyZoom,
        notifyAsana: prefs.notifyAsana,
        notifyChat: prefs.notifyChat,
        notifyInApp: prefs.notifyInApp,
        notifyEmail: prefs.notifyEmail,
        notifySound: prefs.notifySound,
        notificationSoundType: prefs.notificationSoundType,
        quietHoursEnabled: prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
        showOnlineStatus: prefs.showOnlineStatus,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        firstDayOfWeek: prefs.firstDayOfWeek
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // =============================================================================
  // PROJECT MANAGEMENT ROUTES
  // =============================================================================

  // Get all projects for user
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const projects = await storage.getUserProjects(userId, tenantId);
      
      // Get task stats for all projects from task_projects table
      const projectIds = projects.map(p => p.id);
      const stats = await storage.getProjectTaskStats(projectIds);
      
      // Merge stats into projects
      const projectsWithStats = projects.map(p => ({
        ...p,
        taskCount: stats[p.id]?.total ?? 0,
        completedCount: stats[p.id]?.completed ?? 0,
      }));
      
      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Create project
  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const validatedData = createProjectSchema.parse(req.body);
      
      const project = await storage.createProject({
        ...validatedData,
        ownerId: userId,
        tenantId,
      });
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating project:", error);
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  // Get single project with columns
  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const columns = await storage.getProjectColumns(projectId);
      const tasks = await storage.getProjectTasks(projectId);
      const members = await storage.getProjectMembers(projectId);
      const labels = await storage.getProjectLabels(projectId);
      
      // Add subtask counts to each task
      const tasksWithSubtaskCounts = await Promise.all(
        tasks.map(async (task) => {
          const subtasks = await storage.getTaskSubtasks(task.id);
          return {
            ...task,
            subtaskCount: subtasks.length,
            completedSubtaskCount: subtasks.filter(s => s.isCompleted).length,
          };
        })
      );
      
      res.json({ ...project, columns, tasks: tasksWithSubtaskCounts, members, labels });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.updateProject(projectId, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Project columns
  app.post("/api/projects/:id/columns", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, color } = req.body;
      const column = await storage.createProjectColumn({ projectId, name, color });
      res.status(201).json(column);
    } catch (error) {
      console.error("Error creating column:", error);
      res.status(500).json({ error: "Failed to create column" });
    }
  });

  app.patch("/api/columns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const columnId = parseInt(req.params.id);
      const column = await storage.updateProjectColumn(columnId, req.body);
      res.json(column);
    } catch (error) {
      console.error("Error updating column:", error);
      res.status(500).json({ error: "Failed to update column" });
    }
  });

  app.delete("/api/columns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const columnId = parseInt(req.params.id);
      await storage.deleteProjectColumn(columnId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting column:", error);
      res.status(500).json({ error: "Failed to delete column" });
    }
  });

  app.post("/api/projects/:id/columns/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { columnIds } = req.body;
      await storage.reorderProjectColumns(projectId, columnIds);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error reordering columns:", error);
      res.status(500).json({ error: "Failed to reorder columns" });
    }
  });

  // Project members
  app.get("/api/projects/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/projects/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userId, role } = req.body;
      const member = await storage.addProjectMember(projectId, userId, role);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  app.delete("/api/projects/:id/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.params.userId;
      await storage.removeProjectMember(projectId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  // Project labels
  app.post("/api/projects/:id/labels", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, color } = req.body;
      const label = await storage.createProjectLabel(projectId, name, color);
      res.status(201).json(label);
    } catch (error) {
      console.error("Error creating label:", error);
      res.status(500).json({ error: "Failed to create label" });
    }
  });

  app.delete("/api/labels/:id", isAuthenticated, async (req: any, res) => {
    try {
      const labelId = parseInt(req.params.id);
      await storage.deleteProjectLabel(labelId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting label:", error);
      res.status(500).json({ error: "Failed to delete label" });
    }
  });

  // =============================================================================
  // ASANA IMPORT ROUTES
  // =============================================================================

  // Get Asana projects available for import
  app.get("/api/import/asana/projects", isAuthenticated, async (req: any, res) => {
    try {
      const projects = await getAsanaProjectsForImport();
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching Asana projects for import:", error);
      res.status(500).json({ error: error.message || "Failed to fetch Asana projects" });
    }
  });

  // Import a single Asana project
  app.post("/api/import/asana/project/:asanaProjectId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const asanaProjectId = req.params.asanaProjectId;
      
      // Get project details from the request body or fetch from Asana
      const { name, color, notes } = req.body;
      
      // Map Asana color to hex color
      const colorMap: Record<string, string> = {
        'dark-pink': '#e8384f',
        'dark-green': '#4a7c59',
        'dark-blue': '#4186e0',
        'dark-red': '#e8384f',
        'dark-teal': '#2d9d9d',
        'dark-brown': '#8d6e63',
        'dark-orange': '#fd612c',
        'dark-purple': '#7c4dff',
        'dark-warm-gray': '#8da3a6',
        'light-pink': '#ff9eb1',
        'light-green': '#62d26f',
        'light-blue': '#80caff',
        'light-red': '#ff8d85',
        'light-teal': '#4ecbc4',
        'light-yellow': '#f8df72',
        'light-orange': '#ffbe5c',
        'light-purple': '#d4b0ff',
        'light-warm-gray': '#c7c4c4',
      };
      const projectColor = color ? (colorMap[color] || '#3b82f6') : '#3b82f6';
      
      // Create the project in our system (skip default columns - we'll create from Asana sections)
      const project = await storage.createProject({
        name: name || 'Imported Project',
        description: notes || null,
        color: projectColor,
        ownerId: userId,
        tenantId,
      }, { skipDefaultColumns: true });
      
      // Fetch sections (columns) from Asana
      const sections = await getProjectSections(asanaProjectId);
      
      // Create columns, or use defaults if no sections
      const columnMap = new Map<string, number>();
      
      if (sections.length > 0) {
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const column = await storage.createProjectColumn({
            projectId: project.id,
            name: section.name,
            color: ['#e2e8f0', '#93c5fd', '#86efac', '#fcd34d'][i % 4],
            sortOrder: i,
          });
          columnMap.set(section.id, column.id);
        }
      } else {
        // Create default columns if no sections
        const defaultColumns = [
          { name: 'Tasks', color: '#f59e0b' },
          { name: 'In Progress', color: '#93c5fd' },
          { name: 'Done', color: '#86efac' },
          { name: 'Notes', color: '#d4b0ff' },
        ];
        for (let i = 0; i < defaultColumns.length; i++) {
          const column = await storage.createProjectColumn({
            projectId: project.id,
            name: defaultColumns[i].name,
            color: defaultColumns[i].color,
            sortOrder: i,
          });
          if (i === 0) columnMap.set('default', column.id);
        }
      }
      
      // Fetch tasks from Asana
      const asanaTasks = await getProjectTasksForImport(asanaProjectId);
      
      // Import tasks (skip completed tasks)
      let tasksImported = 0;
      for (const asanaTask of asanaTasks) {
        // Skip empty task names and completed tasks
        if (!asanaTask.name || asanaTask.name.trim() === '') continue;
        if (asanaTask.completed) continue;
        
        // Find the column for this task
        let columnId = asanaTask.sectionId ? columnMap.get(asanaTask.sectionId) : null;
        if (!columnId) {
          // Use first column as default
          columnId = columnMap.values().next().value;
        }
        
        const task = await storage.createTask({
          projectId: project.id,
          columnId: columnId || null,
          title: asanaTask.name,
          description: asanaTask.notes || null,
          priority: 'medium',
          dueDate: asanaTask.dueOn ? new Date(asanaTask.dueOn) : undefined,
          isCompleted: asanaTask.completed,
          creatorId: userId,
          tenantId,
        });
        
        // Add task to project with placement (for board view)
        await storage.addTaskToProject({
          tenantId: tenantId || "default",
          taskId: task.id,
          projectId: project.id,
          columnId: columnId || null,
          sortOrder: tasksImported,
          addedBy: userId,
        });
        
        tasksImported++;
      }
      
      res.json({
        success: true,
        project: project,
        tasksImported,
        columnsCreated: columnMap.size,
      });
    } catch (error: any) {
      console.error("Error importing Asana project:", error);
      res.status(500).json({ error: error.message || "Failed to import project" });
    }
  });

  // =============================================================================
  // TASK MANAGEMENT ROUTES
  // =============================================================================

  // Get all tasks for user
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const tasks = await storage.getUserTasks(userId, tenantId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get all tasks across all projects for user
  app.get("/api/tasks/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const tasks = await storage.getAllUserTasks(userId, tenantId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get upcoming tasks (for dashboard)
  app.get("/api/tasks/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const days = parseInt(req.query.days as string) || 7;
      const tasks = await storage.getUpcomingTasks(userId, days);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error);
      res.status(500).json({ error: "Failed to fetch upcoming tasks" });
    }
  });

  // Create task
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const validatedData = createTaskSchema.parse(req.body);
      
      const task = await storage.createTask({
        ...validatedData,
        creatorId: userId,
        tenantId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        recurrenceEndDate: validatedData.recurrenceEndDate ? new Date(validatedData.recurrenceEndDate) : undefined,
      });
      
      // Add task to project with placement (for board view)
      if (validatedData.projectId) {
        await storage.addTaskToProject({
          tenantId: tenantId || "default",
          taskId: task.id,
          projectId: validatedData.projectId,
          columnId: validatedData.columnId ?? null,
          sortOrder: 0,
          addedBy: userId,
        });
      }
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  // Get single task with subtasks and comments
  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const subtasks = await storage.getTaskSubtasks(taskId);
      const comments = await storage.getTaskComments(taskId);
      
      res.json({ ...task, subtasks, comments });
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const validatedData = updateTaskSchema.parse(req.body);
      
      // Get original task to check if assignee changed
      const originalTask = await storage.getTask(taskId);
      
      const updateData: any = { ...validatedData };
      if (validatedData.dueDate !== undefined) {
        updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
      }
      if (validatedData.recurrenceEndDate !== undefined) {
        updateData.recurrenceEndDate = validatedData.recurrenceEndDate ? new Date(validatedData.recurrenceEndDate) : null;
      }
      
      const task = await storage.updateTask(taskId, updateData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Send notification if task was assigned to someone new
      if (validatedData.assigneeId && 
          validatedData.assigneeId !== originalTask?.assigneeId &&
          validatedData.assigneeId !== req.user.id) {
        // Get assignee details and notification preferences
        const assignee = await storage.getUser(validatedData.assigneeId);
        const prefs = await storage.getNotificationPreferences(validatedData.assigneeId);
        
        if (assignee?.email && (prefs?.emailTaskAssigned !== false)) {
          // Get project name
          const project = task.projectId ? await storage.getProject(task.projectId) : null;
          const projectName = project?.name || 'No Project';
          const assignerName = req.user.firstName || req.user.email?.split('@')[0] || 'Someone';
          const baseUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000';
          const taskUrl = `${baseUrl}/projects/${task.projectId}`;
          
          // Send email notification (async, don't block response)
          sendTaskAssignedNotification(
            assignee.email,
            task.title,
            projectName,
            assignerName,
            taskUrl,
            task.dueDate?.toLocaleDateString(),
            task.priority || undefined
          ).then(sent => {
            if (sent) {
              // Log the notification
              storage.logNotification({
                userId: validatedData.assigneeId!,
                type: 'task_assigned',
                title: `New task: ${task.title}`,
                message: `You were assigned to "${task.title}" by ${assignerName}`,
                metadata: { taskId: task.id, projectId: task.projectId },
                sentVia: 'email'
              });
            }
          });
        }
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
      }
    }
  });

  // Move task (drag and drop)
  app.post("/api/tasks/:id/move", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { columnId, sortOrder } = req.body;
      const task = await storage.moveTask(taskId, columnId, sortOrder);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error moving task:", error);
      res.status(500).json({ error: "Failed to move task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // =============================================================================
  // TASK PLACEMENT ROUTES (Asana-style multi-homing)
  // =============================================================================

  app.patch("/api/tasks/:id/placement", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.id);

      const { projectId, columnId, sortOrder, orderKey } = req.body ?? {};
      if (!projectId) {
        return res.status(400).json({ error: "PROJECT_ID_REQUIRED" });
      }

      await storage.updateTaskPlacement({
        tenantId,
        taskId,
        projectId: Number(projectId),
        columnId: columnId === null || columnId === undefined ? null : Number(columnId),
        sortOrder: sortOrder === undefined ? undefined : Number(sortOrder),
        orderKey: orderKey ?? null,
        movedBy: userId,
      });

      res.json({ ok: true });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "TASK_NOT_IN_PROJECT") {
        return res.status(404).json({ error: "TASK_NOT_IN_PROJECT" });
      }
      console.error("Error updating task placement:", e);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  });

  // Add task to project
  app.post("/api/tasks/:id/projects", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.id);

      const { projectId, columnId, sortOrder } = req.body ?? {};
      if (!projectId) {
        return res.status(400).json({ error: "PROJECT_ID_REQUIRED" });
      }

      await storage.addTaskToProject({
        tenantId,
        taskId,
        projectId: Number(projectId),
        columnId: columnId != null ? Number(columnId) : null,
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        addedBy: userId,
      });

      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Error adding task to project:", error);
      res.status(500).json({ error: "Failed to add task to project" });
    }
  });

  // Get projects a task belongs to (multi-homing)
  app.get("/api/tasks/:id/projects", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.id);

      const taskProjects = await storage.getTaskProjects(taskId, tenantId);
      res.json(taskProjects);
    } catch (error) {
      console.error("Error fetching task projects:", error);
      res.status(500).json({ error: "Failed to fetch task projects" });
    }
  });

  // Remove task from project
  app.delete("/api/tasks/:taskId/projects/:projectId", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.taskId);
      const projectId = parseInt(req.params.projectId);

      await storage.removeTaskFromProject({
        tenantId,
        taskId,
        projectId,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing task from project:", error);
      res.status(500).json({ error: "Failed to remove task from project" });
    }
  });

  // =============================================================================
  // TASK STORIES ROUTES (Unified comments + activity feed)
  // =============================================================================

  app.get("/api/tasks/:id/stories", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.id);

      const rawStories = await storage.getTaskStories(taskId, tenantId);
      
      const storiesWithCreator = await Promise.all(
        rawStories.map(async (story) => {
          let creator = null;
          if (story.authorId) {
            const user = await storage.getUser(story.authorId);
            creator = user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null;
          }
          return {
            id: story.id,
            taskId,
            storyType: story.storyType,
            content: story.body || "",
            activityType: story.activityType,
            metadata: story.activityPayload,
            createdBy: story.authorId,
            createdAt: story.createdAt,
            creator,
          };
        })
      );
      
      res.json(storiesWithCreator);
    } catch (error) {
      console.error("Error fetching task stories:", error);
      res.status(500).json({ error: "Failed to fetch task stories" });
    }
  });

  app.post("/api/tasks/:id/comments", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.tenantId as string;
      const taskId = parseInt(req.params.id);
      const { content, body } = req.body ?? {};
      const commentBody = content || body;
      
      if (!commentBody) {
        return res.status(400).json({ error: "CONTENT_REQUIRED" });
      }

      const created = await storage.createTaskStoryComment({
        tenantId,
        taskId,
        authorId: userId,
        body: String(commentBody),
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // =============================================================================
  // PROJECT BOARD ROUTE (Placement-aware)
  // =============================================================================

  app.get("/api/projects/:projectId/board", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId as string | null;
      const projectId = parseInt(req.params.projectId);

      const columns = await storage.getProjectColumns(projectId);
      const placements = await storage.getProjectTaskPlacements(projectId, tenantId);

      const byColumn: Record<string, unknown[]> = {};
      for (const row of placements) {
        const key = row.columnId == null ? "null" : String(row.columnId);
        if (!byColumn[key]) byColumn[key] = [];
        byColumn[key].push({
          ...row.task,
          placement: {
            projectId: row.projectId,
            columnId: row.columnId,
            sortOrder: row.sortOrder,
            orderKey: row.orderKey,
          },
        });
      }

      res.json({
        columns,
        tasksByColumn: byColumn,
      });
    } catch (error) {
      console.error("Error fetching project board:", error);
      res.status(500).json({ error: "Failed to fetch project board" });
    }
  });

  // =============================================================================
  // SUBTASK ROUTES
  // =============================================================================

  app.get("/api/tasks/:id/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const subtasks = await storage.getTaskSubtasks(taskId);
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Subtask] Creating subtask with data:", req.body);
      const validatedData = createSubtaskSchema.parse(req.body);
      console.log("[Subtask] Validated data:", validatedData);
      const subtask = await storage.createSubtask(validatedData);
      console.log("[Subtask] Created subtask:", subtask);
      res.status(201).json(subtask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[Subtask] Validation error:", error.errors);
        res.status(400).json({ error: error.errors });
      } else {
        console.error("[Subtask] Error creating subtask:", error);
        res.status(500).json({ error: "Failed to create subtask" });
      }
    }
  });

  app.patch("/api/subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const subtask = await storage.updateSubtask(subtaskId, req.body);
      res.json(subtask);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.post("/api/subtasks/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const subtask = await storage.toggleSubtask(subtaskId);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      res.json(subtask);
    } catch (error) {
      console.error("Error toggling subtask:", error);
      res.status(500).json({ error: "Failed to toggle subtask" });
    }
  });

  app.delete("/api/subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      await storage.deleteSubtask(subtaskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subtask:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  // =============================================================================
  // TASK COMMENT ROUTES
  // =============================================================================

  app.get("/api/tasks/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = createCommentSchema.parse(req.body);
      const comment = await storage.createTaskComment(validatedData.taskId, userId, validatedData.content);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating comment:", error);
        res.status(500).json({ error: "Failed to create comment" });
      }
    }
  });

  app.patch("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { content } = req.body;
      const comment = await storage.updateTaskComment(commentId, content);
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      await storage.deleteTaskComment(commentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // =============================================================================
  // NOTIFICATION PREFERENCE ROUTES
  // =============================================================================

  app.get("/api/notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const prefs = await storage.getNotificationPreferences(userId);
      
      // Return default preferences if none exist
      if (!prefs) {
        return res.json({
          emailTaskAssigned: true,
          emailDueDate: true,
          emailCalendarConflicts: true,
          emailDigest: false,
          digestFrequency: 'daily'
        });
      }
      
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.put("/api/notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = updateNotificationPrefsSchema.parse(req.body);
      const prefs = await storage.updateNotificationPreferences(userId, validatedData);
      res.json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating notification preferences:", error);
        res.status(500).json({ error: "Failed to update notification preferences" });
      }
    }
  });

  app.get("/api/notifications/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getNotificationLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      res.status(500).json({ error: "Failed to fetch notification logs" });
    }
  });

  // =============================================================================
  // TIME TRACKING ROUTES
  // =============================================================================

  // Get all time entries for user
  app.get("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const entries = await storage.getUserTimeEntries(userId, startDate, endDate);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Get active timer for user
  app.get("/api/time-entries/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const entry = await storage.getActiveTimeEntry(userId);
      res.json(entry || null);
    } catch (error) {
      console.error("Error fetching active timer:", error);
      res.status(500).json({ error: "Failed to fetch active timer" });
    }
  });

  // Get time entries for a specific task
  app.get("/api/tasks/:id/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const entries = await storage.getTaskTimeEntries(taskId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching task time entries:", error);
      res.status(500).json({ error: "Failed to fetch task time entries" });
    }
  });

  // Get time entries for a project
  app.get("/api/projects/:id/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const entries = await storage.getProjectTimeEntries(projectId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching project time entries:", error);
      res.status(500).json({ error: "Failed to fetch project time entries" });
    }
  });

  // Start a timer (create time entry)
  app.post("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const validatedData = createTimeEntrySchema.parse(req.body);
      
      // Stop any existing active timer first
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (activeEntry) {
        await storage.stopTimeEntry(activeEntry.id);
      }
      
      const entry = await storage.createTimeEntry({
        ...validatedData,
        userId,
        startTime: new Date(validatedData.startTime),
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
      });
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating time entry:", error);
        res.status(500).json({ error: "Failed to create time entry" });
      }
    }
  });

  // Stop the active timer
  app.post("/api/time-entries/:id/stop", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const entry = await storage.stopTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error stopping timer:", error);
      res.status(500).json({ error: "Failed to stop timer" });
    }
  });

  // Update time entry
  app.patch("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const validatedData = updateTimeEntrySchema.parse(req.body);
      
      const updateData: any = { ...validatedData };
      if (validatedData.endTime) {
        updateData.endTime = new Date(validatedData.endTime);
      }
      
      const entry = await storage.updateTimeEntry(entryId, updateData);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating time entry:", error);
        res.status(500).json({ error: "Failed to update time entry" });
      }
    }
  });

  // Delete time entry
  app.delete("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      await storage.deleteTimeEntry(entryId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // =============================================================================
  // TASK TEMPLATES ROUTES
  // =============================================================================

  app.get("/api/task-templates", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const templates = await storage.getTaskTemplates(userId, tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ error: "Failed to fetch task templates" });
    }
  });

  app.get("/api/task-templates/:id", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const templateId = parseInt(req.params.id);
      const template = await storage.getTaskTemplate(templateId, userId, tenantId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching task template:", error);
      res.status(500).json({ error: "Failed to fetch task template" });
    }
  });

  app.post("/api/task-templates", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const { createTaskTemplateSchema } = await import("@shared/schema");
      const validatedData = createTaskTemplateSchema.parse(req.body);
      
      const template = await storage.createTaskTemplate({
        ...validatedData,
        creatorId: userId,
        tenantId: tenantId,
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating task template:", error);
        res.status(500).json({ error: "Failed to create task template" });
      }
    }
  });

  app.patch("/api/task-templates/:id", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const templateId = parseInt(req.params.id);
      const { updateTaskTemplateSchema } = await import("@shared/schema");
      const validatedData = updateTaskTemplateSchema.parse(req.body);
      
      const template = await storage.updateTaskTemplate(templateId, userId, tenantId, validatedData);
      if (!template) {
        return res.status(404).json({ error: "Template not found or access denied" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating task template:", error);
        res.status(500).json({ error: "Failed to update task template" });
      }
    }
  });

  app.delete("/api/task-templates/:id", isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const templateId = parseInt(req.params.id);
      const deleted = await storage.deleteTaskTemplate(templateId, userId, tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found or access denied" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ error: "Failed to delete task template" });
    }
  });

  // ==================== WEBHOOKS ====================
  
  const { createWebhookSchema, WebhookEvent } = await import("@shared/schema");
  const { triggerWebhook, testWebhook } = await import("./webhook-service");
  
  app.get("/api/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      const webhooks = await storage.getWebhooks(tenantId);
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.get("/api/webhooks/events", isAuthenticated, async (req: any, res) => {
    res.json({
      events: Object.entries(WebhookEvent).map(([key, value]) => ({
        id: value,
        name: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      })),
    });
  });

  app.get("/api/webhooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const tenantId = req.tenantId;
      const webhook = await storage.getWebhookPublic(webhookId, tenantId);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      res.json(webhook);
    } catch (error) {
      console.error("Error fetching webhook:", error);
      res.status(500).json({ error: "Failed to fetch webhook" });
    }
  });

  app.get("/api/webhooks/:id/deliveries", isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 20;
      const deliveries = await storage.getWebhookDeliveries(webhookId, limit);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching webhook deliveries:", error);
      res.status(500).json({ error: "Failed to fetch webhook deliveries" });
    }
  });

  app.post("/api/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const tenantId = req.tenantId;
      const validatedData = createWebhookSchema.parse(req.body);
      
      // Validate URL is HTTPS for security
      try {
        const url = new URL(validatedData.url);
        if (url.protocol !== "https:" && !url.hostname.includes("localhost") && !url.hostname.includes("replit")) {
          return res.status(400).json({ error: "Webhook URL must use HTTPS" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
      
      const webhook = await storage.createWebhook({
        ...validatedData,
        tenantId,
        createdBy: userId,
      });
      const { secret, ...publicWebhook } = webhook;
      res.status(201).json(publicWebhook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating webhook:", error);
        res.status(500).json({ error: "Failed to create webhook" });
      }
    }
  });

  app.patch("/api/webhooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const tenantId = req.tenantId;
      
      // First verify the webhook belongs to this tenant
      const existing = await storage.getWebhook(webhookId, tenantId);
      if (!existing) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      // Validate URL if being updated
      if (req.body.url) {
        try {
          const url = new URL(req.body.url);
          if (url.protocol !== "https:" && !url.hostname.includes("localhost") && !url.hostname.includes("replit")) {
            return res.status(400).json({ error: "Webhook URL must use HTTPS" });
          }
        } catch {
          return res.status(400).json({ error: "Invalid URL format" });
        }
      }
      
      const webhook = await storage.updateWebhook(webhookId, req.body);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      const { secret, ...publicWebhook } = webhook;
      res.json(publicWebhook);
    } catch (error) {
      console.error("Error updating webhook:", error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  app.delete("/api/webhooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const tenantId = req.tenantId;
      await storage.deleteWebhook(webhookId, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  app.post("/api/webhooks/:id/test", isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const tenantId = req.tenantId;
      const webhook = await storage.getWebhook(webhookId, tenantId);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      const result = await testWebhook(webhook.url, webhook.secret || undefined);
      res.json(result);
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  // Feedback endpoints
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;
      if (!userId || !tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { type, title, description } = req.body;
      if (!type || !title || !description) {
        return res.status(400).json({ error: "type, title, and description are required" });
      }
      if (!["bug", "feature"].includes(type)) {
        return res.status(400).json({ error: "type must be 'bug' or 'feature'" });
      }
      const entry = await storage.createFeedbackEntry({
        tenantId,
        userId,
        type,
        title,
        description,
      });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });

  app.get("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const entries = await storage.getFeedbackEntriesForTenant(tenantId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/feedback/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!["open", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updated = await storage.updateFeedbackStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback status:", error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });

  // Shared items endpoints (share emails/messages with team)
  app.post("/api/shared-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;
      if (!userId || !tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { itemType, itemId, title, preview, note, metadata } = req.body;
      if (!itemType || !itemId) {
        return res.status(400).json({ error: "itemType and itemId are required" });
      }
      if (!["email", "slack"].includes(itemType)) {
        return res.status(400).json({ error: "itemType must be 'email' or 'slack'" });
      }
      const item = await storage.createSharedItem({
        tenantId,
        sharedByUserId: userId,
        itemType,
        itemId,
        title,
        preview,
        note,
        metadata,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating shared item:", error);
      res.status(500).json({ error: "Failed to share item" });
    }
  });

  app.get("/api/shared-items", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const items = await storage.getSharedItems(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shared items:", error);
      res.status(500).json({ error: "Failed to fetch shared items" });
    }
  });

  app.delete("/api/shared-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      const id = parseInt(req.params.id);
      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await storage.deleteSharedItem(id, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shared item:", error);
      res.status(500).json({ error: "Failed to delete shared item" });
    }
  });

  // =============================================================================
  // QR TIGER ROUTES
  // =============================================================================

  app.get("/api/qr-tiger/status", isAuthenticated, async (req: any, res) => {
    try {
      res.json({ connected: isQrTigerConfigured() });
    } catch (error) {
      console.error("Error checking QR Tiger status:", error);
      res.status(500).json({ error: "Failed to check QR Tiger status" });
    }
  });

  app.get("/api/qr-tiger/codes", isAuthenticated, async (req: any, res) => {
    try {
      if (!isQrTigerConfigured()) {
        return res.status(400).json({ error: "QR Tiger not configured" });
      }
      const userId = req.user.claims.sub || req.user.id;
      const codes = await storage.getUserQrCodes(userId);
      res.json(codes.map(code => ({
        id: code.id,
        qrCodeId: code.qrCodeId,
        qrName: code.qrName,
        qrType: code.qrType,
        shortURL: code.shortUrl || "",
        qrImageUrl: code.qrImageUrl || "",
        scans: code.scans || 0,
        createdAt: code.createdAt?.toISOString() || new Date().toISOString(),
      })));
    } catch (error) {
      console.error("Error listing QR codes:", error);
      res.status(500).json({ error: "Failed to list QR codes" });
    }
  });

  app.post("/api/qr-tiger/codes", isAuthenticated, async (req: any, res) => {
    try {
      if (!isQrTigerConfigured()) {
        return res.status(400).json({ error: "QR Tiger not configured" });
      }
      const { name, destinationUrl, category, isDynamic, size, colorDark, backgroundColor, logoUrl } = req.body;
      const userId = req.user.claims.sub || req.user.id;
      
      if (!name || !destinationUrl) {
        return res.status(400).json({ error: "name and destinationUrl are required" });
      }

      const params = {
        name,
        destinationUrl,
        category: category || "general",
        size,
        colorDark,
        backgroundColor,
        logoUrl,
      };

      const result = isDynamic 
        ? await createDynamicQRCode(params)
        : await createStaticQRCode(params);
      
      const qrCodeId = result.qrId || result.id || `qr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const savedCode = await storage.createQrCode({
        userId,
        qrCodeId,
        qrName: name,
        qrType: isDynamic ? "dynamic" : "static",
        destinationUrl,
        shortUrl: result.url || null,
        qrImageUrl: result.data || null,
        category: category || "general",
        scans: 0,
      });
      
      res.status(201).json({
        id: savedCode.id,
        qrCodeId,
        qrName: name,
        qrType: isDynamic ? "dynamic" : "static",
        shortURL: result.url || "",
        qrImageUrl: result.data || "",
        scans: 0,
      });
    } catch (error) {
      console.error("Error creating QR code:", error);
      res.status(500).json({ error: "Failed to create QR code" });
    }
  });

  app.get("/api/qr-tiger/codes/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      if (!isQrTigerConfigured()) {
        return res.status(400).json({ error: "QR Tiger not configured" });
      }
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const analytics = await getQRCodeAnalytics(
        id,
        startDate ? parseInt(startDate as string) : undefined,
        endDate ? parseInt(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching QR code analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.delete("/api/qr-tiger/codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isQrTigerConfigured()) {
        return res.status(400).json({ error: "QR Tiger not configured" });
      }
      const { id } = req.params;
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid QR code ID" });
      }
      await storage.deleteQrCode(numericId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting QR code:", error);
      res.status(500).json({ error: "Failed to delete QR code" });
    }
  });

  // =============================================================================
  // YHCTIME ROUTES
  // =============================================================================

  app.get("/api/yhctime/status", isAuthenticated, async (req: any, res) => {
    try {
      res.json({ connected: yhcTimeClient.isConfigured() });
    } catch (error) {
      console.error("Error checking YHCTime status:", error);
      res.status(500).json({ error: "Failed to check YHCTime status" });
    }
  });

  app.get("/api/yhctime/current-status", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      const employees = await yhcTimeClient.getAllEmployeesStatus();
      res.json({ employees });
    } catch (error: any) {
      console.error("Error fetching all employees status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch employees status" });
    }
  });

  app.get("/api/yhctime/employees/:employeeId/status", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      const employeeId = parseInt(req.params.employeeId, 10);
      if (isNaN(employeeId)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      const status = await yhcTimeClient.getEmployeeStatus(employeeId);
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching employee status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch employee status" });
    }
  });

  app.get("/api/yhctime/sessions", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "start and end date parameters are required" });
      }
      
      const allSessions = await yhcTimeClient.getSessionHistory({ 
        start: start as string, 
        end: end as string 
      });
      
      // Get user to check if admin and get linked employee
      const user = await storage.getUser(req.user.id);
      
      // Admins see all sessions
      if (user?.isAdmin) {
        return res.json({ sessions: allSessions });
      }
      
      // Non-admins only see their own sessions if linked
      if (!user?.yhctimeEmployeeId) {
        return res.json({ sessions: [], notLinked: true });
      }
      
      // Filter sessions to only show the user's own entries
      const userSessions = allSessions.filter(
        session => session.employeeId === user.yhctimeEmployeeId
      );
      
      res.json({ sessions: userSessions });
    } catch (error: any) {
      console.error("Error fetching session history:", error);
      res.status(500).json({ error: error.message || "Failed to fetch session history" });
    }
  });

  app.post("/api/yhctime/sessions", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      
      const { employeeId, startTime, endTime, breakDuration, notes, idempotencyKey } = req.body;
      if (!employeeId || !startTime || !endTime) {
        return res.status(400).json({ error: "employeeId, startTime, and endTime are required" });
      }
      
      const session = await yhcTimeClient.createSession({
        employeeId,
        startTime,
        endTime,
        breakDuration,
        notes,
        idempotencyKey,
      });
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: error.message || "Failed to create session" });
    }
  });

  app.patch("/api/yhctime/sessions/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      const sessionId = parseInt(req.params.sessionId, 10);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const { startTime, endTime, breakDuration, notes } = req.body;
      const session = await yhcTimeClient.updateSession(sessionId, {
        startTime,
        endTime,
        breakDuration,
        notes,
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: error.message || "Failed to update session" });
    }
  });

  app.delete("/api/yhctime/sessions/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      if (!yhcTimeClient.isConfigured()) {
        return res.status(400).json({ error: "YHCTime not configured" });
      }
      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const result = await yhcTimeClient.deleteSession(sessionId);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: error.message || "Failed to delete session" });
    }
  });

  // Link current user to a YHCTime employee
  app.post("/api/yhctime/link-employee", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { employeeId, employeeName } = req.body;
      
      if (!employeeId || !employeeName) {
        return res.status(400).json({ error: "Employee ID and name are required" });
      }

      await storage.updateUserYHCTimeLink(userId, employeeId, employeeName);
      res.json({ success: true, employeeId, employeeName });
    } catch (error: any) {
      console.error("Error linking YHCTime employee:", error);
      res.status(500).json({ error: error.message || "Failed to link employee" });
    }
  });

  // Get current user's linked YHCTime employee
  app.get("/api/yhctime/linked-employee", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.yhctimeEmployeeId) {
        res.json({ 
          linked: true, 
          employeeId: user.yhctimeEmployeeId, 
          employeeName: user.yhctimeEmployeeName 
        });
      } else {
        res.json({ linked: false });
      }
    } catch (error: any) {
      console.error("Error getting linked employee:", error);
      res.status(500).json({ error: error.message || "Failed to get linked employee" });
    }
  });

  // Unlink YHCTime employee from current user
  app.delete("/api/yhctime/link-employee", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.updateUserYHCTimeLink(userId, null, null);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unlinking YHCTime employee:", error);
      res.status(500).json({ error: error.message || "Failed to unlink employee" });
    }
  });

  // =============================================================================
  // BREVO EMAIL ACTIVITY ROUTES
  // =============================================================================

  const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
  const BREVO_BASE_URL = 'https://api.brevo.com/v3';

  async function brevoRequest(endpoint: string, params: Record<string, string> = {}) {
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key not configured');
    }
    
    const url = new URL(`${BREVO_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await globalThis.fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  app.get('/api/brevo/status', isAuthenticated, async (req: any, res) => {
    try {
      if (!BREVO_API_KEY) {
        return res.json({ connected: false, message: 'Brevo API key not configured' });
      }
      const account = await brevoRequest('/account');
      res.json({
        connected: true,
        email: account.email,
        companyName: account.companyName,
        plan: account.plan?.[0]?.type || 'Unknown'
      });
    } catch (error: any) {
      console.error('[Brevo] Status check error:', error.message);
      res.json({ connected: false, message: error.message });
    }
  });

  const requireBrevoConfigured = (req: any, res: any, next: any) => {
    if (!BREVO_API_KEY) {
      return res.status(503).json({ error: 'Brevo API key not configured' });
    }
    next();
  };

  app.get('/api/brevo/statistics/aggregated', isAuthenticated, requireBrevoConfigured, async (req: any, res) => {
    try {
      const { startDate, endDate, days } = req.query;
      const params: Record<string, string> = {};
      
      if (startDate) params.startDate = startDate as string;
      if (endDate) params.endDate = endDate as string;
      if (days) params.days = days as string;
      
      if (!startDate && !endDate && !days) {
        params.days = '30';
      }

      const stats = await brevoRequest('/smtp/statistics/aggregatedReport', params);
      res.json(stats);
    } catch (error: any) {
      console.error('[Brevo] Aggregated stats error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/brevo/statistics/reports', isAuthenticated, requireBrevoConfigured, async (req: any, res) => {
    try {
      const { startDate, endDate, days } = req.query;
      const params: Record<string, string> = {};
      
      if (startDate) params.startDate = startDate as string;
      if (endDate) params.endDate = endDate as string;
      if (days) params.days = days as string;
      
      if (!startDate && !endDate && !days) {
        params.days = '7';
      }

      const reports = await brevoRequest('/smtp/statistics/reports', params);
      res.json(reports);
    } catch (error: any) {
      console.error('[Brevo] Daily reports error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/brevo/statistics/events', isAuthenticated, requireBrevoConfigured, async (req: any, res) => {
    try {
      const { limit, offset, startDate, endDate, event, email, sort } = req.query;
      const params: Record<string, string> = {};
      
      params.limit = (limit as string) || '50';
      if (offset) params.offset = offset as string;
      if (startDate) params.startDate = startDate as string;
      if (endDate) params.endDate = endDate as string;
      if (event) params.event = event as string;
      if (email) params.email = email as string;
      params.sort = (sort as string) || 'desc';

      const events = await brevoRequest('/smtp/statistics/events', params);
      res.json(events);
    } catch (error: any) {
      console.error('[Brevo] Events error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/brevo/campaigns', isAuthenticated, requireBrevoConfigured, async (req: any, res) => {
    try {
      const { days, status, limit, offset } = req.query;
      const params: Record<string, string> = {};
      
      params.limit = (limit as string) || '50';
      params.offset = (offset as string) || '0';
      params.sort = 'desc';
      params.statistics = 'campaignStats';
      if (status) params.status = status as string;

      const daysNum = parseInt(days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const campaignsData = await brevoRequest('/emailCampaigns', params);
      
      const filteredCampaigns = (campaignsData.campaigns || [])
        .filter((c: any) => {
          const sentAt = c.sentDate ? new Date(c.sentDate) : null;
          const scheduledAt = c.scheduledDate ? new Date(c.scheduledDate) : null;
          const campaignDate = sentAt || scheduledAt;
          return campaignDate && campaignDate >= startDate;
        });

      const campaigns = await Promise.all(filteredCampaigns.map(async (c: any) => {
        let stats = c.statistics?.campaignStats?.[0] || c.statistics?.globalStats || null;
        
        if (!stats && c.status === 'sent') {
          try {
            const detailedStats = await brevoRequest(`/emailCampaigns/${c.id}/statistics`);
            stats = detailedStats?.globalStats || detailedStats?.campaignStats?.[0] || null;
          } catch (e) {
            console.log(`[Brevo] Could not fetch detailed stats for campaign ${c.id}`);
          }
        }

        const sent = stats?.sent || 0;
        const delivered = stats?.delivered || 0;
        const uniqueOpens = stats?.uniqueOpens || 0;
        const uniqueClicks = stats?.uniqueClicks || 0;
        const hardBounces = stats?.hardBounces || 0;
        const softBounces = stats?.softBounces || 0;
        const unsubscribed = stats?.unsubscriptions || stats?.unsubscribed || 0;

        return {
          id: c.id,
          name: c.name,
          subject: c.subject,
          status: c.status,
          type: c.type,
          sentAt: c.sentDate,
          scheduledAt: c.scheduledDate,
          recipients: sent,
          stats: {
            delivered,
            opens: uniqueOpens,
            clicks: uniqueClicks,
            bounces: hardBounces + softBounces,
            unsubscribed,
            openRate: sent > 0 ? ((uniqueOpens / sent) * 100).toFixed(2) : '0',
            clickRate: sent > 0 ? ((uniqueClicks / sent) * 100).toFixed(2) : '0',
          }
        };
      }));

      res.json({ campaigns, count: campaigns.length });
    } catch (error: any) {
      console.error('[Brevo] Campaigns error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Gusto API routes
  const { isGustoConfigured, getCompanies, getEmployees, getPayrolls, getPayroll } = await import('./gusto');

  app.get('/api/gusto/status', isAuthenticated, async (req: any, res) => {
    try {
      res.json({ connected: isGustoConfigured() });
    } catch (error: any) {
      res.json({ connected: false, message: error.message });
    }
  });

  app.get('/api/gusto/companies', isAuthenticated, async (req: any, res) => {
    try {
      if (!isGustoConfigured()) {
        return res.status(503).json({ error: 'Gusto not configured' });
      }
      const companies = await getCompanies();
      res.json(companies);
    } catch (error: any) {
      console.error('[Gusto] Companies error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gusto/companies/:companyId/employees', isAuthenticated, async (req: any, res) => {
    try {
      if (!isGustoConfigured()) {
        return res.status(503).json({ error: 'Gusto not configured' });
      }
      const { companyId } = req.params;
      const employees = await getEmployees(companyId);
      res.json(employees);
    } catch (error: any) {
      console.error('[Gusto] Employees error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gusto/companies/:companyId/payrolls', isAuthenticated, async (req: any, res) => {
    try {
      if (!isGustoConfigured()) {
        return res.status(503).json({ error: 'Gusto not configured' });
      }
      const { companyId } = req.params;
      const payrolls = await getPayrolls(companyId);
      res.json(payrolls);
    } catch (error: any) {
      console.error('[Gusto] Payrolls error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gusto/companies/:companyId/payrolls/:payrollId', isAuthenticated, async (req: any, res) => {
    try {
      if (!isGustoConfigured()) {
        return res.status(503).json({ error: 'Gusto not configured' });
      }
      const { companyId, payrollId } = req.params;
      const payroll = await getPayroll(companyId, payrollId);
      res.json(payroll);
    } catch (error: any) {
      console.error('[Gusto] Payroll details error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/presentation/download', isAuthenticated, async (req: any, res) => {
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const { presentationSlides } = await import('@shared/presentation-slides');
      
      const pptx = new PptxGenJS();
      pptx.author = 'The YHC Way';
      pptx.title = 'The YHC Way - Features & Benefits';
      pptx.subject = 'Unified Workspace for Yoga Health Center';

      const primaryColor = 'FD971E';
      const secondaryColor = 'F59E0B';
      const darkText = '1C1917';
      const lightText = '78716C';

      for (const slide of presentationSlides) {
        const pptSlide = pptx.addSlide();
        pptSlide.background = { color: 'FFFFFF' };

        if (slide.type === 'title') {
          pptSlide.addText(slide.title, {
            x: 0.5, y: 2.5, w: 9, h: 1.2,
            fontSize: 54, bold: true, align: 'center',
            color: primaryColor
          });
          pptSlide.addText(slide.subtitle || '', {
            x: 0.5, y: 3.7, w: 9, h: 0.6,
            fontSize: 24, align: 'center', color: darkText
          });
          pptSlide.addText(slide.tagline || '', {
            x: 0.5, y: 4.4, w: 9, h: 0.5,
            fontSize: 18, align: 'center', color: lightText, italic: true
          });
        } else if (slide.type === 'overview') {
          pptSlide.addText(slide.title, {
            x: 0.5, y: 0.5, w: 9, h: 0.8,
            fontSize: 36, bold: true, color: darkText
          });
          const bullets = (slide.points || []).map(p => ({ text: p, options: { bullet: true, color: darkText } }));
          pptSlide.addText(bullets, {
            x: 0.5, y: 1.5, w: 9, h: 3,
            fontSize: 20, lineSpacing: 32
          });
          if (slide.benefit) {
            pptSlide.addText(slide.benefit, {
              x: 0.5, y: 4.8, w: 9, h: 0.6,
              fontSize: 18, bold: true, color: primaryColor, align: 'center'
            });
          }
        } else if (slide.type === 'feature') {
          pptSlide.addText(`${slide.icon || ''} ${slide.title}`, {
            x: 0.5, y: 0.4, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: darkText
          });
          const features = slide.features || [];
          features.forEach((f, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const featureTitle = f.navLabel ? `${f.name} → ${f.navLabel}` : f.name;
            pptSlide.addText(featureTitle, {
              x: 0.5 + col * 4.5, y: 1.3 + row * 1.5, w: 4, h: 0.4,
              fontSize: 16, bold: true, color: darkText
            });
            pptSlide.addText(f.desc, {
              x: 0.5 + col * 4.5, y: 1.7 + row * 1.5, w: 4, h: 0.5,
              fontSize: 13, color: lightText
            });
          });
          if (slide.benefit) {
            pptSlide.addText(slide.benefit, {
              x: 0.5, y: 4.8, w: 9, h: 0.5,
              fontSize: 16, bold: true, color: secondaryColor, align: 'center'
            });
          }
        } else if (slide.type === 'benefits') {
          pptSlide.addText(slide.title, {
            x: 0.5, y: 0.4, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: darkText, align: 'center'
          });
          const benefits = slide.benefits || [];
          benefits.forEach((b, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            pptSlide.addText(`${b.icon} ${b.title}`, {
              x: 0.3 + col * 3.2, y: 1.4 + row * 1.8, w: 3, h: 0.5,
              fontSize: 16, bold: true, color: darkText, align: 'center'
            });
            pptSlide.addText(b.desc, {
              x: 0.3 + col * 3.2, y: 1.9 + row * 1.8, w: 3, h: 0.6,
              fontSize: 12, color: lightText, align: 'center'
            });
          });
        } else if (slide.type === 'closing') {
          pptSlide.addText(slide.title, {
            x: 0.5, y: 2, w: 9, h: 0.7,
            fontSize: 28, bold: true, color: darkText, align: 'center'
          });
          pptSlide.addText(slide.subtitle || '', {
            x: 0.5, y: 2.8, w: 9, h: 1,
            fontSize: 48, bold: true, color: primaryColor, align: 'center'
          });
          pptSlide.addText(slide.tagline || '', {
            x: 0.5, y: 4, w: 9, h: 0.5,
            fontSize: 18, color: lightText, align: 'center', italic: true
          });
        }
      }

      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'attachment; filename="The-YHC-Way-Presentation.pptx"');
      res.send(buffer);
    } catch (error: any) {
      console.error('[Presentation] PPTX generation error:', error);
      res.status(500).json({ error: 'Failed to generate presentation' });
    }
  });

  return httpServer;
}
