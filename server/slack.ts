// Slack integration using Bot Token or User Token
import { storage } from "./storage";

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: string;
  permalink?: string;
  threadTs?: string;
  replyCount?: number;
  isThread?: boolean;
  isDm?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  isMember: boolean;
  isIm?: boolean;
  isMpim?: boolean;
}

export interface SlackThread {
  parentMessage: SlackMessage;
  replies: SlackMessage[];
}

async function getSlackToken(): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('Slack bot token not configured');
  }
  if (!token.startsWith('xoxb-')) {
    console.error('Slack token does not start with xoxb- (got prefix:', token.substring(0, 10) + '...)');
  }
  return token;
}

async function getUserName(token: string, userId: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.ok && data.user) {
      return data.user.real_name || data.user.name || userId;
    }
    return userId;
  } catch {
    return userId;
  }
}

let cachedBotUserId: string | null = null;

async function getBotUserId(token: string): Promise<string | null> {
  if (cachedBotUserId) return cachedBotUserId;
  
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.ok && data.user_id) {
      cachedBotUserId = data.user_id;
      console.log('[Slack] Bot user ID:', cachedBotUserId);
      return cachedBotUserId;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getChannels(): Promise<SlackChannel[]> {
  const token = await getSlackToken();

  const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack API error:', data.error);
    return [];
  }

  return (data.channels || []).map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    isMember: channel.is_member || false
  }));
}

export interface SlackDmConversation {
  id: string;
  name: string;
  isOpen: boolean;
}

async function getUserNameCached(token: string, userId: string, cache: Record<string, string>): Promise<string> {
  if (cache[userId]) return cache[userId];
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.ok && data.user) {
      cache[userId] = data.user.real_name || data.user.name || userId;
    } else {
      cache[userId] = userId;
    }
  } catch {
    cache[userId] = userId;
  }
  return cache[userId];
}

// Get display names for mpim (group DM) members
async function getMpimMemberNames(token: string, channelId: string, cache: Record<string, string>): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/conversations.members?channel=${channelId}&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.ok && data.members && data.members.length > 0) {
      const names: string[] = [];
      for (const memberId of data.members.slice(0, 10)) {
        const name = await getUserNameCached(token, memberId, cache);
        names.push(name);
      }
      return names.join(', ');
    }
  } catch (err) {
    console.error('Error fetching mpim members:', err);
  }
  return 'Group DM';
}

export async function getDmConversations(userToken?: string): Promise<SlackDmConversation[]> {
  const token = userToken || await getSlackToken();
  
  const response = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack DM conversations error:', data.error);
    return [];
  }

  const conversations: SlackDmConversation[] = [];
  const userNameCache: Record<string, string> = {};

  for (const dm of (data.channels || [])) {
    let name = dm.name || '';
    
    if (dm.is_im && dm.user) {
      name = await getUserNameCached(token, dm.user, userNameCache);
    } else if (dm.is_mpim) {
      name = await getMpimMemberNames(token, dm.id, userNameCache);
    }
    
    conversations.push({
      id: dm.id,
      name: name || dm.id,
      isOpen: dm.is_open || false
    });
  }

  return conversations;
}

export async function getUserDmConversations(userId: string): Promise<SlackDmConversation[]> {
  const token = await getUserSlackToken(userId);
  if (!token) {
    return getDmConversations();
  }
  return getDmConversations(token);
}

