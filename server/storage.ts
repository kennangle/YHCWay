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
  type SlackDmPreference,
  type InsertSlackDmPreference,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type IntegrationApiKey,
  type Conversation,
  type ConversationParticipant,
  type Message,
  type EmailTemplate,
  type EmailSignature,
  type InsertEmailSignature,
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
  type TaskAttachment,
  type InsertTaskAttachment,
  type TaskCollaborator,
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
  type FeedbackEntry,
  type InsertFeedbackEntry,
  type SharedItem,
  type InsertSharedItem,
  type TaskProject,
  type InsertTaskProject,
  type TaskStory,
  type InsertTaskStory,
  type EventOutbox,
  type InsertEventOutbox,
  type QrCode,
  type InsertQrCode,
  type ChangelogEntry,
  type InsertChangelogEntry,
  type SiteSetting,
  type InsertSiteSetting,
  users,
  services,
  feedItems,
  oauthAccounts,
  slackChannelPreferences,
  slackDmPreferences,
  passwordResetTokens,
  integrationApiKeys,
  conversations,
  conversationParticipants,
  messages,
  emailTemplates,
  emailSignatures,
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
  taskAttachments,
  taskCollaborators,
  projectMembers,
  notificationPreferences,
  notificationLog,
  timeEntries,
  taskTemplates,
  sessions,
  webhooks,
  webhookDeliveries,
  feedbackEntries,
  sharedItems,
  taskProjects,
  taskStories,
  eventOutbox,
  qrCodes,
  extensionTokens,
  ExtensionToken,
  changelogEntries,
  changelogSyncState,
  siteSettings,
  taskDependencies,
  type TaskDependency,
  type InsertTaskDependency,
  dailyHubEntries,
  dailyHubPinnedAnnouncements,
  type DailyHubEntry,
  type InsertDailyHubEntry,
  type DailyHubPinnedAnnouncement,
  type InsertDailyHubPinnedAnnouncement,
  userNotifications,
  type UserNotification,
  type InsertUserNotification,
  loginAttempts,
  emailVerificationTokens,
  twoFactorSecrets,
  type LoginAttempt,
  type InsertLoginAttempt,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type TwoFactorSecret,
  type InsertTwoFactorSecret,
  serviceCorrelations,
  type ServiceCorrelation,
  type InsertServiceCorrelation,
  notificationGroups,
  type NotificationGroup,
  type InsertNotificationGroup,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, isNull, sql, inArray, gte, lte, or, asc } from "drizzle-orm";
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
  updateUserProfile(id: string, firstName: string, lastName: string): Promise<User | undefined>;
  updateUserYHCTimeLink(id: string, employeeId: string | null, employeeName: string | null): Promise<User | undefined>;
  markTourCompleted(id: string): Promise<User | undefined>;
  recordUserLogin(id: string): Promise<User | undefined>;
  getActiveSessions(): Promise<string[]>;
  deleteUser(id: string): Promise<void>;
  
  getOAuthAccount(userId: string, provider: string): Promise<OAuthAccount | undefined>;
  getOAuthAccountById(id: number): Promise<OAuthAccount | undefined>;
  getOAuthAccountByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | undefined>;
  listOAuthAccounts(userId: string, provider: string): Promise<OAuthAccount[]>;
  countOAuthAccounts(userId: string, provider: string): Promise<number>;
  createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount>;
  upsertOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  upsertOAuthAccountByProviderAccountId(account: InsertOAuthAccount): Promise<OAuthAccount>;
  updateOAuthAccountLabel(id: number, label: string): Promise<OAuthAccount | undefined>;
  setOAuthAccountPrimary(userId: string, provider: string, accountId: number): Promise<void>;
  deleteOAuthAccount(userId: string, provider: string): Promise<void>;
  deleteOAuthAccountById(id: number): Promise<void>;
  
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
  
  // Slack DM preferences
  getSlackDmPreferences(userId: string): Promise<SlackDmPreference[]>;
  saveSlackDmPreferences(userId: string, preferences: { conversationId: string; conversationName: string; isEnabled: boolean }[]): Promise<void>;
  
  // Password reset tokens
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  
  // Extension tokens
  createExtensionToken(data: { userId: string; token: string; deviceLabel?: string; expiresAt: Date }): Promise<ExtensionToken>;
  getExtensionToken(token: string): Promise<ExtensionToken | undefined>;
  getExtensionTokenByUserId(userId: string): Promise<ExtensionToken | undefined>;
  updateExtensionTokenLastUsed(token: string): Promise<void>;
  deleteExtensionTokensForUser(userId: string): Promise<void>;
  
  // Changelog entries
  createChangelogEntry(entry: InsertChangelogEntry): Promise<ChangelogEntry>;
  getChangelogEntries(from: Date, to: Date): Promise<ChangelogEntry[]>;
  getChangelogEntryByHash(hash: string): Promise<ChangelogEntry | undefined>;
  getLastSyncedCommitHash(): Promise<string | null>;
  updateLastSyncedCommitHash(hash: string): Promise<void>;
  getUnannouncedChangelogEntries(): Promise<ChangelogEntry[]>;
  markChangelogEntriesAnnounced(ids: number[]): Promise<void>;
  
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
  
  sendMessage(conversationId: number, senderId: string, content: string, parentId?: number, fileUrl?: string, fileName?: string, fileType?: string): Promise<Message>;
  getConversationMessages(conversationId: number, limit?: number, before?: number): Promise<(Message & { replyCount?: number })[]>;
  getThreadReplies(parentId: number): Promise<Message[]>;
  markConversationRead(userId: string, conversationId: number): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Email templates
  getEmailTemplate(templateType: string): Promise<EmailTemplate | undefined>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  upsertEmailTemplate(templateType: string, subject: string, htmlContent: string): Promise<EmailTemplate>;
  
  // Email signatures
  getUserEmailSignatures(userId: string): Promise<EmailSignature[]>;
  getEmailSignature(id: number): Promise<EmailSignature | undefined>;
  getDefaultEmailSignature(userId: string): Promise<EmailSignature | undefined>;
  getEmailSignatureByAccount(userId: string, accountId: number): Promise<EmailSignature | undefined>;
  createEmailSignature(data: InsertEmailSignature): Promise<EmailSignature>;
  updateEmailSignature(id: number, data: Partial<InsertEmailSignature>): Promise<EmailSignature | undefined>;
  deleteEmailSignature(id: number): Promise<void>;
  setDefaultEmailSignature(userId: string, signatureId: number): Promise<void>;
  
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
  
  // Project stats (multi-homing aware)
  getProjectTaskStats(projectIds: number[]): Promise<Record<number, { total: number; completed: number }>>;
  
  // Tasks
  createTask(data: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getProjectTasks(projectId: number): Promise<Task[]>;
  getUserTasks(userId: string, tenantId?: string): Promise<Task[]>;
  getAllUserTasks(userId: string, tenantId?: string): Promise<Task[]>;
  getUpcomingTasks(userId: string, days?: number): Promise<Task[]>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  archiveTask(id: number): Promise<Task | undefined>;
  unarchiveTask(id: number): Promise<Task | undefined>;
  getArchivedTasks(projectId: number): Promise<Task[]>;
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
  
  // Task attachments
  getTaskAttachments(taskId: number): Promise<(TaskAttachment & { uploader: User })[]>;
  createTaskAttachment(data: InsertTaskAttachment): Promise<TaskAttachment>;
  deleteTaskAttachment(id: number): Promise<void>;
  
  // Task collaborators (sharing tasks with team members)
  getTaskCollaborators(taskId: number): Promise<(TaskCollaborator & { user: User })[]>;
  addTaskCollaborator(taskId: number, userId: string, addedById: string, role?: string): Promise<TaskCollaborator>;
  removeTaskCollaborator(taskId: number, userId: string): Promise<void>;
  getSharedTasks(userId: string, tenantId?: string): Promise<Task[]>;
  
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
  
  // Multi-homing + placement (Asana-style)
  addTaskToProject(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
    columnId?: number | null;
    sortOrder?: number;
    orderKey?: string | null;
    addedBy: string;
  }): Promise<void>;
  
  removeTaskFromProject(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
  }): Promise<void>;
  
  updateTaskPlacement(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
    columnId: number | null;
    sortOrder?: number;
    orderKey?: string | null;
    movedBy: string;
  }): Promise<void>;
  
  getProjectTaskPlacements(projectId: number, tenantId: string | null): Promise<Array<{
    task: Task;
    projectId: number;
    columnId: number | null;
    sortOrder: number;
    orderKey: string | null;
  }>>;
  
  // Task dependencies
  getTaskDependencies(taskId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
    dependsOnTask: Task;
  }>>;
  getTaskDependents(taskId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
    dependentTask: Task;
  }>>;
  getProjectDependencies(projectId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
  }>>;
  addTaskDependency(taskId: number, dependsOnTaskId: number, dependencyType?: string): Promise<{ id: number }>;
  removeTaskDependency(id: number): Promise<void>;
  
  // Task stories (unified comments + activity)
  getTaskStories(taskId: number, tenantId: string | null): Promise<Array<{
    id: number;
    storyType: string;
    authorId: string | null;
    createdAt: Date;
    body: string | null;
    activityType: string | null;
    activityPayload: unknown;
    isEdited: boolean;
    editedAt: Date | null;
  }>>;
  
  createTaskStoryComment(params: {
    tenantId: string;
    taskId: number;
    authorId: string;
    body: string;
  }): Promise<{ id: number }>;
  
  createTaskStoryActivity(params: {
    tenantId: string;
    taskId: number;
    activityType: string;
    activityPayload: unknown;
    actorId?: string | null;
  }): Promise<{ id: number }>;
  
  // Event outbox
  enqueueOutboxEvent(params: {
    tenantId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
  }): Promise<void>;
  
  claimNextOutboxEvent(tenantId?: string): Promise<{
    id: number;
    tenantId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
  } | null>;
  
  markOutboxPublished(id: number): Promise<void>;
  
  // QR codes
  createQrCode(data: InsertQrCode): Promise<QrCode>;
  getUserQrCodes(userId: string): Promise<QrCode[]>;
  deleteQrCode(id: number): Promise<void>;
  
  // Daily Hub
  getDailyHubEntries(date: string): Promise<DailyHubEntry[]>;
  createDailyHubEntry(data: InsertDailyHubEntry): Promise<DailyHubEntry>;
  updateDailyHubEntry(id: number, content: string): Promise<DailyHubEntry | undefined>;
  deleteDailyHubEntry(id: number): Promise<void>;
  getPinnedAnnouncements(date: string): Promise<DailyHubPinnedAnnouncement[]>;
  createPinnedAnnouncement(data: InsertDailyHubPinnedAnnouncement): Promise<DailyHubPinnedAnnouncement>;
  updatePinnedAnnouncement(id: number, data: Partial<InsertDailyHubPinnedAnnouncement>): Promise<DailyHubPinnedAnnouncement | undefined>;
  deletePinnedAnnouncement(id: number): Promise<void>;
  
  // User Notifications (in-app alerts)
  createUserNotification(data: Omit<InsertUserNotification, 'id' | 'createdAt'>): Promise<UserNotification>;
  getUserNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number; tenantId?: string }): Promise<(UserNotification & { actor?: User })[]>;
  markUserNotificationRead(id: string, userId: string, tenantId?: string): Promise<UserNotification | undefined>;
  dismissUserNotification(id: string, userId: string, tenantId?: string): Promise<UserNotification | undefined>;
  markAllUserNotificationsRead(userId: string, tenantId?: string): Promise<void>;
  getUnreadUserNotificationCount(userId: string, tenantId?: string): Promise<number>;
  cleanupExpiredUserNotifications(): Promise<number>;
  broadcastAnnouncement(data: { type: string; title: string; body?: string; metadata?: Record<string, any> }): Promise<number>;
  
  // Cross-service correlations
  getCorrelationsForEvent(userId: string, eventId: string): Promise<ServiceCorrelation[]>;
  saveCorrelation(correlation: InsertServiceCorrelation): Promise<ServiceCorrelation>;
  saveCorrelations(correlations: InsertServiceCorrelation[]): Promise<ServiceCorrelation[]>;
  deleteCorrelationsForEvent(userId: string, eventId: string): Promise<void>;
  getCorrelationsByDate(userId: string, date: Date): Promise<ServiceCorrelation[]>;
  
  // Notification groups
  getNotificationGroups(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationGroup[]>;
  getNotificationGroup(userId: string, groupKey: string): Promise<NotificationGroup | undefined>;
  createOrUpdateNotificationGroup(data: InsertNotificationGroup): Promise<NotificationGroup>;
  markNotificationGroupRead(userId: string, groupId: number): Promise<void>;
  dismissNotificationGroup(userId: string, groupId: number): Promise<void>;
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

  async updateUserProfile(id: string, firstName: string, lastName: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ firstName, lastName, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserYHCTimeLink(id: string, employeeId: string | null, employeeName: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        yhctimeEmployeeId: employeeId, 
        yhctimeEmployeeName: employeeName, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async markTourCompleted(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ hasCompletedTour: true, updatedAt: new Date() })
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
      )
      .orderBy(desc(oauthAccounts.isPrimary))
      .limit(1);
    return account;
  }

  async getOAuthAccountById(id: number): Promise<OAuthAccount | undefined> {
    const [account] = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.id, id));
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

  async listOAuthAccounts(userId: string, provider: string): Promise<OAuthAccount[]> {
    return await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        )
      )
      .orderBy(desc(oauthAccounts.isPrimary), asc(oauthAccounts.createdAt));
  }

  async countOAuthAccounts(userId: string, provider: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        )
      );
    return Number(result[0]?.count || 0);
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

  async upsertOAuthAccountByProviderAccountId(account: InsertOAuthAccount): Promise<OAuthAccount> {
    const existing = await this.getOAuthAccountByProvider(account.provider, account.providerAccountId);
    
    if (existing) {
      const [updated] = await db
        .update(oauthAccounts)
        .set({
          accessToken: account.accessToken,
          refreshToken: account.refreshToken || existing.refreshToken,
          expiresAt: account.expiresAt,
          label: account.label || existing.label,
        })
        .where(eq(oauthAccounts.id, existing.id))
        .returning();
      return updated;
    }
    
    return this.createOAuthAccount(account);
  }

  async updateOAuthAccountLabel(id: number, label: string): Promise<OAuthAccount | undefined> {
    const [updated] = await db
      .update(oauthAccounts)
      .set({ label })
      .where(eq(oauthAccounts.id, id))
      .returning();
    return updated;
  }

  async setOAuthAccountPrimary(userId: string, provider: string, accountId: number): Promise<void> {
    await db
      .update(oauthAccounts)
      .set({ isPrimary: false })
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        )
      );
    
    await db
      .update(oauthAccounts)
      .set({ isPrimary: true })
      .where(eq(oauthAccounts.id, accountId));
  }

  async deleteOAuthAccountById(id: number): Promise<void> {
    await db.delete(oauthAccounts).where(eq(oauthAccounts.id, id));
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

  async getSlackDmPreferences(userId: string): Promise<SlackDmPreference[]> {
    return await db.select()
      .from(slackDmPreferences)
      .where(eq(slackDmPreferences.userId, userId));
  }

  async saveSlackDmPreferences(
    userId: string, 
    preferences: { conversationId: string; conversationName: string; isEnabled: boolean }[]
  ): Promise<void> {
    await db.delete(slackDmPreferences)
      .where(eq(slackDmPreferences.userId, userId));
    
    if (preferences.length > 0) {
      await db.insert(slackDmPreferences)
        .values(preferences.map(p => ({
          userId,
          conversationId: p.conversationId,
          conversationName: p.conversationName,
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

  async createExtensionToken(data: { userId: string; token: string; deviceLabel?: string; expiresAt: Date }): Promise<ExtensionToken> {
    const [extToken] = await db.insert(extensionTokens)
      .values({
        userId: data.userId,
        token: data.token,
        deviceLabel: data.deviceLabel,
        expiresAt: data.expiresAt,
      })
      .returning();
    return extToken;
  }

  async getExtensionToken(token: string): Promise<ExtensionToken | undefined> {
    const [extToken] = await db.select()
      .from(extensionTokens)
      .where(eq(extensionTokens.token, token));
    return extToken;
  }

  async getExtensionTokenByUserId(userId: string): Promise<ExtensionToken | undefined> {
    const [extToken] = await db.select()
      .from(extensionTokens)
      .where(eq(extensionTokens.userId, userId));
    return extToken;
  }

  async updateExtensionTokenLastUsed(token: string): Promise<void> {
    await db.update(extensionTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(extensionTokens.token, token));
  }

  async deleteExtensionTokensForUser(userId: string): Promise<void> {
    await db.delete(extensionTokens)
      .where(eq(extensionTokens.userId, userId));
  }

  async createChangelogEntry(entry: InsertChangelogEntry): Promise<ChangelogEntry> {
    const [created] = await db.insert(changelogEntries).values(entry).returning();
    return created;
  }

  async getChangelogEntries(from: Date, to: Date): Promise<ChangelogEntry[]> {
    return db.select()
      .from(changelogEntries)
      .where(and(
        gte(changelogEntries.entryDate, from),
        lte(changelogEntries.entryDate, to)
      ))
      .orderBy(desc(changelogEntries.entryDate));
  }

  async getChangelogEntryByHash(hash: string): Promise<ChangelogEntry | undefined> {
    const [entry] = await db.select()
      .from(changelogEntries)
      .where(eq(changelogEntries.commitHash, hash));
    return entry;
  }

  async getLastSyncedCommitHash(): Promise<string | null> {
    const [state] = await db.select().from(changelogSyncState).limit(1);
    return state?.lastCommitHash ?? null;
  }

  async updateLastSyncedCommitHash(hash: string): Promise<void> {
    const [existing] = await db.select().from(changelogSyncState).limit(1);
    if (existing) {
      await db.update(changelogSyncState)
        .set({ lastCommitHash: hash, lastSyncAt: new Date() })
        .where(eq(changelogSyncState.id, existing.id));
    } else {
      await db.insert(changelogSyncState).values({ lastCommitHash: hash });
    }
  }

  async getUnannouncedChangelogEntries(): Promise<ChangelogEntry[]> {
    return db.select()
      .from(changelogEntries)
      .where(isNull(changelogEntries.announcedAt))
      .orderBy(desc(changelogEntries.entryDate));
  }

  async markChangelogEntriesAnnounced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(changelogEntries)
      .set({ announcedAt: new Date() })
      .where(inArray(changelogEntries.id, ids));
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

  async sendMessage(conversationId: number, senderId: string, content: string, parentId?: number, fileUrl?: string, fileName?: string, fileType?: string): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({ conversationId, senderId, content, parentId, fileUrl, fileName, fileType })
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

  // Email signatures
  async getUserEmailSignatures(userId: string): Promise<EmailSignature[]> {
    return await db.select()
      .from(emailSignatures)
      .where(eq(emailSignatures.userId, userId))
      .orderBy(desc(emailSignatures.isDefault), desc(emailSignatures.createdAt));
  }

  async getEmailSignature(id: number): Promise<EmailSignature | undefined> {
    const [signature] = await db.select()
      .from(emailSignatures)
      .where(eq(emailSignatures.id, id));
    return signature;
  }

  async getDefaultEmailSignature(userId: string): Promise<EmailSignature | undefined> {
    const [signature] = await db.select()
      .from(emailSignatures)
      .where(and(eq(emailSignatures.userId, userId), eq(emailSignatures.isDefault, true)));
    return signature;
  }

  async getEmailSignatureByAccount(userId: string, accountId: number): Promise<EmailSignature | undefined> {
    const [signature] = await db.select()
      .from(emailSignatures)
      .where(and(
        eq(emailSignatures.userId, userId),
        eq(emailSignatures.gmailAccountId, accountId)
      ));
    return signature;
  }

  async createEmailSignature(data: InsertEmailSignature): Promise<EmailSignature> {
    // If this is the first signature or marked as default, ensure it's the only default
    if (data.isDefault) {
      await db.update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.userId, data.userId));
    }
    
    const [signature] = await db.insert(emailSignatures)
      .values(data)
      .returning();
    return signature;
  }

  async updateEmailSignature(id: number, data: Partial<InsertEmailSignature>): Promise<EmailSignature | undefined> {
    const existing = await this.getEmailSignature(id);
    if (!existing) return undefined;

    // If setting as default, unset other defaults for this user
    if (data.isDefault) {
      await db.update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.userId, existing.userId));
    }

    const [updated] = await db.update(emailSignatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailSignatures.id, id))
      .returning();
    return updated;
  }

  async deleteEmailSignature(id: number): Promise<void> {
    await db.delete(emailSignatures)
      .where(eq(emailSignatures.id, id));
  }

  async setDefaultEmailSignature(userId: string, signatureId: number): Promise<void> {
    // Unset all defaults for this user
    await db.update(emailSignatures)
      .set({ isDefault: false })
      .where(eq(emailSignatures.userId, userId));
    
    // Set the new default
    await db.update(emailSignatures)
      .set({ isDefault: true })
      .where(and(eq(emailSignatures.id, signatureId), eq(emailSignatures.userId, userId)));
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
  
  async getProjectTaskStats(projectIds: number[]): Promise<Record<number, { total: number; completed: number }>> {
    if (projectIds.length === 0) return {};
    
    const result: Record<number, { total: number; completed: number }> = {};
    for (const projectId of projectIds) {
      result[projectId] = { total: 0, completed: 0 };
    }
    
    const placements = await db.select({
      projectId: taskProjects.projectId,
      isCompleted: tasks.isCompleted,
    })
    .from(taskProjects)
    .innerJoin(tasks, eq(taskProjects.taskId, tasks.id))
    .where(inArray(taskProjects.projectId, projectIds));
    
    for (const p of placements) {
      if (result[p.projectId]) {
        result[p.projectId].total++;
        if (p.isCompleted) {
          result[p.projectId].completed++;
        }
      }
    }
    
    return result;
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
    // Get tasks where user is assignee or creator
    let conditions = [or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId))];
    if (tenantId) {
      conditions.push(eq(tasks.tenantId, tenantId));
    }
    const ownedTasks = await db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.dueDate, tasks.sortOrder);

    // Get tasks shared with user (collaborator)
    const sharedTasks = await this.getSharedTasks(userId, tenantId);
    
    // Merge and deduplicate by task id
    const taskMap = new Map<number, Task>();
    for (const task of ownedTasks) {
      taskMap.set(task.id, task);
    }
    for (const task of sharedTasks) {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    }
    
    // Return sorted by due date
    return Array.from(taskMap.values()).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
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

  async archiveTask(id: number): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ isArchived: true, archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async unarchiveTask(id: number): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ isArchived: false, archivedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getArchivedTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.projectId, projectId),
        eq(tasks.isArchived, true)
      ))
      .orderBy(desc(tasks.archivedAt));
  }

  async moveTask(taskId: number, columnId: number, sortOrder: number): Promise<Task | undefined> {
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).then(r => r[0]);
    if (!task) return undefined;

    const [updated] = await db.update(tasks)
      .set({ columnId, sortOrder, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    const tenantId = task.tenantId;
    const projectId = task.projectId;

    if (tenantId && projectId) {
      try {
        await this.updateTaskPlacement({
          tenantId,
          taskId,
          projectId,
          columnId,
          sortOrder,
          movedBy: "SYSTEM_COMPAT",
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "TASK_NOT_IN_PROJECT") {
          await this.addTaskToProject({
            tenantId,
            taskId,
            projectId,
            columnId,
            sortOrder,
            addedBy: "SYSTEM_COMPAT",
          });
        } else {
          throw e;
        }
      }
    }

    return updated;
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

  // Task attachments
  async getTaskAttachments(taskId: number): Promise<(TaskAttachment & { uploader: User })[]> {
    const results = await db.select()
      .from(taskAttachments)
      .innerJoin(users, eq(taskAttachments.uploaderId, users.id))
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(taskAttachments.createdAt);
    return results.map(r => ({
      ...r.task_attachments,
      uploader: r.users,
    }));
  }

  async createTaskAttachment(data: InsertTaskAttachment): Promise<TaskAttachment> {
    const [attachment] = await db.insert(taskAttachments)
      .values(data)
      .returning();
    return attachment;
  }

  async deleteTaskAttachment(id: number): Promise<void> {
    await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  }

  // Task collaborators
  async getTaskCollaborators(taskId: number): Promise<(TaskCollaborator & { user: User })[]> {
    const collaborators = await db.select()
      .from(taskCollaborators)
      .innerJoin(users, eq(taskCollaborators.userId, users.id))
      .where(eq(taskCollaborators.taskId, taskId))
      .orderBy(taskCollaborators.addedAt);
    
    return collaborators.map(c => ({
      ...c.task_collaborators,
      user: c.users,
    }));
  }

  async addTaskCollaborator(taskId: number, userId: string, addedById: string, role: string = "viewer"): Promise<TaskCollaborator> {
    // Check if already a collaborator
    const [existing] = await db.select().from(taskCollaborators)
      .where(and(eq(taskCollaborators.taskId, taskId), eq(taskCollaborators.userId, userId)));
    
    if (existing) {
      // Update role if exists
      const [updated] = await db.update(taskCollaborators)
        .set({ role })
        .where(eq(taskCollaborators.id, existing.id))
        .returning();
      return updated;
    }
    
    const [collaborator] = await db.insert(taskCollaborators)
      .values({ taskId, userId, addedById, role })
      .returning();
    return collaborator;
  }

  async removeTaskCollaborator(taskId: number, userId: string): Promise<void> {
    await db.delete(taskCollaborators)
      .where(and(eq(taskCollaborators.taskId, taskId), eq(taskCollaborators.userId, userId)));
  }

  async getSharedTasks(userId: string, tenantId?: string): Promise<Task[]> {
    // Get tasks where user is a collaborator (not creator or assignee)
    // Filter by tenant if provided
    const conditions = [eq(taskCollaborators.userId, userId)];
    if (tenantId) {
      conditions.push(eq(tasks.tenantId, tenantId));
    }
    
    const results = await db.select({ task: tasks })
      .from(taskCollaborators)
      .innerJoin(tasks, eq(taskCollaborators.taskId, tasks.id))
      .where(and(...conditions));
    
    return results.map(r => r.task);
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

  // Multi-homing + placement (Asana-style)
  private orderKeyFromSortOrder(n: number): string {
    return String(n).padStart(10, "0");
  }

  async addTaskToProject(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
    columnId?: number | null;
    sortOrder?: number;
    orderKey?: string | null;
    addedBy: string;
  }): Promise<void> {
    const sortOrder = params.sortOrder ?? 0;
    const orderKey = params.orderKey ?? this.orderKeyFromSortOrder(sortOrder);

    await db
      .insert(taskProjects)
      .values({
        tenantId: params.tenantId,
        taskId: params.taskId,
        projectId: params.projectId,
        columnId: params.columnId ?? null,
        sortOrder,
        orderKey,
        addedBy: params.addedBy,
      })
      .onConflictDoUpdate({
        target: [taskProjects.taskId, taskProjects.projectId],
        set: {
          columnId: params.columnId ?? null,
          sortOrder,
          orderKey,
        },
      });
  }

  async removeTaskFromProject(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
  }): Promise<void> {
    await db
      .delete(taskProjects)
      .where(
        and(
          eq(taskProjects.tenantId, params.tenantId),
          eq(taskProjects.taskId, params.taskId),
          eq(taskProjects.projectId, params.projectId)
        )
      );
  }

  async updateTaskPlacement(params: {
    tenantId: string;
    taskId: number;
    projectId: number;
    columnId: number | null;
    sortOrder?: number;
    orderKey?: string | null;
    movedBy: string;
  }): Promise<void> {
    const sortOrder = params.sortOrder ?? 0;
    const orderKey = params.orderKey ?? this.orderKeyFromSortOrder(sortOrder);

    const updated = await db
      .update(taskProjects)
      .set({
        columnId: params.columnId,
        sortOrder,
        orderKey,
      })
      .where(
        and(
          eq(taskProjects.tenantId, params.tenantId),
          eq(taskProjects.taskId, params.taskId),
          eq(taskProjects.projectId, params.projectId)
        )
      )
      .returning({ taskId: taskProjects.taskId });

    if (updated.length === 0) {
      throw new Error("TASK_NOT_IN_PROJECT");
    }

    await this.enqueueOutboxEvent({
      tenantId: params.tenantId,
      eventType: "task.moved",
      entityType: "task",
      entityId: `task:${params.taskId}`,
      payload: {
        taskId: params.taskId,
        projectId: params.projectId,
        columnId: params.columnId,
        sortOrder,
        orderKey,
        movedBy: params.movedBy,
      },
    });
  }

  async getProjectTaskPlacements(projectId: number, tenantId: string | null): Promise<Array<{
    task: Task;
    projectId: number;
    columnId: number | null;
    sortOrder: number;
    orderKey: string | null;
  }>> {
    const baseCondition = tenantId 
      ? and(eq(taskProjects.tenantId, tenantId), eq(taskProjects.projectId, projectId))
      : eq(taskProjects.projectId, projectId);
    
    // Filter out archived tasks
    const whereConditions = and(baseCondition, eq(tasks.isArchived, false));
      
    const rows = await db
      .select({
        task: tasks,
        projectId: taskProjects.projectId,
        columnId: taskProjects.columnId,
        sortOrder: taskProjects.sortOrder,
        orderKey: taskProjects.orderKey,
      })
      .from(taskProjects)
      .innerJoin(tasks, eq(tasks.id, taskProjects.taskId))
      .where(whereConditions)
      .orderBy(asc(taskProjects.columnId), asc(taskProjects.orderKey), asc(taskProjects.sortOrder));

    return rows;
  }

  async getTaskProjects(taskId: number, tenantId: string): Promise<Array<{
    projectId: number;
    projectName: string;
    columnId: number | null;
    columnName: string | null;
    sortOrder: number;
  }>> {
    const rows = await db
      .select({
        projectId: taskProjects.projectId,
        projectName: projects.name,
        columnId: taskProjects.columnId,
        sortOrder: taskProjects.sortOrder,
      })
      .from(taskProjects)
      .innerJoin(projects, eq(projects.id, taskProjects.projectId))
      .where(and(eq(taskProjects.tenantId, tenantId), eq(taskProjects.taskId, taskId)));

    const result: Array<{
      projectId: number;
      projectName: string;
      columnId: number | null;
      columnName: string | null;
      sortOrder: number;
    }> = [];

    for (const row of rows) {
      let columnName: string | null = null;
      if (row.columnId) {
        const col = await db
          .select({ name: projectColumns.name })
          .from(projectColumns)
          .where(eq(projectColumns.id, row.columnId))
          .limit(1);
        columnName = col[0]?.name ?? null;
      }
      result.push({
        projectId: row.projectId,
        projectName: row.projectName,
        columnId: row.columnId,
        columnName,
        sortOrder: row.sortOrder,
      });
    }

    return result;
  }

  // Task dependencies
  async getTaskDependencies(taskId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
    dependsOnTask: Task;
  }>> {
    const deps = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, taskId));
    
    const result = [];
    for (const dep of deps) {
      const task = await this.getTask(dep.dependsOnTaskId);
      if (task) {
        result.push({
          id: dep.id,
          taskId: dep.taskId,
          dependsOnTaskId: dep.dependsOnTaskId,
          dependencyType: dep.dependencyType || "finish_to_start",
          dependsOnTask: task,
        });
      }
    }
    return result;
  }

  async getTaskDependents(taskId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
    dependentTask: Task;
  }>> {
    const deps = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.dependsOnTaskId, taskId));
    
    const result = [];
    for (const dep of deps) {
      const task = await this.getTask(dep.taskId);
      if (task) {
        result.push({
          id: dep.id,
          taskId: dep.taskId,
          dependsOnTaskId: dep.dependsOnTaskId,
          dependencyType: dep.dependencyType || "finish_to_start",
          dependentTask: task,
        });
      }
    }
    return result;
  }

  async addTaskDependency(taskId: number, dependsOnTaskId: number, dependencyType: string = "finish_to_start"): Promise<{ id: number }> {
    const [row] = await db
      .insert(taskDependencies)
      .values({
        taskId,
        dependsOnTaskId,
        dependencyType,
      })
      .returning({ id: taskDependencies.id });
    return row;
  }

  async removeTaskDependency(id: number): Promise<void> {
    await db.delete(taskDependencies).where(eq(taskDependencies.id, id));
  }

  async getProjectDependencies(projectId: number): Promise<Array<{
    id: number;
    taskId: number;
    dependsOnTaskId: number;
    dependencyType: string;
  }>> {
    const projectTasks = await this.getProjectTasks(projectId);
    const taskIds = projectTasks.map(t => t.id);
    
    if (taskIds.length === 0) return [];
    
    const deps = await db
      .select()
      .from(taskDependencies)
      .where(inArray(taskDependencies.taskId, taskIds));
    
    return deps.map(dep => ({
      id: dep.id,
      taskId: dep.taskId,
      dependsOnTaskId: dep.dependsOnTaskId,
      dependencyType: dep.dependencyType || "finish_to_start",
    }));
  }

  // Task stories (unified comments + activity)
  async getTaskStories(taskId: number, tenantId: string): Promise<Array<{
    id: number;
    storyType: string;
    authorId: string | null;
    createdAt: Date;
    body: string | null;
    activityType: string | null;
    activityPayload: unknown;
    isEdited: boolean;
    editedAt: Date | null;
  }>> {
    return db
      .select({
        id: taskStories.id,
        storyType: taskStories.storyType,
        authorId: taskStories.authorId,
        createdAt: taskStories.createdAt,
        body: taskStories.body,
        activityType: taskStories.activityType,
        activityPayload: taskStories.activityPayload,
        isEdited: taskStories.isEdited,
        editedAt: taskStories.editedAt,
      })
      .from(taskStories)
      .where(and(eq(taskStories.tenantId, tenantId), eq(taskStories.taskId, taskId)))
      .orderBy(asc(taskStories.createdAt));
  }

  async createTaskStoryComment(params: {
    tenantId: string;
    taskId: number;
    authorId: string;
    body: string;
  }): Promise<{ id: number }> {
    const [row] = await db
      .insert(taskStories)
      .values({
        tenantId: params.tenantId,
        taskId: params.taskId,
        storyType: "comment",
        authorId: params.authorId,
        body: params.body,
      })
      .returning({ id: taskStories.id });

    await this.enqueueOutboxEvent({
      tenantId: params.tenantId,
      eventType: "story.created",
      entityType: "story",
      entityId: `story:${row.id}`,
      payload: { storyId: row.id, taskId: params.taskId, authorId: params.authorId },
    });

    return row;
  }

  async createTaskStoryActivity(params: {
    tenantId: string;
    taskId: number;
    activityType: string;
    activityPayload: unknown;
    actorId?: string | null;
  }): Promise<{ id: number }> {
    const [row] = await db
      .insert(taskStories)
      .values({
        tenantId: params.tenantId,
        taskId: params.taskId,
        storyType: "activity",
        authorId: params.actorId ?? null,
        activityType: params.activityType,
        activityPayload: params.activityPayload,
      })
      .returning({ id: taskStories.id });

    return row;
  }

  // Event outbox
  async enqueueOutboxEvent(params: {
    tenantId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
  }): Promise<void> {
    await db.insert(eventOutbox).values({
      tenantId: params.tenantId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
    });
  }

  async claimNextOutboxEvent(tenantId?: string): Promise<{
    id: number;
    tenantId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
  } | null> {
    const whereTenant = tenantId
      ? sql`AND tenant_id = ${tenantId}`
      : sql``;

    const result = await db.execute(sql`
      WITH next_evt AS (
        SELECT id
        FROM event_outbox
        WHERE published_at IS NULL
        ${whereTenant}
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      SELECT eo.*
      FROM event_outbox eo
      JOIN next_evt ne ON ne.id = eo.id
    `);

    const rows = (result as { rows?: unknown[] }).rows ?? result;

    if (!rows || (rows as unknown[]).length === 0) return null;

    const evt = (rows as Record<string, unknown>[])[0];
    return {
      id: Number(evt.id),
      tenantId: String(evt.tenant_id),
      eventType: String(evt.event_type),
      entityType: String(evt.entity_type),
      entityId: String(evt.entity_id),
      payload: evt.payload,
    };
  }

  async markOutboxPublished(id: number): Promise<void> {
    await db.update(eventOutbox).set({ publishedAt: new Date() }).where(eq(eventOutbox.id, id));
  }

  // QR codes
  async createQrCode(data: InsertQrCode): Promise<QrCode> {
    const [qrCode] = await db.insert(qrCodes).values(data).returning();
    return qrCode;
  }

  async getUserQrCodes(userId: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes).where(eq(qrCodes.userId, userId)).orderBy(desc(qrCodes.createdAt));
  }

  async deleteQrCode(id: number): Promise<void> {
    await db.delete(qrCodes).where(eq(qrCodes.id, id));
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
  async migrateTaskPlacements(): Promise<void> {
    try {
      const existingPlacements = await db.select().from(taskProjects).limit(1);
      if (existingPlacements.length > 0) {
        console.log("[Migration] Task placements already exist, skipping migration");
        return;
      }

      const allTasks = await db.select().from(tasks);
      let migrated = 0;
      
      for (const task of allTasks) {
        if (task.projectId && task.tenantId) {
          try {
            await db.insert(taskProjects).values({
              tenantId: task.tenantId,
              taskId: task.id,
              projectId: task.projectId,
              columnId: task.columnId,
              sortOrder: task.sortOrder ?? 0,
              orderKey: String(task.sortOrder ?? 0).padStart(10, "0"),
              addedBy: task.creatorId,
            }).onConflictDoNothing();
            migrated++;
          } catch (e) {
            console.error(`[Migration] Failed to migrate task ${task.id}:`, e);
          }
        }
      }
      
      console.log(`[Migration] Migrated ${migrated} tasks to task_projects table`);
    } catch (error) {
      console.error("[Migration] Error migrating task placements:", error);
    }
  }

  async getSiteSetting(key: string): Promise<SiteSetting | null> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting || null;
  }

  async upsertSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const [setting] = await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  // Daily Hub methods
  async getDailyHubEntries(date: string): Promise<DailyHubEntry[]> {
    return await db
      .select()
      .from(dailyHubEntries)
      .where(eq(dailyHubEntries.date, date))
      .orderBy(asc(dailyHubEntries.createdAt));
  }

  async createDailyHubEntry(data: InsertDailyHubEntry): Promise<DailyHubEntry> {
    const [entry] = await db.insert(dailyHubEntries).values(data).returning();
    return entry;
  }

  async updateDailyHubEntry(id: number, content: string): Promise<DailyHubEntry | undefined> {
    const [entry] = await db
      .update(dailyHubEntries)
      .set({ content, updatedAt: new Date() })
      .where(eq(dailyHubEntries.id, id))
      .returning();
    return entry;
  }

  async deleteDailyHubEntry(id: number): Promise<void> {
    await db.delete(dailyHubEntries).where(eq(dailyHubEntries.id, id));
  }

  async getPinnedAnnouncements(date: string): Promise<DailyHubPinnedAnnouncement[]> {
    return await db
      .select()
      .from(dailyHubPinnedAnnouncements)
      .where(
        and(
          eq(dailyHubPinnedAnnouncements.isActive, true),
          lte(dailyHubPinnedAnnouncements.startDate, date),
          or(
            isNull(dailyHubPinnedAnnouncements.endDate),
            gte(dailyHubPinnedAnnouncements.endDate, date)
          )
        )
      )
      .orderBy(asc(dailyHubPinnedAnnouncements.createdAt));
  }

  async createPinnedAnnouncement(data: InsertDailyHubPinnedAnnouncement): Promise<DailyHubPinnedAnnouncement> {
    const [announcement] = await db.insert(dailyHubPinnedAnnouncements).values(data).returning();
    return announcement;
  }

  async updatePinnedAnnouncement(id: number, data: Partial<InsertDailyHubPinnedAnnouncement>): Promise<DailyHubPinnedAnnouncement | undefined> {
    const [announcement] = await db
      .update(dailyHubPinnedAnnouncements)
      .set(data)
      .where(eq(dailyHubPinnedAnnouncements.id, id))
      .returning();
    return announcement;
  }

  async deletePinnedAnnouncement(id: number): Promise<void> {
    await db.delete(dailyHubPinnedAnnouncements).where(eq(dailyHubPinnedAnnouncements.id, id));
  }

  // Login attempt tracking
  async recordLoginAttempt(data: InsertLoginAttempt): Promise<LoginAttempt> {
    const [attempt] = await db.insert(loginAttempts).values(data).returning();
    return attempt;
  }

  async getRecentLoginAttempts(email: string, minutes: number = 15): Promise<LoginAttempt[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email),
          gte(loginAttempts.createdAt, cutoff)
        )
      )
      .orderBy(desc(loginAttempts.createdAt));
  }

  async getFailedLoginAttempts(email: string, minutes: number = 15): Promise<number> {
    const attempts = await this.getRecentLoginAttempts(email, minutes);
    return attempts.filter(a => !a.success).length;
  }

  async cleanupOldLoginAttempts(olderThanDays: number = 30): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoff));
  }

  // Email verification tokens
  async createEmailVerificationToken(userId: string): Promise<EmailVerificationToken> {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const [verification] = await db
      .insert(emailVerificationTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return verification;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verification] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verification;
  }

  async useEmailVerificationToken(token: string): Promise<boolean> {
    const verification = await this.getEmailVerificationToken(token);
    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      return false;
    }
    
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.token, token));
    
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, verification.userId));
    
    return true;
  }

  async deleteExpiredVerificationTokens(): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, new Date()));
  }

  // Two-factor authentication
  async getTwoFactorSecret(userId: string): Promise<TwoFactorSecret | undefined> {
    const [secret] = await db
      .select()
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId));
    return secret;
  }

  async createTwoFactorSecret(userId: string, secret: string): Promise<TwoFactorSecret> {
    const existing = await this.getTwoFactorSecret(userId);
    if (existing) {
      const [updated] = await db
        .update(twoFactorSecrets)
        .set({ secret, enabled: false, verifiedAt: null, updatedAt: new Date() })
        .where(eq(twoFactorSecrets.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(twoFactorSecrets)
      .values({ userId, secret })
      .returning();
    return created;
  }

  async enableTwoFactor(userId: string, backupCodes: string[]): Promise<TwoFactorSecret | undefined> {
    const [secret] = await db
      .update(twoFactorSecrets)
      .set({ enabled: true, backupCodes, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(twoFactorSecrets.userId, userId))
      .returning();
    return secret;
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await db.delete(twoFactorSecrets).where(eq(twoFactorSecrets.userId, userId));
  }

  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const secret = await this.getTwoFactorSecret(userId);
    if (!secret?.backupCodes) return false;
    
    const index = secret.backupCodes.indexOf(code);
    if (index === -1) return false;
    
    const newCodes = [...secret.backupCodes];
    newCodes.splice(index, 1);
    
    await db
      .update(twoFactorSecrets)
      .set({ backupCodes: newCodes, updatedAt: new Date() })
      .where(eq(twoFactorSecrets.userId, userId));
    
    return true;
  }

  // User Notifications
  async createUserNotification(data: Omit<InsertUserNotification, 'id' | 'createdAt'>): Promise<UserNotification> {
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [notification] = await db
      .insert(userNotifications)
      .values({ ...data, expiresAt })
      .returning();
    return notification;
  }

  async getUserNotifications(
    userId: string, 
    options?: { unreadOnly?: boolean; limit?: number; tenantId?: string }
  ): Promise<(UserNotification & { actor?: User })[]> {
    const now = new Date();
    const conditions = [
      eq(userNotifications.userId, userId),
      isNull(userNotifications.dismissedAt),
      or(isNull(userNotifications.expiresAt), gte(userNotifications.expiresAt, now)),
    ];
    
    if (options?.unreadOnly) {
      conditions.push(isNull(userNotifications.readAt));
    }
    if (options?.tenantId) {
      conditions.push(or(
        eq(userNotifications.tenantId, options.tenantId),
        isNull(userNotifications.tenantId)
      ));
    }
    
    const results = await db
      .select({
        notification: userNotifications,
        actor: users,
      })
      .from(userNotifications)
      .leftJoin(users, eq(userNotifications.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(userNotifications.createdAt))
      .limit(options?.limit || 50);
    
    return results.map(r => ({
      ...r.notification,
      actor: r.actor || undefined,
    }));
  }

  async markUserNotificationRead(id: string, userId: string, tenantId?: string): Promise<UserNotification | undefined> {
    const conditions = [eq(userNotifications.id, id), eq(userNotifications.userId, userId)];
    if (tenantId) {
      const tenantCondition = or(
        eq(userNotifications.tenantId, tenantId),
        isNull(userNotifications.tenantId)
      );
      if (tenantCondition) conditions.push(tenantCondition);
    }
    const [notification] = await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(...conditions))
      .returning();
    return notification;
  }

  async dismissUserNotification(id: string, userId: string, tenantId?: string): Promise<UserNotification | undefined> {
    const conditions = [eq(userNotifications.id, id), eq(userNotifications.userId, userId)];
    if (tenantId) {
      const tenantCondition = or(
        eq(userNotifications.tenantId, tenantId),
        isNull(userNotifications.tenantId)
      );
      if (tenantCondition) conditions.push(tenantCondition);
    }
    const [notification] = await db
      .update(userNotifications)
      .set({ dismissedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return notification;
  }

  async markAllUserNotificationsRead(userId: string, tenantId?: string): Promise<void> {
    const conditions = [eq(userNotifications.userId, userId), isNull(userNotifications.readAt)];
    if (tenantId) {
      conditions.push(eq(userNotifications.tenantId, tenantId));
    }
    await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(...conditions));
  }

  async getUnreadUserNotificationCount(userId: string, tenantId?: string): Promise<number> {
    const now = new Date();
    const conditions = [
      eq(userNotifications.userId, userId),
      isNull(userNotifications.readAt),
      isNull(userNotifications.dismissedAt),
      or(isNull(userNotifications.expiresAt), gte(userNotifications.expiresAt, now)),
    ];
    if (tenantId) {
      conditions.push(or(
        eq(userNotifications.tenantId, tenantId),
        isNull(userNotifications.tenantId)
      ));
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userNotifications)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  async cleanupExpiredUserNotifications(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(userNotifications)
      .where(and(
        lt(userNotifications.expiresAt, now),
        isNull(userNotifications.dismissedAt)
      ))
      .returning();
    return result.length;
  }

  async broadcastAnnouncement(data: { type: string; title: string; body?: string; metadata?: Record<string, any> }): Promise<number> {
    const allUsers = await db.select({ id: users.id }).from(users);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    let count = 0;
    for (const user of allUsers) {
      await db.insert(userNotifications).values({
        id: crypto.randomUUID(),
        userId: user.id,
        tenantId: null,
        type: data.type,
        title: data.title,
        body: data.body || null,
        resourceType: null,
        resourceId: null,
        metadata: data.metadata || null,
        actorId: null,
        expiresAt,
      });
      count++;
    }
    return count;
  }

  // Cross-service correlations
  async getCorrelationsForEvent(userId: string, eventId: string): Promise<ServiceCorrelation[]> {
    return await db
      .select()
      .from(serviceCorrelations)
      .where(
        and(
          eq(serviceCorrelations.userId, userId),
          eq(serviceCorrelations.primaryId, eventId)
        )
      )
      .orderBy(desc(serviceCorrelations.correlationScore));
  }

  async saveCorrelation(correlation: InsertServiceCorrelation): Promise<ServiceCorrelation> {
    const [result] = await db
      .insert(serviceCorrelations)
      .values(correlation)
      .returning();
    return result;
  }

  async saveCorrelations(correlations: InsertServiceCorrelation[]): Promise<ServiceCorrelation[]> {
    if (correlations.length === 0) return [];
    return await db
      .insert(serviceCorrelations)
      .values(correlations)
      .returning();
  }

  async deleteCorrelationsForEvent(userId: string, eventId: string): Promise<void> {
    await db
      .delete(serviceCorrelations)
      .where(
        and(
          eq(serviceCorrelations.userId, userId),
          eq(serviceCorrelations.primaryId, eventId)
        )
      );
  }

  async getCorrelationsByDate(userId: string, date: Date): Promise<ServiceCorrelation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(serviceCorrelations)
      .where(
        and(
          eq(serviceCorrelations.userId, userId),
          gte(serviceCorrelations.primaryDate, startOfDay),
          lte(serviceCorrelations.primaryDate, endOfDay)
        )
      )
      .orderBy(asc(serviceCorrelations.primaryDate));
  }

  // Notification groups
  async getNotificationGroups(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationGroup[]> {
    const conditions = [
      eq(notificationGroups.userId, userId),
      isNull(notificationGroups.dismissedAt),
    ];
    
    if (options?.unreadOnly) {
      conditions.push(isNull(notificationGroups.readAt));
    }
    
    return await db
      .select()
      .from(notificationGroups)
      .where(and(...conditions))
      .orderBy(desc(notificationGroups.lastUpdatedAt))
      .limit(options?.limit || 50);
  }

  async getNotificationGroup(userId: string, groupKey: string): Promise<NotificationGroup | undefined> {
    const [result] = await db
      .select()
      .from(notificationGroups)
      .where(
        and(
          eq(notificationGroups.userId, userId),
          eq(notificationGroups.groupKey, groupKey)
        )
      );
    return result;
  }

  async createOrUpdateNotificationGroup(data: InsertNotificationGroup): Promise<NotificationGroup> {
    const existing = await this.getNotificationGroup(data.userId, data.groupKey);
    
    if (existing) {
      const [updated] = await db
        .update(notificationGroups)
        .set({
          title: data.title,
          summary: data.summary,
          itemCount: (existing.itemCount || 0) + 1,
          notificationIds: [...(existing.notificationIds || []), ...(data.notificationIds || [])],
          priority: data.priority,
          metadata: data.metadata,
          lastUpdatedAt: new Date(),
          readAt: null,
        })
        .where(eq(notificationGroups.id, existing.id))
        .returning();
      return updated;
    }
    
    const [result] = await db
      .insert(notificationGroups)
      .values(data)
      .returning();
    return result;
  }

  async markNotificationGroupRead(userId: string, groupId: number): Promise<void> {
    await db
      .update(notificationGroups)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationGroups.id, groupId),
          eq(notificationGroups.userId, userId)
        )
      );
  }

  async dismissNotificationGroup(userId: string, groupId: number): Promise<void> {
    await db
      .update(notificationGroups)
      .set({ dismissedAt: new Date() })
      .where(
        and(
          eq(notificationGroups.id, groupId),
          eq(notificationGroups.userId, userId)
        )
      );
  }
}

export const storage = new DbStorage();

storage.migrateProjectColumns();
storage.migrateTaskPlacements();
