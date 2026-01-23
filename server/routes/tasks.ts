import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { asyncHandler, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from "../errors";
import { createTaskSchema, updateTaskSchema, createCommentSchema, addCollaboratorSchema } from "@shared/schema";
import { sendTaskAssignedNotification } from "../email";
import { updateAsanaTaskCompletion } from "../asana";
import { requireTenant } from "../tenantMiddleware";

const router = Router();

router.get("/", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId;
  const tasks = await storage.getUserTasks(userId, tenantId);
  res.json(tasks);
}));

router.get("/all", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId;
  const tasks = await storage.getAllUserTasks(userId, tenantId);
  res.json(tasks);
}));

router.get("/upcoming", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const days = parseInt(req.query.days as string) || 7;
  const tasks = await storage.getUpcomingTasks(userId, days);
  res.json(tasks);
}));

router.post("/", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId;
  
  const validatedData = createTaskSchema.parse(req.body);
  
  const task = await storage.createTask({
    ...validatedData,
    creatorId: userId,
    tenantId,
    startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
    dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    recurrenceEndDate: validatedData.recurrenceEndDate ? new Date(validatedData.recurrenceEndDate) : undefined,
  });
  
  if (validatedData.projectId) {
    await storage.addTaskToProject({
      tenantId: tenantId || "default",
      taskId: task.id,
      projectId: validatedData.projectId,
      columnId: validatedData.columnId ?? null,
      sortOrder: 0,
      addedBy: userId,
    });
  }
  
  res.status(201).json(task);
}));

router.get("/:id", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const task = await storage.getTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  const subtasks = await storage.getTaskSubtasks(taskId);
  const comments = await storage.getTaskComments(taskId);
  
  res.json({ ...task, subtasks, comments });
}));

router.patch("/:id", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const taskId = parseInt(req.params.id);
  const validatedData = updateTaskSchema.parse(req.body);
  
  const originalTask = await storage.getTask(taskId);
  
  const updateData: any = { ...validatedData };
  if (validatedData.dueDate !== undefined) {
    updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
  }
  if (validatedData.recurrenceEndDate !== undefined) {
    updateData.recurrenceEndDate = validatedData.recurrenceEndDate ? new Date(validatedData.recurrenceEndDate) : null;
  }
  
  const task = await storage.updateTask(taskId, updateData);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  if (validatedData.assigneeId && 
      validatedData.assigneeId !== originalTask?.assigneeId &&
      validatedData.assigneeId !== userId) {
    const assignee = await storage.getUser(validatedData.assigneeId);
    const prefs = await storage.getNotificationPreferences(validatedData.assigneeId);
    const project = task.projectId ? await storage.getProject(task.projectId) : null;
    const projectName = project?.name || 'No Project';
    const assignerName = req.user.firstName || req.user.email?.split('@')[0] || 'Someone';
    
    storage.createUserNotification({
      tenantId: req.tenantId || null,
      userId: validatedData.assigneeId,
      type: 'task.assigned',
      title: `New task assigned: ${task.title}`,
      body: `${assignerName} assigned you to "${task.title}"${projectName !== 'No Project' ? ` in ${projectName}` : ''}`,
      resourceType: 'task',
      resourceId: String(task.id),
      actorId: userId,
      metadata: { taskId: task.id, projectId: task.projectId, projectName },
    }).catch(err => console.error("Failed to create task notification:", err));
    
    if (assignee?.email && (prefs?.emailTaskAssigned !== false)) {
      const baseUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000';
      const taskUrl = `${baseUrl}/projects/${task.projectId}`;
      
      sendTaskAssignedNotification(
        assignee.email,
        task.title,
        projectName,
        assignerName,
        taskUrl,
        task.dueDate?.toLocaleDateString(),
        task.priority || undefined
      ).then(sent => {
        if (sent) {
          storage.logNotification({
            userId: validatedData.assigneeId!,
            type: 'task_assigned',
            title: `New task: ${task.title}`,
            message: `You were assigned to "${task.title}" by ${assignerName}`,
            metadata: { taskId: task.id, projectId: task.projectId },
            sentVia: 'email'
          });
        }
      });
    }
  }
  
  res.json(task);
}));

router.post("/:id/move", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const { columnId, sortOrder } = req.body;
  const task = await storage.moveTask(taskId, columnId, sortOrder);
  if (!task) {
    throw new NotFoundError("Task");
  }
  res.json(task);
}));

