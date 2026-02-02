import { Express, RequestHandler, Router } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../errors";
import { handleGmailCallback, verifyOAuthState } from "../gmail-oauth";
import adminRoutes from "./admin";
import gmailRoutes from "./gmail";
import tasksRoutes from "./tasks";
import slackRoutes from "./slack";
import projectsRoutes from "./projects";
import fathomRoutes from "./fathom";

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

  // Slack OAuth callback - NO auth middleware, uses state param for user identification
  app.get("/api/v2/slack/callback", asyncHandler(async (req: any, res: any) => {
    const { code, state: userId } = req.query;
    
    if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
      return res.redirect('/connect?error=invalid_callback');
    }
    
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.redirect('/connect?error=slack_not_configured');
    }
    
    const appUrl = process.env.APP_URL || 'https://yhcway.com';
    const redirectUri = `${appUrl}/api/v2/slack/callback`;
    
    try {
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
      
      const tokenData = await tokenResponse.json() as any;
      
      if (!tokenData.ok) {
        console.error('Slack OAuth error:', tokenData.error);
        return res.redirect('/connect?error=slack_auth_failed');
      }
      
      const userToken = tokenData.authed_user?.access_token;
      const slackUserId = tokenData.authed_user?.id;
      const teamId = tokenData.team?.id;
      const scope = tokenData.authed_user?.scope;
      
      if (!userToken || !slackUserId || !teamId) {
        console.error('Missing user token in Slack response:', tokenData);
        return res.redirect('/connect?error=slack_missing_token');
      }
      
      await storage.saveSlackUserCredentials(userId, slackUserId, teamId, userToken, scope);
      await storage.enableIntegration(userId, 'slack');
      
      res.redirect('/connect?success=slack');
    } catch (error: any) {
      console.error("Error in Slack OAuth callback:", error);
      res.redirect('/connect?error=slack_connection_failed');
    }
  }));

  // Register admin routes with auth + admin check
  app.use("/api/v2/admin", isAuthenticated, isAdmin, adminRoutes);
  
  // Register gmail routes with auth check (except callback which is above)
  app.use("/api/v2/gmail", isAuthenticated, gmailRoutes);
  
  // Register tasks routes with auth check
  app.use("/api/v2/tasks", isAuthenticated, tasksRoutes);
  
  // Register slack routes with auth check (except callback which is above)
  app.use("/api/v2/slack", isAuthenticated, slackRoutes);
  
  // Register projects routes with auth check
  app.use("/api/v2/projects", isAuthenticated, projectsRoutes);
  
  // Register Fathom routes with auth check
  app.use("/api/fathom", isAuthenticated, fathomRoutes);
}

export { adminRoutes, gmailRoutes, tasksRoutes, slackRoutes, projectsRoutes, fathomRoutes };
