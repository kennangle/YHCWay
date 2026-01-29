# The YHC Way User Guide

Welcome to The YHC Way! This guide will help you get started with your unified workspace and make the most of all its features.

---

## Getting Started

### Your First Login

After your administrator approves your account, you'll receive access to The YHC Way. When you log in for the first time, you'll see the Dashboard - your central hub for all work activity.

Before diving in, we recommend visiting the **Setup Guide** (found in the left sidebar) to connect your favorite tools. The more services you connect, the more powerful The YHC Way becomes.

### Understanding the Sidebar

The left sidebar is your main navigation. Here's what you'll find:

**Main Menu**
- **Overview** - Your dashboard with a unified activity feed
- **Unified Inbox** - All your emails and messages in one place
- **Calendar** - Events from Google Calendar, Apple Calendar, and Zoom
- **Asana Tasks** - Your tasks and projects from Asana
- **Intro Offers** - Mindbody Analytics intro offer tracking
- **Chat** - Internal messaging with your team

**Bottom Menu**
- **Setup Guide** - Step-by-step help connecting your services
- **Connect App** - Add or manage your connected services
- **Email Builder** - Create and manage email templates
- **Settings** - Customize your preferences

---

## Connecting Your Services

The YHC Way works best when you connect all your productivity tools. Here's how to set up each one:

### Gmail

1. Go to **Connect App** in the sidebar
2. Find **Gmail** and click **Connect**
3. Sign in with your Google account and grant permission
4. Your emails will now appear in the Unified Inbox

### Google Calendar

1. Go to **Connect App** in the sidebar
2. Find **Google Calendar** - it connects automatically with Gmail
3. Your events will appear in the Calendar page

### Apple Calendar (iCloud)

1. Go to **Connect App** in the sidebar
2. Find **Apple Calendar** and click **Connect**
3. Enter your Apple ID email address
4. Enter an **App-Specific Password** (not your regular Apple password)
   - To create one: Go to appleid.apple.com > Sign-In and Security > App-Specific Passwords
5. Your iCloud calendar events will sync to The YHC Way

### Slack

1. Go to **Connect App** in the sidebar
2. Find **Slack** and click **Connect**
3. Authorize The YHC Way to access your Slack workspace
4. Your Slack messages and DMs will appear in the Unified Inbox

### Zoom

Zoom is pre-configured by your administrator. Your upcoming Zoom meetings will automatically appear in your Calendar.

### Asana

1. Go to **Connect App** in the sidebar
2. Find **Asana** and click **Connect**
3. Sign in to your Asana account and grant permission
4. Your tasks will appear in the Asana Tasks page

---

## Using the Dashboard

The Dashboard is your home base. Here's what you'll see:

### Unified Activity Feed

The main section shows recent activity from all your connected services:
- New emails from Gmail
- Slack messages and mentions
- Upcoming Zoom meetings
- New intro offers from Mindbody Analytics

Each item shows when it happened and lets you quickly see what needs your attention.

### Filtering the Feed

Use the filters above the feed to narrow down what you see:
- **All/Mentions/Unread** - Filter by message status
- **Service Dropdown** - Filter by source (Gmail, Slack, Zoom, Intro Offers)

The service dropdown shows counts for each source so you can see at a glance where your activity is coming from.

### Today's Schedule

On the right side, you'll see your upcoming events for the day, pulled from all your connected calendars.

### Quick Stats

The dashboard also shows summary cards with:
- Unread email count
- Upcoming meetings
- Pending tasks
- Active intro offers

---

## The Unified Inbox

The Unified Inbox brings together messages from Gmail and Slack in one view.

### Filtering Messages

Use the tabs at the top to filter:
- **All** - Everything in one view
- **Gmail** - Only email messages
- **Slack** - Only Slack messages
- **Slack DMs** - Direct messages from Slack

### Reading and Responding

Click any message to see more details. For emails, you can read the full message and reply directly. For Slack messages, you can view the thread and see where the conversation is happening.