router.patch("/:id/complete", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const { completed } = req.body;
  
  if (typeof completed !== 'boolean') {
    throw new ValidationError("completed must be a boolean");
  }
  
  const task = await storage.getTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  const updatedTask = await storage.updateTask(taskId, {
    isCompleted: completed,
    completedAt: completed ? new Date() : null,
  });
  
  let asanaSynced = false;
  let asanaError: string | null = null;
  
  if (task.asanaTaskId) {
    try {
      asanaSynced = await updateAsanaTaskCompletion(task.asanaTaskId, completed);
      if (!asanaSynced) {
        asanaError = "Failed to sync with Asana";
      }
    } catch (error: any) {
      console.error("Error syncing task completion to Asana:", error);
      asanaError = error.message || "Failed to sync with Asana";
    }
  }
  
  res.json({
    task: updatedTask,
    asanaSynced,
    asanaError,
  });
}));

router.delete("/:id", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  await storage.deleteTask(taskId);
  res.status(204).send();
}));

router.post("/:id/archive", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const task = await storage.archiveTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  res.json(task);
}));

router.post("/:id/unarchive", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const task = await storage.unarchiveTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  res.json(task);
}));

router.patch("/:id/placement", requireTenant, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id || req.user?.claims?.sub;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.id);

  const { projectId, columnId, sortOrder, orderKey } = req.body ?? {};
  if (!projectId) {
    throw new ValidationError("projectId is required");
  }

  try {
    await storage.updateTaskPlacement({
      tenantId,
      taskId,
      projectId: Number(projectId),
      columnId: columnId === null || columnId === undefined ? null : Number(columnId),
      sortOrder: sortOrder === undefined ? undefined : Number(sortOrder),
      orderKey: orderKey ?? null,
      movedBy: userId,
    });
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "TASK_NOT_IN_PROJECT") {
      throw new NotFoundError("Task placement");
    }
    throw e;
  }
}));

router.post("/:id/projects", requireTenant, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id || req.user?.claims?.sub;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.id);

  const { projectId, columnId, sortOrder } = req.body ?? {};
  if (!projectId) {
    throw new ValidationError("projectId is required");
  }

  await storage.addTaskToProject({
    tenantId,
    taskId,
    projectId: Number(projectId),
    columnId: columnId != null ? Number(columnId) : null,
    sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    addedBy: userId,
  });

  res.status(201).json({ ok: true });
}));

router.get("/:id/projects", requireTenant, asyncHandler(async (req: any, res: any) => {
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.id);

  const taskProjects = await storage.getTaskProjects(taskId, tenantId);
  res.json(taskProjects);
}));

router.delete("/:taskId/projects/:projectId", requireTenant, asyncHandler(async (req: any, res: any) => {
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.taskId);
  const projectId = parseInt(req.params.projectId);

  await storage.removeTaskFromProject({
    tenantId,
    taskId,
    projectId,
  });

  res.status(204).send();
}));

router.get("/:id/dependencies", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const dependencies = await storage.getTaskDependencies(taskId);
  res.json(dependencies);
}));

router.get("/:id/dependents", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const dependents = await storage.getTaskDependents(taskId);
  res.json(dependents);
}));

router.post("/:id/dependencies", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const { dependsOnTaskId, dependencyType } = req.body;

  if (!dependsOnTaskId) {
    throw new ValidationError("dependsOnTaskId is required");
  }

  if (taskId === dependsOnTaskId) {
    throw new ValidationError("A task cannot depend on itself");
  }

  const task = await storage.getTask(taskId);
  const dependsOnTask = await storage.getTask(dependsOnTaskId);
  if (!task || !dependsOnTask) {
    throw new NotFoundError("Task");
  }

  const visitedSet = new Set<number>();
  const checkCycle = async (currentTaskId: number): Promise<boolean> => {
    if (currentTaskId === taskId) return true;
    if (visitedSet.has(currentTaskId)) return false;
    visitedSet.add(currentTaskId);
    
    const deps = await storage.getTaskDependencies(currentTaskId);
    for (const dep of deps) {
      if (await checkCycle(dep.dependsOnTaskId)) return true;
    }
    return false;
  };
  
  if (await checkCycle(dependsOnTaskId)) {
    throw new ValidationError("This would create a circular dependency");
  }

  const result = await storage.addTaskDependency(taskId, dependsOnTaskId, dependencyType);
  res.status(201).json(result);
}));

