export type ProjectColumn = {
  id: number;
  projectId: number;
  name: string;
  color?: string;
  sortOrder?: number;
};

export type Placement = {
  projectId: number;
  columnId: number | null;
  sortOrder: number;
  orderKey: string | null;
};

export type TaskLite = {
  id: number;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority: string;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  placement: Placement;
};

export type ProjectBoardResponse = {
  columns: ProjectColumn[];
  tasksByColumn: Record<string, TaskLite[]>;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  color: string;
};
