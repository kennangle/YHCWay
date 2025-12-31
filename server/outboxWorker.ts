import { storage } from "./storage";

export async function runOutboxWorker(opts?: { tenantId?: string; idleMs?: number }) {
  const idleMs = opts?.idleMs ?? 300;

  console.log("[OutboxWorker] Starting outbox worker...");

  while (true) {
    const evt = await storage.claimNextOutboxEvent(opts?.tenantId);

    if (!evt) {
      await new Promise((r) => setTimeout(r, idleMs));
      continue;
    }

    try {
      await handleEvent(evt);
      await storage.markOutboxPublished(evt.id);
    } catch (e) {
      console.error("[OutboxWorker] Processing error:", e, evt);
    }
  }
}

async function handleEvent(evt: {
  id: number;
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: unknown;
}) {
  const p = evt.payload as Record<string, unknown>;

  switch (evt.eventType) {
    case "task.moved": {
      const taskId = p.taskId as number;
      const movedBy = p.movedBy as string | null;
      const columnId = p.columnId as number | null;
      const projectId = p.projectId as number;

      let columnName = "No Column";
      if (columnId) {
        try {
          const columns = await storage.getProjectColumns(projectId);
          const column = columns.find(c => c.id === columnId);
          if (column) {
            columnName = column.name;
          }
        } catch {
          columnName = `Column #${columnId}`;
        }
      }

      await storage.createTaskStoryActivity({
        tenantId: evt.tenantId,
        taskId,
        activityType: "task.moved",
        activityPayload: {
          columnId,
          columnName,
          projectId,
          movedBy,
        },
        actorId: movedBy && movedBy !== "SYSTEM_COMPAT" ? movedBy : null,
      });

      console.log(`[OutboxWorker] Created activity story for task ${taskId} moved to column ${columnName}`);
      break;
    }

    case "task.created": {
      const taskId = p.taskId as number;
      const createdBy = p.createdBy as string;

      await storage.createTaskStoryActivity({
        tenantId: evt.tenantId,
        taskId,
        activityType: "task.created",
        activityPayload: { createdBy },
        actorId: createdBy,
      });

      console.log(`[OutboxWorker] Created activity story for task ${taskId} created`);
      break;
    }

    case "task.updated": {
      const taskId = p.taskId as number;
      const updatedBy = p.updatedBy as string;
      const changes = p.changes as Record<string, unknown>;

      await storage.createTaskStoryActivity({
        tenantId: evt.tenantId,
        taskId,
        activityType: "task.updated",
        activityPayload: { updatedBy, changes },
        actorId: updatedBy,
      });

      console.log(`[OutboxWorker] Created activity story for task ${taskId} updated`);
      break;
    }

    case "task.completed": {
      const taskId = p.taskId as number;
      const completedBy = p.completedBy as string;

      await storage.createTaskStoryActivity({
        tenantId: evt.tenantId,
        taskId,
        activityType: "task.completed",
        activityPayload: { completedBy },
        actorId: completedBy,
      });

      console.log(`[OutboxWorker] Created activity story for task ${taskId} completed`);
      break;
    }

    case "task.assignee_changed": {
      const taskId = p.taskId as number;
      const changedBy = p.changedBy as string;
      const oldAssignee = p.oldAssignee as string | null;
      const newAssignee = p.newAssignee as string | null;

      await storage.createTaskStoryActivity({
        tenantId: evt.tenantId,
        taskId,
        activityType: "task.assignee_changed",
        activityPayload: { changedBy, oldAssignee, newAssignee },
        actorId: changedBy,
      });

      console.log(`[OutboxWorker] Created activity story for task ${taskId} assignee changed`);
      break;
    }

    case "story.created": {
      console.log(`[OutboxWorker] Story ${p.storyId} created for task ${p.taskId}`);
      break;
    }

    default:
      console.log(`[OutboxWorker] Unknown event type: ${evt.eventType}`);
  }
}

export function startOutboxWorkerInBackground(opts?: { tenantId?: string; idleMs?: number }) {
  runOutboxWorker(opts).catch((err) => {
    console.error("[OutboxWorker] Worker crashed:", err);
  });
}
