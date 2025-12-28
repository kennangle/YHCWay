import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertFeedItemSchema, ADMIN_EMAIL, adminCreateUserSchema, integrationApiKeySchema, sendMessageSchema, createConversationSchema, createTenantSchema, inviteUserSchema, type User } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { tenantMiddleware, requireTenant, requireTenantRole } from "./tenantMiddleware";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getRecentEmails, isGmailConnected } from "./gmail";
import { getGmailAuthUrl, handleGmailCallback, getRecentEmailsForUser, isGmailConnectedForUser, disconnectGmailForUser, getGmailClientForUser, getEmailById, sendEmail, deleteEmailById } from "./gmail-oauth";
import { getUpcomingEvents, getEventsForMonth, isCalendarConnected, createCalendarEvent } from "./calendar";
import { getUpcomingMeetings, isZoomConnected } from "./zoom";
import { getRecentMessages as getSlackMessages, getAllMessages as getAllSlackMessages, getDirectMessages as getSlackDMs, getThreadReplies as getSlackThreadReplies, isSlackConnected, getChannels as getSlackChannels, getRecentMessagesFiltered, isUserSlackConnected, getUserAllMessages, getUserDirectMessages, getUserChannels } from "./slack";
import { isAppleCalendarConnected, testAppleCalendarConnection, saveAppleCalendarCredentials, deleteAppleCalendarCredentials, getAppleCalendarEvents, getAppleCalendarEventsForMonth } from "./appleCalendar";
import { isAsanaConnected, getMyTasks, getProjects, getUpcomingTasks, isUserAsanaConnected, getUserMyTasks, getUserProjects, getUserUpcomingTasks } from "./asana";
import { getTypeformForms, getTypeformForm, createTypeformForm, updateTypeformForm, deleteTypeformForm, getTypeformResponses, isTypeformConfigured } from "./typeform";
import { sendInvitationEmail, getTemplateTypes, getDefaultTemplate } from "./email";
import { appleCalendarConnectSchema, slackPreferencesUpdateSchema, emailTemplateSchema } from "@shared/schema";
import { broadcastToUsers, generateWsAuthToken } from "./websocket";
import { getIntroOffers, getIntroOfferSummary, updateIntroOffer, getStudents, isMindbodyAnalyticsConfigured } from "./mindbodyAnalytics";

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
        id: u.user.id,
        email: u.user.email,
        firstName: u.user.firstName,
        lastName: u.user.lastName,
        profileImageUrl: u.user.profileImageUrl,
        role: u.role,
        joinedAt: u.joinedAt,
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
      const parseResult = introOfferUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: parseResult.error.errors });
      }
      const { status, notes } = parseResult.data;
      const updated = await updateIntroOffer(id, { status, notes });
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
      
      if (preferences.length === 0) {
        const allMessages = await getAllSlackMessages(30);
        res.json(allMessages);
        return;
      }
      
      const dmMessages = await getSlackDMs(10);
      
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
      
      console.log('[Asana Callback] Got tokens - hasAccess:', !!accessToken, 'hasRefresh:', !!refreshToken, 'asanaUserId:', asanaUserId);
      
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

  return httpServer;
}
