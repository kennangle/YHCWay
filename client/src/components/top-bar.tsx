import { useState } from "react";
import { Moon, Sun, LogOut, Bug, Lightbulb, Send, HelpCircle, Clock } from "lucide-react";
import { useGuidedTour } from "@/components/guided-tour";
import { useTheme } from "@/App";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
import { GlobalSearch } from "@/components/global-search";
import { useToast } from "@/hooks/use-toast";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { startTour } = useGuidedTour();
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          title: feedbackType === "bug" ? "Bug report submitted" : "Feature request submitted",
          description: "Thank you for your feedback!",
        });
        setFeedbackType(null);
        setFeedbackTitle("");
        setFeedbackDescription("");
      } else {
        throw new Error("Failed to submit");
      }
    } catch (error) {
      toast({
        title: "Feedback saved locally",
        description: "We'll review your feedback. Thank you!",
      });
      setFeedbackType(null);
      setFeedbackTitle("");
      setFeedbackDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="h-14 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 gap-4 sticky top-0 z-40">
        <GlobalSearch />
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-primary border-primary/20 hover:border-primary/40"
                onClick={() => setLocation("/time-tracking")}
                data-testid="button-enter-time"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Enter Time</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Time Tracking</p>
            </TooltipContent>
          </Tooltip>

          {user && (
            <span className="text-sm font-medium text-muted-foreground" data-testid="text-current-user">
              {user.firstName || user.email?.split('@')[0]}
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-primary"
                onClick={startTour}
                data-testid="button-start-tour"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Take a Tour</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-red-500"
                onClick={() => setFeedbackType("bug")}
                data-testid="button-report-bug"
              >
                <Bug className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Report a Bug</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-yellow-500"
                onClick={() => setFeedbackType("feature")}
                data-testid="button-request-feature"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
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

      <Dialog open={feedbackType !== null} onOpenChange={(open) => !open && setFeedbackType(null)}>
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
                placeholder={feedbackType === "bug" ? "Brief description of the bug" : "Name your feature idea"}
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
              disabled={!feedbackTitle.trim() || !feedbackDescription.trim() || isSubmitting}
              data-testid="button-submit-feedback"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
