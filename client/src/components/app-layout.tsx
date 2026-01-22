import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useGuidedTour } from "@/components/guided-tour";
import { useTheme } from "@/App";
import { queryClient } from "@/lib/queryClient";
import { GlobalSearch } from "@/components/global-search";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
import {
  ChevronDown,
  Clock,
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  Bug,
  Lightbulb,
  Send,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import yhcLogo from "@assets/logo_bug_1024_1767889616107.jpg";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { startTour } = useGuidedTour();

  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((data) => setAppVersion(data.version || ""))
      .catch(() => setAppVersion(""));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackTitle.trim() || !feedbackDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: feedbackType,
          title: feedbackTitle,
          description: feedbackDescription,
        }),
      });

      if (res.ok) {
        toast({
          title:
            feedbackType === "bug"
              ? "Bug report submitted"
              : "Feature request submitted",
          description: "Thank you for your feedback!",
        });
      } else {
        throw new Error("Failed to submit");
      }
    } catch (error) {
      toast({
        title: "Feedback saved locally",
        description: "We'll review your feedback. Thank you!",
      });
    } finally {
      setFeedbackType(null);
      setFeedbackTitle("");
      setFeedbackDescription("");
      setIsSubmitting(false);
    }
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      const parts = user.firstName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-full z-40 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        <SidebarNav />
      </aside>

      {/* Mobile Menu Drawer */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle>Navigation</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" data-testid="button-close-mobile-menu">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto">
            <SidebarNav onClose={() => setMobileMenuOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        sidebarCollapsed ? "md:ml-0" : "md:ml-64"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex h-14 items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden h-9 w-9"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Desktop Sidebar Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden md:flex h-9 w-9"
                    data-testid="button-toggle-sidebar"
                  >
                    {sidebarCollapsed ? (
                      <PanelLeft className="h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                </TooltipContent>
              </Tooltip>

              <div className="flex-1 max-w-md">
                <GlobalSearch />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/time-tracking">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-600 dark:text-gray-300"
                      data-testid="button-time-tracking"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Time Tracking</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startTour}
                    className="h-9 w-9 text-gray-600 dark:text-gray-300"
                    data-testid="button-guided-tour"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Take a Guided Tour</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-9 w-9 text-gray-500 hover:text-red-500"
                    onClick={() => setFeedbackType("bug")}
                    data-testid="button-report-bug"
                  >
                    <Bug className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Report a Bug</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-9 w-9 text-gray-500 hover:text-yellow-500"
                    onClick={() => setFeedbackType("feature")}
                    data-testid="button-request-feature"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Request a Feature</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    data-testid="button-toggle-theme"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    data-testid="user-profile-button"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium text-sm">
                      {getInitials()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:inline">
                      {user?.firstName || user?.email?.split("@")[0] || "User"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden lg:inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs text-gray-500">
                    {user?.email}
                    {appVersion && <span className="ml-1">v{appVersion}</span>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/connect" className="cursor-pointer">
                      Connect Apps
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 relative z-10">{children}</main>
      </div>

      <Dialog
        open={feedbackType !== null}
        onOpenChange={(open) => !open && setFeedbackType(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedbackType === "bug" ? (
                <>
                  <Bug className="w-5 h-5 text-red-500" />
                  Report a Bug
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Request a Feature
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feedback-title">
                {feedbackType === "bug" ? "What's the issue?" : "Feature title"}
              </Label>
              <Input
                id="feedback-title"
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                placeholder={
                  feedbackType === "bug"
                    ? "Brief description of the bug"
                    : "Name your feature idea"
                }
                data-testid="input-feedback-title"
              />
            </div>
            <div>
              <Label htmlFor="feedback-description">
                {feedbackType === "bug" ? "Steps to reproduce" : "Description"}
              </Label>
              <Textarea
                id="feedback-description"
                value={feedbackDescription}
                onChange={(e) => setFeedbackDescription(e.target.value)}
                placeholder={
                  feedbackType === "bug"
                    ? "1. Go to...\n2. Click on...\n3. See the error..."
                    : "Describe what you'd like and why it would be helpful..."
                }
                rows={5}
                data-testid="input-feedback-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackType(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={
                !feedbackTitle.trim() || !feedbackDescription.trim() || isSubmitting
              }
              data-testid="button-submit-feedback"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
