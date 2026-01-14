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
  type: "title" | "overview" | "feature" | "benefits" | "closing" | "howto" | "detail" | "section";
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
  // SECTION 1 — ORIENTATION & PURPOSE
  {
    id: 1,
    type: "section",
    title: "SECTION 1",
    subtitle: "Orientation & Purpose",
  },
  {
    id: 2,
    type: "title",
    title: "The YHC Way",
    subtitle: "Management Operating System",
    tagline: "Work unified. Work smarter. Lead with clarity.",
  },
  {
    id: 3,
    type: "overview",
    title: "What Is The YHC Way?",
    points: [
      "A unified workspace designed for how Yoga Health Center actually operates",
      "One cockpit for communication, scheduling, tasks, projects, and analytics",
      "One source of truth for decisions, follow-through, and accountability",
      "One operating rhythm for the GM and owners",
      "Accessible anywhere — desktop, mobile, Chrome extension",
    ],
    benefit: "Purpose: Reduce chaos, increase execution speed, and drive predictable growth.",
  },
  {
    id: 4,
    type: "benefits",
    title: "Why This System Matters",
    subtitle: "Management Outcomes",
    benefits: [
      { icon: "🚀", title: "Faster execution", desc: "Clear ownership, fewer dropped balls" },
      { icon: "💬", title: "Cleaner communication", desc: "Less Slack noise, fewer email loops" },
      { icon: "📈", title: "Predictable growth engine", desc: "Track acquisition → conversion → retention" },
      { icon: "📊", title: "Better decisions", desc: "Scoreboard replaces opinions" },
      { icon: "⚙️", title: "Scalable management layer", desc: "Systems that outlive any one person" },
    ],
    benefit: "This is not a tool. It's how we run the business.",
  },
  {
    id: 5,
    type: "detail",
    title: "What You Will Stop Doing / Start Doing",
    subtitle: "By Role",
    icon: "🔄",
    points: [
      "GM / Leadership: Stop chasing updates, reacting all day → Start running a daily/weekly rhythm with clear priorities",
      "Owners: Stop asking 'Where are we on X?' → Start reviewing a simple scoreboard weekly",
      "Front Desk Leads: Stop managing tasks in Slack or memory → Start using Tasks/Projects for ownership + due dates",
      "Teachers / Coaches: Stop missing updates → Start checking Dashboard + Inbox for key info",
    ],
  },

  // SECTION 2 — DAILY & WEEKLY OPERATING SYSTEM
  {
    id: 6,
    type: "section",
    title: "SECTION 2",
    subtitle: "Daily & Weekly Operating System",
  },
  {
    id: 7,
    type: "howto",
    title: "Management Daily Workflow",
    subtitle: "5 Minutes",
    icon: "⏰",
    steps: [
      { step: "Start (1 min)", detail: "Daily Briefing → KPIs, alerts, upcoming commitments", link: "/dashboard" },
      { step: "Capture (1 min)", detail: "Inbox → convert messages into tasks", link: "/inbox" },
      { step: "Decide (1 min)", detail: "Identify Today's Top 3 must-win priorities" },
      { step: "Block (1 min)", detail: "Calendar → protect deep-work blocks", link: "/calendar" },
      { step: "Execute (1 min)", detail: "Projects → move 1–2 critical rocks forward", link: "/projects" },
    ],
    tips: ["A simple habit loop that keeps the team aligned"],
    navPath: "/dashboard",
  },
  {
    id: 8,
    type: "detail",
    title: "Weekly Operating Rhythm",
    subtitle: "60–90 Minutes",
    icon: "📅",
    points: [
      "Scoreboard Review: 8–12 metrics that show the health of the business",
      "Issues List: Identify blockers and root causes",
      "Rocks / Projects: Status, next actions, owners",
      "To-Do Review: Commitments from last week → done or not done",
      "Decisions: Clear owners + deadlines",
    ],
    benefit: "Predictable accountability → consistent execution.",
  },
  {
    id: 9,
    type: "detail",
    title: "Rules of the Road",
    subtitle: "Source of Truth",
    icon: "📍",
    points: [
      "Slack = real-time coordination",
      "Inbox = intake + triage",
      "Tasks = ownership + due dates",
      "Projects = multi-step initiatives",
      "Calendar = commitments + time blocks",
    ],
    tips: [
      "If it has an owner + due date → it must be a task",
      "Meetings end with 'who / what / by when'",
      "Slack is not the archive → tasks/projects are",
    ],
  },
  {
    id: 10,
    type: "detail",
    title: "Response Time Norms",
    icon: "⏱️",
    points: [
      "Urgent (Slack): Immediate or within 1 hour",
      "Same Day (Inbox → Tasks): By end of day",
      "24–48 Hours (Tasks): Non-urgent items",
      "Weekly (Projects): Progress updates during weekly rhythm",
    ],
    benefit: "Clear expectations reduce noise and interruptions.",
  },

  // SECTION 3 — SETUP & CONFIGURATION
  {
    id: 11,
    type: "section",
    title: "SECTION 3",
    subtitle: "Setup & Configuration",
  },
  {
    id: 12,
    type: "howto",
    title: "Connect Accounts",
    subtitle: "In Order",
    icon: "🔗",
    steps: [
      { step: "Google Workspace", detail: "Gmail + Calendar", link: "/connect" },
      { step: "Slack", detail: "Channel messages and DMs", link: "/connect" },
      { step: "Brevo", detail: "Email marketing analytics", link: "/connect" },
      { step: "Typeform", detail: "Form responses", link: "/connect" },
      { step: "Perkville", detail: "Rewards and loyalty", link: "/connect" },
      { step: "YHCTime", detail: "Time tracking", link: "/connect" },
    ],
    navPath: "/connect",
  },
  {
    id: 13,
    type: "detail",
    title: "Configure Defaults",
    icon: "⚙️",
    points: [
      "Task labels, owners, priorities",
      "Project templates",
      "Notification preferences",
      "Mobile Setup: Add to Home Screen, enable notifications",
    ],
    tips: ["If something breaks: Re-auth Google/Slack, check permissions, allow popups"],
    navPath: "/settings",
  },
  {
    id: 14,
    type: "detail",
    title: "Common Issues + Quick Fixes",
    icon: "🔧",
    points: [
      "Gmail not connected → Re-auth Google",
      "Slack channels missing → Update Slack preferences",
      "Calendar duplicates → Disable duplicate sources",
      "Zoom link missing → Check Zoom integration",
      "Mobile not loading → Add to Home Screen, clear cache",
      "Chrome extension missing → Pin + re-auth",
      "Pop-ups blocked → Enable for app domain",
    ],
  },

  // SECTION 4 — CORE WORKSPACE
  {
    id: 15,
    type: "section",
    title: "SECTION 4",
    subtitle: "Core Workspace",
  },
  {
    id: 16,
    type: "detail",
    title: "Dashboard Overview",
    subtitle: "Your daily command center",
    icon: "📊",
    points: [
      "Unified feed of emails, Slack messages, and events",
      "Upcoming meetings",
      "Task summary",
      "Quick actions",
      "AI Daily Briefing",
    ],
    tips: ["Start here every morning"],
    navPath: "/dashboard",
  },
  {
    id: 17,
    type: "detail",
    title: "Unified Mailbox",
    subtitle: "All communication in one place",
    icon: "📬",
    points: [
      "Emails + Slack messages in a single feed",
      "Click to read, reply, or convert to tasks",
      "AI drafting for quick responses",
      "Delete emails with trash icon",
    ],
    benefit: "Reduces context switching and missed messages.",
    navPath: "/inbox",
  },
  {
    id: 18,
    type: "detail",
    title: "Email Features",
    icon: "✉️",
    points: [
      "Read and reply without opening Gmail",
      "Compose new emails",
      "AI email drafting",
      "Delete → syncs to Gmail trash",
    ],
    benefit: "Keeps communication inside the workflow.",
    navPath: "/inbox",
  },
  {
    id: 19,
    type: "detail",
    title: "Slack",
    icon: "💬",
    points: [
      "View messages from followed channels",
      "Read full threads",
      "Customize which channels appear",
      "Slack messages also appear in Unified Mailbox",
    ],
    benefit: "Slack becomes signal, not noise.",
    navPath: "/chat",
  },

  // PLANNING & EXECUTION
  {
    id: 20,
    type: "section",
    title: "SECTION 5",
    subtitle: "Planning & Execution",
  },
  {
    id: 21,
    type: "detail",
    title: "Calendar Power",
    subtitle: "All calendars unified",
    icon: "📅",
    points: [
      "Google, Apple, Calendly",
      "Month, week, day views",
      "Zoom join buttons",
      "Color-coded sources",
    ],
    benefit: "Your schedule becomes a strategic tool.",
    navPath: "/calendar",
  },
  {
    id: 22,
    type: "howto",
    title: "Managing Tasks",
    icon: "✅",
    steps: [
      { step: "Create tasks", link: "/tasks" },
      { step: "Set due dates + priorities" },
      { step: "Add subtasks" },
      { step: "Mark complete" },
      { step: "AI auto-prioritization" },
    ],
    benefit: "Tasks = ownership + accountability.",
    navPath: "/tasks",
  },
  {
    id: 23,
    type: "detail",
    title: "Task Features",
    icon: "📝",
    points: [
      "Due dates + reminders",
      "Priorities",
      "Subtasks",
      "Assignments",
      "Recurring tasks",
      "Comments",
      "Asana sync",
    ],
    benefit: "Everything assigned lives here.",
    navPath: "/tasks",
  },
  {
    id: 24,
    type: "howto",
    title: "Managing Projects",
    icon: "📋",
    steps: [
      { step: "Create projects", link: "/projects" },
      { step: "Add columns", detail: "To Do, In Progress, Done" },
      { step: "Add tasks" },
      { step: "Drag + drop" },
      { step: "Import from Asana" },
    ],
    benefit: "Projects = multi-step initiatives.",
    navPath: "/projects",
  },
  {
    id: 25,
    type: "detail",
    title: "Project Features",
    icon: "🎯",
    points: [
      "Kanban boards",
      "Custom columns",
      "Task details + comments",
      "Subtasks",
      "Asana import",
    ],
    benefit: "Keeps major initiatives moving.",
    navPath: "/projects",
  },

  // AI PRODUCTIVITY SUITE
  {
    id: 26,
    type: "section",
    title: "SECTION 6",
    subtitle: "AI Productivity Suite",
  },
  {
    id: 27,
    type: "howto",
    title: "Using the AI Assistant",
    icon: "🤖",
    steps: [
      { step: "Daily Briefing", detail: "Summary of your day", link: "/dashboard" },
      { step: "Smart Search", detail: "Cmd/Ctrl + K" },
      { step: "Task extraction", detail: "From emails and messages" },
      { step: "Email drafting", detail: "AI-powered responses" },
    ],
    benefit: "AI becomes your management co-pilot.",
    navPath: "/dashboard",
  },
  {
    id: 28,
    type: "detail",
    title: "AI Features",
    icon: "✨",
    points: [
      "Daily Briefing",
      "Smart Search",
      "Email drafting",
      "Task extraction",
      "Calendar optimization",
      "Task prioritization",
      "AI Summaries",
    ],
    benefit: "Work smarter, not harder.",
    navPath: "/dashboard",
  },
  {
    id: 29,
    type: "howto",
    title: "AI Summarize Tool",
    icon: "⚡",
    steps: [
      { step: "Paste transcripts, emails, or notes", link: "/ai-summarize" },
      { step: "Add context" },
      { step: "Get structured summaries + action items" },
    ],
    tips: ["Perfect for meetings and long threads"],
    navPath: "/ai-summarize",
  },

  // WORKSPACE TOOLS
  {
    id: 30,
    type: "section",
    title: "SECTION 7",
    subtitle: "Workspace Tools",
  },
  {
    id: 31,
    type: "detail",
    title: "Google Workspace Launcher",
    subtitle: "Quick access to your Google files",
    icon: "💾",
    points: [
      "Google Docs",
      "Google Sheets",
      "Google Drive",
    ],
    benefit: "Opens in Google — YHC Way acts as the launcher.",
    navPath: "/google-drive",
  },

  // GROWTH ENGINE
  {
    id: 32,
    type: "section",
    title: "SECTION 8",
    subtitle: "Growth Engine",
  },
  {
    id: 33,
    type: "detail",
    title: "The Growth Funnel",
    icon: "📈",
    points: [
      "Acquisition: Lead sources, referrals, corporate outreach",
      "Conversion: Intro → consult → membership close",
      "Retention: Risk list, outreach cadence, win-backs",
    ],
    benefit: "This is how membership grows predictably.",
  },
  {
    id: 34,
    type: "detail",
    title: "Weekly Scoreboard",
    subtitle: "8–12 Metrics",
    icon: "📊",
    points: [
      "Active members",
      "New members",
      "Reactivations",
      "Expired",
      "Terminated",
      "Net adds",
      "Intro offers sold",
      "Intro → membership conversion %",
      "Attendance/utilization (optional)",
      "Autopay $ (optional)",
    ],
    benefit: "The GM's steering wheel.",
  },
  {
    id: 35,
    type: "detail",
    title: "Marketing Data Hub",
    subtitle: "All marketing signals in one place",
    icon: "📢",
    points: [
      "Brevo email analytics",
      "Typeform responses",
      "Perkville rewards",
    ],
    benefit: "See what's working and where to improve.",
  },
  {
    id: 36,
    type: "detail",
    title: "Intro Offers Tracking",
    icon: "🎁",
    points: [
      "Track intro offer performance",
      "Monitor conversion rates",
      "Compare offer types",
      "Export data",
    ],
    benefit: "Turns intro offers into a measurable funnel.",
    navPath: "/intro-offers",
  },
  {
    id: 37,
    type: "detail",
    title: "Creating QR Codes",
    icon: "📱",
    points: [
      "Create branded QR codes",
      "Customize colors",
      "Track scans",
    ],
    tips: ["Useful for events, signage, and campaigns"],
    navPath: "/qr-codes",
  },
  {
    id: 38,
    type: "howto",
    title: "Email Builder",
    icon: "📧",
    steps: [
      { step: "Choose templates", link: "/email-builder" },
      { step: "Edit content" },
      { step: "Preview mobile + desktop" },
      { step: "Send via Brevo" },
    ],
    benefit: "Create polished marketing emails quickly.",
    navPath: "/email-builder",
  },

  // OPERATIONS
  {
    id: 39,
    type: "section",
    title: "SECTION 9",
    subtitle: "Operations",
  },
  {
    id: 40,
    type: "detail",
    title: "Time Tracking",
    icon: "⏱️",
    points: [
      "Enter hours",
      "Add notes",
      "Edit recent entries",
      "Manager view for team hours",
    ],
    benefit: "Keeps operations clean and auditable.",
    navPath: "/time-tracking",
  },

  // SUPPORT & GOVERNANCE
  {
    id: 41,
    type: "section",
    title: "SECTION 10",
    subtitle: "Support & Governance",
  },
  {
    id: 42,
    type: "detail",
    title: "Templates & Repeatable Workflows",
    icon: "📋",
    points: [
      "New member follow-up",
      "Cancellation save workflow",
      "Teacher onboarding",
      "Weekly ops checklist",
      "Event launch checklist",
    ],
    benefit: "Consistency beats heroics.",
  },
  {
    id: 43,
    type: "detail",
    title: "Rollout Plan",
    subtitle: "Management → Staff",
    icon: "🚀",
    points: [
      "Week 1–2: Management only",
      "Week 3–4: Front desk + leads",
      "Month 2: Broader team",
    ],
    benefit: "Clean rollout prevents chaos.",
  },
  {
    id: 44,
    type: "detail",
    title: "Request a Feature",
    icon: "💡",
    points: [
      "Email: ken@yogahealthcenter.com",
      "Subject: 'Feature Request: [Title]'",
      "Include: description, why it matters, examples",
      "Or click the 'Request a feature' button",
    ],
  },
  {
    id: 45,
    type: "detail",
    title: "Report a Bug",
    icon: "🐛",
    points: [
      "Email: ken@yogahealthcenter.com",
      "Subject: 'Bug Report: [Description]'",
      "Include: screenshot, steps to reproduce, browser info",
      "Or click the 'Report a Bug' button",
    ],
  },
  {
    id: 46,
    type: "detail",
    title: "Getting Help",
    icon: "❓",
    points: [
      "Setup Guide",
      "This presentation",
      "Email support",
    ],
    tips: ["Start with the Setup Guide for common questions"],
    navPath: "/setup-guide",
  },

  // QUICK REFERENCE & CLOSING
  {
    id: 47,
    type: "section",
    title: "SECTION 11",
    subtitle: "Quick Reference & Closing",
  },
  {
    id: 48,
    type: "overview",
    title: "Quick Navigation Reference",
    features: [
      { name: "Unified Mailbox", desc: "All emails and Slack messages", navPath: "/inbox" },
      { name: "Calendar", desc: "All calendars unified", navPath: "/calendar" },
      { name: "Tasks", desc: "Ownership + due dates", navPath: "/tasks" },
      { name: "Projects", desc: "Multi-step initiatives", navPath: "/projects" },
      { name: "Google Drive", desc: "File access", navPath: "/google-drive" },
      { name: "AI Summarize", desc: "Meeting summaries", navPath: "/ai-summarize" },
      { name: "Intro Offers", desc: "Conversion tracking", navPath: "/intro-offers" },
      { name: "Time Tracking", desc: "Hours and notes", navPath: "/time-tracking" },
      { name: "Perkville", desc: "Rewards and loyalty", navPath: "/rewards" },
      { name: "QR Codes", desc: "Marketing tools", navPath: "/qr-codes" },
    ],
  },
  {
    id: 49,
    type: "closing",
    title: "You're Ready",
    subtitle: "The YHC Way",
    tagline: "Work unified. Work smarter. Lead the YHC way.",
    cta: "Start with the Dashboard",
  },
  {
    id: 50,
    type: "closing",
    title: "Questions?",
    subtitle: "Contact ken@yogahealthcenter.com for support",
  },
];
