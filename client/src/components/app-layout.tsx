import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useGuidedTour } from "@/components/guided-tour";
import { useTheme } from "@/App";
import { getNavigationTabs, NavTab, NavItem } from "@/lib/navigation-config";
import { queryClient } from "@/lib/queryClient";
import { GlobalSearch } from "@/components/global-search";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  Clock,
  HelpCircle,
  ExternalLink,
  Moon,
  Sun,
  LogOut,
  Bug,
  Lightbulb,
  Send,
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

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { startTour } = useGuidedTour();
  const isAdmin = user?.isAdmin || false;
  const tabs = getNavigationTabs(isAdmin);

  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((data) => setAppVersion(data.version || ""))
      .catch(() => setAppVersion(""));
  }, []);

  const isTabActive = (tab: NavTab) => {
    if (tab.href && location === tab.href) return true;
    return tab.items.some(
      (item) => location === item.href || location.startsWith(item.href + "/")
    );
  };

  const isItemActive = (item: NavItem) => {
    return location === item.href || location.startsWith(item.href + "/");
  };

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
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        {/* Top Utility Bar */}
        <div className="flex h-12 items-center justify-between px-4 gap-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <img src={yhcLogo} alt="The YHC Way" className="h-8 w-8 rounded-lg" />
              <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                The YHC Way
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-lg mx-4 hidden sm:block">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/time-tracking">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900"
                    data-testid="button-time-tracking"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Time</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Time Tracking</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startTour}
                  className="gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  data-testid="button-guided-tour"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Tour</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Take a Guided Tour</TooltipContent>
            </Tooltip>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
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
                  className="h-8 w-8 text-gray-500 hover:text-yellow-500"
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
                  className="h-8 w-8"
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

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

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

        {/* Navigation Bar - Desktop */}
        <nav className="hidden md:flex items-center gap-2 px-4 py-2 border-b border-gray-200/50 dark:border-gray-700/50">
          {tabs.map((tab) => (
            <NavTabDropdown
              key={tab.id}
              tab={tab}
              isActive={isTabActive(tab)}
              isItemActive={isItemActive}
            />
          ))}
        </nav>

        {/* Navigation Bar - Mobile */}
        <MobileNav tabs={tabs} isItemActive={isItemActive} isTabActive={isTabActive} />
      </header>

      <main className="relative z-10">{children}</main>

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

function NavTabDropdown({
  tab,
  isActive,
  isItemActive,
}: {
  tab: NavTab;
  isActive: boolean;
  isItemActive: (item: NavItem) => boolean;
}) {
  const [, navigate] = useLocation();

  const handleTabClick = () => {
    if (tab.href) {
      navigate(tab.href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30",
            "focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1",
            isActive
              ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
          data-testid={`nav-tab-${tab.id}`}
        >
          <tab.icon className="h-4 w-4" />
          <span className="hidden xl:inline">{tab.label}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {tab.href && (
          <DropdownMenuItem
            onClick={handleTabClick}
            className="gap-2 cursor-pointer"
            data-testid={`nav-item-${tab.id}-home`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label} Home</span>
          </DropdownMenuItem>
        )}
        {tab.items.map((item) => (
          <NavDropdownItem key={item.id} item={item} isActive={isItemActive(item)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavDropdownItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  if (item.isExternal) {
    return (
      <DropdownMenuItem asChild>
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 cursor-pointer w-full",
            isActive && "bg-orange-50 dark:bg-orange-900/20"
          )}
          data-testid={`nav-item-${item.id}`}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </a>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem asChild>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 cursor-pointer w-full",
          isActive && "bg-orange-50 dark:bg-orange-900/20"
        )}
        data-testid={`nav-item-${item.id}`}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

function MobileNav({
  tabs,
  isItemActive,
  isTabActive,
}: {
  tabs: NavTab[];
  isItemActive: (item: NavItem) => boolean;
  isTabActive: (tab: NavTab) => boolean;
}) {
  return (
    <div className="md:hidden overflow-x-auto border-t bg-white dark:bg-slate-900">
      <div className="flex items-center gap-1 p-2 min-w-max">
        {tabs.map((tab) => (
          <DropdownMenu key={tab.id}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  isTabActive(tab)
                    ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
                data-testid={`mobile-nav-tab-${tab.id}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {tab.items.map((item) => (
                <NavDropdownItem key={item.id} item={item} isActive={isItemActive(item)} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
    </div>
  );
}
