import { UnifiedSidebar } from "@/components/unified-sidebar";
import { User, Bell, Shield, Palette, HelpCircle } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";

export default function Settings() {
  const settingsSections = [
    {
      icon: User,
      title: "Account",
      description: "Manage your profile and preferences",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Control how you receive alerts",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your data and security settings",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel",
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      description: "Get help or contact support",
    },
  ];

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
          <h1 className="font-display font-bold text-3xl mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace preferences.</p>
        </header>

        <div className="max-w-2xl space-y-4">
          {settingsSections.map((section) => (
            <button
              key={section.title}
              className="w-full glass-card p-5 rounded-2xl flex items-center gap-4 text-left hover:bg-white/60 transition-all"
              data-testid={`button-settings-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <section.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <div className="text-muted-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
