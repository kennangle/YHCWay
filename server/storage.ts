import { 
  type User, 
  type UpsertUser,
  type Service,
  type InsertService,
  type FeedItem,
  type InsertFeedItem,
  type OAuthAccount,
  type InsertOAuthAccount,
  type SlackChannelPreference,
  type InsertSlackChannelPreference,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type IntegrationApiKey,
  type Conversation,
  type ConversationParticipant,
  type Message,
  type EmailTemplate,
  type UserPreference,
  type SlackUserCredential,
  type InsertSlackUserCredential,
  type AsanaUserCredential,
  type InsertAsanaUserCredential,
  type Tenant,
  type InsertTenant,
  type TenantUser,
  type InsertTenantUser,
  type TenantInvitation,
  type AuditLog,
  type InsertAuditLog,
  type Project,
  type InsertProject,
  type ProjectColumn,
  type InsertProjectColumn,
  type ProjectLabel,
  type Task,
  type InsertTask,
  type TaskSubtask,
  type InsertTaskSubtask,
  type TaskComment,
  type InsertTaskComment,
  type ProjectMember,
  type NotificationPreference,
  type InsertNotificationPreference,
  type NotificationLogEntry,
  type InsertNotificationLog,
  type TimeEntry,
  type InsertTimeEntry,
  type TaskTemplate,
  type InsertTaskTemplate,
  type Webhook,
  type InsertWebhook,
  type WebhookDelivery,
  type InsertWebhookDelivery,
  type ArchivedEmail,
  type InsertArchivedEmail,
  type ArchivedSlackMessage,
  type InsertArchivedSlackMessage,
  type FeedbackEntry,
  type InsertFeedbackEntry,
  type SharedItem,
  type InsertSharedItem,
  users,
  services,
  feedItems,
  oauthAccounts,
  slackChannelPreferences,
  passwordResetTokens,
  integrationApiKeys,
  conversations,
  conversationParticipants,
  messages,
  emailTemplates,
  userPreferences,
  slackUserCredentials,
  asanaUserCredentials,
  userDisabledIntegrations,
  tenants,
  tenantUsers,
  tenantInvitations,
  auditLogs,
  projects,
  projectColumns,
  projectLabels,
  tasks,
  taskSubtasks,
  taskComments,
  projectMembers,
  notificationPreferences,
  notificationLog,
  timeEntries,
  taskTemplates,
  sessions,
  webhooks,
  webhookDeliveries,
  archivedEmails,
  archivedSlackMessages,
  feedbackEntries,
  sharedItems
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, isNull, sql, inArray, gte, lte, or } from "drizzle-orm";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  updateUserPassword(id: string, passwordHash: string): Promise<User | undefined>;
  updateUserApprovalStatus(id: string, status: string, approvedBy?: string): Promise<User | undefined>;
  recordUserLogin(id: string): Promise<User | undefined>;
  getActiveSessions(): Promise<string[]>;
  deleteUser(id: string): Promise<void>;
  
  getOAuthAccount(userId: string, provider: string): Promise<OAuthAccount | undefined>;
  getOAuthAccountByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | undefined>;
  createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount>;
  upsertOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  deleteOAuthAccount(userId: string, provider: string): Promise<void>;
  
  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  updateServiceConnection(id: number, connected: boolean): Promise<Service | undefined>;
  
  getAllFeedItems(): Promise<FeedItem[]>;
  getFeedItem(id: number): Promise<FeedItem | undefined>;
  createFeedItem(feedItem: InsertFeedItem): Promise<FeedItem>;
  updateFeedItem(id: number, feedItem: Partial<InsertFeedItem>): Promise<FeedItem | undefined>;
  deleteFeedItem(id: number): Promise<void>;
  
  // Slack channel preferences
  getSlackChannelPreferences(userId: string): Promise<SlackChannelPreference[]>;
  saveSlackChannelPreferences(userId: string, preferences: { channelId: string; channelName: string; isEnabled: boolean }[]): Promise<void>;
  
  // Password reset tokens
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  
  // Integration API keys
  getIntegrationApiKey(userId: string, integrationName: string): Promise<IntegrationApiKey | undefined>;
  saveIntegrationApiKey(userId: string, integrationName: string, apiKey: string): Promise<IntegrationApiKey>;
  deleteIntegrationApiKey(userId: string, integrationName: string): Promise<void>;
  getUserIntegrations(userId: string): Promise<IntegrationApiKey[]>;
  
  // Chat system
  createConversation(participantIds: string[], name?: string, isGroup?: boolean): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<(Conversation & { participants: User[]; lastMessage?: Message })[]>;
  findExistingDM(userId1: string, userId2: string): Promise<Conversation | undefined>;
  getConversationParticipants(conversationId: number): Promise<User[]>;
  isUserInConversation(userId: string, conversationId: number): Promise<boolean>;
  
  sendMessage(conversationId: number, senderId: string, content: string, parentId?: number): Promise<Message>;
  getConversationMessages(conversationId: number, limit?: number, before?: number): Promise<(Message & { replyCount?: number })[]>;
  getThreadReplies(parentId: number): Promise<Message[]>;
  markConversationRead(userId: string, conversationId: number): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Email templates
  getEmailTemplate(templateType: string): Promise<EmailTemplate | undefined>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  upsertEmailTemplate(templateType: string, subject: string, htmlContent: string): Promise<EmailTemplate>;
  
  // User preferences
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  updateUserPreferences(userId: string, prefs: Partial<Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserPreference>;
  
  // Slack user credentials
  getSlackUserCredentials(userId: string): Promise<SlackUserCredential | undefined>;
  saveSlackUserCredentials(userId: string, slackUserId: string, slackTeamId: string, accessToken: string, scope?: string): Promise<SlackUserCredential>;
  deleteSlackUserCredentials(userId: string): Promise<void>;
  
  // Asana user credentials
  getAsanaUserCredentials(userId: string): Promise<AsanaUserCredential | undefined>;
  saveAsanaUserCredentials(userId: string, asanaUserId: string, accessToken: string, refreshToken?: string, expiresAt?: Date, scope?: string): Promise<AsanaUserCredential>;
  deleteAsanaUserCredentials(userId: string): Promise<void>;
  
  // User disabled integrations
  getUserDisabledIntegrations(userId: string): Promise<string[]>;
  disableIntegration(userId: string, integrationName: string): Promise<void>;
  enableIntegration(userId: string, integrationName: string): Promise<void>;
  
  // Tenant management
  createTenant(name: string, slug: string, ownerId: string): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<void>;
  getUserTenants(userId: string): Promise<(Tenant & { role: string })[]>;
  
  // Tenant users
  addUserToTenant(tenantId: string, userId: string, role: string, invitedBy?: string): Promise<TenantUser>;
  removeUserFromTenant(tenantId: string, userId: string): Promise<void>;
  getTenantUsers(tenantId: string): Promise<(TenantUser & { user: User })[]>;
  getUserTenantRole(tenantId: string, userId: string): Promise<string | undefined>;
  updateTenantUserRole(tenantId: string, userId: string, role: string): Promise<TenantUser | undefined>;
  
  // Tenant invitations
  createTenantInvitation(tenantId: string, email: string, role: string, invitedBy: string, token: string, expiresAt: Date): Promise<TenantInvitation>;
  getTenantInvitation(token: string): Promise<TenantInvitation | undefined>;
  acceptTenantInvitation(token: string): Promise<TenantInvitation | undefined>;
  getPendingInvitations(tenantId: string): Promise<TenantInvitation[]>;
  
  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
  
  // Project management
  createProject(data: InsertProject, options?: { skipDefaultColumns?: boolean }): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getUserProjects(userId: string, tenantId?: string): Promise<Project[]>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  
  // Project columns
  getProjectColumns(projectId: number): Promise<ProjectColumn[]>;
  createProjectColumn(data: InsertProjectColumn): Promise<ProjectColumn>;
  updateProjectColumn(id: number, data: Partial<InsertProjectColumn>): Promise<ProjectColumn | undefined>;
  deleteProjectColumn(id: number): Promise<void>;
  reorderProjectColumns(projectId: number, columnIds: number[]): Promise<void>;
  
  // Project labels
  getProjectLabels(projectId: number): Promise<ProjectLabel[]>;
  createProjectLabel(projectId: number, name: string, color?: string): Promise<ProjectLabel>;
  deleteProjectLabel(id: number): Promise<void>;
  
  // Project members
  getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]>;
  addProjectMember(projectId: number, userId: string, role?: string): Promise<ProjectMember>;
  removeProjectMember(projectId: number, userId: string): Promise<void>;
  
  // Tasks
  createTask(data: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getProjectTasks(projectId: number): Promise<Task[]>;
  getUserTasks(userId: string, tenantId?: string): Promise<Task[]>;
  getAllUserTasks(userId: string, tenantId?: string): Promise<Task[]>;
  getUpcomingTasks(userId: string, days?: number): Promise<Task[]>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  moveTask(taskId: number, columnId: number, sortOrder: number): Promise<Task | undefined>;
  
  // Subtasks
  getTaskSubtasks(taskId: number): Promise<TaskSubtask[]>;
  createSubtask(data: InsertTaskSubtask): Promise<TaskSubtask>;
  updateSubtask(id: number, data: Partial<InsertTaskSubtask>): Promise<TaskSubtask | undefined>;
  deleteSubtask(id: number): Promise<void>;
  toggleSubtask(id: number): Promise<TaskSubtask | undefined>;
  
  // Task comments
  getTaskComments(taskId: number): Promise<(TaskComment & { author: User })[]>;
  createTaskComment(taskId: number, authorId: string, content: string): Promise<TaskComment>;
  updateTaskComment(id: number, content: string): Promise<TaskComment | undefined>;
  deleteTaskComment(id: number): Promise<void>;
  
  // Notification preferences and logs
  getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined>;
  updateNotificationPreferences(userId: string, prefs: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationPreference>;
  logNotification(data: InsertNotificationLog): Promise<NotificationLogEntry>;
  getNotificationLogs(userId: string, limit?: number): Promise<NotificationLogEntry[]>;
  
  // Time tracking
  createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getUserTimeEntries(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTaskTimeEntries(taskId: number): Promise<TimeEntry[]>;
  getProjectTimeEntries(projectId: number): Promise<TimeEntry[]>;
  updateTimeEntry(id: number, data: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<void>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
  stopTimeEntry(id: number): Promise<TimeEntry | undefined>;
  
  // Task templates
  getTaskTemplates(userId: string, tenantId?: string): Promise<TaskTemplate[]>;
  getTaskTemplate(id: number, userId?: string, tenantId?: string): Promise<TaskTemplate | undefined>;
  createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, userId: string, tenantId: string | undefined, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: number, userId: string, tenantId?: string): Promise<boolean>;
  
  // Webhooks
  getWebhooks(tenantId?: string): Promise<Omit<Webhook, 'secret'>[]>;
  getWebhook(id: number, tenantId?: string): Promise<Webhook | undefined>;
  getWebhookPublic(id: number, tenantId?: string): Promise<Omit<Webhook, 'secret'> | undefined>;
  createWebhook(data: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, data: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number, tenantId?: string): Promise<void>;
  getActiveWebhooksForEvent(event: string, tenantId?: string): Promise<Webhook[]>;
  logWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery>;
  getWebhookDeliveries(webhookId: number, limit?: number): Promise<WebhookDelivery[]>;
  
  // Feedback entries
  createFeedbackEntry(data: InsertFeedbackEntry): Promise<FeedbackEntry>;
  getFeedbackEntriesForTenant(tenantId: string): Promise<(FeedbackEntry & { user: User })[]>;
  updateFeedbackStatus(id: number, status: string): Promise<FeedbackEntry | undefined>;
  
  // Shared items (share emails/messages with team)
  createSharedItem(data: InsertSharedItem): Promise<SharedItem>;
  getSharedItems(tenantId: string): Promise<(SharedItem & { sharedBy: User })[]>;
  deleteSharedItem(id: number, tenantId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.approvalStatus, "pending"));
  }

  async updateUserApprovalStatus(id: string, status: string, approvedBy?: string): Promise<User | undefined> {
    const updateData: Record<string, unknown> = { 
      approvalStatus: status, 
      updatedAt: new Date() 
    };
    if (status === "approved" || status === "rejected") {
      updateData.approvalDate = new Date();
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
      }
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async recordUserLogin(id: string): Promise<User | undefined> {
    const now = new Date();
    const existingUser = await this.getUser(id);
    
    const updateData: Record<string, unknown> = { 
      lastLoginAt: now,
      updatedAt: now
    };
    
    // Set firstLoginAt only if this is the first login
    if (!existingUser?.firstLoginAt) {
      updateData.firstLoginAt = now;
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getActiveSessions(): Promise<string[]> {
    // Get active sessions (not expired) and extract user IDs from session data
    const now = new Date();
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(sql`${sessions.expire} > ${now}`);
    
    const activeUserIds: Set<string> = new Set();
    for (const session of activeSessions) {
      try {
        const sessData = session.sess as any;
        // Replit Auth stores user info in passport.user.claims.sub
        const userId = sessData?.passport?.user?.claims?.sub;
        if (userId) {
          activeUserIds.add(userId);
        }
      } catch (e) {
        // Skip malformed sessions
      }
    }
    return Array.from(activeUserIds);
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user and all related data (cascading deletes should handle most)
    await db.delete(users).where(eq(users.id, id));
  }

  async getOAuthAccount(userId: string, provider: string): Promise<OAuthAccount | undefined> {
    const [account] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        )
      );
    return account;
  }

  async getOAuthAccountByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | undefined> {
    const [account] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId)
        )
      );
    return account;
  }

  async createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount> {
    const [newAccount] = await db.insert(oauthAccounts).values(account).returning();
    return newAccount;
  }

  async linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount> {
    const [newAccount] = await db
      .insert(oauthAccounts)
      .values({ ...account, userId })
      .returning();
    return newAccount;
  }

  async upsertOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount> {
    const existing = await this.getOAuthAccount(account.userId, account.provider);
    
    if (existing) {
      const [updated] = await db
        .update(oauthAccounts)
        .set({
          providerAccountId: account.providerAccountId,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt,
        })
        .where(eq(oauthAccounts.id, existing.id))
        .returning();
      return updated;
    }
    
    return this.createOAuthAccount(account);
  }

  async deleteOAuthAccount(userId: string, provider: string): Promise<void> {
    await db
      .delete(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        )
      );
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async updateServiceConnection(id: number, connected: boolean): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ connected })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async getAllFeedItems(): Promise<FeedItem[]> {
    return await db.select().from(feedItems).orderBy(desc(feedItems.sortOrder), desc(feedItems.timestamp));
  }

  async getFeedItem(id: number): Promise<FeedItem | undefined> {
    const [item] = await db.select().from(feedItems).where(eq(feedItems.id, id));
    return item;
  }

  async createFeedItem(feedItem: InsertFeedItem): Promise<FeedItem> {
    const [newItem] = await db.insert(feedItems).values(feedItem).returning();
    return newItem;
  }

  async updateFeedItem(id: number, feedItem: Partial<InsertFeedItem>): Promise<FeedItem | undefined> {
    const [updated] = await db
      .update(feedItems)
      .set(feedItem)
      .where(eq(feedItems.id, id))
      .returning();
    return updated;
  }

  async deleteFeedItem(id: number): Promise<void> {
    await db.delete(feedItems).where(eq(feedItems.id, id));
  }

  async getSlackChannelPreferences(userId: string): Promise<SlackChannelPreference[]> {
    return await db.select()
      .from(slackChannelPreferences)
      .where(eq(slackChannelPreferences.userId, userId));
  }

  async saveSlackChannelPreferences(
    userId: string, 
    preferences: { channelId: string; channelName: string; isEnabled: boolean }[]
  ): Promise<void> {
    await db.delete(slackChannelPreferences)
      .where(eq(slackChannelPreferences.userId, userId));
    
    if (preferences.length > 0) {
      await db.insert(slackChannelPreferences)
        .values(preferences.map(p => ({
          userId,
          channelId: p.channelId,
          channelName: p.channelName,
          isEnabled: p.isEnabled,
        })));
    }
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async getIntegrationApiKey(userId: string, integrationName: string): Promise<IntegrationApiKey | undefined> {
    const [key] = await db.select()
      .from(integrationApiKeys)
      .where(and(
        eq(integrationApiKeys.userId, userId),
        eq(integrationApiKeys.integrationName, integrationName)
      ));
    return key;
  }

  async saveIntegrationApiKey(userId: string, integrationName: string, apiKey: string): Promise<IntegrationApiKey> {
    const existing = await this.getIntegrationApiKey(userId, integrationName);
    
    if (existing) {
      const [updated] = await db.update(integrationApiKeys)
        .set({ apiKey, updatedAt: new Date() })
        .where(eq(integrationApiKeys.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newKey] = await db.insert(integrationApiKeys)
      .values({ userId, integrationName, apiKey })
      .returning();
    return newKey;
  }

  async deleteIntegrationApiKey(userId: string, integrationName: string): Promise<void> {
    await db.delete(integrationApiKeys)
      .where(and(
        eq(integrationApiKeys.userId, userId),
        eq(integrationApiKeys.integrationName, integrationName)
      ));
  }

  async getUserIntegrations(userId: string): Promise<IntegrationApiKey[]> {
    return await db.select()
      .from(integrationApiKeys)
      .where(eq(integrationApiKeys.userId, userId));
  }

  // Chat system methods
  async createConversation(participantIds: string[], name?: string, isGroup?: boolean): Promise<Conversation> {
    const [conversation] = await db.insert(conversations)
      .values({ name, isGroup: isGroup || participantIds.length > 2 })
      .returning();
    
    await db.insert(conversationParticipants)
      .values(participantIds.map(userId => ({
        conversationId: conversation.id,
        userId,
      })));
    
    return conversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: string): Promise<(Conversation & { participants: User[]; lastMessage?: Message })[]> {
    const userConvos = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    if (userConvos.length === 0) return [];
    
    const convoIds = userConvos.map(c => c.conversationId);
    const convos = await db.select()
      .from(conversations)
      .where(inArray(conversations.id, convoIds))
      .orderBy(desc(conversations.updatedAt));
    
    const result: (Conversation & { participants: User[]; lastMessage?: Message })[] = [];
    
    for (const convo of convos) {
      const participants = await this.getConversationParticipants(convo.id);
      const [lastMessage] = await db.select()
        .from(messages)
        .where(and(eq(messages.conversationId, convo.id), isNull(messages.deletedAt)))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      
      result.push({ ...convo, participants, lastMessage });
    }
    
    return result;
  }

  async findExistingDM(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const user1Convos = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId1));
    
    for (const { conversationId } of user1Convos) {
      const [convo] = await db.select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.isGroup, false)));
      
      if (convo) {
        const participants = await db.select()
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conversationId));
        
        if (participants.length === 2 && participants.some(p => p.userId === userId2)) {
          return convo;
        }
      }
    }
    return undefined;
  }

  async getConversationParticipants(conversationId: number): Promise<User[]> {
    const participantRows = await db.select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    
    if (participantRows.length === 0) return [];
    
    const userIds = participantRows.map(p => p.userId);
    return await db.select()
      .from(users)
      .where(inArray(users.id, userIds));
  }

  async isUserInConversation(userId: string, conversationId: number): Promise<boolean> {
    const [participant] = await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.conversationId, conversationId)
      ));
    return !!participant;
  }

  async sendMessage(conversationId: number, senderId: string, content: string, parentId?: number): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({ conversationId, senderId, content, parentId })
      .returning();
    
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    
    return message;
  }

  async getConversationMessages(conversationId: number, limit: number = 50, before?: number): Promise<(Message & { replyCount?: number })[]> {
    const allMessages = await db.select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        isNull(messages.parentId),
        before ? lt(messages.id, before) : undefined
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    const result: (Message & { replyCount?: number })[] = [];
    for (const msg of allMessages) {
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(eq(messages.parentId, msg.id), isNull(messages.deletedAt)));
      result.push({ ...msg, replyCount: Number(countResult?.count || 0) });
    }
    
    return result;
  }

  async getThreadReplies(parentId: number): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(and(eq(messages.parentId, parentId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt);
  }

  async markConversationRead(userId: string, conversationId: number): Promise<void> {
    await db.update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.conversationId, conversationId)
      ));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userConvos = await db.select({
      conversationId: conversationParticipants.conversationId,
      lastReadAt: conversationParticipants.lastReadAt
    })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    let unreadCount = 0;
    for (const { conversationId, lastReadAt } of userConvos) {
      const condition = lastReadAt 
        ? and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt), sql`${messages.createdAt} > ${lastReadAt}`)
        : and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt));
      
      const [result] = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(condition);
      
      unreadCount += Number(result?.count || 0);
    }
    
    return unreadCount;
  }

  // Email templates
  async getEmailTemplate(templateType: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateType, templateType));
    return template;
  }

  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates);
  }

  async upsertEmailTemplate(templateType: string, subject: string, htmlContent: string): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values({ templateType, subject, htmlContent })
      .onConflictDoUpdate({
        target: emailTemplates.templateType,
        set: { subject, htmlContent, updatedAt: new Date() }
      })
      .returning();
    return template;
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    const [prefs] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updateUserPreferences(
    userId: string, 
    prefs: Partial<Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserPreference> {
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userPreferences)
      .values({ userId, ...prefs })
      .returning();
    return created;
  }

  // Slack user credentials
  async getSlackUserCredentials(userId: string): Promise<SlackUserCredential | undefined> {
    const [creds] = await db.select()
      .from(slackUserCredentials)
      .where(eq(slackUserCredentials.userId, userId));
    return creds;
  }

  async saveSlackUserCredentials(
    userId: string, 
    slackUserId: string, 
    slackTeamId: string, 
    accessToken: string, 
    scope?: string
  ): Promise<SlackUserCredential> {
    const existing = await this.getSlackUserCredentials(userId);
    
    if (existing) {
      const [updated] = await db.update(slackUserCredentials)
        .set({ slackUserId, slackTeamId, accessToken, scope, updatedAt: new Date() })
        .where(eq(slackUserCredentials.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(slackUserCredentials)
      .values({ userId, slackUserId, slackTeamId, accessToken, scope })
      .returning();
    return created;
  }

  async deleteSlackUserCredentials(userId: string): Promise<void> {
    await db.delete(slackUserCredentials)
      .where(eq(slackUserCredentials.userId, userId));
  }

  // Asana user credentials
  async getAsanaUserCredentials(userId: string): Promise<AsanaUserCredential | undefined> {
    const [creds] = await db.select()
      .from(asanaUserCredentials)
      .where(eq(asanaUserCredentials.userId, userId));
    return creds;
  }

  async saveAsanaUserCredentials(
    userId: string, 
    asanaUserId: string, 
    accessToken: string, 
    refreshToken?: string,
    expiresAt?: Date,
    scope?: string
  ): Promise<AsanaUserCredential> {
    const existing = await this.getAsanaUserCredentials(userId);
    
    if (existing) {
      const [updated] = await db.update(asanaUserCredentials)
        .set({ asanaUserId, accessToken, refreshToken, expiresAt, scope, updatedAt: new Date() })
        .where(eq(asanaUserCredentials.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(asanaUserCredentials)
      .values({ userId, asanaUserId, accessToken, refreshToken, expiresAt, scope })
      .returning();
    return created;
  }

  async deleteAsanaUserCredentials(userId: string): Promise<void> {
    await db.delete(asanaUserCredentials)
      .where(eq(asanaUserCredentials.userId, userId));
  }

  // User disabled integrations
  async getUserDisabledIntegrations(userId: string): Promise<string[]> {
    const disabled = await db.select()
      .from(userDisabledIntegrations)
      .where(eq(userDisabledIntegrations.userId, userId));
    return disabled.map(d => d.integrationName);
  }

  async disableIntegration(userId: string, integrationName: string): Promise<void> {
    await db.insert(userDisabledIntegrations)
      .values({ userId, integrationName })
      .onConflictDoNothing();
  }

  async enableIntegration(userId: string, integrationName: string): Promise<void> {
    await db.delete(userDisabledIntegrations)
      .where(and(
        eq(userDisabledIntegrations.userId, userId),
        eq(userDisabledIntegrations.integrationName, integrationName)
      ));
  }

  // Tenant management
  async createTenant(name: string, slug: string, ownerId: string): Promise<Tenant> {
    const [tenant] = await db.insert(tenants)
      .values({ name, slug })
      .returning();
    
    // Add the creator as owner
    await db.insert(tenantUsers)
      .values({ tenantId: tenant.id, userId: ownerId, role: 'owner' });
    
    return tenant;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async deleteTenant(id: string): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getUserTenants(userId: string): Promise<(Tenant & { role: string })[]> {
    const userTenantLinks = await db.select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));
    
    if (userTenantLinks.length === 0) return [];
    
    const result: (Tenant & { role: string })[] = [];
    for (const link of userTenantLinks) {
      const tenant = await this.getTenant(link.tenantId);
      if (tenant) {
        result.push({ ...tenant, role: link.role });
      }
    }
    return result;
  }

  // Tenant users
  async addUserToTenant(tenantId: string, userId: string, role: string, invitedBy?: string): Promise<TenantUser> {
    const [tenantUser] = await db.insert(tenantUsers)
      .values({ tenantId, userId, role, invitedBy, invitedAt: invitedBy ? new Date() : undefined })
      .returning();
    return tenantUser;
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    await db.delete(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, userId)
      ));
  }

  async getTenantUsers(tenantId: string): Promise<(TenantUser & { user: User })[]> {
    const tenantUserLinks = await db.select()
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));
    
    const result: (TenantUser & { user: User })[] = [];
    for (const link of tenantUserLinks) {
      const user = await this.getUser(link.userId);
      if (user) {
        result.push({ ...link, user });
      }
    }
    return result;
  }

  async getUserTenantRole(tenantId: string, userId: string): Promise<string | undefined> {
    const [link] = await db.select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, userId)
      ));
    return link?.role;
  }

  async updateTenantUserRole(tenantId: string, userId: string, role: string): Promise<TenantUser | undefined> {
    const [updated] = await db.update(tenantUsers)
      .set({ role })
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, userId)
      ))
      .returning();
    return updated;
  }

  // Tenant invitations
  async createTenantInvitation(
    tenantId: string, 
    email: string, 
    role: string, 
    invitedBy: string, 
    token: string, 
    expiresAt: Date
  ): Promise<TenantInvitation> {
    const [invitation] = await db.insert(tenantInvitations)
      .values({ tenantId, email, role, invitedBy, token, expiresAt })
      .returning();
    return invitation;
  }

  async getTenantInvitation(token: string): Promise<TenantInvitation | undefined> {
    const [invitation] = await db.select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.token, token));
    return invitation;
  }

  async acceptTenantInvitation(token: string): Promise<TenantInvitation | undefined> {
    const [updated] = await db.update(tenantInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(tenantInvitations.token, token))
      .returning();
    return updated;
  }

  async getPendingInvitations(tenantId: string): Promise<TenantInvitation[]> {
    return await db.select()
      .from(tenantInvitations)
      .where(and(
        eq(tenantInvitations.tenantId, tenantId),
        isNull(tenantInvitations.acceptedAt)
      ));
  }

  // Audit logging
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs)
      .values(log)
      .returning();
    return auditLog;
  }

  async getAuditLogs(tenantId: string, limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Project management
  async createProject(data: InsertProject, options?: { skipDefaultColumns?: boolean }): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    // Create default columns unless explicitly skipped (for imports)
    if (!options?.skipDefaultColumns) {
      await db.insert(projectColumns).values([
        { projectId: project.id, name: "Tasks", color: "#f59e0b", sortOrder: 0 },
        { projectId: project.id, name: "In Progress", color: "#3b82f6", sortOrder: 1 },
        { projectId: project.id, name: "Done", color: "#22c55e", sortOrder: 2 },
        { projectId: project.id, name: "Notes", color: "#8b5cf6", sortOrder: 3 },
      ]);
    }
    // Add creator as project member
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: data.ownerId,
      role: "owner",
    });
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: string, tenantId?: string): Promise<Project[]> {
    const memberProjectIds = await db.select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    
    if (memberProjectIds.length === 0) return [];
    
    const projectIds = memberProjectIds.map(p => p.projectId);
    let query = db.select().from(projects)
      .where(and(
        inArray(projects.id, projectIds),
        eq(projects.isArchived, false)
      ));
    
    return await query.orderBy(desc(projects.updatedAt));
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project columns
  async getProjectColumns(projectId: number): Promise<ProjectColumn[]> {
    return await db.select().from(projectColumns)
      .where(eq(projectColumns.projectId, projectId))
      .orderBy(projectColumns.sortOrder);
  }

  async createProjectColumn(data: InsertProjectColumn): Promise<ProjectColumn> {
    const existing = await db.select().from(projectColumns)
      .where(eq(projectColumns.projectId, data.projectId));
    const sortOrder = existing.length;
    const [column] = await db.insert(projectColumns)
      .values({ ...data, sortOrder })
      .returning();
    return column;
  }

  async updateProjectColumn(id: number, data: Partial<InsertProjectColumn>): Promise<ProjectColumn | undefined> {
    const [column] = await db.update(projectColumns)
      .set(data)
      .where(eq(projectColumns.id, id))
      .returning();
    return column;
  }

  async deleteProjectColumn(id: number): Promise<void> {
    await db.delete(projectColumns).where(eq(projectColumns.id, id));
  }

  async reorderProjectColumns(projectId: number, columnIds: number[]): Promise<void> {
    for (let i = 0; i < columnIds.length; i++) {
      await db.update(projectColumns)
        .set({ sortOrder: i })
        .where(and(
          eq(projectColumns.id, columnIds[i]),
          eq(projectColumns.projectId, projectId)
        ));
    }
  }

  // Project labels
  async getProjectLabels(projectId: number): Promise<ProjectLabel[]> {
    return await db.select().from(projectLabels)
      .where(eq(projectLabels.projectId, projectId));
  }

  async createProjectLabel(projectId: number, name: string, color: string = "#6b7280"): Promise<ProjectLabel> {
    const [label] = await db.insert(projectLabels)
      .values({ projectId, name, color })
      .returning();
    return label;
  }

  async deleteProjectLabel(id: number): Promise<void> {
    await db.delete(projectLabels).where(eq(projectLabels.id, id));
  }

  // Project members
  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]> {
    const members = await db.select()
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));
    
    return members.map(m => ({
      ...m.project_members,
      user: m.users,
    }));
  }

  async addProjectMember(projectId: number, userId: string, role: string = "member"): Promise<ProjectMember> {
    const [member] = await db.insert(projectMembers)
      .values({ projectId, userId, role })
      .returning();
    return member;
  }

  async removeProjectMember(projectId: number, userId: string): Promise<void> {
    await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
  }

  // Tasks
  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getProjectTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.sortOrder);
  }

  async getUserTasks(userId: string, tenantId?: string): Promise<Task[]> {
    let conditions = [eq(tasks.assigneeId, userId)];
    if (tenantId) {
      conditions.push(eq(tasks.tenantId, tenantId));
    }
    return await db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.dueDate, tasks.sortOrder);
  }

  async getAllUserTasks(userId: string, tenantId?: string): Promise<Task[]> {
    let conditions = [or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId))];
    if (tenantId) {
      conditions.push(eq(tasks.tenantId, tenantId));
    }
    return await db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.dueDate, tasks.sortOrder);
  }

  async getUpcomingTasks(userId: string, days: number = 7): Promise<Task[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.assigneeId, userId),
        eq(tasks.isCompleted, false),
        lt(tasks.dueDate, futureDate)
      ))
      .orderBy(tasks.dueDate);
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.isCompleted === true) {
      updateData.completedAt = new Date();
    } else if (data.isCompleted === false) {
      updateData.completedAt = null;
    }
    const [task] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async moveTask(taskId: number, columnId: number, sortOrder: number): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ columnId, sortOrder, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return task;
  }

  // Subtasks
  async getTaskSubtasks(taskId: number): Promise<TaskSubtask[]> {
    return await db.select().from(taskSubtasks)
      .where(eq(taskSubtasks.taskId, taskId))
      .orderBy(taskSubtasks.sortOrder);
  }

  async createSubtask(data: InsertTaskSubtask): Promise<TaskSubtask> {
    const existing = await db.select().from(taskSubtasks)
      .where(eq(taskSubtasks.taskId, data.taskId));
    const sortOrder = existing.length;
    const [subtask] = await db.insert(taskSubtasks)
      .values({ ...data, sortOrder })
      .returning();
    return subtask;
  }

  async updateSubtask(id: number, data: Partial<InsertTaskSubtask>): Promise<TaskSubtask | undefined> {
    const [subtask] = await db.update(taskSubtasks)
      .set(data)
      .where(eq(taskSubtasks.id, id))
      .returning();
    return subtask;
  }

  async deleteSubtask(id: number): Promise<void> {
    await db.delete(taskSubtasks).where(eq(taskSubtasks.id, id));
  }

  async toggleSubtask(id: number): Promise<TaskSubtask | undefined> {
    const [existing] = await db.select().from(taskSubtasks)
      .where(eq(taskSubtasks.id, id));
    if (!existing) return undefined;
    
    const [subtask] = await db.update(taskSubtasks)
      .set({ 
        isCompleted: !existing.isCompleted,
        completedAt: existing.isCompleted ? null : new Date()
      })
      .where(eq(taskSubtasks.id, id))
      .returning();
    return subtask;
  }

  // Task comments
  async getTaskComments(taskId: number): Promise<(TaskComment & { author: User })[]> {
    const comments = await db.select()
      .from(taskComments)
      .innerJoin(users, eq(taskComments.authorId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
    
    return comments.map(c => ({
      ...c.task_comments,
      author: c.users,
    }));
  }

  async createTaskComment(taskId: number, authorId: string, content: string): Promise<TaskComment> {
    const [comment] = await db.insert(taskComments)
      .values({ taskId, authorId, content })
      .returning();
    return comment;
  }

  async updateTaskComment(id: number, content: string): Promise<TaskComment | undefined> {
    const [comment] = await db.update(taskComments)
      .set({ content, editedAt: new Date() })
      .where(eq(taskComments.id, id))
      .returning();
    return comment;
  }

  async deleteTaskComment(id: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, id));
  }

  // Notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined> {
    const [prefs] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async updateNotificationPreferences(userId: string, data: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(notificationPreferences)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }

  // Notification log
  async logNotification(data: InsertNotificationLog): Promise<NotificationLogEntry> {
    const [entry] = await db.insert(notificationLog)
      .values(data)
      .returning();
    return entry;
  }

  async getNotificationLogs(userId: string, limit: number = 50): Promise<NotificationLogEntry[]> {
    return db.select().from(notificationLog)
      .where(eq(notificationLog.userId, userId))
      .orderBy(desc(notificationLog.sentAt))
      .limit(limit);
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notificationLog)
      .set({ readAt: new Date() })
      .where(eq(notificationLog.id, id));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notificationLog)
      .where(and(
        eq(notificationLog.userId, userId),
        isNull(notificationLog.readAt)
      ));
    return result[0]?.count || 0;
  }

  // Time tracking
  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries)
      .values(data)
      .returning();
    return entry;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries)
      .where(eq(timeEntries.id, id));
    return entry;
  }

  async getUserTimeEntries(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    const conditions = [eq(timeEntries.userId, userId)];
    if (startDate) {
      conditions.push(gte(timeEntries.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.startTime, endDate));
    }
    return db.select().from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime));
  }

  async getTaskTimeEntries(taskId: number): Promise<TimeEntry[]> {
    return db.select().from(timeEntries)
      .where(eq(timeEntries.taskId, taskId))
      .orderBy(desc(timeEntries.startTime));
  }

  async getProjectTimeEntries(projectId: number): Promise<TimeEntry[]> {
    return db.select().from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.startTime));
  }

  async updateTimeEntry(id: number, data: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [entry] = await db.update(timeEntries)
      .set(data)
      .where(eq(timeEntries.id, id))
      .returning();
    return entry;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries)
      .where(and(
        eq(timeEntries.userId, userId),
        isNull(timeEntries.endTime)
      ))
      .orderBy(desc(timeEntries.startTime))
      .limit(1);
    return entry;
  }

  async stopTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entry = await this.getTimeEntry(id);
    if (!entry || entry.endTime) return entry;
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);
    
    const [updated] = await db.update(timeEntries)
      .set({ endTime, duration })
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  async getTaskTemplates(userId: string, tenantId?: string): Promise<TaskTemplate[]> {
    if (tenantId) {
      return db.select().from(taskTemplates)
        .where(
          and(
            eq(taskTemplates.tenantId, tenantId),
            sql`(${taskTemplates.creatorId} = ${userId} OR ${taskTemplates.isShared} = true)`
          )
        )
        .orderBy(desc(taskTemplates.createdAt));
    }
    return db.select().from(taskTemplates)
      .where(eq(taskTemplates.creatorId, userId))
      .orderBy(desc(taskTemplates.createdAt));
  }

  async getTaskTemplate(id: number, userId?: string, tenantId?: string): Promise<TaskTemplate | undefined> {
    const conditions = [eq(taskTemplates.id, id)];
    if (tenantId) {
      conditions.push(eq(taskTemplates.tenantId, tenantId));
    }
    const [template] = await db.select().from(taskTemplates)
      .where(and(...conditions));
    if (!template) return undefined;
    if (userId && template.creatorId !== userId && !template.isShared) return undefined;
    return template;
  }

  async createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate> {
    const [template] = await db.insert(taskTemplates)
      .values(data)
      .returning();
    return template;
  }

  async updateTaskTemplate(id: number, userId: string, tenantId: string | undefined, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const existing = await this.getTaskTemplate(id, userId, tenantId);
    if (!existing || existing.creatorId !== userId) return undefined;
    
    const [template] = await db.update(taskTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(taskTemplates.id, id))
      .returning();
    return template;
  }

  async deleteTaskTemplate(id: number, userId: string, tenantId?: string): Promise<boolean> {
    const existing = await this.getTaskTemplate(id, userId, tenantId);
    if (!existing || existing.creatorId !== userId) return false;
    
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
    return true;
  }

  // Webhooks
  async getWebhooks(tenantId?: string): Promise<Omit<Webhook, 'secret'>[]> {
    const results = tenantId
      ? await db.select().from(webhooks)
          .where(eq(webhooks.tenantId, tenantId))
          .orderBy(desc(webhooks.createdAt))
      : await db.select().from(webhooks)
          .where(isNull(webhooks.tenantId))
          .orderBy(desc(webhooks.createdAt));
    return results.map(({ secret, ...rest }) => rest);
  }

  async getWebhook(id: number, tenantId?: string): Promise<Webhook | undefined> {
    const conditions = [eq(webhooks.id, id)];
    if (tenantId) {
      conditions.push(eq(webhooks.tenantId, tenantId));
    }
    const [webhook] = await db.select().from(webhooks).where(and(...conditions));
    return webhook;
  }

  async getWebhookPublic(id: number, tenantId?: string): Promise<Omit<Webhook, 'secret'> | undefined> {
    const webhook = await this.getWebhook(id, tenantId);
    if (!webhook) return undefined;
    const { secret, ...rest } = webhook;
    return rest;
  }

  async createWebhook(data: InsertWebhook): Promise<Webhook> {
    const [webhook] = await db.insert(webhooks).values(data).returning();
    return webhook;
  }

  async updateWebhook(id: number, data: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const [webhook] = await db.update(webhooks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return webhook;
  }

  async deleteWebhook(id: number, tenantId?: string): Promise<void> {
    const conditions = [eq(webhooks.id, id)];
    if (tenantId) {
      conditions.push(eq(webhooks.tenantId, tenantId));
    }
    await db.delete(webhooks).where(and(...conditions));
  }

  async getActiveWebhooksForEvent(event: string, tenantId?: string): Promise<Webhook[]> {
    const results = tenantId
      ? await db.select().from(webhooks)
          .where(and(eq(webhooks.tenantId, tenantId), eq(webhooks.isActive, true)))
      : await db.select().from(webhooks)
          .where(and(isNull(webhooks.tenantId), eq(webhooks.isActive, true)));
    return results.filter(w => w.events.includes(event));
  }

  async logWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const [delivery] = await db.insert(webhookDeliveries).values(data).returning();
    return delivery;
  }

  async getWebhookDeliveries(webhookId: number, limit: number = 20): Promise<WebhookDelivery[]> {
    return db.select().from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.deliveredAt))
      .limit(limit);
  }

  // Archived Emails
  async getArchivedEmails(userId: string): Promise<ArchivedEmail[]> {
    return db.select().from(archivedEmails)
      .where(eq(archivedEmails.userId, userId))
      .orderBy(desc(archivedEmails.archivedAt));
  }

  async archiveEmail(data: InsertArchivedEmail): Promise<ArchivedEmail> {
    const [archived] = await db.insert(archivedEmails).values(data).returning();
    return archived;
  }

  async isEmailArchived(userId: string, emailId: string): Promise<boolean> {
    const [existing] = await db.select().from(archivedEmails)
      .where(and(eq(archivedEmails.userId, userId), eq(archivedEmails.emailId, emailId)));
    return !!existing;
  }

  async unarchiveEmail(userId: string, emailId: string): Promise<void> {
    await db.delete(archivedEmails)
      .where(and(eq(archivedEmails.userId, userId), eq(archivedEmails.emailId, emailId)));
  }

  // Archived Slack Messages
  async getArchivedSlackMessages(userId: string): Promise<ArchivedSlackMessage[]> {
    return db.select().from(archivedSlackMessages)
      .where(eq(archivedSlackMessages.userId, userId))
      .orderBy(desc(archivedSlackMessages.archivedAt));
  }

  async archiveSlackMessage(data: InsertArchivedSlackMessage): Promise<ArchivedSlackMessage> {
    const [archived] = await db.insert(archivedSlackMessages).values(data).returning();
    return archived;
  }

  async isSlackMessageArchived(userId: string, messageId: string): Promise<boolean> {
    const [existing] = await db.select().from(archivedSlackMessages)
      .where(and(eq(archivedSlackMessages.userId, userId), eq(archivedSlackMessages.messageId, messageId)));
    return !!existing;
  }

  async unarchiveSlackMessage(userId: string, messageId: string): Promise<void> {
    await db.delete(archivedSlackMessages)
      .where(and(eq(archivedSlackMessages.userId, userId), eq(archivedSlackMessages.messageId, messageId)));
  }

  // Feedback entries
  async createFeedbackEntry(data: InsertFeedbackEntry): Promise<FeedbackEntry> {
    const [entry] = await db.insert(feedbackEntries).values({
      ...data,
      type: data.type as "bug" | "feature",
      status: (data.status || "open") as "open" | "in_progress" | "resolved"
    }).returning();
    return entry;
  }

  async getFeedbackEntriesForTenant(tenantId: string): Promise<(FeedbackEntry & { user: User })[]> {
    const entries = await db.select().from(feedbackEntries)
      .leftJoin(users, eq(feedbackEntries.userId, users.id))
      .where(eq(feedbackEntries.tenantId, tenantId))
      .orderBy(desc(feedbackEntries.createdAt));
    
    return entries.map(e => ({
      ...e.feedback_entries,
      user: e.users!
    }));
  }

  async updateFeedbackStatus(id: number, status: string): Promise<FeedbackEntry | undefined> {
    const [updated] = await db.update(feedbackEntries)
      .set({ status: status as "open" | "in_progress" | "resolved" })
      .where(eq(feedbackEntries.id, id))
      .returning();
    return updated;
  }

  // Shared items (share emails/messages with team)
  async createSharedItem(data: InsertSharedItem): Promise<SharedItem> {
    const [item] = await db.insert(sharedItems).values({
      ...data,
      itemType: data.itemType as "email" | "slack"
    }).returning();
    return item;
  }

  async getSharedItems(tenantId: string): Promise<(SharedItem & { sharedBy: User })[]> {
    const items = await db.select().from(sharedItems)
      .leftJoin(users, eq(sharedItems.sharedByUserId, users.id))
      .where(eq(sharedItems.tenantId, tenantId))
      .orderBy(desc(sharedItems.sharedAt));
    
    return items.map(i => ({
      ...i.shared_items,
      sharedBy: i.users!
    }));
  }

  async deleteSharedItem(id: number, tenantId: string): Promise<void> {
    await db.delete(sharedItems)
      .where(and(eq(sharedItems.id, id), eq(sharedItems.tenantId, tenantId)));
  }

  async migrateProjectColumns(): Promise<void> {
    try {
      await db.delete(projectColumns).where(eq(projectColumns.name, "To Do"));
      console.log("[Migration] Removed 'To Do' columns from all projects");
      
      const allProjects = await db.select().from(projects);
      for (const project of allProjects) {
        const existingNotes = await db.select().from(projectColumns)
          .where(and(
            eq(projectColumns.projectId, project.id),
            eq(projectColumns.name, "Notes")
          ));
        
        if (existingNotes.length === 0) {
          const doneColumn = await db.select().from(projectColumns)
            .where(and(
              eq(projectColumns.projectId, project.id),
              eq(projectColumns.name, "Done")
            ));
          
          const notesOrder = doneColumn.length > 0 ? doneColumn[0].sortOrder + 1 : 99;
          
          await db.insert(projectColumns).values({
            projectId: project.id,
            name: "Notes",
            color: "#8b5cf6",
            sortOrder: notesOrder
          });
          console.log(`[Migration] Added 'Notes' column to project ${project.id}`);
        }
      }
      console.log("[Migration] Project columns migration complete");
    } catch (error) {
      console.error("[Migration] Error migrating project columns:", error);
    }
  }
}

export const storage = new DbStorage();

storage.migrateProjectColumns();
