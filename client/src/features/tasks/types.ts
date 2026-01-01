export type Task = {
  id: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  priority: string;
  projectId: number;
  columnId: number | null;
  sortOrder: number;
  subtasks?: TaskSubtask[];
  isRecurring?: boolean;
  recurrencePattern?: string | null;
  recurrenceInterval?: number;
  recurrenceEndDate?: string | null;
};

export type TaskSubtask = {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
};

export type TaskProject = {
  projectId: number;
  projectName: string;
  columnId: number | null;
  columnName: string | null;
  sortOrder: number;
};
