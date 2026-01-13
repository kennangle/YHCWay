import { DndContext, DragEndEvent, DragOverlay, closestCorners } from "@dnd-kit/core";
import { useState } from "react";
import { BoardColumn } from "./BoardColumn";
import { TaskCard } from "./TaskCard";
import { useBoardSensors } from "@/features/tasks/dnd/sensors";
import { computePlacement, findInsertIndex } from "@/features/tasks/dnd/placement";
import { useMovePlacement, useCreateTask, useToggleTaskCompletion } from "@/features/tasks/hooks";
import type { ProjectColumn, TaskLite } from "../types";

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
  const [activeTask, setActiveTask] = useState<TaskLite | null>(null);

  const handleDragStart = (event: { active: { id: string | number; data: { current?: { task?: TaskLite } } } }) => {
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const taskId = parseInt(activeId.replace("task-", ""));
    let toColumnId: number | null = null;
    let overTaskId: number | null = null;

    if (overId.startsWith("column-")) {
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

  const handleCreateTask = (columnId: number, title: string) => {
    createTask.mutate({ columnId, title, priority: "medium" });
  };

  const handleToggleComplete = (taskId: number, completed: boolean) => {
    toggleCompletion.mutate({ taskId, completed });
  };

  const sortedColumns = [...columns].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
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
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-72 opacity-90">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
