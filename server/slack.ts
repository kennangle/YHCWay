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

export async function getDirectMessages(maxResults: number = 10): Promise<SlackMessage[]> {
  const token = await getSlackToken();

  const response = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=20', {
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

  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  const twentyFourMonthsAgo = Math.floor((Date.now() - (24 * 30 * 24 * 60 * 60 * 1000)) / 1000);

  for (const dm of (data.channels || []).slice(0, 5)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${dm.id}&limit=3&oldest=${twentyFourMonthsAgo}`,
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
          // Include regular messages and assistant app thread messages
          const isRegularMessage = msg.type === 'message' && !msg.subtype;
          const isAssistantThread = msg.type === 'message' && msg.subtype === 'assistant_app_thread';
          
          if (isRegularMessage || isAssistantThread) {
            // For assistant threads, use the title as the message text
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
            } else if (dm.is_mpim && dm.name) {
              dmName = dm.name.replace('mpdm-', '').replace('--', ', ');
            }

            messages.push({
              id: msg.ts,
              channelId: dm.id,
              channelName: dmName,
              text: messageText,
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              isDm: true,
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count || 0
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching DM history:`, error);
    }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
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

  const allMessages = [...channelMessages, ...dmMessages];
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

  const response = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=20', {
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

  const messages: SlackMessage[] = [];
  const userNameCache: Record<string, string> = {};

  const twentyFourMonthsAgo = Math.floor((Date.now() - (24 * 30 * 24 * 60 * 60 * 1000)) / 1000);

  for (const dm of (data.channels || []).slice(0, 10)) {
    try {
      const historyResponse = await fetch(
        `https://slack.com/api/conversations.history?channel=${dm.id}&limit=5&oldest=${twentyFourMonthsAgo}`,
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
            } else if (dm.is_mpim && dm.name) {
              dmName = dm.name.replace('mpdm-', '').replace('--', ', ');
            }

            messages.push({
              id: msg.ts,
              channelId: dm.id,
              channelName: dmName,
              text: messageText,
              userId: msg.user || '',
              userName: userName || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
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
