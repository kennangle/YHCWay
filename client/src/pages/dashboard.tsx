import { UnifiedSidebar } from "@/components/unified-sidebar";
import { ServiceCard } from "@/components/service-card";
import { FeedItem } from "@/components/feed-item";
import { Search, Bell } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import type { Service, FeedItem as FeedItemType } from "@shared/schema";

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const { data: feedItems = [], isLoading: feedLoading } = useQuery<FeedItemType[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Failed to fetch feed items");
      return res.json();
    },
  });

  const getIconName = (iconStr: string) => {
    const iconMap: Record<string, string> = {
      "MessageCircle": "MessageCircle",
      "Mail": "Mail",
      "Calendar": "Calendar",
      "Video": "Video",
    };
    return iconMap[iconStr] || "Calendar";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
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
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{today}</p>
            <h1 className="font-display font-bold text-3xl">Good morning, Alex</h1>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors" data-testid="button-search">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors relative" data-testid="button-notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {servicesLoading ? (
            <div className="col-span-5 text-center text-muted-foreground">Loading services...</div>
          ) : (
            services.map((service) => (
              <ServiceCard 
                key={service.id}
                id={service.id}
                name={service.name}
                description={service.description}
                icon={getIconName(service.icon)}
                colorClass={service.colorClass}
                connected={service.connected}
              />
            ))
          )}
        </section>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl">Unified Feed</h2>
              <div className="flex gap-2 text-sm">
                <button className="px-3 py-1.5 rounded-full bg-white shadow-sm text-foreground font-medium" data-testid="button-filter-all">All</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors" data-testid="button-filter-mentions">Mentions</button>
                <button className="px-3 py-1.5 rounded-full text-muted-foreground hover:bg-white/50 transition-colors" data-testid="button-filter-unread">Unread</button>
              </div>
            </div>

            <div className="space-y-3">
              {feedLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading feed...</div>
              ) : feedItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No feed items yet</div>
              ) : (
                feedItems.map((item) => (
                  <FeedItem 
                    key={item.id} 
                    type={item.type as any}
                    title={item.title}
                    subtitle={item.subtitle || undefined}
                    time={item.time}
                    sender={item.sender || undefined}
                    avatar={item.avatar || undefined}
                    urgent={item.urgent}
                  />
                ))
              )}
            </div>
          </div>

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
              <button className="w-full py-2.5 rounded-lg bg-primary text-white font-medium shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors" data-testid="button-new-message">
                New Message
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
