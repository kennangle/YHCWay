import { useState } from "react";
import { X, CheckCircle2, Circle, Calendar, User, Flag, FolderOpen, Repeat, ChevronDown, Users, Plus, Trash2 } from "lucide-react";
import { useTask, useTaskProjects, useUpdateTask, useTaskCollaborators, useAddTaskCollaborator, useRemoveTaskCollaborator } from "../hooks";
import { StoriesFeed } from "./StoriesFeed";
import { CommentComposer } from "./CommentComposer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

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

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface Collaborator {
  id: number;
  taskId: number;
  userId: string;
  role: string;
  addedAt: string;
  user: User;
}

export function TaskPane({ taskId, onClose }: TaskPaneProps) {
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  const { data: task, isLoading } = useTask(taskId);
  const { data: taskProjects = [] } = useTaskProjects(taskId);
  const { data: collaborators = [] } = useTaskCollaborators(taskId) as { data: Collaborator[] };
  const updateTask = useUpdateTask();
  const addCollaborator = useAddTaskCollaborator();
  const removeCollaborator = useRemoveTaskCollaborator();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const handleAddCollaborator = () => {
    if (selectedUserId && taskId) {
      addCollaborator.mutate({ taskId, collaboratorId: selectedUserId });
      setSelectedUserId("");
      setShowAddCollaborator(false);
    }
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (taskId) {
      removeCollaborator.mutate({ taskId, userId });
    }
  };

  const availableUsers = users.filter(
    (u) => !collaborators.some((c) => c.userId === u.id) && u.id !== task?.assigneeId
  );

  const handleToggleComplete = () => {
    if (task) {
      updateTask.mutate({ taskId, data: { isCompleted: !task.isCompleted } });
    }
  };

  if (isLoading) {
    return (
      <div className="w-[320px] min-w-[280px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
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
      <div className="w-[320px] min-w-[280px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full items-center justify-center">
        <p className="text-gray-500">Task not found</p>
        <Button variant="ghost" onClick={onClose} className="mt-2">
          Close
        </Button>
      </div>
    );
  }

  const priorityInfo = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;

  return (
    <div className="w-[320px] min-w-[280px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                <Users className="w-3 h-3" />
                Shared with ({collaborators.length})
              </p>
              <Popover open={showAddCollaborator} onOpenChange={setShowAddCollaborator}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid="button-add-collaborator">
                    <Plus className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Share with team member</p>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger data-testid="select-collaborator">
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">No more team members available</div>
                        ) : (
                          availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id} data-testid={`collaborator-option-${user.id}`}>
                              {user.firstName || user.email.split('@')[0]} {user.lastName || ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAddCollaborator} 
                      disabled={!selectedUserId || addCollaborator.isPending}
                      className="w-full"
                      size="sm"
                      data-testid="button-confirm-add-collaborator"
                    >
                      {addCollaborator.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {collaborators.length > 0 ? (
              <div className="space-y-1">
                {collaborators.map((collab) => (
                  <div 
                    key={collab.id} 
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 text-sm"
                    data-testid={`collaborator-${collab.userId}`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{collab.user.firstName || collab.user.email.split('@')[0]} {collab.user.lastName || ''}</span>
                      <span className="text-xs text-gray-400 capitalize">({collab.role})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveCollaborator(collab.userId)}
                      data-testid={`button-remove-collaborator-${collab.userId}`}
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2">Not shared with anyone yet</p>
            )}
          </div>

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
