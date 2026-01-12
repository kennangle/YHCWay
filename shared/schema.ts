import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, boolean, timestamp, integer, index, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// MULTI-TENANCY - Role constants
// =============================================================================

export const TenantRole = {
  OWNER: "owner",
  ADMIN: "admin", 
  MEMBER: "member",
  GUEST: "guest",
} as const;
export type TenantRoleType = typeof TenantRole[keyof typeof TenantRole];

// =============================================================================
// TENANTS TABLE (no dependencies)
// =============================================================================

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  logoUrl: varchar("logo_url"),
  ssoEnabled: boolean("sso_enabled").default(false),
  ssoProvider: varchar("sso_provider"),
  ssoConfig: jsonb("sso_config"),
  plan: varchar("plan").default("free"),
  maxUsers: integer("max_users").default(5),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export const createTenantSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

// =============================================================================
// CORE TABLES
// =============================================================================

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User approval status constants
export const ApprovalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type ApprovalStatusType = typeof ApprovalStatus[keyof typeof ApprovalStatus];

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  emailVerified: boolean("email_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  approvalStatus: varchar("approval_status").default("pending"),
  approvalDate: timestamp("approval_date"),
  approvedBy: varchar("approved_by"),
  firstLoginAt: timestamp("first_login_at"),
  lastLoginAt: timestamp("last_login_at"),
  yhctimeEmployeeId: integer("yhctime_employee_id"),
  yhctimeEmployeeName: varchar("yhctime_employee_name"),
  hasCompletedTour: boolean("has_completed_tour").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// =============================================================================
// MULTI-TENANCY TABLES (depend on users and tenants)
// =============================================================================

// Tenant users - maps users to tenants with roles
export const tenantUsers = pgTable("tenant_users", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"),
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
}, (table) => [
  index("idx_tenant_user_tenant").on(table.tenantId),
  index("idx_tenant_user_user").on(table.userId),
]);

export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = typeof tenantUsers.$inferInsert;

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

