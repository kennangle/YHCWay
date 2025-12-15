import { UnifiedSidebar } from "@/components/unified-sidebar";
import { ServiceCard } from "@/components/service-card";
import { AppleCalendarConnect } from "@/components/apple-calendar-connect";
import { Search } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";

export default function Connect() {
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("Failed to fetch services");
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

  const connectedServices = services.filter(s => s.connected);
  const availableServices = services.filter(s => !s.connected);

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
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Connect Apps</h1>
          <p className="text-muted-foreground">Manage your connected services and add new integrations.</p>
        </header>

        <div className="glass-panel p-4 rounded-xl mb-8 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search for apps..." 
            className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground"
            data-testid="input-search-apps"
          />
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading services...</div>
        ) : (
          <>
            {connectedServices.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display font-semibold text-xl mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Connected Apps
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {connectedServices.map((service) => (
                    <ServiceCard 
                      key={service.id}
                      id={service.id}
                      name={service.name}
                      description={service.description}
                      icon={getIconName(service.icon)}
                      colorClass={service.colorClass}
                      connected={service.connected}
                    />
                  ))}
                </div>
              </section>
            )}

            {availableServices.length > 0 && (
              <section>
                <h2 className="font-display font-semibold text-xl mb-4">Available Apps</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {availableServices.map((service) => (
                    <ServiceCard 
                      key={service.id}
                      id={service.id}
                      name={service.name}
                      description={service.description}
                      icon={getIconName(service.icon)}
                      colorClass={service.colorClass}
                      connected={service.connected}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="font-display font-semibold text-xl mb-4">Special Integrations</h2>
              <p className="text-muted-foreground mb-4">These integrations require additional credentials.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AppleCalendarConnect variant="card" />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
