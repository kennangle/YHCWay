import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertFeedItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      const allServices = await storage.getAllServices();
      res.json(allServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
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

  app.patch("/api/services/:id/connection", async (req, res) => {
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

  // Feed items routes
  app.get("/api/feed", async (req, res) => {
    try {
      const allFeedItems = await storage.getAllFeedItems();
      res.json(allFeedItems);
    } catch (error) {
      console.error("Error fetching feed items:", error);
      res.status(500).json({ error: "Failed to fetch feed items" });
    }
  });

  app.post("/api/feed", async (req, res) => {
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

  app.delete("/api/feed/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFeedItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feed item:", error);
      res.status(500).json({ error: "Failed to delete feed item" });
    }
  });

  return httpServer;
}
