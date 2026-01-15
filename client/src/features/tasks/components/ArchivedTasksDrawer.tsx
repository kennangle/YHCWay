import { useState } from "react";
import { Archive, ArchiveRestore, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArchivedTasks, useUnarchiveTask } from "../hooks";
import type { Task } from "../types";

interface ArchivedTasksDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onTaskClick?: (taskId: number) => void;
}

export function ArchivedTasksDrawer({ projectId, isOpen, onClose, onTaskClick }: ArchivedTasksDrawerProps) {
  const { data: archivedTasks = [], isLoading } = useArchivedTasks(projectId);
  const unarchiveTask = useUnarchiveTask(projectId);

  const handleUnarchive = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    unarchiveTask.mutate(taskId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Archived Tasks</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-archived">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No archived tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archivedTasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="p-3 bg-gray-50 rounded-lg flex items-center justify-between hover:bg-gray-100 cursor-pointer"
                  onClick={() => onTaskClick?.(task.id)}
                  data-testid={`archived-task-${task.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{task.title}</p>
                    {task.archivedAt && (
                      <p className="text-xs text-gray-400">
                        Archived {new Date(task.archivedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleUnarchive(task.id, e)}
                    disabled={unarchiveTask.isPending}
                    title="Restore task"
                    data-testid={`button-unarchive-${task.id}`}
                  >
                    <ArchiveRestore className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
