# UniWork360 New User Testing Guide

Welcome to UniWork360! This guide will walk you through setting up and testing all the features of your unified workspace.

---

## Step 1: Initial Login

1. Visit the app URL
2. Click **"Log in with Replit"** on the landing page
3. Authorize the app with your Replit account
4. You should be redirected to the Dashboard

**What to verify:**
- You see the Dashboard with your name in the top right
- The sidebar navigation is visible on the left

---

## Step 2: Connect Your Services (Setup Guide)

Navigate to **Connect** in the sidebar to set up your integrations.

### 2A: Connect Google Calendar
1. Find "Google Calendar" card
2. Click **Connect**
3. Authorize with your Google account
4. Return to the Connect page

**What to verify:** Green "Connected" badge appears

### 2B: Connect Gmail
1. Find "Gmail" card
2. Click **Connect** 
3. Authorize with your Google account (make sure to grant email permissions)
4. Return to the Connect page

**What to verify:** Green "Connected" badge appears

### 2C: Connect Zoom (if applicable)
1. Find "Zoom" card
2. Click **Connect**
3. Authorize with your Zoom account

**What to verify:** Green "Connected" badge appears

### 2D: Connect Slack (if applicable)
1. Find "Slack" card
2. Click **Connect**
3. Authorize with your Slack workspace
4. Select which channels to monitor

**What to verify:** Green "Connected" badge appears

### 2E: Connect Apple Calendar (Optional)
1. Find "Apple Calendar" card
2. Click **Connect**
3. Enter your Apple ID email
4. Enter an **App-Specific Password** (create one at appleid.apple.com)

**What to verify:** Green "Connected" badge appears

---

## Step 3: Explore the Dashboard

Navigate to **Dashboard** in the sidebar.

**What to verify:**
- Unified feed shows items from connected services
- Calendar widget shows upcoming events
- Zoom meetings appear (if connected)
- Asana tasks appear (if connected)

---

## Step 4: Test the Unified Inbox

Navigate to **Unified Inbox** in the sidebar.

### 4A: View Messages
1. You should see emails and Slack messages combined
2. Use the filter buttons (All, Gmail, Channels, DMs) to filter

**What to verify:**
- Messages are sorted by date
- Each message type has a colored indicator (red=Gmail, purple=Slack, pink=DMs)

### 4B: Read an Email
1. Click on any Gmail message
2. A detail panel should slide in from the right
3. Review the full email content

**What to verify:** Email content displays correctly with formatting

### 4C: Compose an Email
1. Click the **Compose** button (top right)
2. Fill in To, Subject, and body
3. Use the formatting toolbar (bold, italic, lists, etc.)
4. Click **Send**

**What to verify:** 
- Rich text editor works
- Email sends successfully (check your sent folder)

### 4D: Archive a Message
1. Hover over any message
2. Click the **Archive** icon (box with arrow)
3. Message should disappear from inbox

**What to verify:** Message is archived

---

## Step 5: Test the Archive

Navigate to **Archive** in the sidebar.

1. View your archived messages
2. Use filters to switch between Emails and Slack messages
3. Click **Restore** on any message to unarchive it

**What to verify:**
- Archived messages appear here
- Restore moves them back to inbox

---

## Step 6: Test Projects & Tasks

Navigate to **Projects** in the sidebar.

### 6A: Create a Project
1. Click **New Project**
2. Enter a name (e.g., "Test Project")
3. Add a description
4. Click **Create**

**What to verify:** Project appears in the list

### 6B: Open the Project
1. Click on your new project
2. You should see a Kanban board with columns

**What to verify:** Default columns (To Do, In Progress, Done) are visible

### 6C: Create a Task
1. Click **Add Task** in any column
2. Enter a title (e.g., "Test Task")
3. Add details, due date, priority
4. Click **Save**

**What to verify:** Task card appears in the column

### 6D: Drag and Drop
1. Drag a task from one column to another
2. Release to drop

**What to verify:** Task moves to the new column

### 6E: Edit a Task
1. Click on any task card
2. Modify the details
3. Save changes

**What to verify:** Changes are saved

---

## Step 7: Test the Calendar View

Navigate to **Calendar** in the sidebar.

1. View your calendar events
2. Switch between Week/Month views
3. Events should be color-coded by source

**What to verify:**
- Google Calendar events appear
- Apple Calendar events appear (if connected)
- Zoom meetings appear with video icon

---

## Step 8: Test AI Assistant

Navigate to **AI Assistant** in the sidebar.

### 8A: Daily Briefing
1. Click **Get Daily Briefing**
2. Wait for AI to generate summary

**What to verify:** AI provides summary of your day

### 8B: Smart Search
1. Type a query like "Show me emails about invoices"
2. Press Enter or click Search

**What to verify:** AI returns relevant results

### 8C: Task Generation
1. Paste some text (email, meeting notes)
2. Click **Extract Tasks**

**What to verify:** AI suggests actionable tasks

---

## Step 9: Test Settings

Navigate to **Settings** in the sidebar.

### 9A: Appearance
1. Try switching theme (Light/Dark)
2. Adjust color preferences

**What to verify:** Theme changes apply immediately

### 9B: Notifications
1. Toggle notification preferences
2. Set quiet hours

**What to verify:** Settings save correctly

---

## Step 10: Test Chat

Navigate to **Chat** in the sidebar.

1. Select a conversation or start new one
2. Type a message
3. Send it

**What to verify:** Message appears in chat

---

## Step 11: Test Mobile (PWA)

On your mobile device:

1. Open the app URL in Safari (iOS) or Chrome (Android)
2. Add to Home Screen
3. Open the app from your home screen
4. Navigate through all features

**What to verify:**
- App opens in fullscreen mode
- Navigation works on mobile
- All features are accessible

---

## Step 12: Test Keyboard Shortcuts

Try these keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + N` | New task |
| `Cmd/Ctrl + /` | Show shortcuts |

**What to verify:** Shortcuts work as expected

---

## Troubleshooting

### Gmail shows "Insufficient Permission"
- Go to Connect page
- Disconnect Gmail
- Reconnect and ensure you grant all requested permissions

### Slack messages not appearing
- Check that the Slack bot is invited to channels
- Go to Slack Channel Config and select channels to monitor

### Calendar events not syncing
- Verify the calendar connection is active
- Check that the calendar has events in the visible date range

---

## Testing Complete!

If all steps work correctly, the app is functioning as expected. Report any issues with:
- Which step failed
- What you expected to happen
- What actually happened
- Any error messages shown
