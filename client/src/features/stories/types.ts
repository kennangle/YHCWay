export type Story = {
  id: number;
  taskId: number;
  storyType: "comment" | "activity";
  content: string;
  activityType: string | null;
  metadata: unknown;
  createdBy: string | null;
  createdAt: string;
  creator?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  _optimistic?: boolean;
};