---

## Calendar

The Calendar page shows events from all your connected calendar services.

### Viewing Events

- Events from Google Calendar appear with a blue indicator
- Events from Apple Calendar appear with a gray indicator
- Zoom meetings show a video icon and include a "Join" button

### Navigating Dates

Use the arrows at the top to move between days, or click "Today" to jump back to the current date.

---

## Asana Tasks

If you use Asana for project management, this page shows all your assigned tasks.

### Task List

Each task shows:
- Task name
- Due date (if set)
- Project name
- A link to open the task directly in Asana

### Completing Tasks

Click on any task to see its details. To mark it complete or make changes, click the link to open it in Asana.

---

## Intro Offers (Mindbody Analytics)

If your organization uses Mindbody, this page helps you track intro offer purchases and student engagement.

### What You'll See

Each intro offer shows:
- Student name
- Offer purchased
- Purchase date
- Member status
- Classes attended since purchase
- Days since purchase

### Understanding the Data

This information helps you follow up with new students who purchased intro offers, ensuring they're engaged and converting to regular members.

---

## Chat

The YHC Way includes built-in chat for communicating with your team.

### Starting a Conversation

1. Click the **+** button to start a new conversation
2. Select a team member from the list
3. Type your message and press Enter or click Send

### Group Conversations

You can also create group chats:
1. Click the **+** button
2. Select multiple team members
3. Give the group a name (optional)
4. Start chatting

### Thread Replies

To keep conversations organized, you can reply in a thread:
1. Hover over a message
2. Click the reply icon
3. Your reply will be nested under the original message

---

## Email Builder

Create professional email templates for common communications.

### Creating a Template

1. Go to **Email Builder** in the sidebar
2. Click **Create Template**
3. Choose a template type (welcome, follow-up, etc.)
4. Use the visual editor to design your email
5. Save your template for future use

### Using Variables

Templates support variables like `{{firstName}}` that get replaced with actual data when you send emails.

---

## Settings

Customize The YHC Way to work the way you prefer.

### Available Settings

- **Profile** - Update your name and profile picture
- **Notifications** - Choose what alerts you receive
- **Appearance** - Switch between light and dark themes
- **Connected Services** - View and manage your integrations
- **Organization** - Manage your team and organization settings

---

## Organization (Teams)

Organizations allow you to collaborate with your team. When you create an organization, you become the owner and can invite team members to share projects, tasks, and data.

### Creating an Organization

1. Go to **Settings** in the sidebar
2. Click **Organization**
3. Click **Create Organization**
4. Enter your organization name (e.g., "Yoga Health Center")
5. The URL slug will be auto-generated (you can customize it)
6. Click **Create Organization**

You'll now see your organization details including:
- **Organization ID** (Tenant ID) - A unique identifier for your organization
- **Plan** - Your current subscription level
- **Created Date** - When the organization was created

### Viewing Your Organization ID

Your Organization ID (also called Tenant ID) is displayed in Settings > Organization. You can click the copy button next to it to copy it to your clipboard.

The Organization ID is used to:
- Scope all your data (projects, tasks, team members)
- Identify your organization when using the API
- Share access with external integrations

### Inviting Team Members

Only organization owners and admins can invite new members:

1. Go to **Settings > Organization**
2. Click **Invite** in the Team Members section
3. Enter the team member's email address
4. Choose their role:
   - **Member** - Can view and work on shared projects
   - **Admin** - Can also invite new members and manage settings
5. Click **Send Invitation**

The invited person will receive an email with a link to join your organization.

### Team Member Roles

- **Owner** - Full control over the organization (cannot be removed)
- **Admin** - Can invite members, manage settings, and access all features
- **Member** - Can work on projects and tasks within the organization
- **Guest** - Limited access (view only)

### Data Isolation

All data within an organization is isolated and secure:
- Projects and tasks are only visible to organization members
- Each organization has its own settings and configurations
- Removing a member revokes their access to all organization data

