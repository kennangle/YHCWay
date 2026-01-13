import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/command-palette";
import { useSidebarCollapse, SidebarProvider } from "@/hooks/useSidebarCollapse";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "light" as Theme, setTheme: () => {} };
  }
  return context;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Overview from "@/pages/overview";
import Connect from "@/pages/connect";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Inbox from "@/pages/inbox";
import Calendar from "@/pages/calendar";
import Chat from "@/pages/chat";
import Tasks from "@/pages/tasks";
import Projects from "@/pages/projects";
import ProjectBoard from "@/pages/project-board";
import ProjectV2 from "@/pages/project-v2";
import Typeform from "@/pages/typeform";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import EmailBuilderPage from "@/pages/email-builder";
import IntroOffers from "@/pages/intro-offers";
import Webhooks from "@/pages/webhooks";
import SetupGuide from "@/pages/setup-guide";
import PendingApproval from "@/pages/pending-approval";
import QRCodes from "@/pages/qr-codes";
import Rewards from "@/pages/rewards";
import TimeTracking from "@/pages/time-tracking";
import AISummarize from "@/pages/ai-summarize";
import EmailActivity from "@/pages/email-activity";
import Gusto from "@/pages/gusto";
import Presentation from "@/pages/presentation";
import Changelog from "@/pages/changelog";
import GoogleDocs from "@/pages/google-docs";
import GoogleSheets from "@/pages/google-sheets";
import GoogleDrive from "@/pages/google-drive";
import { FloatingAIButton } from "@/components/floating-ai-button";
import { GuidedTour } from "@/components/guided-tour";

function ApprovalGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  if (user && user.approvalStatus !== "approved" && location !== "/pending-approval") {
    return <Redirect to="/pending-approval" />;
  }

  return <>{children}</>;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useKeyboardShortcuts(() => setCommandPaletteOpen(true));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/dashboard">{() => <Redirect to="/login" />}</Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <ApprovalGuard>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <FloatingAIButton />
      <GuidedTour autoStart />
      <Switch>
        <Route path="/pending-approval" component={PendingApproval} />
        <Route path="/" component={Overview} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectV2} />
        <Route path="/projects-old/:id" component={ProjectBoard} />
        <Route path="/typeform" component={Typeform} />
        <Route path="/chat" component={Chat} />
        <Route path="/connect" component={Connect} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={Admin} />
        <Route path="/email-builder" component={EmailBuilderPage} />
        <Route path="/intro-offers" component={IntroOffers} />
        <Route path="/webhooks" component={Webhooks} />
        <Route path="/setup-guide" component={SetupGuide} />
        <Route path="/qr-codes" component={QRCodes} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/time-tracking" component={TimeTracking} />
        <Route path="/email-activity" component={EmailActivity} />
        <Route path="/gusto" component={Gusto} />
        <Route path="/presentation" component={Presentation} />
        <Route path="/changelog" component={Changelog} />
        <Route path="/google-drive" component={GoogleDrive} />
        <Route path="/google-docs" component={GoogleDocs} />
        <Route path="/google-sheets" component={GoogleSheets} />
        <Route path="/ai-summarize" component={AISummarize} />
        <Route path="/login">{() => <Redirect to="/dashboard" />}</Route>
        <Route path="/register">{() => <Redirect to="/dashboard" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </ApprovalGuard>
  );
}

function SidebarContextWrapper({ children }: { children: ReactNode }) {
  const sidebarState = useSidebarCollapse();
  return (
    <SidebarProvider value={sidebarState}>
      {children}
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarContextWrapper>
            <Toaster />
            <Router />
          </SidebarContextWrapper>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