router.delete("/:taskId/dependencies/:depId", asyncHandler(async (req: any, res: any) => {
  const depId = parseInt(req.params.depId);
  await storage.removeTaskDependency(depId);
  res.status(204).send();
}));

router.get("/:id/stories", requireTenant, asyncHandler(async (req: any, res: any) => {
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.id);

  const rawStories = await storage.getTaskStories(taskId, tenantId);
  
  const storiesWithCreator = await Promise.all(
    rawStories.map(async (story) => {
      let creator = null;
      if (story.authorId) {
        const user = await storage.getUser(story.authorId);
        creator = user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null;
      }
      return {
        id: story.id,
        taskId,
        storyType: story.storyType,
        content: story.body || "",
        activityType: story.activityType,
        metadata: story.activityPayload,
        createdBy: story.authorId,
        createdAt: story.createdAt,
        creator,
      };
    })
  );
  
  res.json(storiesWithCreator);
}));

router.post("/:id/comments", requireTenant, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id || req.user?.claims?.sub;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId as string;
  const taskId = parseInt(req.params.id);
  const { content, body } = req.body ?? {};
  const commentBody = content || body;
  
  if (!commentBody) {
    throw new ValidationError("Comment content is required");
  }

  const created = await storage.createTaskStoryComment({
    tenantId,
    taskId,
    authorId: userId,
    body: String(commentBody),
  });

  res.status(201).json(created);
}));

router.get("/:id/subtasks", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const subtasks = await storage.getTaskSubtasks(taskId);
  res.json(subtasks);
}));

router.get("/:id/comments", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const comments = await storage.getTaskComments(taskId);
  res.json(comments);
}));

async function canAccessTask(userId: string, task: any, tenantId: string | undefined, storageRef: any): Promise<boolean> {
  if (!task) return false;
  if (tenantId && task.tenantId && task.tenantId !== tenantId) return false;
  if (task.creatorId === userId || task.assigneeId === userId) return true;
  const collaborators = await storageRef.getTaskCollaborators(task.id);
  return collaborators.some((c: any) => c.userId === userId);
}

router.get("/:id/collaborators", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const taskId = parseInt(req.params.id);
  const tenantId = req.tenantId;
  
  const task = await storage.getTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  if (tenantId && task.tenantId && task.tenantId !== tenantId) {
    throw new NotFoundError("Task");
  }
  
  const hasAccess = await canAccessTask(userId, task, tenantId, storage);
  if (!hasAccess) {
    throw new ForbiddenError("Not authorized to view this task");
  }
  
  const collaborators = await storage.getTaskCollaborators(taskId);
  res.json(collaborators);
}));

router.post("/:id/collaborators", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const taskId = parseInt(req.params.id);
  const tenantId = req.tenantId;
  
  const validatedData = addCollaboratorSchema.parse({ ...req.body, taskId });
  
  const task = await storage.getTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  if (tenantId && task.tenantId && task.tenantId !== tenantId) {
    throw new NotFoundError("Task");
  }
  
  if (task.creatorId !== userId && task.assigneeId !== userId) {
    throw new ForbiddenError("Only task creator or assignee can add collaborators");
  }
  
  const collaborator = await storage.addTaskCollaborator(taskId, validatedData.userId, userId, validatedData.role);
  res.status(201).json(collaborator);
}));

router.delete("/:taskId/collaborators/:userId", asyncHandler(async (req: any, res: any) => {
  const requesterId = req.user?.claims?.sub || req.user?.id;
  if (!requesterId) {
    throw new UnauthorizedError();
  }
  const taskId = parseInt(req.params.taskId);
  const targetUserId = req.params.userId;
  const tenantId = req.tenantId;
  
  const task = await storage.getTask(taskId);
  if (!task) {
    throw new NotFoundError("Task");
  }
  
  if (tenantId && task.tenantId && task.tenantId !== tenantId) {
    throw new NotFoundError("Task");
  }
  
  if (targetUserId !== requesterId && task.creatorId !== requesterId && task.assigneeId !== requesterId) {
    throw new ForbiddenError("Not authorized to remove this collaborator");
  }
  
  await storage.removeTaskCollaborator(taskId, targetUserId);
  res.status(204).send();
}));

router.get("/:id/time-entries", asyncHandler(async (req: any, res: any) => {
  const taskId = parseInt(req.params.id);
  const entries = await storage.getTaskTimeEntries(taskId);
  res.json(entries);
}));

export default router;
