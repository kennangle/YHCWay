import { 
  type User, 
  type InsertUser,
  type Service,
  type InsertService,
  type FeedItem,
  type InsertFeedItem,
  users,
  services,
  feedItems
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Service methods
  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateServiceConnection(id: number, connected: boolean): Promise<Service | undefined>;
  
  // Feed item methods
  getAllFeedItems(): Promise<FeedItem[]>;
  getFeedItem(id: number): Promise<FeedItem | undefined>;
  createFeedItem(feedItem: InsertFeedItem): Promise<FeedItem>;
  deleteFeedItem(id: number): Promise<void>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Service methods
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

  async updateServiceConnection(id: number, connected: boolean): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ connected })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  // Feed item methods
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

  async deleteFeedItem(id: number): Promise<void> {
    await db.delete(feedItems).where(eq(feedItems.id, id));
  }
}

export const storage = new DbStorage();