// Tenant invitations for pending invites
export const tenantInvitations = pgTable("tenant_invitations", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("member"),
  token: varchar("token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type InsertTenantInvitation = typeof tenantInvitations.$inferInsert;

// Audit log for enterprise compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action").notNull(),
  resourceType: varchar("resource_type"),
  resourceId: varchar("resource_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_tenant").on(table.tenantId),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_action").on(table.action),
  index("idx_audit_created").on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// =============================================================================
// OTHER USER-RELATED TABLES
// =============================================================================

// OAuth accounts table for external providers
export const oauthAccounts = pgTable("oauth_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(),
  providerAccountId: varchar("provider_account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type InsertOAuthAccount = typeof oauthAccounts.$inferInsert;

// Admin email constant
export const ADMIN_EMAIL = "ken@yogahealthcenter.com";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  colorClass: text("color_class").notNull(),
  connected: boolean("connected").notNull().default(false),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const feedItems = pgTable("feed_items", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  time: text("time").notNull(),
  sender: text("sender"),
  avatar: text("avatar"),
  urgent: boolean("urgent").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertFeedItemSchema = createInsertSchema(feedItems).omit({ 
  id: true,
  timestamp: true 
});
export type InsertFeedItem = z.infer<typeof insertFeedItemSchema>;
export type FeedItem = typeof feedItems.$inferSelect;

// Admin create user schema (with plain-text password that will be hashed)
export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isAdmin: z.boolean().default(false),
});
export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;

// Apple Calendar credentials table (CalDAV requires basic auth)
export const appleCalendarCredentials = pgTable("apple_calendar_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appleId: varchar("apple_id").notNull(),
  appPassword: text("app_password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AppleCalendarCredential = typeof appleCalendarCredentials.$inferSelect;
export type InsertAppleCalendarCredential = typeof appleCalendarCredentials.$inferInsert;

export const appleCalendarConnectSchema = z.object({
  appleId: z.string().email("Apple ID must be a valid email"),
  appPassword: z.string().min(10, "App-specific password required"),
});

// Slack channel preferences - which channels each user wants to follow
export const slackChannelPreferences = pgTable("slack_channel_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").notNull(),
  channelName: varchar("channel_name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SlackChannelPreference = typeof slackChannelPreferences.$inferSelect;
export type InsertSlackChannelPreference = typeof slackChannelPreferences.$inferInsert;

export const slackChannelPreferenceSchema = z.object({
  channelId: z.string(),
  channelName: z.string(),
  isEnabled: z.boolean().default(true),
});

export const slackPreferencesUpdateSchema = z.object({
  channels: z.array(slackChannelPreferenceSchema),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Extension access tokens table - for Chrome extension authentication
export const extensionTokens = pgTable("extension_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  deviceLabel: varchar("device_label"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_extension_token_user").on(table.userId),
  index("idx_extension_token_token").on(table.token),
]);

export type ExtensionToken = typeof extensionTokens.$inferSelect;
export type InsertExtensionToken = typeof extensionTokens.$inferInsert;

// Integration API keys table - for Calendly, Typeform, etc.
export const integrationApiKeys = pgTable("integration_api_keys", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  integrationName: varchar("integration_name").notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IntegrationApiKey = typeof integrationApiKeys.$inferSelect;
export type InsertIntegrationApiKey = typeof integrationApiKeys.$inferInsert;

export const integrationApiKeySchema = z.object({
  integrationName: z.enum(["calendly", "typeform"]),
  apiKey: z.string().min(1, "API key is required"),
});

// Slack user credentials for per-user OAuth
export const slackUserCredentials = pgTable("slack_user_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  slackUserId: varchar("slack_user_id").notNull(),
  slackTeamId: varchar("slack_team_id").notNull(),
  accessToken: text("access_token").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SlackUserCredential = typeof slackUserCredentials.$inferSelect;
export type InsertSlackUserCredential = typeof slackUserCredentials.$inferInsert;

// Asana user credentials for per-user OAuth
export const asanaUserCredentials = pgTable("asana_user_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  asanaUserId: varchar("asana_user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AsanaUserCredential = typeof asanaUserCredentials.$inferSelect;
export type InsertAsanaUserCredential = typeof asanaUserCredentials.$inferInsert;

// User disabled integrations - allows users to hide system-level integrations
export const userDisabledIntegrations = pgTable("user_disabled_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  integrationName: varchar("integration_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserDisabledIntegration = typeof userDisabledIntegrations.$inferSelect;
export type InsertUserDisabledIntegration = typeof userDisabledIntegrations.$inferInsert;

// Chat system - Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name"),
  isGroup: boolean("is_group").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Chat system - Conversation participants
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = typeof conversationParticipants.$inferInsert;

// Chat system - Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const sendMessageSchema = z.object({
  conversationId: z.number().optional(),
  recipientId: z.string().optional(),
  parentId: z.number().optional(),
  content: z.string().min(1, "Message cannot be empty"),
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
  name: z.string().optional(),
  isGroup: z.boolean().default(false),
});

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  templateType: varchar("template_type").notNull().unique(),
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

export const emailTemplateSchema = z.object({
  templateType: z.string(),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "Email content is required"),
});

// Email layout block type for drag-and-drop builder
export type EmailLayoutBlock = {
  id: string;
  type: "header" | "text" | "image" | "button" | "divider" | "spacer" | "columns" | "social";
  content: Record<string, unknown>;
  styles?: Record<string, string>;
};

// Email layouts table for drag-and-drop builder
export const emailLayouts = pgTable("email_layouts", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description"),
  blocks: jsonb("blocks").$type<EmailLayoutBlock[]>().notNull().default([]),
  previewHtml: text("preview_html"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmailLayout = typeof emailLayouts.$inferSelect;
export type InsertEmailLayout = typeof emailLayouts.$inferInsert;

export const emailLayoutBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["header", "text", "image", "button", "divider", "spacer", "columns", "social"]),
  content: z.record(z.unknown()),
  styles: z.record(z.string()).optional(),
});

export const insertEmailLayoutSchema = createInsertSchema(emailLayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailLayoutInput = z.infer<typeof insertEmailLayoutSchema>;

// User preferences table for settings
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Appearance
  googleCalendarColor: varchar("google_calendar_color").default("#3b82f6"),
  appleCalendarColor: varchar("apple_calendar_color").default("#22c55e"),
  zoomColor: varchar("zoom_color").default("#a855f7"),
  theme: varchar("theme").default("light"),
  // Notifications - per service
  notifyGmail: boolean("notify_gmail").default(true),
  notifySlack: boolean("notify_slack").default(true),
  notifyCalendar: boolean("notify_calendar").default(true),
  notifyZoom: boolean("notify_zoom").default(true),
  notifyAsana: boolean("notify_asana").default(true),
  notifyChat: boolean("notify_chat").default(true),
  // Notifications - delivery
  notifyInApp: boolean("notify_in_app").default(true),
  notifyEmail: boolean("notify_email").default(false),
  notifySound: boolean("notify_sound").default(true),
  notificationSoundType: varchar("notification_sound_type").default("chime"),
  // Notifications - quiet hours
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start").default("22:00"),
  quietHoursEnd: varchar("quiet_hours_end").default("08:00"),
  // Privacy
  showOnlineStatus: boolean("show_online_status").default(true),
  // Language & Region
  timezone: varchar("timezone").default("America/New_York"),
  dateFormat: varchar("date_format").default("MM/DD/YYYY"),
  firstDayOfWeek: varchar("first_day_of_week").default("sunday"),
  // Dashboard widget configuration
  dashboardWidgets: jsonb("dashboard_widgets").$type<DashboardWidgetConfig[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard widget configuration type
export type DashboardWidgetConfig = {
  id: string;
  visible: boolean;
  order: number;
};

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

export const dashboardWidgetConfigSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
  order: z.number(),
});

export const userPreferencesSchema = z.object({
  googleCalendarColor: z.string().optional(),
  appleCalendarColor: z.string().optional(),
  zoomColor: z.string().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  // Notifications
  notifyGmail: z.boolean().optional(),
  notifySlack: z.boolean().optional(),
  notifyCalendar: z.boolean().optional(),
  notifyZoom: z.boolean().optional(),
  notifyAsana: z.boolean().optional(),
  notifyChat: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySound: z.boolean().optional(),
  notificationSoundType: z.enum(["chime", "bell", "ping", "pop", "none"]).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  // Privacy
  showOnlineStatus: z.boolean().optional(),
  // Language
  timezone: z.string().optional(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
  firstDayOfWeek: z.enum(["sunday", "monday"]).optional(),
  // Dashboard widgets
  dashboardWidgets: z.array(dashboardWidgetConfigSchema).optional(),
});

// =============================================================================
// PROJECT & TASK MANAGEMENT
// =============================================================================

// Priority levels for tasks
export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;
export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// Recurrence patterns
export const RecurrencePattern = {
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  CUSTOM: "custom",
} as const;
export type RecurrencePatternType = typeof RecurrencePattern[keyof typeof RecurrencePattern];

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#3b82f6"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isArchived: boolean("is_archived").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_tenant").on(table.tenantId),
  index("idx_project_owner").on(table.ownerId),
]);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

// Project columns (for Kanban board)
export const projectColumns = pgTable("project_columns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  color: varchar("color").default("#6b7280"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_column_project").on(table.projectId),
]);

export type ProjectColumn = typeof projectColumns.$inferSelect;
export type InsertProjectColumn = typeof projectColumns.$inferInsert;

export const insertColumnSchema = createInsertSchema(projectColumns).omit({ 
  id: true, 
  createdAt: true 
});

// Project labels
export const projectLabels = pgTable("project_labels", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  color: varchar("color").default("#6b7280"),
}, (table) => [
  index("idx_label_project").on(table.projectId),
]);

export type ProjectLabel = typeof projectLabels.$inferSelect;
export type InsertProjectLabel = typeof projectLabels.$inferInsert;

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  columnId: integer("column_id").references(() => projectColumns.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  description: text("description"),
  priority: varchar("priority").default("medium"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  progress: integer("progress").default(0),
  isMilestone: boolean("is_milestone").default(false),
  assigneeId: varchar("assignee_id").references(() => users.id, { onDelete: "set null" }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  // Recurrence settings
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern"),
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  parentTaskId: integer("parent_task_id"),
  labels: text("labels").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_task_tenant").on(table.tenantId),
  index("idx_task_project").on(table.projectId),
  index("idx_task_column").on(table.columnId),
  index("idx_task_assignee").on(table.assigneeId),
  index("idx_task_due").on(table.dueDate),
  index("idx_task_start").on(table.startDate),
]);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  completedAt: true,
});

export const createTaskSchema = z.object({
  projectId: z.number(),
  columnId: z.number().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  isMilestone: z.boolean().optional(),
  assigneeId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]).optional(),
  recurrenceInterval: z.number().optional(),
  recurrenceEndDate: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  isMilestone: z.boolean().optional(),
  assigneeId: z.string().nullable().optional(),
  columnId: z.number().optional(),
  sortOrder: z.number().optional(),
  isCompleted: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]).nullable().optional(),
  recurrenceInterval: z.number().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

