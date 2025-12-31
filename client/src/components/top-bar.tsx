import { Moon, Sun, LogOut, Bug, Lightbulb } from "lucide-react";
import { useTheme } from "@/App";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlobalSearch } from "@/components/global-search";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="h-14 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 gap-4 sticky top-0 z-40">
      <GlobalSearch />
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm font-medium text-muted-foreground" data-testid="text-current-user">
            {user.firstName || user.email?.split('@')[0]}
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <a href="mailto:support@uniwork360.com?subject=Bug Report" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-red-500"
                data-testid="button-report-bug"
              >
                <Bug className="h-4 w-4" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Report a Bug</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a href="mailto:support@uniwork360.com?subject=Feature Request" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-yellow-500"
                data-testid="button-request-feature"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Request a Feature</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              data-testid="button-toggle-theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 text-muted-foreground hover:text-red-500"
              data-testid="button-logout-topbar"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log out</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
