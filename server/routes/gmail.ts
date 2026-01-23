import { Router } from "express";
import { storage } from "../storage";
import { asyncHandler, ExternalServiceError, NotFoundError, ValidationError, UnauthorizedError } from "../errors";
import { gmailLimiter } from "../rate-limiter";
import { 
  getGmailAuthUrl, 
  handleGmailCallback, 
  signOAuthState, 
  verifyOAuthState,
  isGmailConnectedForUser,
  disconnectGmailForUser,
  getRecentEmailsFromAllAccounts,
  getGmailLabelsForUser
} from "../gmail-oauth";
import { isGmailConnected, getRecentEmails, getGmailLabels } from "../gmail";
import { cache, TTL, getOrFetch, invalidateGmailCache } from "../cache";

const router = Router();

router.get("/connect", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const label = req.query.label as string | undefined;
  const state = signOAuthState({ userId, label });
  const authUrl = getGmailAuthUrl(state);
  res.json({ authUrl });
}));

router.get("/accounts", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const accounts = await storage.listOAuthAccounts(userId, 'gmail');
  res.json(accounts.map(a => ({
    id: a.id,
    email: a.providerAccountId,
    label: a.label,
    isPrimary: a.isPrimary,
    createdAt: a.createdAt,
  })));
}));

router.delete("/accounts/:id", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const accountId = parseInt(req.params.id);
  const account = await storage.getOAuthAccountById(accountId);
  
  if (!account || account.userId !== userId || account.provider !== 'gmail') {
    throw new NotFoundError("Gmail account");
  }
  
  await storage.deleteOAuthAccountById(accountId);
  invalidateGmailCache(userId, accountId);
  res.json({ success: true });
}));

router.patch("/accounts/:id", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const accountId = parseInt(req.params.id);
  const { label } = req.body;
  
  const account = await storage.getOAuthAccountById(accountId);
  if (!account || account.userId !== userId || account.provider !== 'gmail') {
    throw new NotFoundError("Gmail account");
  }
  
  const updated = await storage.updateOAuthAccountLabel(accountId, label);
  res.json({ id: updated?.id, email: updated?.providerAccountId, label: updated?.label, isPrimary: updated?.isPrimary });
}));

router.post("/accounts/:id/primary", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const accountId = parseInt(req.params.id);
  
  const account = await storage.getOAuthAccountById(accountId);
  if (!account || account.userId !== userId || account.provider !== 'gmail') {
    throw new NotFoundError("Gmail account");
  }
  
  await storage.setOAuthAccountPrimary(userId, 'gmail', accountId);
  res.json({ success: true });
}));

router.post("/disconnect", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  await disconnectGmailForUser(userId);
  invalidateGmailCache(userId);
  res.json({ success: true });
}));

router.get("/status", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.json({ connected: false, accounts: [], needsReconnect: false });
  }
  
  const accounts = await storage.listOAuthAccounts(userId, 'gmail');
  if (accounts.length > 0) {
    const now = Date.now();
    const accountDetails = accounts.map(a => {
      const isExpired = a.expiresAt ? new Date(a.expiresAt).getTime() < now : false;
      const hasRefreshToken = !!a.refreshToken;
      const needsReconnect = isExpired && !hasRefreshToken;
      return { 
        id: a.id, 
        email: a.providerAccountId, 
        label: a.label, 
        isPrimary: a.isPrimary,
        isExpired,
        hasRefreshToken,
        needsReconnect
      };
    });
    
    const anyNeedsReconnect = accountDetails.some(a => a.needsReconnect);
    
    return res.json({ 
      connected: true, 
      type: 'custom',
      accountCount: accounts.length,
      accounts: accountDetails,
      needsReconnect: anyNeedsReconnect,
      message: anyNeedsReconnect ? 'Some Gmail accounts need to be reconnected in Settings' : null
    });
  }
  
  const connectorConnected = await isGmailConnected();
  res.json({ connected: connectorConnected, type: 'connector', accounts: [], needsReconnect: false });
}));

router.get("/messages", gmailLimiter, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  const accountIdParam = req.query.accountId;
  const accountId = accountIdParam ? parseInt(accountIdParam as string) : undefined;
  
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  if (accountIdParam && (isNaN(accountId!) || accountId! <= 0)) {
    throw new ValidationError("Invalid accountId");
  }
  
  if (accountId) {
    const account = await storage.getOAuthAccountById(accountId);
    if (!account || account.userId !== userId || account.provider !== 'gmail') {
      throw new NotFoundError("Gmail account");
    }
  }
  
  const customConnected = await isGmailConnectedForUser(userId);
  
  if (customConnected) {
    try {
      const { getRecentEmailsForAccount } = await import("../gmail-oauth");
      let emails;
      if (accountId) {
        emails = await getRecentEmailsForAccount(userId, accountId, 20);
      } else {
        emails = await getRecentEmailsFromAllAccounts(userId, 20);
      }
      return res.json(emails);
    } catch (emailError: any) {
      console.log("[Gmail Messages] OAuth failed, trying connector fallback...");
    }
  }
  
  try {
    const emails = await getRecentEmails(20);
    res.json(emails);
  } catch (error) {
    throw new ExternalServiceError("Gmail", error as Error);
  }
}));

router.get("/labels", gmailLimiter, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  const accountId = req.query.accountId ? parseInt(req.query.accountId as string, 10) : undefined;
  
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  if (req.query.accountId && (isNaN(accountId!) || accountId! <= 0)) {
    throw new ValidationError("Invalid accountId");
  }
  
  const cacheKey = cache.gmail.labels(userId, accountId || 0);
  
  try {
    const labels = await getOrFetch(cacheKey, async () => {
      return await getGmailLabelsForUser(userId, accountId);
    }, TTL.LABELS);
    return res.json(labels);
  } catch (oauthError: any) {
    console.log("[Gmail Labels] OAuth fetch failed, trying connector:", oauthError?.message);
    
    try {
      const labels = await getGmailLabels();
      return res.json(labels);
    } catch (connectorError) {
      throw new ExternalServiceError("Gmail", connectorError as Error);
    }
  }
}));

export default router;
