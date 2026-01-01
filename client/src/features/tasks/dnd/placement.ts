import { between } from "@/lib/orderKey";
import type { TaskLite } from "@/features/projects/types";

export interface DropResult {
  taskId: number;
  toColumnId: number | null;
  orderKey: string;
  sortOrder: number;
}

export function computePlacement(
  taskId: number,
  toColumnId: number | null,
  tasksInColumn: TaskLite[],
  insertAtIndex: number
): DropResult {
  const prevTask = insertAtIndex > 0 ? tasksInColumn[insertAtIndex - 1] : null;
  const nextTask = insertAtIndex < tasksInColumn.length ? tasksInColumn[insertAtIndex] : null;

  const prevKey = prevTask?.placement.orderKey ?? null;
  const nextKey = nextTask?.placement.orderKey ?? null;

  const orderKey = between(prevKey, nextKey);
  const sortOrder = insertAtIndex;

  return {
    taskId,
    toColumnId,
    orderKey,
    sortOrder,
  };
}

export function findInsertIndex(
  tasks: TaskLite[],
  overTaskId: number | null
): number {
  if (!overTaskId) return tasks.length;
  
  const idx = tasks.findIndex((t) => t.id === overTaskId);
  return idx >= 0 ? idx : tasks.length;
}