---

## Projects & Tasks

The YHC Way includes a powerful project management system for organizing your work, with multiple views just like Asana.

### Creating a Project

1. Go to **Projects** in the sidebar
2. Click **New Project**
3. Give your project a name and optional description
4. Your project board will be created with default columns (To Do, In Progress, Done)

### Project Views

The YHC Way offers four different ways to view your project:

**Board View** (Kanban)
- The default view showing tasks as cards organized in columns
- Drag and drop tasks between columns to update their status
- Perfect for visualizing workflow stages

**List View**
- A spreadsheet-like view showing all tasks in rows
- Quickly see task status, priority, due date, and assignee at a glance
- Great for bulk reviewing tasks

**Gantt Chart View**
- A timeline-based view showing task durations
- See task start dates and end dates as horizontal bars
- Identify task overlap and scheduling conflicts
- View task progress and milestones
- Perfect for project planning and resource management

**Timeline View**
- Tasks grouped by due date (Today, Tomorrow, This Week, etc.)
- Overdue tasks highlighted at the top
- Tasks without due dates shown at the bottom
- Ideal for focusing on what's due next

To switch views, use the view buttons in the top-right corner of your project:
- Grid icon = Board View
- List icon = List View
- Gantt icon = Gantt Chart View
- Calendar range icon = Timeline View

### Managing Tasks

**Creating Tasks:**
1. Click **+ Add Task** in any column
2. Enter the task title
3. Click the task to add more details like due date, priority, and assignees

**Moving Tasks:**
Simply drag and drop tasks between columns to update their status (in Board view).

**Task Details:**
Click any task to open it and:
- Add a description
- Set a start date (for Gantt view scheduling)
- Set a due date
- Set task progress (0-100%)
- Mark as milestone (for key project dates)
- Assign it to a team member
- Add subtasks for breaking down work
- Leave comments for discussion
- Set priority (Low, Medium, High, Urgent)
- **Set as recurring** (daily, weekly, bi-weekly, or monthly)

### Recurring Tasks

For tasks that repeat regularly:
1. Open any task
2. Click the **Repeat** button (shows "Not recurring" by default)
3. Choose your pattern:
   - **Daily** - Task repeats every day
   - **Weekly** - Task repeats every week
   - **Bi-weekly** - Task repeats every two weeks
   - **Monthly** - Task repeats every month
4. The task will show a purple recurring indicator

### Multi-Project Tasks

Tasks can belong to multiple projects simultaneously:
- When a task appears in multiple projects, it shows a purple badge with the project count
- Click the task to see all projects it belongs to
- Changes to the task (completion, details) sync across all projects

### Task Filtering

Filter tasks to focus on what matters:
1. Click the **Filter** button at the top of your project board
2. Filter by:
   - **Priority** - Show only High/Urgent tasks
   - **Due Date** - Show tasks due within a date range
3. Active filters are highlighted

### Custom Columns

You can add custom columns to organize work your way:
1. Click **Add Column** at the end of your board
2. Name your column
3. Drag it to reorder if needed

### Importing from Asana

If you're migrating from Asana, you can import your projects:
1. Go to the Projects page
2. Click **Import from Asana**
3. Select the Asana project to import
4. Your sections become columns and tasks are imported automatically

---

## Typeform Integration

Create and manage forms directly within The YHC Way.

### Viewing Forms

1. Go to **Typeform** in the sidebar (admin only)
2. See all your Typeform forms in one place
3. Click **Preview** to view a form without leaving The YHC Way
4. Click the external link icon to open forms in Typeform

### Connecting Typeform

Typeform is configured by your administrator. Once connected, all your organization's forms will be accessible from The YHC Way.

---

## Email Notifications

The YHC Way can send you email notifications when tasks are assigned to you.

### What Gets Notified

- **Task Assignments** - When someone assigns a task to you, you'll receive an email with the task details, project name, and a link to view it

### Managing Notification Preferences