// Subtasks table
export const taskSubtasks = pgTable("task_subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subtask_task").on(table.taskId),
]);

export type TaskSubtask = typeof taskSubtasks.$inferSelect;
export type InsertTaskSubtask = typeof taskSubtasks.$inferInsert;

export const createSubtaskSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1, "Subtask title is required"),
});

// Task comments table
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
}, (table) => [
  index("idx_comment_task").on(table.taskId),
]);

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

export const createCommentSchema = z.object({
  taskId: z.number(),
  content: z.string().min(1, "Comment cannot be empty"),
});

// Task dependencies table for Gantt chart
export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type").default("finish_to_start"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dep_task").on(table.taskId),
  index("idx_dep_depends_on").on(table.dependsOnTaskId),
]);

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;

export const createDependencySchema = z.object({
  taskId: z.number(),
  dependsOnTaskId: z.number(),
  dependencyType: z.enum(["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]).optional(),
});

// Project members (for team assignments)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").default("member"),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_pmember_project").on(table.projectId),
  index("idx_pmember_user").on(table.userId),
]);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// =============================================================================
// TIME TRACKING
// =============================================================================

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds, null if timer is running
  isBillable: boolean("is_billable").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_time_entry_task").on(table.taskId),
  index("idx_time_entry_project").on(table.projectId),
  index("idx_time_entry_user").on(table.userId),
]);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

