import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, boolean, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
export const ADMIN_EMAIL = "ken@kennangle.com";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
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

// Integration API keys table - for Calendly, Typeform, etc.
export const integrationApiKeys = pgTable("integration_api_keys", {
  id: serial("id").primaryKey(),
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

// Chat system - Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
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
  content: z.string().min(1, "Message cannot be empty"),
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
  name: z.string().optional(),
  isGroup: z.boolean().default(false),
});