1. Go to **Settings** in the sidebar
2. Find the **Notifications** section
3. Toggle task assignment emails on or off

---

## Mobile Access

The YHC Way is fully mobile-optimized and works great on phones and tablets.

### Accessing on Mobile

Simply open The YHC Way in your mobile browser:
- The layout automatically adjusts for smaller screens
- All features are accessible on mobile
- Touch-friendly buttons and navigation

### Adding to Your Home Screen

For quick access, you can add The YHC Way to your phone's home screen:

**On iPhone/iPad:**
1. Open The YHC Way in **Safari**
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

**On Android:**
1. Open The YHC Way in **Chrome**
2. Tap the **three-dot menu** in the top right
3. Tap **Add to Home Screen**
4. Tap **Add**

This creates a shortcut icon on your home screen for quick access to The YHC Way.

---

## Chat Search

Quickly find conversations and messages in Chat.

### How to Search

1. Go to **Chat** in the sidebar
2. Use the **search bar** at the top of the conversation list
3. Type a name or keywords
4. Results filter as you type

### What's Searchable

- Conversation names
- Participant names
- Message content

### Clearing Search

Click the **X** button in the search bar to clear your search and see all conversations again.

---

## Keyboard Shortcuts

The YHC Way supports keyboard shortcuts to help you navigate quickly without using your mouse.

### Navigation Shortcuts

Press **G** followed by a letter to navigate:
- **G + I** - Go to Unified Inbox
- **G + C** - Go to Calendar
- **G + P** - Go to Projects
- **G + T** - Go to Tasks
- **G + D** - Go to Dashboard
- **G + S** - Go to Settings
- **G + H** - Go to Chat

### Project Board Shortcuts

When viewing a project board:
- **Arrow Keys** - Navigate between tasks
- **Enter** - Open the selected task
- **Escape** - Close the task detail pane

### Other Shortcuts

- **Escape** - Cancel current action or close dialogs

---

## Command Palette

The Command Palette gives you quick access to everything in The YHC Way.

### Opening the Command Palette

Press **Cmd + K** (Mac) or **Ctrl + K** (Windows/Linux) to open it.

### What You Can Do

- **Navigate** - Quickly jump to any page
- **Create tasks** - Start a new task from anywhere
- **Use templates** - Apply saved task templates
- **Search** - Find projects, tasks, and more

Just start typing to filter the available actions.

---

## Task Templates

Save time by creating templates for tasks you create repeatedly.

### Creating a Template

1. Go to **Settings** or use the Command Palette
2. Find **Task Templates**
3. Click **Create Template**
4. Fill in the default task details:
   - Template name
   - Default task title
   - Description
   - Priority
   - Subtasks
5. Save your template

### Using Templates

1. Open the Command Palette (**Cmd + K**)
2. Type "template" or the template name
3. Select your template
4. A new task is created with the template's default values

### Sharing Templates

Templates can be marked as "shared" so your team members can use them too.

---

## Time Tracking

Track time spent on tasks and projects with the built-in time tracker.

### Starting a Timer

1. On the Dashboard, find the **Time Tracker** widget
2. Optionally enter a description of what you're working on
3. Click **Start** to begin timing

### Stopping a Timer

Click **Stop** when you're done. The time will be recorded.

### Viewing Time Summary

The Time Tracker widget shows:
- Current active timer (if running)
- Total time tracked today
- Number of entries today

---

## Dashboard Widgets

Customize your Dashboard to show the information that matters most to you.

### Available Widgets

- **Unified Feed** - Recent activity from all services
- **Today's Schedule** - Upcoming events
- **Quick Stats** - Summary counts
- **Time Tracker** - Track time on tasks
- **Upcoming Tasks** - Due dates approaching

### Customizing Widgets

1. Click the **Settings** icon on the Dashboard
2. Toggle widgets on or off
3. Drag widgets to reorder them
4. Changes save automatically

---

## Calendar View

The Calendar page displays events from all your connected calendar sources.

