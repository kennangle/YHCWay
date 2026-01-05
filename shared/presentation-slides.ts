export interface SlideFeature {
  name: string;
  desc: string;
}

export interface SlideBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface Slide {
  id: number;
  type: "title" | "overview" | "feature" | "benefits" | "closing";
  title: string;
  subtitle?: string;
  tagline?: string;
  icon?: string;
  points?: string[];
  features?: SlideFeature[];
  benefits?: SlideBenefit[];
  benefit?: string;
  cta?: string;
}

export const presentationSlides: Slide[] = [
  {
    id: 1,
    type: "title",
    title: "The YHC Way",
    subtitle: "Unified Workspace for Yoga Health Center",
    tagline: "One platform. All your tools. Seamlessly connected.",
  },
  {
    id: 2,
    type: "overview",
    title: "What is The YHC Way?",
    points: [
      "A unified workspace that brings all your business tools together",
      "Purpose-built for Yoga Health Center's unique workflow",
      "Eliminates app-switching and information silos",
      "Modern, intuitive interface accessible from anywhere",
    ],
    benefit: "Save hours every week by working smarter, not harder",
  },
  {
    id: 3,
    type: "feature",
    title: "Communication Hub",
    icon: "📬",
    features: [
      { name: "Unified Inbox", desc: "All emails, messages, and notifications in one place" },
      { name: "Gmail Integration", desc: "Read, compose, and manage emails without leaving the app" },
      { name: "Slack Channels", desc: "Stay connected with team conversations" },
      { name: "AI Email Drafting", desc: "Compose professional emails in seconds" },
    ],
    benefit: "Never miss an important message again",
  },
  {
    id: 4,
    type: "feature",
    title: "Calendar & Scheduling",
    icon: "📅",
    features: [
      { name: "Google Calendar", desc: "View and manage all your appointments" },
      { name: "Zoom Integration", desc: "Join meetings with one click" },
      { name: "Daily Briefing", desc: "Start your day with a summary of upcoming events" },
      { name: "Smart Scheduling", desc: "Find optimal times and manage your schedule" },
    ],
    benefit: "Stay organized and prepared for every day",
  },
  {
    id: 5,
    type: "feature",
    title: "Projects & Tasks",
    icon: "📋",
    features: [
      { name: "Kanban Boards", desc: "Visual project management with drag-and-drop" },
      { name: "Task Management", desc: "Subtasks, due dates, priorities, and assignments" },
      { name: "Asana Import", desc: "Seamlessly migrate existing projects" },
      { name: "AI Task Prioritization", desc: "Smart ranking of what matters most" },
    ],
    benefit: "Get more done with less effort",
  },
  {
    id: 6,
    type: "feature",
    title: "AI-Powered Assistant",
    icon: "🤖",
    features: [
      { name: "Daily Briefing", desc: "Morning summary of tasks, meetings, and messages" },
      { name: "Smart Search", desc: "Natural language search across all your data" },
      { name: "Task Extraction", desc: "Auto-generate tasks from emails and messages" },
      { name: "Calendar Optimization", desc: "Find focus time and identify overloaded days" },
    ],
    benefit: "Your intelligent productivity partner",
  },
  {
    id: 7,
    type: "feature",
    title: "Client Engagement",
    icon: "🎁",
    features: [
      { name: "Intro Offers Tracking", desc: "Monitor new client conversions via Mindbody" },
      { name: "Perkville Rewards", desc: "View and manage customer loyalty points" },
      { name: "QR Code Generator", desc: "Create trackable QR codes for marketing" },
      { name: "Email Builder", desc: "Design beautiful email campaigns" },
    ],
    benefit: "Build lasting relationships with your clients",
  },
  {
    id: 8,
    type: "feature",
    title: "HR & Operations",
    icon: "👥",
    features: [
      { name: "Gusto HR & Payroll", desc: "Employee directory and payroll history at a glance" },
      { name: "YHCTime Tracking", desc: "Track employee hours and manage time entries" },
      { name: "User Management", desc: "Control access with role-based permissions" },
      { name: "Audit Logs", desc: "Complete compliance trail for enterprise security" },
    ],
    benefit: "Streamline your back-office operations",
  },
  {
    id: 9,
    type: "benefits",
    title: "Why Choose The YHC Way?",
    benefits: [
      { icon: "⏱️", title: "Save Time", desc: "Stop switching between 10+ apps every day" },
      { icon: "🎯", title: "Stay Focused", desc: "Everything you need in one unified view" },
      { icon: "🔒", title: "Secure", desc: "Enterprise-grade security with role-based access" },
      { icon: "📱", title: "Accessible", desc: "Work from anywhere on any device" },
      { icon: "🤝", title: "Team Aligned", desc: "Keep everyone on the same page" },
      { icon: "📈", title: "Data Driven", desc: "AI insights to work smarter" },
    ],
  },
  {
    id: 10,
    type: "closing",
    title: "Ready to Transform Your Workflow?",
    subtitle: "The YHC Way",
    tagline: "Work unified. Work smarter. Work the YHC way.",
    cta: "Get Started Today",
  },
];
