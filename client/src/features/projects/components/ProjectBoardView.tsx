import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, rectIntersection, CollisionDetection, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { TaskCard } from "./TaskCard";
import { useBoardSensors } from "@/features/tasks/dnd/sensors";
import { computePlacement, findInsertIndex } from "@/features/tasks/dnd/placement";
import { useMovePlacement, useCreateTask, useToggleTaskCompletion } from "@/features/tasks/hooks";
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from "../hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ProjectColumn, TaskLite } from "../types";

const ADD_COLUMN_COLORS = [
  { value: "#f59e0b", label: "Amber" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#ef4444", label: "Red" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
  { value: "#14b8a6", label: "Teal" },
];

const customCollisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current;
  if (activeData?.type === "column-sortable") {
    return closestCenter(args);
  }
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

interface TeamUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

interface ProjectBoardViewProps {
  projectId: number;
  columns: ProjectColumn[];
  tasksByColumn: Record<string, TaskLite[]>;
  onSelectTask: (taskId: number) => void;
  selectedTaskId: number | null;
}

export function ProjectBoardView({
  projectId,
  columns,
  tasksByColumn,
  onSelectTask,
  selectedTaskId,
}: ProjectBoardViewProps) {
  const sensors = useBoardSensors();
  const movePlacement = useMovePlacement(projectId);
  const createTask = useCreateTask(projectId);
  const toggleCompletion = useToggleTaskCompletion(projectId);
  const createColumn = useCreateColumn(projectId);
  const updateColumn = useUpdateColumn(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const reorderColumns = useReorderColumns(projectId);
  
  const [activeTask, setActiveTask] = useState<TaskLite | null>(null);
  const [activeColumn, setActiveColumn] = useState<ProjectColumn | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#6b7280");

  const { data: usersRaw = [] } = useQuery<TeamUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Deduplicate users by ID to prevent duplicate entries in dropdowns
  const users = useMemo(() => {
    const seen = new Set<string>();
    return usersRaw.filter(user => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
  }, [usersRaw]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (activeData?.type === "column-sortable" && activeData.column) {
      setActiveColumn(activeData.column);
      setActiveTask(null);
    } else if (activeData?.task) {
      setActiveTask(activeData.task);
      setActiveColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (activeColumn) {
      setActiveColumn(null);
      if (!over) return;
      
      const activeId = String(active.id);
      const overId = String(over.id);
      
      if (activeId === overId) return;
      
      const activeColId = parseInt(activeId.replace("column-sortable-", ""));
      const overColId = parseInt(overId.replace("column-sortable-", ""));
      
      const oldIndex = sortedColumns.findIndex(c => c.id === activeColId);
      const newIndex = sortedColumns.findIndex(c => c.id === overColId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedColumns, oldIndex, newIndex);
        reorderColumns.mutate(newOrder.map(c => c.id));
      }
      return;
    }

    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const taskId = parseInt(activeId.replace("task-", ""));
    let toColumnId: number | null = null;
    let overTaskId: number | null = null;

    if (overId.startsWith("column-") && !overId.startsWith("column-sortable-")) {
      toColumnId = parseInt(overId.replace("column-", ""));
    } else if (overId.startsWith("task-")) {
      overTaskId = parseInt(overId.replace("task-", ""));
      const overData = over.data.current;
      if (overData?.type === "task" && overData.task) {
        const taskPlacement = overData.task.placement;
        toColumnId = taskPlacement?.columnId ?? null;
      }
      if (toColumnId === null) {
        for (const [colKey, tasks] of Object.entries(tasksByColumn)) {
          if (tasks.some((t) => t.id === overTaskId)) {
            toColumnId = colKey === "null" ? null : parseInt(colKey);
            break;
          }
        }
      }
    }

    if (toColumnId === null) return;

    const tasksInColumn = tasksByColumn[String(toColumnId)] || [];
    const filteredTasks = tasksInColumn.filter((t) => t.id !== taskId);
    const insertIdx = findInsertIndex(filteredTasks, overTaskId);

    const placement = computePlacement(taskId, toColumnId, filteredTasks, insertIdx);

    movePlacement.mutate({
      taskId,
      projectId,
      columnId: toColumnId,
      orderKey: placement.orderKey,
      sortOrder: placement.sortOrder,
    });
  };

  const handleCreateTask = (columnId: number, title: string, options?: { priority?: string; assigneeId?: string; dueDate?: string }) => {
    createTask.mutate({ 
      columnId, 
      title, 
      priority: options?.priority || "medium",
      assigneeId: options?.assigneeId,
      dueDate: options?.dueDate,
    });
  };

  const handleToggleComplete = (taskId: number, completed: boolean) => {
    toggleCompletion.mutate({ taskId, completed });
  };

  const handleRenameColumn = (columnId: number, name: string) => {
    updateColumn.mutate({ columnId, data: { name } });
  };

  const handleDeleteColumn = (columnId: number) => {
    deleteColumn.mutate(columnId);
  };

  const handleChangeColumnColor = (columnId: number, color: string) => {
    updateColumn.mutate({ columnId, data: { color } });
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      createColumn.mutate({ name: newColumnName.trim(), color: newColumnColor });
      setNewColumnName("");
      setNewColumnColor("#6b7280");
      setIsAddingColumn(false);
    }
  };

  const sortedColumns = [...columns].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const columnSortableIds = sortedColumns.map(c => `column-sortable-${c.id}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <SortableContext items={columnSortableIds} strategy={horizontalListSortingStrategy}>
          {sortedColumns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn[String(column.id)] || []}
              projectId={projectId}
              onSelectTask={onSelectTask}
              selectedTaskId={selectedTaskId}
              onCreateTask={handleCreateTask}
              onToggleComplete={handleToggleComplete}
              users={users}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onChangeColumnColor={handleChangeColumnColor}
              isDraggable={true}
            />
          ))}
        </SortableContext>

        {isAddingColumn ? (
          <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3">
            <div className="space-y-3">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") {
                    setIsAddingColumn(false);
                    setNewColumnName("");
                  }
                }}
                className="text-sm"
                data-testid="input-new-column-name"
              />
              <div className="flex flex-wrap gap-1">
                {ADD_COLUMN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewColumnColor(color.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newColumnColor === color.value 
                        ? "border-gray-800 scale-110" 
                        : "border-transparent hover:border-gray-300"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    data-testid={`color-picker-${color.label.toLowerCase()}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                  data-testid="button-confirm-add-column"
                >
                  Add column
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName("");
                  }}
                  data-testid="button-cancel-add-column"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex-shrink-0 w-72 h-12 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors border-2 border-dashed border-gray-300"
            data-testid="button-add-column"
          >
            <Plus className="w-4 h-4" />
            Add column
          </button>
        )}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-72 opacity-90">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
        {activeColumn && (
          <div className="w-72 opacity-80 bg-gray-50 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: activeColumn.color || "#6b7280" }}
              />
              <span className="font-medium text-sm text-gray-700">{activeColumn.name}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