### Event Sources

Events are pulled from:
- **Google Calendar** - Your Google account events
- **Apple Calendar** - Your iCloud calendar events
- **Zoom Meetings** - Scheduled Zoom calls

### Zoom Meetings

Zoom meetings include a **Join** button for quick access to your video calls directly from the calendar.

---

## AI Assistant

The YHC Way includes a powerful AI Assistant to help you work smarter and save time on routine tasks. Access it by clicking the **brain icon** in the bottom-right corner of your screen.

> For a comprehensive guide, see the dedicated [AI Assistant User Guide](ai_assistant_userguide.md).

### Getting Started

1. Click the **brain icon** (bottom-right corner of your screen)
2. The AI Assistant panel opens with multiple tabs
3. Select the feature you want to use
4. Your last-used tab is remembered between sessions

### Available Features

**Daily Briefing**
Start your day with a personalized summary:
- Your priority tasks for the day
- Upcoming meetings with context
- Urgent messages that need attention
- Key deadlines and reminders

*Best used: First thing in the morning or after breaks*

**Smart Search**
Search across all your connected services using natural language:
- "Find emails about the budget proposal"
- "What meetings do I have this week?"
- "Show me tasks assigned to me"
- "What did Sarah email me about last Friday?"

*Best used: When looking for information across multiple services*

**Email Drafting**
Compose professional emails quickly:
1. Describe what you want to say in plain language
2. The AI generates a polished draft
3. Review and edit as needed
4. Click **Copy** to paste into your email client

*Best used: When you need to write professional responses quickly*

**Task Generation**
Extract actionable tasks from any content:
- Paste an email, meeting notes, or any text
- The AI identifies action items automatically
- Review the suggested tasks
- Create them directly in your project boards

*Best used: After meetings or when processing email backlogs*

**Meeting Prep**
Walk into every meeting prepared:
1. Select an upcoming meeting from your calendar
2. Get a summary of:
   - Related emails and threads
   - Open tasks involving attendees
   - Recent Slack discussions
   - Previous meeting notes
3. Review key talking points

*Best used: 10-15 minutes before important meetings*

**Calendar Optimization**
Analyze and improve your schedule:
- Identify overloaded days
- Find opportunities for focus time
- Spot back-to-back meeting patterns
- Get suggestions for better time blocking

*Best used: Weekly planning sessions*

**Task Prioritization**
Get AI-powered task rankings based on:
- Urgency and due dates
- Task importance and impact
- Dependencies on other tasks
- Your current workload

*Best used: When you have many tasks and need to focus*

### Tips for Success

- **Copy buttons** - Click the copy icon next to any AI-generated content to copy it to your clipboard
- **Tab memory** - Your last-used tab is remembered between sessions
- **Be specific** - The more context you provide, the better the AI can help
- **Service connection** - Connect Gmail, Calendar, Slack, and Asana for the best experience
- **Regular use** - Daily Briefings work best when used consistently

### Privacy Note

The AI Assistant processes your data securely and only accesses services you've connected. No data is stored beyond your session unless you explicitly save it (like creating a task).

---

## Tips for Success

1. **Connect everything** - The more services you connect, the more useful The YHC Way becomes
2. **Check the Dashboard daily** - Start your day with a quick overview of what needs attention
3. **Use the Unified Inbox** - Stop switching between email and Slack tabs
4. **Keep the Calendar open** - Never miss a meeting with all your events in one place
5. **Add to your home screen** - Create a shortcut for quick mobile access
6. **Use Projects** - Manage your tasks natively without leaving The YHC Way
7. **Learn keyboard shortcuts** - Press G + letter to navigate quickly
8. **Use the Command Palette** - Press Cmd + K for quick access to anything
9. **Create templates** - Save time on repetitive tasks with templates
10. **Track your time** - Use the time tracker to understand where your time goes
11. **Use the AI Assistant** - Click the brain icon to get daily briefings, draft emails, and prioritize tasks
12. **Set recurring tasks** - Use the repeat feature for tasks you do regularly