export const createTimeEntrySchema = z.object({
  taskId: z.number().optional(),
  projectId: z.number().optional(),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  isBillable: z.boolean().optional(),
});

export const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  isBillable: z.boolean().optional(),
});

// =============================================================================
// TASK TEMPLATES
// =============================================================================

export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  defaultTitle: varchar("default_title"),
  defaultDescription: text("default_description"),
  defaultPriority: varchar("default_priority").default("medium"),
  defaultLabels: text("default_labels").array(),
  subtasks: text("subtasks").array(),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_template_tenant").on(table.tenantId),
  index("idx_template_creator").on(table.creatorId),
]);

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = typeof taskTemplates.$inferInsert;

export const createTaskTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  defaultTitle: z.string().optional(),
  defaultDescription: z.string().optional(),
  defaultPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  defaultLabels: z.array(z.string()).optional(),
  subtasks: z.array(z.string()).optional(),
  isShared: z.boolean().optional(),
});

export const updateTaskTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  defaultTitle: z.string().optional(),
  defaultDescription: z.string().optional(),
  defaultPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  defaultLabels: z.array(z.string()).optional(),
  subtasks: z.array(z.string()).optional(),
  isShared: z.boolean().optional(),
});

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  emailTaskAssigned: boolean("email_task_assigned").default(true),
  emailTaskDue: boolean("email_task_due").default(true),
  emailCalendarConflict: boolean("email_calendar_conflict").default(true),
  emailImportantEmails: boolean("email_important_emails").default(false),
  emailDailyDigest: boolean("email_daily_digest").default(false),
  pushEnabled: boolean("push_enabled").default(false),
  pushSubscription: jsonb("push_subscription"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_notif_pref_user").on(table.userId),
]);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const updateNotificationPrefsSchema = z.object({
  emailTaskAssigned: z.boolean().optional(),
  emailTaskDue: z.boolean().optional(),
  emailCalendarConflict: z.boolean().optional(),
  emailImportantEmails: z.boolean().optional(),
  emailDailyDigest: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

// Notification log for tracking sent notifications
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // 'task_assigned', 'task_due', 'calendar_conflict', 'important_email'
  title: varchar("title").notNull(),
  message: text("message"),
  metadata: jsonb("metadata"),
  sentVia: varchar("sent_via").notNull(), // 'email', 'push', 'both'
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => [
  index("idx_notif_log_user").on(table.userId),
  index("idx_notif_log_type").on(table.type),
]);

export type NotificationLogEntry = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = typeof notificationLog.$inferInsert;

// =============================================================================
// WEBHOOKS
// =============================================================================

export const WebhookEvent = {
  INTRO_OFFER_STATUS_CHANGED: "intro_offer.status_changed",
  INTRO_OFFER_CREATED: "intro_offer.created",
  TASK_COMPLETED: "task.completed",
  TASK_CREATED: "task.created",
} as const;
export type WebhookEventType = typeof WebhookEvent[keyof typeof WebhookEvent];

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  url: varchar("url").notNull(),
  secret: varchar("secret"),
  events: text("events").array().notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_webhook_tenant").on(table.tenantId),
  index("idx_webhook_active").on(table.isActive),
]);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const createWebhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, "Select at least one event"),
  isActive: z.boolean().default(true),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: varchar("event").notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  success: boolean("success").default(false),
  attempts: integer("attempts").default(1),
  deliveredAt: timestamp("delivered_at").defaultNow(),
}, (table) => [
  index("idx_webhook_delivery_webhook").on(table.webhookId),
  index("idx_webhook_delivery_event").on(table.event),
]);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

