import { db } from "../server/storage";
import { services, feedItems } from "../shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(feedItems);
  await db.delete(services);

  // Seed services
  const serviceData = [
    {
      name: "Slack",
      description: "5 unread mentions, 12 new messages",
      icon: "MessageCircle",
      colorClass: "bg-[#4A154B] text-white",
      connected: true,
    },
    {
      name: "Gmail",
      description: "3 urgent emails, 18 total unread",
      icon: "Mail",
      colorClass: "bg-[#EA4335] text-white",
      connected: true,
    },
    {
      name: "Google Calendar",
      description: "2 meetings remaining today",
      icon: "Calendar",
      colorClass: "bg-[#4285F4] text-white",
      connected: true,
    },
    {
      name: "Apple Calendar",
      description: "Sync your personal iCloud events",
      icon: "Calendar",
      colorClass: "bg-gray-800 text-white",
      connected: false,
    },
    {
      name: "Zoom",
      description: "Join upcoming meetings instantly",
      icon: "Video",
      colorClass: "bg-[#2D8CFF] text-white",
      connected: true,
    },
  ];

  await db.insert(services).values(serviceData);
  console.log("✓ Seeded services");

  // Seed feed items
  const feedData = [
    {
      type: "calendar",
      title: "Product Design Sync",
      subtitle: "10:00 AM - 11:00 AM • Zoom Meeting",
      time: "In 15m",
      sender: "Design Team",
      urgent: true,
      sortOrder: 100,
    },
    {
      type: "zoom",
      title: "Weekly Standup",
      subtitle: "Meeting ID: 893 234 1111",
      time: "10m ago",
      sender: "Zoom",
      urgent: false,
      sortOrder: 90,
    },
    {
      type: "slack",
      title: "New feedback on the dashboard prototypes",
      subtitle: "#design-system",
      time: "2m ago",
      sender: "Sarah Jenkins",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100",
      urgent: false,
      sortOrder: 80,
    },
    {
      type: "email",
      title: "Q4 Roadmap Review - Final Draft",
      subtitle: "Please review the attached document before...",
      time: "12m ago",
      sender: "Michael Scott",
      urgent: false,
      sortOrder: 70,
    },
    {
      type: "slack",
      title: "Can we deploy the hotfix?",
      subtitle: "Direct Message",
      time: "1h ago",
      sender: "David Chen",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&h=100",
      urgent: false,
      sortOrder: 60,
    },
    {
      type: "email",
      title: "Invitation: Lunch & Learn @ Fri Dec 15",
      subtitle: "RSVP needed by tomorrow",
      time: "2h ago",
      sender: "HR Team",
      urgent: false,
      sortOrder: 50,
    },
  ];

  await db.insert(feedItems).values(feedData);
  console.log("✓ Seeded feed items");

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
