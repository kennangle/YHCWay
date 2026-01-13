export interface SlideFeature {
  name: string;
  desc: string;
  navLabel?: string;
  navPath?: string;
}

export interface SlideBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface SlideStep {
  step: string;
  detail?: string;
  link?: string;
}

export interface Slide {
  id: number;
  type: "title" | "overview" | "feature" | "benefits" | "closing" | "howto" | "detail";
  title: string;
  subtitle?: string;
  tagline?: string;
  icon?: string;
  points?: string[];
  features?: SlideFeature[];
  benefits?: SlideBenefit[];
  benefit?: string;
  cta?: string;
  steps?: SlideStep[];
  tips?: string[];
  navPath?: string;
}

export const presentationSlides: Slide[] = [
  {
    id: 1,
    type: "title",
    title: "The YHC Way",
    subtitle: "User Guide & Reference",
    tagline: "Everything you need to know to get the most out of your unified workspace",
  },
  {
    id: 2,
    type: "overview",
    title: "What is The YHC Way?",
    points: [
      "A unified workspace that brings all your business tools together",
      "Purpose-built for Yoga Health Center's unique workflow",
      "Eliminates app-switching and information silos",
      "Accessible from any device - desktop, mobile, or Chrome extension",
    ],
    benefit: "Save hours every week by working smarter, not harder",
  },

  // GETTING STARTED
  {
    id: 3,
    type: "howto",
    title: "Getting Started",
    icon: "🚀",
    steps: [
      { step: "Log in with your email and password", detail: "Use the credentials provided by your administrator" },
      { step: "Complete the guided tour", detail: "First-time users will see a walkthrough of key features" },
      { step: "Check your Dashboard", detail: "See your unified feed of emails, events, and tasks" },
      { step: "Connect your accounts", detail: "Go to Settings to link Gmail, Calendar, and other services" },
    ],
    tips: ["Bookmark the app for quick access", "Install the Chrome extension for one-click access"],
    navPath: "/dashboard",
  },

  // DASHBOARD
  {
    id: 4,
    type: "detail",
    title: "Dashboard Overview",
    icon: "📊",
    subtitle: "Your daily command center",
    points: [
      "Unified Feed: See recent emails, Slack messages, and calendar events in one stream",
      "Upcoming Events: Quick view of your next meetings and appointments",
      "Task Summary: See your pending tasks and priorities at a glance",
      "Quick Actions: Access common actions without navigating away",
    ],
    tips: ["Check Dashboard first thing in the morning", "Use the AI Daily Briefing button for a summary"],
    navPath: "/dashboard",
  },

  // UNIFIED INBOX
  {
    id: 5,
    type: "howto",
    title: "Using the Unified Mailbox",
    icon: "📬",
    steps: [
      { step: "Navigate to Unified Mailbox", detail: "Click 'Unified Mailbox' at the top of the sidebar", link: "/inbox" },
      { step: "View all messages", detail: "Emails and Slack messages appear in a combined feed" },
      { step: "Click any message to read", detail: "Full message content opens in a detail panel" },
      { step: "Reply or compose", detail: "Use the compose button to write new emails" },
    ],
    tips: ["Messages are sorted by most recent first", "Gmail must be connected in Settings first"],
    navPath: "/inbox",
  },

  // EMAIL DETAILS
  {
    id: 6,
    type: "detail",
    title: "Email Features",
    icon: "✉️",
    subtitle: "Read, compose, and manage emails",
    points: [
      "Read emails directly in the app - no need to open Gmail",
      "Compose new emails with the 'Compose' button",
      "AI Email Drafting: Click the AI button to generate professional email text",
      "Reply to messages without leaving your workflow",
      "Delete emails: Click the trash icon to move emails to trash",
    ],
    tips: ["Use AI drafting for quick professional responses", "Your sent emails appear in Gmail as normal", "Deleted emails go to Gmail trash and can be recovered there"],
    navPath: "/inbox",
  },

  // CALENDAR
  {
    id: 7,
    type: "howto",
    title: "Using the Calendar",
    icon: "📅",
    steps: [
      { step: "Navigate to Calendar", detail: "Click 'Calendar' at the top of the sidebar", link: "/calendar" },
      { step: "View your events", detail: "See all Google Calendar, Apple Calendar, and Calendly events" },
      { step: "Switch views", detail: "Toggle between month, week, and day views" },
      { step: "Click an event for details", detail: "See meeting info, join links, and attendees" },
    ],
    tips: ["Zoom meetings show a 'Join' button for one-click access", "Calendly events appear with a blue badge"],
    navPath: "/calendar",
  },

  // CALENDAR DETAILS
  {
    id: 8,
    type: "detail",
    title: "Calendar Integrations",
    icon: "🔗",
    subtitle: "All your calendars in one place",
    points: [
      "Google Calendar: Primary calendar - connect via Settings",
      "Calendly: Shows your booked appointments automatically",
      "Apple Calendar: Connect with your Apple ID app-specific password",
      "Zoom: Meeting links are extracted and shown as join buttons",
    ],
    tips: ["Connect additional calendars in Settings > Connections", "Color coding helps identify event sources"],
    navPath: "/calendar",
  },

  // PROJECTS
  {
    id: 9,
    type: "howto",
    title: "Managing Projects",
    icon: "📋",
    steps: [
      { step: "Navigate to Projects", detail: "Click 'Projects' in the Collaboration section", link: "/projects" },
      { step: "Create a new project", detail: "Click '+ New Project' and give it a name" },
      { step: "Add columns", detail: "Create columns like 'To Do', 'In Progress', 'Done'" },
      { step: "Add tasks to columns", detail: "Click '+' in any column to create a task" },
      { step: "Drag and drop", detail: "Move tasks between columns by dragging them" },
    ],
    tips: ["Double-click a task to edit its details", "You can import projects from Asana if migrating"],
    navPath: "/projects",
  },

  // PROJECT FEATURES
  {
    id: 10,
    type: "detail",
    title: "Project Features",
    icon: "🎯",
    subtitle: "Kanban-style project management",
    points: [
      "Kanban Boards: Visual columns for workflow stages",
      "Drag & Drop: Move tasks by dragging between columns",
      "Custom Columns: Create any columns that fit your workflow",
      "Task Details: Click any task to see full details, subtasks, and comments",
      "Asana Import: One-click migration from existing Asana projects",
    ],
    tips: ["Keep column names consistent across projects", "Archive completed projects to reduce clutter"],
    navPath: "/projects",
  },

  // TASKS
  {
    id: 11,
    type: "howto",
    title: "Managing Tasks",
    icon: "✅",
    steps: [
      { step: "Navigate to Tasks", detail: "Click 'Tasks' in the Collaboration section", link: "/tasks" },
      { step: "Create a task", detail: "Click '+ New Task' and enter a title" },
      { step: "Set due date", detail: "Click the calendar icon to pick a deadline" },
      { step: "Set priority", detail: "Choose Low, Medium, High, or Urgent" },
      { step: "Add subtasks", detail: "Break down complex tasks into smaller steps" },
      { step: "Mark complete", detail: "Check the box when finished" },
    ],
    tips: ["Use the AI button to auto-prioritize your tasks", "Recurring tasks can be set up for routine work"],
    navPath: "/tasks",
  },

  // TASK FEATURES
  {
    id: 12,
    type: "detail",
    title: "Task Features",
    icon: "📝",
    subtitle: "Complete task management",
    points: [
      "Due Dates: Set deadlines and get reminders",
      "Priorities: Low, Medium, High, Urgent levels",
      "Subtasks: Break tasks into smaller actionable items",
      "Assignments: Assign tasks to team members",
      "Recurring Tasks: Set tasks to repeat daily, weekly, or monthly",
      "Comments: Collaborate with notes on each task",
      "Asana Sync: Mark tasks complete and changes sync to Asana automatically",
    ],
    tips: ["High priority tasks appear at the top of your list", "Overdue tasks are highlighted in red", "Tasks imported from Asana stay in sync"],
    navPath: "/tasks",
  },

  // SLACK / CHAT
  {
    id: 13,
    type: "howto",
    title: "Using Slack",
    icon: "💬",
    steps: [
      { step: "Navigate to Slack", detail: "Click 'Slack' in the Collaboration section", link: "/chat" },
      { step: "View Slack messages", detail: "Recent messages from your followed channels appear here" },
      { step: "Filter channels", detail: "Choose which Slack channels to follow in Settings", link: "/settings" },
      { step: "Read conversations", detail: "Click any message to see the full thread" },
    ],
    tips: ["Slack messages also appear in your Unified Mailbox", "You can customize which channels to follow"],
    navPath: "/chat",
  },

  // AI ASSISTANT
  {
    id: 14,
    type: "howto",
    title: "Using the AI Assistant",
    icon: "🤖",
    steps: [
      { step: "Look for the AI button", detail: "It's the sparkle icon in the bottom-right corner" },
      { step: "Click to open AI menu", detail: "See available AI actions" },
      { step: "Try Daily Briefing", detail: "Get a summary of your day's tasks and meetings" },
      { step: "Use Smart Search", detail: "Press Cmd+K (or Ctrl+K) to search across all your data" },
      { step: "Extract tasks", detail: "AI can create tasks from emails or messages" },
    ],
    tips: ["Daily Briefing is great first thing in the morning", "AI suggestions get better over time"],
    navPath: "/dashboard",
  },

  // AI FEATURES
  {
    id: 15,
    type: "detail",
    title: "AI Features",
    icon: "✨",
    subtitle: "Your intelligent productivity partner",
    points: [
      "Daily Briefing: Summary of meetings, tasks, and important messages",
      "Smart Search: Natural language search - just ask a question",
      "Email Drafting: Generate professional emails from simple prompts",
      "Task Extraction: Create tasks automatically from emails or Slack",
      "Calendar Optimization: Find focus time and identify busy days",
      "Task Prioritization: AI ranks your tasks by importance",
      "AI Summarize: Summarize meeting transcripts and long emails",
    ],
    tips: ["Be specific with AI prompts for better results", "AI uses your actual data, not generic responses"],
    navPath: "/dashboard",
  },

  // AI SUMMARIZE
  {
    id: 29,
    type: "howto",
    title: "AI Summarize Tool",
    icon: "⚡",
    steps: [
      { step: "Navigate to AI Summarize", detail: "Click 'AI Summarize' in the Productivity section", link: "/ai-summarize" },
      { step: "Choose content type", detail: "Select 'Meeting Transcript' or 'Email/Notes' tab" },
      { step: "Paste your content", detail: "Paste meeting transcript, long email, or notes" },
      { step: "Add context (optional)", detail: "Enter title and attendees for better results" },
      { step: "Click Summarize", detail: "AI generates a structured summary in seconds" },
    ],
    tips: ["Works great for Zoom transcripts", "Extracts action items automatically", "Use for long email threads too"],
    navPath: "/ai-summarize",
  },

  // GOOGLE DOCS
  {
    id: 30,
    type: "howto",
    title: "Google Docs",
    icon: "📄",
    steps: [
      { step: "Navigate to Google Docs", detail: "Click 'Google Docs' in the Productivity section", link: "/google-docs" },
      { step: "View your documents", detail: "See all documents from connected Google account" },
      { step: "Click to open", detail: "Documents open in a new tab in Google Docs" },
      { step: "Create new document", detail: "Click '+ New' to create a new Google Doc" },
    ],
    tips: ["Documents are synced from your Google account", "Edits happen in Google Docs directly"],
    navPath: "/google-docs",
  },

  // GOOGLE SHEETS
  {
    id: 31,
    type: "howto",
    title: "Google Sheets",
    icon: "📊",
    steps: [
      { step: "Navigate to Google Sheets", detail: "Click 'Google Sheets' in the Productivity section", link: "/google-sheets" },
      { step: "View your spreadsheets", detail: "See all spreadsheets from connected Google account" },
      { step: "Click to open", detail: "Spreadsheets open in a new tab in Google Sheets" },
      { step: "Create new spreadsheet", detail: "Click '+ New' to create a new Google Sheet" },
    ],
    tips: ["Spreadsheets are synced from your Google account", "Great for quick access to shared files"],
    navPath: "/google-sheets",
  },

  // GOOGLE DRIVE
  {
    id: 34,
    type: "howto",
    title: "Google Drive",
    icon: "💾",
    steps: [
      { step: "Navigate to Google Drive", detail: "Click 'Google Drive' in the Productivity section", link: "/google-drive" },
      { step: "Browse your files", detail: "See all files and folders from your Google Drive" },
      { step: "Navigate folders", detail: "Click folders to browse inside, use breadcrumbs to go back" },
      { step: "Open files", detail: "Click the open icon to view any file in Google" },
      { step: "Search files", detail: "Use the search bar to find files by name" },
    ],
    tips: ["Files are sorted by most recently modified", "Supports Docs, Sheets, PDFs, images, and more"],
    navPath: "/google-drive",
  },

  // BREVO EMAIL ANALYTICS
  {
    id: 32,
    type: "detail",
    title: "Brevo Email Analytics",
    icon: "📈",
    subtitle: "Track your email campaigns",
    points: [
      "View sent email statistics and delivery rates",
      "Track open rates and click-through rates",
      "Monitor campaign performance over time",
      "See which emails are performing best",
    ],
    tips: ["Check weekly for trends", "Use data to improve future emails"],
    navPath: "/email-activity",
  },

  // TYPEFORM
  {
    id: 33,
    type: "detail",
    title: "Typeform Responses",
    icon: "📝",
    subtitle: "View and manage form submissions",
    points: [
      "See all Typeform responses in one place",
      "View individual submission details",
      "Track response trends over time",
      "Export data for analysis",
    ],
    tips: ["Check regularly for new submissions", "Forms must be connected via Typeform"],
    navPath: "/typeform",
  },

  // TIME TRACKING
  {
    id: 16,
    type: "howto",
    title: "Time Tracking",
    icon: "⏱️",
    steps: [
      { step: "Navigate to Time Tracking", detail: "Click 'Time Tracking' in Operations section", link: "/time-tracking" },
      { step: "Link your YHCTime account", detail: "First time: enter your YHCTime employee ID in Settings", link: "/settings" },
      { step: "Create a time entry", detail: "Click 'Enter Time' and fill in the details" },
      { step: "Select date and hours", detail: "Choose the date and enter hours worked" },
      { step: "Add notes (optional)", detail: "Describe what you worked on" },
      { step: "Submit", detail: "Your entry is saved to YHCTime" },
    ],
    tips: ["You can edit or delete recent entries", "Managers can view team time entries"],
    navPath: "/time-tracking",
  },

  // PERKVILLE REWARDS
  {
    id: 17,
    type: "howto",
    title: "Perkville Rewards",
    icon: "⭐",
    steps: [
      { step: "Navigate to Perkville", detail: "Click 'Perkville' in the Marketing section", link: "/rewards" },
      { step: "View your points", detail: "See your total, available, and pending points" },
      { step: "Check activity", detail: "See how you've earned points recently" },
      { step: "Staff: Look up customers", detail: "Search by email to find customer balances" },
    ],
    tips: ["Points are synced from Perkville automatically", "Staff can view analytics and top customers"],
    navPath: "/rewards",
  },

  // INTRO OFFERS
  {
    id: 18,
    type: "detail",
    title: "Intro Offers Tracking",
    icon: "🎁",
    subtitle: "Monitor new client conversions",
    points: [
      "View intro offer performance from Mindbody",
      "Track conversion rates for new clients",
      "See which offers are most effective",
      "Filter by date range and offer type",
      "Export data for reporting",
    ],
    tips: ["Check weekly to spot trends", "Compare different offers to optimize marketing"],
    navPath: "/intro-offers",
  },

  // QR CODES
  {
    id: 19,
    type: "howto",
    title: "Creating QR Codes",
    icon: "📱",
    steps: [
      { step: "Navigate to QR Codes", detail: "Click 'QR Codes' in the Marketing section", link: "/qr-codes" },
      { step: "Click 'Create QR Code'", detail: "Opens the creation form" },
      { step: "Enter the destination URL", detail: "Where should the QR code link to?" },
      { step: "Customize colors (optional)", detail: "Match your branding" },
      { step: "Generate and download", detail: "Save the QR code image for printing" },
    ],
    tips: ["Use dynamic QR codes to change the link later", "Track scans in the QR Codes dashboard"],
    navPath: "/qr-codes",
  },

  // EMAIL BUILDER
  {
    id: 20,
    type: "howto",
    title: "Email Builder",
    icon: "📧",
    steps: [
      { step: "Navigate to Email Builder", detail: "Click 'Email Builder' in the Engage & Automate section", link: "/email-builder" },
      { step: "Choose a template", detail: "Start with a pre-built template or blank" },
      { step: "Edit content", detail: "Click sections to edit text, images, and buttons" },
      { step: "Preview your email", detail: "See how it looks on desktop and mobile" },
      { step: "Send or save", detail: "Send via Brevo or save as a template" },
    ],
    tips: ["Mobile preview ensures emails look good on phones", "Save templates for reuse"],
    navPath: "/email-builder",
  },

  // SETTINGS
  {
    id: 21,
    type: "detail",
    title: "Settings & Connections",
    icon: "⚙️",
    subtitle: "Manage your account and integrations",
    points: [
      "Profile: Update your name and preferences",
      "Gmail Connection: Link your Google account for email",
      "Calendar Connections: Add Google, Apple, or Calendly calendars",
      "Slack Preferences: Choose which channels to follow",
      "YHCTime Link: Connect your employee ID for time tracking",
      "Notification Preferences: Control what alerts you receive",
    ],
    tips: ["Re-connect services if you see authentication errors", "Each user manages their own connections"],
    navPath: "/settings",
  },

  // CHROME EXTENSION
  {
    id: 22,
    type: "detail",
    title: "Chrome Extension",
    icon: "🌐",
    subtitle: "Quick access from your browser",
    points: [
      "Install the YHC Way Chrome extension for one-click access",
      "See notifications without opening the full app",
      "Quick links to Dashboard, Tasks, and Calendar",
      "Works on any website - always accessible",
      "Secure login with your existing credentials",
    ],
    tips: ["Pin the extension to your Chrome toolbar", "Click the icon anytime for quick access"],
    navPath: "/settings",
  },

  // MOBILE ACCESS
  {
    id: 23,
    type: "detail",
    title: "Mobile Access",
    icon: "📲",
    subtitle: "Work from anywhere",
    points: [
      "The YHC Way works on any mobile browser",
      "Responsive design adapts to your screen size",
      "Add to Home Screen for app-like experience",
      "All features available on mobile",
      "Works on iPhone, iPad, and Android",
    ],
    tips: ["On iPhone: Safari > Share > Add to Home Screen", "On Android: Chrome > Menu > Add to Home Screen"],
    navPath: "/",
  },

  // REQUEST A FEATURE
  {
    id: 24,
    type: "howto",
    title: "Request a Feature",
    icon: "💡",
    steps: [
      { step: "Think about what would help you work better", detail: "What's missing? What would save you time?" },
      { step: "Write a clear description", detail: "Explain what the feature would do and why it's helpful" },
      { step: "Email ken@yogahealthcenter.com", detail: "Use subject line: 'Feature Request: [Brief Title]'" },
      { step: "Include examples if possible", detail: "Screenshots or examples of similar features help a lot" },
    ],
    tips: ["Be specific about the problem you're trying to solve", "Prioritize - mention if it's urgent or a nice-to-have"],
    navPath: "Email",
  },

  // REPORT A BUG
  {
    id: 25,
    type: "howto",
    title: "Report a Bug",
    icon: "🐛",
    steps: [
      { step: "Note what happened", detail: "What were you trying to do? What went wrong?" },
      { step: "Take a screenshot", detail: "Capture any error messages or unexpected behavior" },
      { step: "Note the steps to reproduce", detail: "What did you click before the problem appeared?" },
      { step: "Email ken@yogahealthcenter.com", detail: "Use subject line: 'Bug Report: [Brief Description]'" },
      { step: "Include browser info", detail: "Mention if you're using Chrome, Safari, or mobile" },
    ],
    tips: ["Screenshots are extremely helpful", "The more detail, the faster we can fix it"],
    navPath: "Email",
  },

  // GETTING HELP
  {
    id: 26,
    type: "detail",
    title: "Getting Help",
    icon: "❓",
    subtitle: "Support and resources",
    points: [
      "Setup Guide: Step-by-step walkthrough in the app",
      "This Presentation: Reference guide for all features",
      "Request a Feature: Email ken@yogahealthcenter.com with your idea",
      "Report a Bug: Email ken@yogahealthcenter.com with details and screenshots",
      "General Questions: Reach out to ken@yogahealthcenter.com anytime",
    ],
    tips: ["Check the Setup Guide first for common questions", "Include screenshots when reporting issues"],
    navPath: "/setup-guide",
  },

  {
    id: 27,
    type: "benefits",
    title: "Quick Reference - Navigation",
    benefits: [
      { icon: "📬", title: "Unified Mailbox", desc: "All emails and messages (top of sidebar)" },
      { icon: "📅", title: "Calendar", desc: "All calendars unified (top of sidebar)" },
      { icon: "⚡", title: "Productivity", desc: "Google Docs, Sheets, AI Summarize" },
      { icon: "👥", title: "Collaboration", desc: "Slack, Tasks, Projects" },
      { icon: "📢", title: "Marketing", desc: "Brevo, Perkville, Typeform" },
      { icon: "🎯", title: "Engage & Automate", desc: "Intro Offers, QR Codes, Email Builder" },
    ],
  },

  {
    id: 28,
    type: "closing",
    title: "You're Ready!",
    subtitle: "The YHC Way",
    tagline: "Work unified. Work smarter. Work the YHC way.",
    cta: "Start Exploring",
  },
];
