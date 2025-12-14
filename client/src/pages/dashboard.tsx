import { UnifiedSidebar } from "@/components/unified-sidebar";
import { ServiceCard } from "@/components/service-card";
import { FeedItem, FeedType } from "@/components/feed-item";
import { MessageCircle, Mail, Calendar as CalendarIcon, Search, Bell } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const feedItems = [
    {
      id: 1,
      type: "calendar" as FeedType,
      title: "Product Design Sync",
      subtitle: "10:00 AM - 11:00 AM • Zoom Meeting",
      time: "In 15m",
      sender: "Design Team",
      urgent: true,
    },
    {
      id: 2,
      type: "slack" as FeedType,
      title: "New feedback on the dashboard prototypes",
      subtitle: "#design-system",
      time: "2m ago",
      sender: "Sarah Jenkins",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100",
    },
    {
      id: 3,
      type: "email" as FeedType,
      title: "Q4 Roadmap Review - Final Draft",
      subtitle: "Please review the attached document before...",
      time: "12m ago",
      sender: "Michael Scott",
      urgent: false,
    },
    {
      id: 4,
      type: "slack" as FeedType,
      title: "Can we deploy the hotfix?",
      subtitle: "Direct Message",
      time: "1h ago",
      sender: "David Chen",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&h=100",
    },
    {
      id: 5,
      type: "email" as FeedType,
      title: "Invitation: Lunch & Learn @ Fri Dec 15",
      subtitle: "RSVP needed by tomorrow",
      time: "2h ago",
      sender: "HR Team",
      urgent: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 ml-64 p-8 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{today}</p>
            <h1 className="font-display font-bold text-3xl">Good morning, Alex</h1>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Integration Status Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <ServiceCard 
            name="Slack" 
            description="5 unread mentions, 12 new messages"
            icon={<MessageCircle className="w-6 h-6" />}
            colorClass="bg-[#4A154B] text-white"
            connected={true}
          />
          <ServiceCard 
            name="Gmail" 
            description="3 urgent emails, 18 total unread"
            icon={<Mail className="w-6 h-6" />}
            colorClass="bg-[#EA4335] text-white"
            connected={true}
          />
          <ServiceCard 
            name="Google Calendar" 
            description="2 meetings remaining today"
            icon={<CalendarIcon className="w-6 h-6" />}
            colorClass="bg-[#4285F4] text-white"
            connected={true}
          />
           <ServiceCard 
            name="Apple Calendar" 
            description="Sync your personal iCloud events"
            icon={<CalendarIcon className="w-6 h-6" />}
            colorClass="bg-gray-800 text-white"
            connected={false}
          />
        </section>

        {/* Main Content Split */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Column: Unified Feed */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl">Unified Feed</h2>
              <div className="flex gap-2 text-sm">
                <button className="px-3 py-1.5 rounded-full bg-white shadow-sm text-foreground font-medium">All</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors">Mentions</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors">Unread</button>
              </div>
            </div>

            <div className="space-y-3">
              {feedItems.map((item) => (
                <FeedItem key={item.id} {...item} />
              ))}
            </div>
          </div>

          {/* Right Column: Upcoming & Quick Actions */}
          <div className="col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-display font-semibold text-lg mb-4">Upcoming</h3>
              
              <div className="relative pl-4 border-l-2 border-primary/20 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-white"></div>
                  <p className="text-xs text-primary font-bold mb-1">NOW</p>
                  <h4 className="font-medium text-foreground">Deep Work Session</h4>
                  <p className="text-sm text-muted-foreground">9:00 AM - 10:00 AM</p>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-muted-foreground/30 ring-4 ring-white"></div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">10:00 AM</p>
                  <h4 className="font-medium text-foreground">Product Design Sync</h4>
                  <p className="text-sm text-muted-foreground">Zoom Meeting</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-muted-foreground/30 ring-4 ring-white"></div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">2:00 PM</p>
                  <h4 className="font-medium text-foreground">Client Review</h4>
                  <p className="text-sm text-muted-foreground">Google Meet</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
              <h3 className="font-display font-semibold text-lg mb-2">Quick Compose</h3>
              <p className="text-sm text-muted-foreground mb-4">Send a message to any connected service.</p>
              <button className="w-full py-2.5 rounded-lg bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors">
                New Message
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
