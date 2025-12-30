import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, Check, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AppleCalendarConnectProps {
  variant?: "card" | "button";
}

export function AppleCalendarConnect({ variant = "card" }: AppleCalendarConnectProps) {
  const [open, setOpen] = useState(false);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["apple-calendar-status"],
    queryFn: async () => {
      const res = await fetch("/api/apple-calendar/status", { credentials: "include" });
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { appleId: string; appPassword: string }) => {
      const res = await fetch("/api/apple-calendar/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Connection failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apple-calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["apple-calendar-events"] });
      setOpen(false);
      setAppleId("");
      setAppPassword("");
      setError("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/apple-calendar/disconnect", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apple-calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["apple-calendar-events"] });
    },
  });

  const handleConnect = () => {
    setError("");
    connectMutation.mutate({ appleId, appPassword });
  };

  const isConnected = status?.connected;

  if (variant === "button") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={isConnected ? "outline" : "default"}
            className="gap-2"
            data-testid="button-apple-calendar"
          >
            <Apple className="w-4 h-4" />
            {isConnected ? "Connected" : "Connect Apple Calendar"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isConnected ? "Apple Calendar Connected" : "Connect Apple Calendar"}
            </DialogTitle>
          </DialogHeader>
          {isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your Apple Calendar is connected. Events will appear in your unified calendar.
              </p>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect-apple"
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          ) : (
            <ConnectForm
              appleId={appleId}
              setAppleId={setAppleId}
              appPassword={appPassword}
              setAppPassword={setAppPassword}
              error={error}
              isPending={connectMutation.isPending}
              onConnect={handleConnect}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col h-full relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500 bg-gray-500" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-white bg-gradient-to-br from-gray-600 to-gray-800">
          <Apple className="w-6 h-6" />
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
                isConnected
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-white text-muted-foreground border border-border hover:border-primary hover:text-primary"
              }`}
              data-testid="button-toggle-apple-calendar"
            >
              {isConnected ? (
                <>
                  <Check className="w-3 h-3" /> Connected
                </>
              ) : (
                <>
                  <span className="w-3 h-3 text-lg leading-none">+</span> Connect
                </>
              )}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isConnected ? "Apple Calendar Connected" : "Connect Apple Calendar"}
              </DialogTitle>
            </DialogHeader>
            {isConnected ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your Apple Calendar is connected. Events will appear in your unified calendar.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect-apple"
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            ) : (
              <ConnectForm
                appleId={appleId}
                setAppleId={setAppleId}
                appPassword={appPassword}
                setAppPassword={setAppPassword}
                error={error}
                isPending={connectMutation.isPending}
                onConnect={handleConnect}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-auto relative z-10">
        <h3 className="font-display font-semibold text-lg text-foreground mb-1" data-testid="text-service-name-apple-calendar">
          Apple Calendar
        </h3>
        <p className="text-sm text-muted-foreground leading-snug">
          Sync your iCloud calendars and events
        </p>
      </div>
    </div>
  );
}

function ConnectForm({
  appleId,
  setAppleId,
  appPassword,
  setAppPassword,
  error,
  isPending,
  onConnect,
}: {
  appleId: string;
  setAppleId: (v: string) => void;
  appPassword: string;
  setAppPassword: (v: string) => void;
  error: string;
  isPending: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        To connect Apple Calendar, you need to generate an app-specific password from your Apple account.
      </p>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <p className="font-medium text-amber-800 mb-1">How to get an app-specific password:</p>
        <ol className="list-decimal list-inside text-amber-700 space-y-1">
          <li>Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="underline">appleid.apple.com</a></li>
          <li>Sign in and go to Security</li>
          <li>Click "App-Specific Passwords"</li>
          <li>Generate a new password for "UniWork360"</li>
        </ol>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appleId">Apple ID (Email)</Label>
        <Input
          id="appleId"
          type="email"
          placeholder="your@icloud.com"
          value={appleId}
          onChange={(e) => setAppleId(e.target.value)}
          data-testid="input-apple-id"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="appPassword">App-Specific Password</Label>
        <Input
          id="appPassword"
          type="password"
          placeholder="xxxx-xxxx-xxxx-xxxx"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          data-testid="input-app-password"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      <Button
        className="w-full"
        onClick={onConnect}
        disabled={isPending || !appleId || !appPassword}
        data-testid="button-connect-apple"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Apple Calendar"
        )}
      </Button>
    </div>
  );
}
