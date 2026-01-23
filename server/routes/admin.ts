import { Router, RequestHandler } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { asyncHandler, NotFoundError, ValidationError } from "../errors";
import { insertServiceSchema, insertFeedItemSchema, emailTemplateSchema, adminCreateUserSchema, User } from "@shared/schema";
import { getTemplateTypes, getDefaultTemplate, sendInvitationEmail } from "../email";

const router = Router();

router.get("/users", asyncHandler(async (req: any, res: any) => {
  const allUsers = await storage.getAllUsers();
  res.json(allUsers);
}));

router.get("/active-sessions", asyncHandler(async (req: any, res: any) => {
  const activeSessions = await storage.getActiveSessions();
  res.json(activeSessions);
}));

router.patch("/users/:id", asyncHandler(async (req: any, res: any) => {
  const { isAdmin: adminStatus } = req.body;
  if (typeof adminStatus !== "boolean") {
    throw new ValidationError("isAdmin must be a boolean");
  }
  const updatedUser = await storage.updateUserAdmin(req.params.id, adminStatus);
  if (!updatedUser) {
    throw new NotFoundError("User");
  }
  res.json(updatedUser);
}));

router.delete("/users/:id", asyncHandler(async (req: any, res: any) => {
  const userToDelete = await storage.getUser(req.params.id);
  if (!userToDelete) {
    throw new NotFoundError("User");
  }
  const currentUserId = req.user?.id;
  if (req.params.id === currentUserId) {
    throw new ValidationError("Cannot delete yourself");
  }
  await storage.deleteUser(req.params.id);
  res.status(204).send();
}));

router.put("/services/:id", asyncHandler(async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  const validatedData = insertServiceSchema.partial().parse(req.body);
  const updatedService = await storage.updateService(id, validatedData);
  if (!updatedService) {
    throw new NotFoundError("Service");
  }
  res.json(updatedService);
}));

router.delete("/services/:id", asyncHandler(async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  await storage.deleteService(id);
  res.status(204).send();
}));

router.put("/feed/:id", asyncHandler(async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  const validatedData = insertFeedItemSchema.partial().parse(req.body);
  const updatedItem = await storage.updateFeedItem(id, validatedData);
  if (!updatedItem) {
    throw new NotFoundError("Feed item");
  }
  res.json(updatedItem);
}));

router.patch("/users/:id/profile", asyncHandler(async (req: any, res: any) => {
  const { firstName, lastName } = req.body;
  if (typeof firstName !== 'string' || typeof lastName !== 'string') {
    throw new ValidationError("First name and last name are required");
  }
  const updatedUser = await storage.updateUserProfile(req.params.id, firstName, lastName);
  if (!updatedUser) {
    throw new NotFoundError("User");
  }
  res.json(updatedUser);
}));

router.post("/users/:id/reset-password", asyncHandler(async (req: any, res: any) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const updatedUser = await storage.updateUserPassword(req.params.id, passwordHash);
  if (!updatedUser) {
    throw new NotFoundError("User");
  }
  res.json({ message: "Password updated successfully" });
}));

router.get("/users/pending", asyncHandler(async (req: any, res: any) => {
  const pendingUsers = await storage.getPendingUsers();
  res.json(pendingUsers);
}));

router.post("/users/:id/approve", asyncHandler(async (req: any, res: any) => {
  const user = req.user as User;
  const updatedUser = await storage.updateUserApprovalStatus(req.params.id, "approved", user.id);
  if (!updatedUser) {
    throw new NotFoundError("User");
  }
  res.json(updatedUser);
}));

router.post("/users/:id/reject", asyncHandler(async (req: any, res: any) => {
  const user = req.user as User;
  const updatedUser = await storage.updateUserApprovalStatus(req.params.id, "rejected", user.id);
  if (!updatedUser) {
    throw new NotFoundError("User");
  }
  res.json(updatedUser);
}));

router.get("/email-templates", asyncHandler(async (req: any, res: any) => {
  const templates = await storage.getAllEmailTemplates();
  res.json(templates);
}));

router.get("/email-templates/:type", asyncHandler(async (req: any, res: any) => {
  const template = await storage.getEmailTemplate(req.params.type);
  if (!template) {
    throw new NotFoundError("Template");
  }
  res.json(template);
}));

router.put("/email-templates/:type", asyncHandler(async (req: any, res: any) => {
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
}));

router.get("/email-template-types", asyncHandler(async (req: any, res: any) => {
  res.json(getTemplateTypes());
}));

router.get("/email-templates/:type/default", asyncHandler(async (req: any, res: any) => {
  const defaultTemplate = getDefaultTemplate(req.params.type);
  if (!defaultTemplate) {
    throw new NotFoundError("Template type");
  }
  res.json(defaultTemplate);
}));

router.post("/users", asyncHandler(async (req: any, res: any) => {
  const validatedData = adminCreateUserSchema.parse(req.body);
  
  const existingUser = await storage.getUserByEmail(validatedData.email);
  if (existingUser) {
    throw new ValidationError("Email already registered");
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
}));

export default router;
