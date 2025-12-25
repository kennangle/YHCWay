import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { User, Bell, Shield, Palette, HelpCircle, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";

interface UserPreferences {
  googleCalendarColor: string;
  appleCalendarColor: string;
  zoomColor: string;
  theme: string;
}

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Pink" },
];

type SettingsSection = "main" | "account" | "notifications" | "privacy" | "appearance" | "help";

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast.success("Preferences saved!");
    },
    onError: () => {
      toast.error("Failed to save preferences");
    },
  });

  const handleColorChange = (key: keyof UserPreferences, color: string) => {
    updatePreferencesMutation.mutate({ [key]: color });
  };

  const settingsSections = [
    {
      id: "account" as const,
      icon: User,
      title: "Account",
      description: "Manage your profile and preferences",
    },
    {
      id: "notifications" as const,
      icon: Bell,
      title: "Notifications",
      description: "Control how you receive alerts",
    },
    {
      id: "privacy" as const,
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your data and security settings",
    },
    {
      id: "appearance" as const,
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel",
    },
    {
      id: "help" as const,
      icon: HelpCircle,
      title: "Help & Support",
      description: "Get help or contact support",
    },
  ];

  const renderMainMenu = () => (
    <div className="max-w-2xl space-y-4">
      {settingsSections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className="w-full glass-card p-5 rounded-2xl flex items-center gap-4 text-left hover:bg-white/60 transition-all"
          data-testid={`button-settings-${section.id}`}
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
  );

  const renderColorPicker = (
    label: string, 
    description: string,
    currentColor: string, 
    onChange: (color: string) => void
  ) => (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Label className="text-base font-semibold">{label}</Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div 
          className="w-8 h-8 rounded-lg border-2 border-white/50 shadow-md"
          style={{ backgroundColor: currentColor }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className="relative w-10 h-10 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            style={{ backgroundColor: color.value }}
            data-testid={`color-${label.toLowerCase().replace(/\s+/g, '-')}-${color.label.toLowerCase()}`}
            title={color.label}
          >
            {currentColor === color.value && (
              <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => setActiveSection("main")}
        className="mb-6 -ml-2"
        data-testid="button-back-to-main"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Settings
      </Button>

      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">Appearance</h2>
        <p className="text-muted-foreground">Customize how UniWork looks for you.</p>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground mb-3">Calendar Colors</h3>
          
          {renderColorPicker(
            "Google Calendar",
            "Color for events from Google Calendar",
            preferences?.googleCalendarColor || "#3b82f6",
            (color) => handleColorChange("googleCalendarColor", color)
          )}

          {renderColorPicker(
            "Apple Calendar",
            "Color for events from Apple iCloud Calendar",
            preferences?.appleCalendarColor || "#22c55e",
            (color) => handleColorChange("appleCalendarColor", color)
          )}

          {renderColorPicker(
            "Zoom Meetings",
            "Color for Zoom meetings on the calendar",
            preferences?.zoomColor || "#a855f7",
            (color) => handleColorChange("zoomColor", color)
          )}
        </div>
      )}
    </div>
  );

  const renderComingSoon = (title: string) => (
    <div className="max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => setActiveSection("main")}
        className="mb-6 -ml-2"
        data-testid="button-back-to-main"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Settings
      </Button>

      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl mb-2">{title}</h2>
      </div>

      <div className="glass-card p-8 rounded-2xl text-center">
        <p className="text-muted-foreground">This section is coming soon.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "appearance":
        return renderAppearanceSection();
      case "account":
        return renderComingSoon("Account");
      case "notifications":
        return renderComingSoon("Notifications");
      case "privacy":
        return renderComingSoon("Privacy & Security");
      case "help":
        return renderComingSoon("Help & Support");
      default:
        return renderMainMenu();
    }
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
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace preferences.</p>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
