import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface NativeTask {
  id: number;
  projectId: number | null;
  title: string;
  priority: string;
  dueDate: string | null;
  isCompleted: boolean;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "text-red-600";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    default:
      return "text-gray-400";
  }
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  if (date < today) {
    return "Overdue";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function UpcomingTasksWidget() {
  const { data: nativeTasksRaw = [], isLoading } = useQuery<NativeTask[]>({
    queryKey: ["native-tasks-upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/upcoming", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const nativeTasks = Array.isArray(nativeTasksRaw) ? nativeTasksRaw : [];
  const upcomingTasks = nativeTasks.filter((t) => !t.isCompleted).slice(0, 8);

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-4">Loading tasks...</div>;
  }

  if (upcomingTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-2">No upcoming tasks</p>
        <Link href="/projects">
          <button className="text-sm text-primary hover:underline">Create a task</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcomingTasks.map((task) => (
        <Link key={task.id} href="/projects" data-testid={`task-${task.id}`}>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-colors cursor-pointer">
            {task.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className={`w-5 h-5 flex-shrink-0 ${getPriorityColor(task.priority)}`} />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
            </div>
            {task.dueDate && (
              <span
                className={`text-xs flex-shrink-0 flex items-center gap-1 ${
                  isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {isOverdue(task.dueDate) && <AlertCircle className="w-3 h-3" />}
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </Link>
      ))}
      {nativeTasks.filter((t) => !t.isCompleted).length > 8 && (
        <Link href="/projects">
          <button className="w-full text-center text-sm text-primary hover:underline py-2">
            View all {nativeTasks.filter((t) => !t.isCompleted).length} tasks
          </button>
        </Link>
      )}
    </div>
  );
}
