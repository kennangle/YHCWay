import { Express, RequestHandler, Router } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../errors";
import { handleGmailCallback, verifyOAuthState } from "../gmail-oauth";
import adminRoutes from "./admin";
import gmailRoutes from "./gmail";

export function registerModularRoutes(app: Express, isAuthenticated: RequestHandler, isAdmin: RequestHandler) {
  // OAuth callbacks must be registered without auth middleware
  // They are protected by signed state tokens instead
  app.get("/api/v2/gmail/callback", asyncHandler(async (req: any, res: any) => {
    const { code, state } = req.query;
    
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.redirect('/settings?error=invalid_callback');
    }
    
    const stateData = verifyOAuthState(state);
    if (!stateData) {
      console.error("[Gmail OAuth v2] Invalid state signature");
      return res.redirect('/settings?error=invalid_state');
    }
    
    const { userId, label } = stateData;
    
    try {
      const result = await handleGmailCallback(code, userId, label);
      res.redirect(`/settings?success=gmail&email=${encodeURIComponent(result.email)}`);
    } catch (error: any) {
      const errorMsg = error?.message?.includes('Maximum') ? 'max_accounts' : 'gmail_connection_failed';
      res.redirect(`/settings?error=${errorMsg}`);
    }
  }));

  // Register admin routes with auth + admin check
  app.use("/api/v2/admin", isAuthenticated, isAdmin, adminRoutes);
  
  // Register gmail routes with auth check (except callback which is above)
  app.use("/api/v2/gmail", isAuthenticated, gmailRoutes);
}

export { adminRoutes, gmailRoutes };
