import { Router } from "express";
import { storage } from "../storage";
import { asyncHandler, ExternalServiceError, ValidationError, UnauthorizedError, ForbiddenError } from "../errors";
import { slackPreferencesUpdateSchema, slackDmPreferencesUpdateSchema } from "@shared/schema";
import {
  isSlackConnected,
  getRecentMessages as getSlackMessages,
  getAllMessages as getAllSlackMessages,
  getDirectMessages as getSlackDMs,
  getThreadReplies as getSlackThreadReplies,
  getChannels as getSlackChannels,
  getRecentMessagesFiltered,
  isUserSlackConnected,
  getUserAllMessages,
  getUserDirectMessages,
  getUserChannels,
  sendSlackNotification,
  sendSlackBlockNotification,
  formatYHCWayNotification,
  sendUserSlackMessage,
  getUserDmConversations
} from "../slack";

const router = Router();

router.get("/status", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (userId) {
    const userConnected = await isUserSlackConnected(userId);
    if (userConnected) {
      return res.json({ connected: true, type: 'user' });
    }
  }
  const botConnected = await isSlackConnected();
  res.json({ connected: botConnected, type: 'bot' });
}));

router.get("/messages", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const includeDms = req.query.includeDms === 'true';
  
  const userConnected = await isUserSlackConnected(userId);
  if (userConnected) {
    const messages = await getUserAllMessages(userId, 30);
    return res.json(messages);
  }
  
  const messages = includeDms 
    ? await getAllSlackMessages(30)
    : await getSlackMessages(20);
  res.json(messages);
}));

router.get("/dms", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const userConnected = await isUserSlackConnected(userId);
  if (userConnected) {
    const messages = await getUserDirectMessages(userId, 15);
    return res.json(messages);
  }
  
  const messages = await getSlackDMs(15);
  res.json(messages);
}));

router.get("/thread/:channelId/:threadTs", asyncHandler(async (req: any, res: any) => {
  const { channelId, threadTs } = req.params;
  const replies = await getSlackThreadReplies(channelId, threadTs, 20);
  res.json(replies);
}));

router.get("/channels", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const userConnected = await isUserSlackConnected(userId);
  if (userConnected) {
    const channels = await getUserChannels(userId);
    return res.json(channels);
  }
  
  const channels = await getSlackChannels();
  res.json(channels);
}));

router.get("/preferences", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const preferences = await storage.getSlackChannelPreferences(userId);
  res.json(preferences);
}));

router.post("/preferences", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const validatedData = slackPreferencesUpdateSchema.parse(req.body);
  await storage.saveSlackChannelPreferences(userId, validatedData.channels);
  res.json({ success: true });
}));

router.get("/dm-conversations", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const userConnected = await isUserSlackConnected(userId);
  if (!userConnected) {
    return res.json([]);
  }
  
  const conversations = await getUserDmConversations(userId);
  res.json(conversations);
}));

router.get("/dm-preferences", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const preferences = await storage.getSlackDmPreferences(userId);
  res.json(preferences);
}));

router.post("/dm-preferences", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const validatedData = slackDmPreferencesUpdateSchema.parse(req.body);
  await storage.saveSlackDmPreferences(userId, validatedData.conversations);
  res.json({ success: true });
}));

router.get("/messages/filtered", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const channelPreferences = await storage.getSlackChannelPreferences(userId);
  const dmPreferences = await storage.getSlackDmPreferences(userId);
  const enabledChannelIds = channelPreferences
    .filter(p => p.isEnabled)
    .map(p => p.channelId);
  const enabledDmIds = dmPreferences
    .filter(p => p.isEnabled)
    .map(p => p.conversationId);
  
  const userConnected = await isUserSlackConnected(userId);
  
  let dmMessages;
  if (userConnected) {
    dmMessages = await getUserDirectMessages(userId, 15);
  } else {
    dmMessages = await getSlackDMs(15);
  }
  
  if (dmPreferences.length > 0) {
    dmMessages = dmMessages.filter(dm => enabledDmIds.includes(dm.channelId));
  }
  
  if (channelPreferences.length === 0) {
    if (userConnected) {
      const allMessages = await getUserAllMessages(userId, 30);
      if (dmPreferences.length > 0) {
        const filteredMessages = allMessages.filter(msg => 
          !msg.isDm || enabledDmIds.includes(msg.channelId)
        );
        return res.json(filteredMessages);
      } else {
        return res.json(allMessages);
      }
    } else {
      const allMessages = await getAllSlackMessages(30);
      if (dmPreferences.length > 0) {
        const filteredMessages = allMessages.filter(msg => 
          !msg.isDm || enabledDmIds.includes(msg.channelId)
        );
        return res.json(filteredMessages);
      } else {
        return res.json(allMessages);
      }
    }
  }
  
  if (enabledChannelIds.length === 0) {
    return res.json(dmMessages);
  }
  
  const channelMessages = await getRecentMessagesFiltered(enabledChannelIds, 20);
  const allMessages = [...channelMessages, ...dmMessages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);
  res.json(allMessages);
}));

router.get("/connect", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new ExternalServiceError("Slack", new Error("Slack OAuth not configured"));
  }
  
  const appUrl = process.env.APP_URL || 'https://yhcway.com';
  // Use V1 callback URL for backward compatibility with Slack app settings
  const redirectUri = `${appUrl}/api/slack/callback`;
  
  const userScopes = [
    'channels:read',
    'channels:history',
    'groups:read',
    'groups:history',
    'im:read',
    'im:history',
    'mpim:read',
    'mpim:history',
    'users:read',
    'chat:write'
  ].join(',');
  
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
  
  res.json({ authUrl });
}));

router.post("/disconnect", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  await storage.deleteSlackUserCredentials(userId);
  await storage.disableIntegration(userId, 'slack');
  res.json({ success: true });
}));

router.get("/user-status", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.json({ connected: false });
  }
  const creds = await storage.getSlackUserCredentials(userId);
  res.json({ connected: !!creds });
}));

router.post("/notify", asyncHandler(async (req: any, res: any) => {
  const { channelId, message, type, data } = req.body;
  
  if (!channelId) {
    throw new ValidationError("channelId is required");
  }

  let result;
  
  if (type && data) {
    const notification = formatYHCWayNotification(type, data);
    result = await sendSlackBlockNotification(channelId, notification.blocks, notification.text);
  } else if (message) {
    result = await sendSlackNotification(channelId, message);
  } else {
    throw new ValidationError("Either message or (type and data) is required");
  }

  if (result.success) {
    res.json(result);
  } else {
    throw new ExternalServiceError("Slack", new Error(result.error || "Failed to send notification"));
  }
}));

router.post("/reply", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const isConnected = await isUserSlackConnected(userId);
  if (!isConnected) {
    throw new ForbiddenError("Slack not connected. Please connect your Slack account in Settings.");
  }
  
  const { channelId, message, threadTs } = req.body;
  
  if (!channelId) {
    throw new ValidationError("channelId is required");
  }
  if (!message || !message.trim()) {
    throw new ValidationError("message is required");
  }

  const result = await sendUserSlackMessage(userId, channelId, message.trim(), { threadTs });

  if (result.success) {
    res.json(result);
  } else {
    throw new ExternalServiceError("Slack", new Error(result.error || "Failed to send reply"));
  }
}));

export default router;
