# Slack Configuration Guide for The YHC Way

This guide walks you through setting up Slack integration for The YHC Way.

## Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Enter an app name (e.g., "The YHC Way Integration")
5. Select your Slack workspace
6. Click **Create App**

## Step 2: Configure Bot Permissions

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll down to **Scopes** section
3. Under **Bot Token Scopes**, add these permissions:
   - `channels:history` - View messages in public channels
   - `channels:read` - View basic channel info
   - `groups:history` - View messages in private channels (optional)
   - `groups:read` - View basic private channel info (optional)
   - `im:history` - View direct messages
   - `im:read` - View basic DM info
   - `mpim:history` - View group DM messages
   - `mpim:read` - View basic group DM info
   - `users:read` - View user info

## Step 3: Install the App to Your Workspace

1. Scroll up to **OAuth Tokens for Your Workspace**
2. Click **Install to Workspace**
3. Review the permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## Step 4: Add the Token to The YHC Way

1. In your Replit project, go to the **Secrets** tab (lock icon in the left sidebar)
2. Find or create a secret named `SLACK_BOT_TOKEN`
3. Paste your Bot User OAuth Token as the value
4. Save the secret

## Step 5: Invite the Bot to Channels

For the bot to read messages from a channel:

1. Open the Slack channel you want to monitor
2. Type `/invite @YourBotName` (replace with your bot's name)
3. Press Enter

The bot must be invited to each channel you want to see in The YHC Way.

## Troubleshooting

### "invalid_auth" Error
- Your bot token may be expired or incorrect
- Go back to [api.slack.com/apps](https://api.slack.com/apps), select your app
- Navigate to **OAuth & Permissions** and copy a fresh token

### No Messages Showing
- Make sure the bot is invited to the channels you want to monitor
- Check that the required scopes are added (Step 2)
- Reinstall the app after adding new scopes

### Missing Channels
- Private channels require `groups:read` and `groups:history` scopes
- The bot must be explicitly invited to private channels

## Required Scopes Summary

| Scope | Purpose |
|-------|---------|
| channels:history | Read public channel messages |
| channels:read | List public channels |
| im:history | Read direct messages |
| im:read | List direct message conversations |
| users:read | Get user names and profiles |

## Need Help?

If you're still having issues, check the Slack API documentation at [api.slack.com/docs](https://api.slack.com/docs) or verify your token is correctly saved in the Secrets tab.