---

## For Developers: Running Tests

The YHC Way includes automated tests to ensure code quality.

### Test Commands

- **npm test** - Run all tests once
- **npm run test:watch** - Run tests in development mode (auto-rerun on file changes)
- **npm run test:coverage** - Generate a coverage report

### What's Tested

- Cache module functionality
- Authentication validation
- Task dependency logic
- API route patterns

---

## Troubleshooting

### Reconnecting Services to Fix Issues

Sometimes connected services may stop working correctly. This can happen when:
- Permissions change or expire
- You change your password on the external service
- The service adds new features that require additional permissions
- Your session or token becomes invalid

**The solution is often to disconnect and reconnect the service.** This refreshes your connection and ensures you have all required permissions.

#### How to Reconnect a Service

1. Go to **Settings** or **Connect App** in the sidebar
2. Find the service that's having issues
3. Click **Disconnect** to remove the current connection
4. Wait a few seconds, then click **Connect** again
5. Follow the authorization prompts and **approve all requested permissions**
6. Try using the feature again

### Common Issues and Solutions

#### Slack: "Please reconnect your Slack account to enable sending messages"

**Problem:** You can read Slack messages but cannot reply to them.

**Cause:** Your Slack connection is missing the "chat:write" permission needed to send messages. This happens if you connected Slack before this permission was added, or if you didn't approve all permissions during setup.

**Solution:**
1. Go to **Settings** → **Connections**
2. Find **Slack** and click **Disconnect**
3. Click **Connect** to reconnect
4. When Slack asks for permissions, make sure to approve **all** of them, including "Send messages on your behalf"
5. Try sending your reply again

#### Gmail: "Insufficient Permission" or emails not loading

**Problem:** Gmail shows an error or your emails aren't appearing.

**Cause:** Your Gmail connection may have expired or needs additional permissions.

**Solution:**
1. Go to **Connect App** in the sidebar
2. Find **Gmail** and click **Disconnect**
3. Click **Connect** and sign in with your Google account again
4. Approve all requested permissions
5. Your emails should now load correctly

#### Asana: Tasks not syncing or showing outdated information

**Problem:** Asana tasks aren't updating or new tasks aren't appearing.

**Solution:**
1. Go to **Connect App** in the sidebar
2. Find **Asana** and click **Disconnect**
3. Click **Connect** and sign in to Asana again
4. Your tasks will refresh with the latest data

#### Apple Calendar: Events not appearing

**Problem:** Your iCloud calendar events aren't showing up.

**Cause:** App-specific passwords can expire or become invalid.

**Solution:**
1. Go to **Connect App** in the sidebar
2. Find **Apple Calendar** and click **Disconnect**
3. Go to appleid.apple.com and create a new App-Specific Password
4. Click **Connect** in The YHC Way and enter your new credentials
5. Your calendar events should now sync

#### Google Docs/Sheets: "Access Denied" or documents not loading

**Problem:** You can't access your Google documents.

**Solution:**
1. Go to **Connect App** in the sidebar
2. Find **Google Docs** or **Google Sheets** and reconnect
3. Make sure to approve all permissions when prompted

### General Tips

- **When in doubt, reconnect** - Most connection issues can be resolved by disconnecting and reconnecting the service
- **Approve all permissions** - Some features require specific permissions. Always approve everything the service asks for during setup
- **Check your credentials** - If you recently changed your password on an external service, you'll need to reconnect
- **Clear your browser cache** - Sometimes clearing your browser's cache and cookies can resolve display issues
- **Try a different browser** - If issues persist, try accessing The YHC Way in a different browser or incognito window

---

## Getting Help

If you have questions or run into issues:
- Check the **Setup Guide** for connection help
- Try the **Troubleshooting** section above
- Contact your administrator at ken@kennangle.com

---

Thank you for using The YHC Way! We hope it helps you work more efficiently by bringing all your tools together in one place.