export async function getDirectMessages(maxResults: number = 10, includeThreadReplies: boolean = true): Promise<SlackMessage[]> {
  const token = await getSlackToken();
  const effectiveMaxResults = includeThreadReplies ? maxResults * 3 : maxResults;
  
  const botUserId = await getBotUserId(token);

  const response = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=50', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack DM list error:', data.error);
    return [];
  }

  const allDmChannels = data.channels || [];
  console.log(`[Slack DMs] Found ${allDmChannels.length} DM channels:`, allDmChannels.map((c: any) => ({ id: c.id, user: c.user, name: c.name })));

  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};
  const threadsToFetch: { channelId: string; threadTs: string; dmName: string }[] = [];

  const twentyFourMonthsAgo = Date.now() - (24 * 30 * 24 * 60 * 60 * 1000);

  // Increase from 5 to 15 DM channels to fetch
  for (const dm of allDmChannels.slice(0, 15)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${dm.id}&limit=10&_t=${Date.now()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      const historyData = await historyResponse.json();

      console.log(`[Slack DMs] Channel ${dm.id} returned ${historyData.messages?.length || 0} messages`);

      if (historyData.ok && historyData.messages) {
        let dmName = 'Direct Message';
        if (dm.user) {
          if (!userNameCache[dm.user]) {
            userNameCache[dm.user] = await getUserName(token, dm.user);
          }
          dmName = userNameCache[dm.user];
        } else if (dm.is_mpim) {
          dmName = await getMpimMemberNames(token, dm.id, userNameCache);
        }

        for (const msg of historyData.messages) {
          const messageTimestamp = parseFloat(msg.ts) * 1000;
          if (messageTimestamp < twentyFourMonthsAgo) {
            continue;
          }
          
          const isRegularMessage = msg.type === 'message' && !msg.subtype;
          const isAssistantThread = msg.type === 'message' && msg.subtype === 'assistant_app_thread';
          
          if (isRegularMessage || isAssistantThread) {
            const messageText = isAssistantThread && msg.assistant_app_thread?.title 
              ? msg.assistant_app_thread.title 
              : (msg.text || '');
              
            let userName = userNameCache[msg.user];
            if (!userName && msg.user) {
              userName = await getUserName(token, msg.user);
              userNameCache[msg.user] = userName;
            }

            messages.push({
              id: msg.ts,
              channelId: dm.id,
              channelName: dmName,
              text: messageText,
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(messageTimestamp).toISOString(),
              isDm: true,
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0
            });

            if (includeThreadReplies && msg.reply_count && msg.reply_count > 0 && msg.thread_ts) {
              threadsToFetch.push({ channelId: dm.id, threadTs: msg.thread_ts, dmName });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching DM history:`, error);
    }
  }

  if (includeThreadReplies && threadsToFetch.length > 0) {
    for (const thread of threadsToFetch.slice(0, 5)) {
      try {
        const repliesResponse = await fetch(
          `https://slack.com/api/conversations.replies?channel=${thread.channelId}&ts=${thread.threadTs}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const repliesData = await repliesResponse.json();

        if (repliesData.ok && repliesData.messages) {
          for (const reply of repliesData.messages.slice(1)) {
            if (reply.type === 'message') {
              let userName = userNameCache[reply.user];
              if (!userName && reply.user) {
                userName = await getUserName(token, reply.user);
                userNameCache[reply.user] = userName;
              }

              messages.push({
                id: reply.ts,
                channelId: thread.channelId,
                channelName: thread.dmName,
                text: reply.text || '',
                userId: reply.user || '',
                userName: userName || 'Unknown',
                timestamp: new Date(parseFloat(reply.ts) * 1000).toISOString(),
                isDm: true,
                threadTs: thread.threadTs,
                isThread: true,
                replyCount: 0
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching thread replies:`, error);
      }
    }
  }

  // Deduplicate messages by ID (thread replies might appear in both history and thread fetch)
  const seen = new Set<string>();
  const uniqueMessages = messages.filter(msg => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });

  uniqueMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return uniqueMessages.slice(0, effectiveMaxResults);
}

export async function getThreadReplies(channelId: string, threadTs: string, maxResults: number = 10): Promise<SlackMessage[]> {
  const token = await getSlackToken();

  const response = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channelId}&ts=${threadTs}&limit=${maxResults}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack thread replies error:', data.error);
    return [];
  }

  const userNameCache: Record<string, string> = {};
  const messages: SlackMessage[] = [];

  for (const msg of (data.messages || []).slice(1)) {
    if (msg.type === 'message') {
      let userName = userNameCache[msg.user];
      if (!userName && msg.user) {
        userName = await getUserName(token, msg.user);
        userNameCache[msg.user] = userName;
      }

      messages.push({
        id: msg.ts,
        channelId: channelId,
        channelName: '',
        text: msg.text || '',
        userId: msg.user || '',
        userName: userName || 'Unknown',
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        isThread: true,
        threadTs: threadTs
      });
    }
  }

  return messages;
}

export async function getRecentMessages(maxResults: number = 20): Promise<SlackMessage[]> {
  const token = await getSlackToken();

  const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const channelsData = await channelsResponse.json();

  if (!channelsData.ok) {
    console.error('Slack channels error:', channelsData.error);
    return [];
  }

  const memberChannels = (channelsData.channels || []).filter((c: any) => c.is_member);
  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  for (const channel of memberChannels.slice(0, 5)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const historyData = await historyResponse.json();

      if (historyData.ok && historyData.messages) {
        for (const msg of historyData.messages) {
          if (msg.type === 'message' && !msg.subtype) {
            let userName = userNameCache[msg.user];
            if (!userName && msg.user) {
              userName = await getUserName(token, msg.user);
              userNameCache[msg.user] = userName;
            }

            let permalink = '';
            try {
              const permalinkResponse = await fetch(
                `https://slack.com/api/chat.getPermalink?channel=${channel.id}&message_ts=${msg.ts}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              const permalinkData = await permalinkResponse.json();
              if (permalinkData.ok) {
                permalink = permalinkData.permalink;
              }
            } catch {
              // Skip permalink if it fails
            }

            messages.push({
              id: msg.ts,
              channelId: channel.id,
              channelName: channel.name,
              text: msg.text || '',
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              permalink,
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0,
              isDm: false
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching messages from channel ${channel.name}:`, error);
    }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
}

export async function getAllMessages(maxResults: number = 30): Promise<SlackMessage[]> {
  const [channelMessages, dmMessages] = await Promise.all([
    getRecentMessages(Math.floor(maxResults * 0.5)),
    getDirectMessages(Math.floor(maxResults * 0.5))
  ]);

  // Deduplicate messages by ID
  const seen = new Set<string>();
  const allMessages = [...channelMessages, ...dmMessages].filter(msg => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
  
  allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return allMessages.slice(0, maxResults);
}

export async function isSlackConnected(): Promise<boolean> {
  try {
    const token = await getSlackToken();
    
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function getRecentMessagesFiltered(
  channelIds: string[], 
  maxResults: number = 20
): Promise<SlackMessage[]> {
  if (channelIds.length === 0) {
    return [];
  }

  const token = await getSlackToken();
  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const channelsData = await channelsResponse.json();
  if (!channelsData.ok) {
    return [];
  }

  const channelMap = new Map<string, string>();
  for (const channel of channelsData.channels || []) {
    channelMap.set(channel.id, channel.name);
  }

  for (const channelId of channelIds.slice(0, 10)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const historyData = await historyResponse.json();

      if (historyData.ok && historyData.messages) {
        for (const msg of historyData.messages) {
          if (msg.type === 'message' && !msg.subtype) {
            let userName = userNameCache[msg.user];
            if (!userName && msg.user) {
              userName = await getUserName(token, msg.user);
              userNameCache[msg.user] = userName;
            }

            messages.push({
              id: msg.ts,
              channelId: channelId,
              channelName: channelMap.get(channelId) || channelId,
              text: msg.text || '',
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0,
              isDm: false
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching messages from channel ${channelId}:`, error);
    }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
}

// ==================== USER TOKEN FUNCTIONS ====================
// These functions use the user's own OAuth token to access their messages

export async function getUserSlackToken(userId: string): Promise<string | null> {
  const creds = await storage.getSlackUserCredentials(userId);
  return creds?.accessToken || null;
}

export async function isUserSlackConnected(userId: string): Promise<boolean> {
  const creds = await storage.getSlackUserCredentials(userId);
  return !!creds;
}

export async function getUserDirectMessages(userId: string, maxResults: number = 10): Promise<SlackMessage[]> {
  const token = await getUserSlackToken(userId);
  if (!token) {
    return [];
  }

  // Fetch up to 100 DM channels when using user token (more comprehensive than bot)
  const response = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack user DM list error:', data.error);
    return [];
  }

  const allDmChannels = data.channels || [];
  
  // Sort DM channels by priority (most recently active first)
  // Priority is based on 'priority' field if available, or 'updated' timestamp
  const sortedDmChannels = [...allDmChannels].sort((a, b) => {
    // Higher priority values = more recent activity
    const priorityA = a.priority || 0;
    const priorityB = b.priority || 0;
    if (priorityA !== priorityB) return priorityB - priorityA;
    
    // Fall back to updated timestamp
    const updatedA = a.updated || 0;
    const updatedB = b.updated || 0;
    return updatedB - updatedA;
  });
  
  console.log(`[Slack User DMs] Found ${allDmChannels.length} DM channels for user ${userId}`);

  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  const twentyFourMonthsAgo = Date.now() - (24 * 30 * 24 * 60 * 60 * 1000);

  // Fetch from up to 30 DM channels with user token (prioritized by recent activity)
  for (const dm of sortedDmChannels.slice(0, 30)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${dm.id}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const historyData = await historyResponse.json();

      if (historyData.ok && historyData.messages) {
        for (const msg of historyData.messages) {
          const messageTimestamp = parseFloat(msg.ts) * 1000;
          if (messageTimestamp < twentyFourMonthsAgo) {
            continue;
          }
          
          const isRegularMessage = msg.type === 'message' && !msg.subtype;
          const isAssistantThread = msg.type === 'message' && msg.subtype === 'assistant_app_thread';
          
          if (isRegularMessage || isAssistantThread) {
            const messageText = isAssistantThread && msg.assistant_app_thread?.title 
              ? msg.assistant_app_thread.title 
              : (msg.text || '');
              
            let userName = userNameCache[msg.user];
            if (!userName && msg.user) {
              userName = await getUserName(token, msg.user);
              userNameCache[msg.user] = userName;
            }

            let dmName = 'Direct Message';
            if (dm.user) {
              if (!userNameCache[dm.user]) {
                userNameCache[dm.user] = await getUserName(token, dm.user);
              }
              dmName = userNameCache[dm.user];
            } else if (dm.is_mpim) {
              dmName = await getMpimMemberNames(token, dm.id, userNameCache);
            }

            messages.push({
              id: msg.ts,
              channelId: dm.id,
              channelName: dmName,
              text: messageText,
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(messageTimestamp).toISOString(),
              isDm: true,
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching user DM history:`, error);
    }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
}

export async function getUserChannels(userId: string): Promise<SlackChannel[]> {
  const token = await getUserSlackToken(userId);
  if (!token) {
    return [];
  }

  const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack user channels error:', data.error);
    return [];
  }

  return (data.channels || []).map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    isMember: channel.is_member || false
  }));
}

export async function getUserChannelMessages(userId: string, maxResults: number = 20): Promise<SlackMessage[]> {
  const token = await getUserSlackToken(userId);
  if (!token) {
    return [];
  }

  const channelResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const channelData = await channelResponse.json();

  if (!channelData.ok) {
    console.error('Slack user channels error:', channelData.error);
    return [];
  }

  const memberChannels = (channelData.channels || []).filter((ch: any) => ch.is_member);
  const channelMap = new Map(memberChannels.map((ch: any) => [ch.id, ch.name]));
  
  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  for (const channel of memberChannels.slice(0, 10)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const historyData = await historyResponse.json();

      if (historyData.ok && historyData.messages) {
        for (const msg of historyData.messages) {
          if (msg.type === 'message' && !msg.subtype) {
            let userName = userNameCache[msg.user];
            if (!userName && msg.user) {
              userName = await getUserName(token, msg.user);
              userNameCache[msg.user] = userName;
            }

            messages.push({
              id: msg.ts,
              channelId: channel.id,
              channelName: channelMap.get(channel.id) || channel.id,
              text: msg.text || '',
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0,
              isDm: false
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching user channel messages:`, error);
    }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
}

export async function getUserAllMessages(userId: string, maxResults: number = 30): Promise<SlackMessage[]> {
  const [dms, channelMessages] = await Promise.all([
    getUserDirectMessages(userId, 15),
    getUserChannelMessages(userId, 15)
  ]);

  const allMessages = [...dms, ...channelMessages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return allMessages.slice(0, maxResults);
}

// ==================== SLACK NOTIFICATIONS ====================
// Functions to send notifications to Slack channels

export interface SlackNotificationResult {
  success: boolean;
  channelId?: string;
  timestamp?: string;
  error?: string;
}

export async function sendSlackNotification(
  channelId: string,
  message: string,
  options?: {
    threadTs?: string;
    unfurlLinks?: boolean;
    mrkdwn?: boolean;
  }
): Promise<SlackNotificationResult> {
  try {
    const token = await getSlackToken();
    
    const payload: any = {
      channel: channelId,
      text: message,
      unfurl_links: options?.unfurlLinks ?? false,
      mrkdwn: options?.mrkdwn ?? true,
    };

    if (options?.threadTs) {
      payload.thread_ts = options.threadTs;
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack postMessage error:', data.error);
      return { success: false, error: data.error };
    }

    return {
      success: true,
      channelId: data.channel,
      timestamp: data.ts,
    };
  } catch (error: any) {
    console.error('Error sending Slack notification:', error);
    return { success: false, error: error?.message || 'Failed to send notification' };
  }
}

export async function sendSlackBlockNotification(
  channelId: string,
  blocks: any[],
  text: string,
  options?: {
    threadTs?: string;
  }
): Promise<SlackNotificationResult> {
  try {
    const token = await getSlackToken();
    
    const payload: any = {
      channel: channelId,
      blocks: blocks,
      text: text, // Fallback text for notifications
    };

    if (options?.threadTs) {
      payload.thread_ts = options.threadTs;
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack postMessage error:', data.error);
      return { success: false, error: data.error };
    }

    return {
      success: true,
      channelId: data.channel,
      timestamp: data.ts,
    };
  } catch (error: any) {
    console.error('Error sending Slack block notification:', error);
    return { success: false, error: error?.message || 'Failed to send notification' };
  }
}

// Send a message using user's OAuth token (for DM replies)
export async function sendUserSlackMessage(
  userId: string,
  channelId: string,
  message: string,
  options?: {
    threadTs?: string;
  }
): Promise<SlackNotificationResult> {
  try {
    console.log('[Slack] sendUserSlackMessage called:', { userId, channelId, hasThreadTs: !!options?.threadTs });
    const token = await getUserSlackToken(userId);
    if (!token) {
      console.error('[Slack] No token found for user:', userId);
      return { success: false, error: 'User Slack not connected' };
    }
    
    const payload: any = {
      channel: channelId,
      text: message,
    };

    if (options?.threadTs) {
      payload.thread_ts = options.threadTs;
    }

    console.log('[Slack] Sending chat.postMessage with payload:', JSON.stringify(payload));
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[Slack] chat.postMessage response:', { ok: data.ok, error: data.error, channel: data.channel });

    if (!data.ok) {
      console.error('[Slack] user postMessage error:', data.error, data);
      return { success: false, error: data.error };
    }

    return {
      success: true,
      channelId: data.channel,
      timestamp: data.ts,
    };
  } catch (error: any) {
    console.error('Error sending Slack message as user:', error);
    return { success: false, error: error?.message || 'Failed to send message' };
  }
}

// Helper to format The YHC Way notifications nicely for Slack
export function formatYHCWayNotification(
  type: 'task_assigned' | 'task_completed' | 'project_update' | 'comment' | 'custom',
  data: {
    title: string;
    description?: string;
    user?: string;
    link?: string;
  }
): { blocks: any[]; text: string } {
  const icons = {
    task_assigned: '📋',
    task_completed: '✅',
    project_update: '📊',
    comment: '💬',
    custom: '🔔',
  };

  const icon = icons[type] || '🔔';
  const text = `${icon} ${data.title}`;
  
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${icon} ${data.title}*`,
      },
    },
  ];

  if (data.description) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.description,
      },
    });
  }

  if (data.user) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `By ${data.user}`,
        },
      ],
    });
  }

  if (data.link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View in The YHC Way',
          },
          url: data.link,
          action_id: 'view_in_yhcway',
        },
      ],
    });
  }

  return { blocks, text };
}
