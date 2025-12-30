import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Link } from "wouter";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Mail, 
  Calendar, 
  Video, 
  MessageSquare, 
  Apple,
  ListTodo,
  Gift,
  Settings,
  ExternalLink
} from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery } from "@tanstack/react-query";

interface ServiceStatus {
  gmail: boolean;
  googleCalendar: boolean;
  zoom: boolean;
  slack: boolean;
  appleCalendar: boolean;
  asana: boolean;
  mindbody: boolean;
}

export default function SetupGuide() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: gmailStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/gmail/status"],
    retry: false,
  });

  const { data: calendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
    retry: false,
  });

  const { data: zoomStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/zoom/status"],
    retry: false,
  });

  const { data: slackStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/slack/status"],
    retry: false,
  });

  const { data: appleCalendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/apple-calendar/status"],
    retry: false,
  });

  const { data: asanaStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/asana/status"],
    retry: false,
  });

  const { data: mindbodyStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/mindbody-analytics/status"],
    retry: false,
  });

  const serviceStatus: ServiceStatus = {
    gmail: gmailStatus?.connected || false,
    googleCalendar: calendarStatus?.connected || false,
    zoom: zoomStatus?.connected || false,
    slack: slackStatus?.connected || false,
    appleCalendar: appleCalendarStatus?.connected || false,
    asana: asanaStatus?.connected || false,
    mindbody: mindbodyStatus?.configured || false,
  };

  const completedSteps = Object.values(serviceStatus).filter(Boolean).length;
  const totalSteps = 7;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  const setupSteps = [
    {
      id: "gmail",
      title: "Connect Gmail",
      description: "View and manage your emails directly from UniWork360. Send, reply, and organize your inbox without switching apps.",
      icon: Mail,
      connected: serviceStatus.gmail,
      href: "/connect",
      color: "text-red-500",
      bgColor: "bg-red-100",
    },
    {
      id: "google-calendar",
      title: "Connect Google Calendar",
      description: "See your upcoming events and schedule at a glance. Never miss a meeting with integrated calendar views.",
      icon: Calendar,
      connected: serviceStatus.googleCalendar,
      href: "/connect",
      color: "text-blue-500",
      bgColor: "bg-blue-100",
    },
    {
      id: "apple-calendar",
      title: "Connect Apple Calendar",
      description: "Sync your Apple Calendar events. Requires an app-specific password from your Apple ID settings.",
      icon: Apple,
      connected: serviceStatus.appleCalendar,
      href: "/connect",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    {
      id: "zoom",
      title: "Connect Zoom",
      description: "View upcoming Zoom meetings and join with one click. Stay on top of your video calls.",
      icon: Video,
      connected: serviceStatus.zoom,
      href: "/connect",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      id: "slack",
      title: "Connect Slack",
      description: "See your Slack messages and DMs in one place. Stay connected with your team without tab switching.",
      icon: MessageSquare,
      connected: serviceStatus.slack,
      href: "/connect",
      color: "text-purple-500",
      bgColor: "bg-purple-100",
    },
    {
      id: "asana",
      title: "Connect Asana",
      description: "Track your tasks and projects. View your Asana assignments alongside other work items.",
      icon: ListTodo,
      connected: serviceStatus.asana,
      href: "/connect",
      color: "text-orange-500",
      bgColor: "bg-orange-100",
    },
    {
      id: "mindbody",
      title: "Mindbody Analytics",
      description: "View intro offers and student analytics from your Mindbody Analytics dashboard.",
      icon: Gift,
      connected: serviceStatus.mindbody,
      href: "/intro-offers",
      color: "text-pink-500",
      bgColor: "bg-pink-100",
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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="font-display font-bold text-3xl mb-2" data-testid="text-setup-title">
              Welcome to UniWork360!
            </h1>
            <p className="text-muted-foreground text-lg">
              Let's get your workspace set up. Follow these steps to connect your favorite tools.
            </p>
          </header>

          <div className="glass-card rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Setup Progress</h2>
              <span className="text-sm text-muted-foreground">
                {completedSteps} of {totalSteps} services connected
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {setupSteps.map((step, index) => (
              <div 
                key={step.id}
                className={`glass-card rounded-2xl p-6 transition-all ${
                  step.connected ? "border-2 border-green-300/50" : "hover:shadow-md"
                }`}
                data-testid={`setup-step-${step.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${step.bgColor} flex items-center justify-center`}>
                      <step.icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                      {step.connected && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">
                      {step.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {step.connected ? (
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <Link
                        href={step.href}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                        data-testid={`button-connect-${step.id}`}
                      >
                        Connect
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 glass-card rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-4">Additional Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/settings"
                className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
                data-testid="link-settings"
              >
                <Settings className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium">Customize Settings</div>
                  <div className="text-sm text-muted-foreground">Adjust notifications, theme, and preferences</div>
                </div>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
                data-testid="link-dashboard"
              >
                <ExternalLink className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium">Go to Dashboard</div>
                  <div className="text-sm text-muted-foreground">View your unified feed and activity</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-muted-foreground text-sm">
            <p>Need help? Contact your administrator or check back later for updates.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
