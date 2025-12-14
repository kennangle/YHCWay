// Slack integration using Bot Token

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: string;
  permalink?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isMember: boolean;
}

async function getSlackToken(): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error('Slack bot token not configured');
  }
  return token;
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

export async function getRecentMessages(maxResults: number = 20): Promise<SlackMessage[]> {
  const token = await getSlackToken();

  // First get channels the bot is a member of
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

  // Fetch recent messages from each channel (limit to first 5 channels for performance)
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
            // Get permalink for the message
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
              userName: msg.user || 'Unknown',
              timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              permalink
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching messages from channel ${channel.name}:`, error);
    }
  }

  // Sort by timestamp descending and limit
  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, maxResults);
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
