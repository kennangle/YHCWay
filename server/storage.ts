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
  userDisabledIntegrations
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, isNull, sql, inArray } from "drizzle-orm";
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
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  updateUserPassword(id: string, passwordHash: string): Promise<User | undefined>;
  
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
  
  sendMessage(conversationId: number, senderId: string, content: string): Promise<Message>;
  getConversationMessages(conversationId: number, limit?: number, before?: number): Promise<Message[]>;
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

  async sendMessage(conversationId: number, senderId: string, content: string): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({ conversationId, senderId, content })
      .returning();
    
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    
    return message;
  }

  async getConversationMessages(conversationId: number, limit: number = 50, before?: number): Promise<Message[]> {
    let query = db.select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        before ? lt(messages.id, before) : undefined
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return await query;
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
}

export const storage = new DbStorage();