// =============================================================================
// FEEDBACK ENTRIES (Bug Reports & Feature Requests)
// =============================================================================

export const FeedbackType = {
  BUG: "bug",
  FEATURE: "feature",
} as const;

export const FeedbackStatus = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
} as const;

export const feedbackEntries = pgTable("feedback_entries", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull().$type<"bug" | "feature">(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status").notNull().default("open").$type<"open" | "in_progress" | "resolved">(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feedback_tenant").on(table.tenantId),
  index("idx_feedback_status").on(table.status),
]);

export const insertFeedbackEntrySchema = createInsertSchema(feedbackEntries).omit({
  id: true,
  createdAt: true,
});

export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type InsertFeedbackEntry = z.infer<typeof insertFeedbackEntrySchema>;

// =============================================================================
// SHARED ITEMS (Share emails/messages with team)
// =============================================================================

export const SharedItemType = {
  EMAIL: "email",
  SLACK: "slack",
} as const;

export const sharedItems = pgTable("shared_items", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sharedByUserId: varchar("shared_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: varchar("item_type").notNull().$type<"email" | "slack">(),
  itemId: varchar("item_id").notNull(),
  title: varchar("title"),
  preview: text("preview"),
  note: text("note"),
  metadata: jsonb("metadata"),
  sharedAt: timestamp("shared_at").defaultNow(),
}, (table) => [
  index("idx_shared_item_tenant").on(table.tenantId),
  index("idx_shared_item_type").on(table.itemType),
]);

export const insertSharedItemSchema = createInsertSchema(sharedItems).omit({
  id: true,
  sharedAt: true,
});

export type SharedItem = typeof sharedItems.$inferSelect;
export type InsertSharedItem = z.infer<typeof insertSharedItemSchema>;

// =============================================================================
// ASANA-STYLE MULTI-HOMING + PLACEMENT
// =============================================================================

