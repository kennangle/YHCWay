import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckCircle2, Circle, GripVertical, User, Layers } from "lucide-react";
import type { TaskLite } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskCardProps {
  task: TaskLite;
  onClick: () => void;
  isSelected?: boolean;
  onToggleComplete?: (taskId: number, completed: boolean) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export function TaskCard({ task, onClick, isSelected, onToggleComplete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDueDate = (date: string | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "Overdue", className: "text-red-600" };
    if (diffDays === 0) return { text: "Today", className: "text-orange-600" };
    if (diffDays === 1) return { text: "Tomorrow", className: "text-yellow-600" };
    return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), className: "text-gray-500" };
  };

  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-white border rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""}
        ${isSelected ? "ring-2 ring-primary border-primary" : "border-gray-200"}
        ${task.isCompleted ? "opacity-60" : ""}
      `}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          <button
            className="mt-0.5 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete?.(task.id, !task.isCompleted);
            }}
            data-testid={`button-toggle-complete-${task.id}`}
          >
            {task.isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 hover:text-gray-400" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.isCompleted ? "line-through text-gray-400" : "text-gray-900"}`}>
              {task.title}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.priority && task.priority !== "medium" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              )}

              {dueInfo && (
                <span className={`text-[10px] flex items-center gap-1 ${dueInfo.className}`}>
                  <Calendar className="w-3 h-3" />
                  {dueInfo.text}
                </span>
              )}

              {task.assigneeId && (
                <span className="text-[10px] flex items-center gap-1 text-gray-500">
                  <User className="w-3 h-3" />
                </span>
              )}

              {(task.subtaskCount ?? 0) > 0 && (
                <span className="text-[10px] text-gray-500">
                  {task.completedSubtaskCount ?? 0}/{task.subtaskCount} subtasks
                </span>
              )}

              {(task.projectCount ?? 0) > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] flex items-center gap-0.5 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                        <Layers className="w-3 h-3" />
                        {task.projectCount}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>In {task.projectCount} projects</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
