import { Router } from "express";
import { storage } from "../storage";
import { asyncHandler, UnauthorizedError, ValidationError, NotFoundError } from "../errors";
import { createProjectSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId;
  const projects = await storage.getUserProjects(userId, tenantId);
  
  const projectIds = projects.map(p => p.id);
  const stats = await storage.getProjectTaskStats(projectIds);
  
  const projectsWithStats = projects.map(p => ({
    ...p,
    taskCount: stats[p.id]?.total ?? 0,
    completedCount: stats[p.id]?.completed ?? 0,
  }));
  
  res.json(projectsWithStats);
}));

router.post("/", asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.claims?.sub || req.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const tenantId = req.tenantId;
  
  try {
    const validatedData = createProjectSchema.parse(req.body);
    
    const project = await storage.createProject({
      ...validatedData,
      ownerId: userId,
      tenantId,
    });
    
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map(e => e.message).join(", "));
    }
    throw error;
  }
}));

router.get("/:id", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }
  
  const columns = await storage.getProjectColumns(projectId);
  const tasks = await storage.getProjectTasks(projectId);
  const members = await storage.getProjectMembers(projectId);
  const labels = await storage.getProjectLabels(projectId);
  
  const tasksWithSubtaskCounts = await Promise.all(
    tasks.map(async (task) => {
      const subtasks = await storage.getTaskSubtasks(task.id);
      return {
        ...task,
        subtaskCount: subtasks.length,
        completedSubtaskCount: subtasks.filter(s => s.isCompleted).length,
      };
    })
  );
  
  res.json({ ...project, columns, tasks: tasksWithSubtaskCounts, members, labels });
}));

router.patch("/:id", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const project = await storage.updateProject(projectId, req.body);
  if (!project) {
    throw new NotFoundError("Project");
  }
  res.json(project);
}));

router.delete("/:id", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  await storage.deleteProject(projectId);
  res.status(204).send();
}));

router.post("/:id/columns", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const { name, color } = req.body;
  if (!name) {
    throw new ValidationError("Column name is required");
  }
  
  const column = await storage.createProjectColumn({ projectId, name, color });
  res.status(201).json(column);
}));

router.post("/:id/columns/reorder", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const { columnIds } = req.body;
  if (!columnIds || !Array.isArray(columnIds)) {
    throw new ValidationError("columnIds array is required");
  }
  
  await storage.reorderProjectColumns(projectId, columnIds);
  res.status(200).json({ success: true });
}));

router.get("/:id/members", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const members = await storage.getProjectMembers(projectId);
  res.json(members);
}));

router.post("/:id/members", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const requesterId = req.user?.claims?.sub || req.user?.id;
  const { userId, role } = req.body;
  if (!userId) {
    throw new ValidationError("userId is required");
  }
  
  const member = await storage.addProjectMember(projectId, userId, role);
  
  if (userId !== requesterId) {
    const project = await storage.getProject(projectId);
    const requesterName = req.user?.firstName || req.user?.email?.split('@')[0] || 'Someone';
    
    storage.createUserNotification({
      tenantId: req.tenantId || null,
      userId: userId,
      type: 'project.member_added',
      title: `Added to project: ${project?.name || 'Untitled'}`,
      body: `${requesterName} added you to the project "${project?.name || 'Untitled'}"`,
      resourceType: 'project',
      resourceId: String(projectId),
      actorId: requesterId,
      metadata: { projectId, projectName: project?.name, role },
    }).catch(err => console.error("Failed to create project member notification:", err));
  }
  
  res.status(201).json(member);
}));

router.delete("/:id/members/:userId", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const userId = req.params.userId;
  await storage.removeProjectMember(projectId, userId);
  res.status(204).send();
}));

router.post("/:id/labels", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const { name, color } = req.body;
  if (!name) {
    throw new ValidationError("Label name is required");
  }
  
  const label = await storage.createProjectLabel(projectId, name, color);
  res.status(201).json(label);
}));

router.get("/:projectId/dependencies", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const dependencies = await storage.getProjectDependencies(projectId);
  res.json(dependencies);
}));

router.get("/:projectId/archived-tasks", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const archivedTasks = await storage.getArchivedTasks(projectId);
  res.json(archivedTasks);
}));

router.get("/:projectId/board", asyncHandler(async (req: any, res: any) => {
  const tenantId = req.tenantId as string | null;
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }

  const columns = await storage.getProjectColumns(projectId);
  const placements = await storage.getProjectTaskPlacements(projectId, tenantId);

  const byColumn: Record<string, unknown[]> = {};
  for (const row of placements) {
    const key = row.columnId == null ? "null" : String(row.columnId);
    if (!byColumn[key]) byColumn[key] = [];
    byColumn[key].push({
      ...row.task,
      placement: {
        projectId: row.projectId,
        columnId: row.columnId,
        sortOrder: row.sortOrder,
        orderKey: row.orderKey,
      },
    });
  }

  res.json({
    columns,
    tasksByColumn: byColumn,
  });
}));

router.get("/:id/time-entries", asyncHandler(async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    throw new ValidationError("Invalid project ID");
  }
  
  const entries = await storage.getProjectTimeEntries(projectId);
  res.json(entries);
}));

export default router;
