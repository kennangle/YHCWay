import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Square, Clock, Timer } from "lucide-react";

interface TimeEntry {
  id: number;
  taskId: number | null;
  projectId: number | null;
  userId: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  isBillable: boolean;
  createdAt: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function TimeTrackerWidget() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
    queryKey: ["active-time-entry"],
    queryFn: async () => {
      const res = await fetch("/api/time-entries/active", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active timer");
      return res.json();
    },
    refetchInterval: 1000,
  });

  const { data: todayEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["today-time-entries"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const res = await fetch(`/api/time-entries?startDate=${today.toISOString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async (desc: string) => {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: desc || null,
          startTime: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to start timer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["today-time-entries"] });
      setDescription("");
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/time-entries/${id}/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to stop timer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["today-time-entries"] });
    },
  });

  useEffect(() => {
    if (activeEntry) {
      const startTime = new Date(activeEntry.startTime).getTime();
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeEntry]);

  const totalTodaySeconds = todayEntries
    .filter(e => e.duration)
    .reduce((sum, e) => sum + (e.duration || 0), 0);

  const handleStart = () => {
    startMutation.mutate(description);
  };

  const handleStop = () => {
    if (activeEntry) {
      stopMutation.mutate(activeEntry.id);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-2xl mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Time Tracker</h3>
        </div>
        <div className="text-center text-muted-foreground py-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl mb-8" data-testid="time-tracker-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Time Tracker</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          Today: <span className="font-semibold text-foreground">{formatDuration(totalTodaySeconds + (activeEntry ? elapsedTime : 0))}</span>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Input
          placeholder="What are you working on?"
          value={activeEntry ? (activeEntry.description || "") : description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!!activeEntry}
          className="flex-1"
          data-testid="input-time-description"
        />
        
        {activeEntry ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
              <Timer className="w-4 h-4 animate-pulse" />
              <span className="font-mono font-semibold">{formatDuration(elapsedTime)}</span>
            </div>
            <Button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              variant="destructive"
              size="icon"
              data-testid="button-stop-timer"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-start-timer"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}
      </div>

      {todayEntries.filter(e => e.id !== activeEntry?.id && e.duration).length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Today's Time</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {todayEntries.filter(e => e.id !== activeEntry?.id && e.duration).slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-white/30">
                <span className="truncate flex-1">{entry.description || "No description"}</span>
                <span className="text-muted-foreground ml-2 flex-shrink-0">
                  {formatTime(new Date(entry.startTime))} · {formatDuration(entry.duration || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
