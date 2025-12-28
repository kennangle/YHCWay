import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
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
import Typeform from "@/pages/typeform";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import EmailBuilderPage from "@/pages/email-builder";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/dashboard">{() => <Redirect to="/login" />}</Route>
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/typeform" component={Typeform} />
          <Route path="/chat" component={Chat} />
          <Route path="/connect" component={Connect} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={Admin} />
          <Route path="/email-builder" component={EmailBuilderPage} />
          <Route path="/login">{() => <Redirect to="/dashboard" />}</Route>
          <Route path="/register">{() => <Redirect to="/dashboard" />}</Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
