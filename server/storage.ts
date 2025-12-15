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
  users,
  services,
  feedItems,
  oauthAccounts,
  slackChannelPreferences,
  passwordResetTokens
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and } from "drizzle-orm";
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
  
  getOAuthAccount(provider: string, providerAccountId: string): Promise<OAuthAccount | undefined>;
  createOAuthAccount(account: InsertOAuthAccount): Promise<OAuthAccount>;
  linkOAuthAccount(userId: string, account: Omit<InsertOAuthAccount, 'userId'>): Promise<OAuthAccount>;
  
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

  async getOAuthAccount(provider: string, providerAccountId: string): Promise<OAuthAccount | undefined> {
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
}

export const storage = new DbStorage();
