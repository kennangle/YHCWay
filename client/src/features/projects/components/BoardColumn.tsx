import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectColumn, TaskLite } from "../types";

interface BoardColumnProps {
  column: ProjectColumn;
  tasks: TaskLite[];
  projectId: number;
  onSelectTask: (taskId: number) => void;
  selectedTaskId: number | null;
  onCreateTask: (columnId: number, title: string) => void;
  onToggleComplete?: (taskId: number, completed: boolean) => void;
}

export function BoardColumn({
  column,
  tasks,
  onSelectTask,
  selectedTaskId,
  onCreateTask,
  onToggleComplete,
}: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", column },
  });

  const sortableItems = tasks.map((t) => `task-${t.id}`);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(column.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setIsAdding(false);
    }
  };

  return (
    <div
      className={`
        flex-shrink-0 w-72 bg-gray-50 rounded-lg flex flex-col max-h-full
        ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}
      `}
    >
      <div className="p-3 flex items-center gap-2 border-b border-gray-200">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color || "#6b7280" }}
        />
        <h3 className="font-medium text-sm text-gray-700 flex-1">{column.name}</h3>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]"
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onSelectTask(task.id)}
              isSelected={selectedTaskId === task.id}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAdding && (
          <div className="text-center text-xs text-gray-400 py-4">
            No tasks
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200">
        {isAdding ? (
          <div className="space-y-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewTaskTitle("");
                }
              }}
              className="text-sm"
              data-testid={`input-new-task-${column.id}`}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setIsAdding(false);
                setNewTaskTitle("");
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-full p-2 rounded hover:bg-gray-100 transition-colors"
            data-testid={`button-add-task-${column.id}`}
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