/**
 * task_projects = Asana multi-homing + per-project placement.
 * A task can belong to multiple projects with per-project placement.
 * 
 * Transitional compatibility:
 * - Keep sortOrder for current UI/logic (int)
 * - Add orderKey for stable fractional ordering (text)
 */
export const taskProjects = pgTable("task_projects", {
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  columnId: integer("column_id").references(() => projectColumns.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  orderKey: text("order_key"),
  addedBy: varchar("added_by", { length: 128 }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.projectId] }),
  index("task_projects_by_project").on(table.tenantId, table.projectId, table.columnId, table.sortOrder),
  index("task_projects_by_task").on(table.tenantId, table.taskId),
]);

export type TaskProject = typeof taskProjects.$inferSelect;
export type InsertTaskProject = typeof taskProjects.$inferInsert;

// =============================================================================
// TASK STORIES (Unified Comments + Activity Feed)
// =============================================================================

/**
 * task_stories = unified stream: comments + immutable activity.
 * 
 * storyType:
 * - "comment": body is required; activity fields null
 * - "activity": activityType + activityPayload required; body null
 */
export const taskStories = pgTable("task_stories", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  storyType: text("story_type").notNull(),
  authorId: varchar("author_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  body: text("body"),
  activityType: text("activity_type"),
  activityPayload: jsonb("activity_payload"),
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
}, (table) => [
  index("task_stories_by_task").on(table.tenantId, table.taskId, table.createdAt),
]);

export type TaskStory = typeof taskStories.$inferSelect;
export type InsertTaskStory = typeof taskStories.$inferInsert;

export const createTaskStoryCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
});

// =============================================================================
// EVENT OUTBOX (Transactional Side Effects)
// =============================================================================

/**
 * event_outbox = transactional outbox for consistent side effects.
 * Worker claims rows using SKIP LOCKED and marks publishedAt.
 */
export const eventOutbox = pgTable("event_outbox", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  index("event_outbox_pending").on(table.publishedAt, table.createdAt),
  index("event_outbox_tenant_type").on(table.tenantId, table.eventType),
]);

export type EventOutbox = typeof eventOutbox.$inferSelect;
export type InsertEventOutbox = typeof eventOutbox.$inferInsert;

// =============================================================================
// QR CODES (Local persistence for QR Tiger integration)
// =============================================================================

export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  qrCodeId: varchar("qr_code_id").notNull(),
  qrName: varchar("qr_name").notNull(),
  qrType: varchar("qr_type").notNull().default("dynamic"),
  destinationUrl: text("destination_url").notNull(),
  shortUrl: text("short_url"),
  qrImageUrl: text("qr_image_url"),
  category: varchar("category").default("general"),
  scans: integer("scans").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("qr_codes_user").on(table.userId),
]);

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = typeof qrCodes.$inferInsert;

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
});

// =============================================================================
// CHANGELOG ENTRIES (Development Activity Tracking)
// =============================================================================

export const ChangelogEntryType = {
  FEATURE: "feature",
  FIX: "fix",
  IMPROVEMENT: "improvement",
  DOCS: "docs",
  DEPLOY: "deploy",
  OTHER: "other",
} as const;
export type ChangelogEntryTypeValue = typeof ChangelogEntryType[keyof typeof ChangelogEntryType];

export const changelogEntries = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  commitHash: varchar("commit_hash", { length: 40 }),
  author: varchar("author"),
  summary: text("summary").notNull(),
  description: text("description"),
  entryType: varchar("entry_type").default("other"),
  entryDate: timestamp("entry_date").notNull(),
  isManual: boolean("is_manual").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("changelog_by_date").on(table.entryDate),
  index("changelog_by_hash").on(table.commitHash),
]);

export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type InsertChangelogEntry = typeof changelogEntries.$inferInsert;

export const insertChangelogEntrySchema = createInsertSchema(changelogEntries).omit({
  id: true,
  createdAt: true,
});

// Changelog sync state - tracks last processed commit
export const changelogSyncState = pgTable("changelog_sync_state", {
  id: serial("id").primaryKey(),
  lastCommitHash: varchar("last_commit_hash", { length: 40 }),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
});
