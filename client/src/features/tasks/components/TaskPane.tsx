import { X, CheckCircle2, Circle, Calendar, User, Flag, FolderOpen, Repeat, ChevronDown } from "lucide-react";
import { useTask, useTaskProjects, useUpdateTask } from "../hooks";
import { StoriesFeed } from "./StoriesFeed";
import { CommentComposer } from "./CommentComposer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

interface TaskPaneProps {
  taskId: number;
  onClose: () => void;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-gray-500" },
  medium: { label: "Medium", color: "text-blue-500" },
  high: { label: "High", color: "text-orange-500" },
  urgent: { label: "Urgent", color: "text-red-500" },
};

export function TaskPane({ taskId, onClose }: TaskPaneProps) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: taskProjects = [] } = useTaskProjects(taskId);
  const updateTask = useUpdateTask();

  const handleToggleComplete = () => {
    if (task) {
      updateTask.mutate({ taskId, data: { isCompleted: !task.isCompleted } });
    }
  };

  if (isLoading) {
    return (
      <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full items-center justify-center">
        <p className="text-gray-500">Task not found</p>
        <Button variant="ghost" onClick={onClose} className="mt-2">
          Close
        </Button>
      </div>
    );
  }

  const priorityInfo = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;

  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-start gap-3">
        <button
          onClick={handleToggleComplete}
          className="mt-1 flex-shrink-0"
          data-testid="button-toggle-complete"
        >
          {task.isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-semibold ${task.isCompleted ? "line-through text-gray-400" : "text-gray-900"}`}>
            {task.title}
          </h2>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-pane">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <User className="w-4 h-4" />
              <span>{task.assigneeId ? "Assigned" : "Unassigned"}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Flag className={`w-4 h-4 ${priorityInfo.color}`} />
              <span className={priorityInfo.color}>{priorityInfo.label}</span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                  data-testid="button-recurrence"
                >
                  <Repeat className={`w-4 h-4 ${task.isRecurring ? "text-purple-500" : ""}`} />
                  <span className={task.isRecurring ? "text-purple-500" : ""}>
                    {task.isRecurring 
                      ? RECURRENCE_OPTIONS.find(o => o.value === task.recurrencePattern)?.label || "Recurring"
                      : "Not recurring"}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 px-2">Repeat Task</p>
                  <button
                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${!task.isRecurring ? "bg-gray-100 font-medium" : ""}`}
                    onClick={() => updateTask.mutate({ taskId, data: { isRecurring: false, recurrencePattern: null } })}
                    data-testid="option-no-recurrence"
                  >
                    No recurrence
                  </button>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${task.isRecurring && task.recurrencePattern === opt.value ? "bg-purple-100 text-purple-700 font-medium" : ""}`}
                      onClick={() => updateTask.mutate({ taskId, data: { isRecurring: true, recurrencePattern: opt.value } })}
                      data-testid={`option-recurrence-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {taskProjects.length > 0 && (
              <div className="flex items-center gap-2 text-gray-500">
                <FolderOpen className="w-4 h-4" />
                <span>{taskProjects.length} project{taskProjects.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {taskProjects.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Also in</p>
              <div className="flex flex-wrap gap-2">
                {taskProjects.map((tp) => (
                  <span
                    key={tp.projectId}
                    className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600"
                    data-testid={`badge-project-${tp.projectId}`}
                  >
                    {tp.projectName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Activity</p>
            <StoriesFeed taskId={taskId} />
            <CommentComposer taskId={taskId} />
          </div>
        </div>
      </div>
    </div>
  );
}
