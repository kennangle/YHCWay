import { useState, useCallback } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { ArrowLeft, Plus, MoreVertical, Calendar, User, Clock, Flag, MessageSquare, CheckSquare, RefreshCw, GripVertical, Trash2, Edit } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProjectColumn {
  id: number;
  projectId: number;
  name: string;
  color: string;
  sortOrder: number;
}

interface Task {
  id: number;
  projectId: number;
  columnId: number | null;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  isCompleted: boolean;
  isRecurring: boolean;
  recurrencePattern: string | null;
  sortOrder: number;
  createdAt: string;
  subtasks?: TaskSubtask[];
  comments?: TaskComment[];
}

interface TaskSubtask {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

interface TaskComment {
  id: number;
  taskId: number;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string; email: string };
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  columns: ProjectColumn[];
  tasks: Task[];
  members: any[];
  labels: any[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "Overdue", className: "text-red-600" };
    if (diffDays === 0) return { text: "Today", className: "text-orange-600" };
    if (diffDays === 1) return { text: "Tomorrow", className: "text-yellow-600" };
    return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), className: "text-muted-foreground" };
  };

  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group ${
        task.isCompleted ? "opacity-60" : ""
      }`}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-grab"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            {dueInfo && (
              <span className={`text-[10px] flex items-center gap-1 ${dueInfo.className}`}>
                <Calendar className="w-3 h-3" />
                {dueInfo.text}
              </span>
            )}
            {task.isRecurring && (
              <span className="text-[10px] flex items-center gap-1 text-purple-600">
                <Clock className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onAddTask, onTaskClick }: { 
  column: ProjectColumn; 
  tasks: Task[]; 
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", column },
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex-shrink-0 w-64 sm:w-72 bg-gray-50/80 rounded-xl p-3"
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={onAddTask}
          className="p-1 hover:bg-gray-200 rounded"
          data-testid={`button-add-task-${column.id}`}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <SortableContext items={tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ProjectBoard() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const queryClient = useQueryClient();
  
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    priority: "medium",
    dueDate: "",
  });
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: project, isLoading, refetch } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setCreateTaskDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, columnId, sortOrder }: { taskId: number; columnId: number; sortOrder: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ columnId, sortOrder }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setSelectedTask(null);
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (data: { taskId: number; title: string }) => {
      const res = await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewSubtask("");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/subtasks/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle subtask");
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { taskId: number; content: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = parseInt((active.id as string).replace("task-", ""));
    const task = project?.tasks.find(t => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over || !project) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    if (activeId === overId) return;
    
    const taskId = parseInt(activeId.replace("task-", ""));
    let targetColumnId: number | null = null;
    
    if (overId.startsWith("column-")) {
      targetColumnId = parseInt(overId.replace("column-", ""));
    } else if (overId.startsWith("task-")) {
      const overTaskId = parseInt(overId.replace("task-", ""));
      const overTask = project.tasks.find(t => t.id === overTaskId);
      targetColumnId = overTask?.columnId || null;
    }
    
    if (targetColumnId !== null) {
      const tasksInColumn = project.tasks.filter(t => t.columnId === targetColumnId);
      moveTaskMutation.mutate({
        taskId,
        columnId: targetColumnId,
        sortOrder: tasksInColumn.length,
      });
    }
  };

  const handleCreateTask = () => {
    if (newTask.title.trim() && selectedColumnId !== null) {
      createTaskMutation.mutate({
        projectId,
        columnId: selectedColumnId,
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
      });
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim() && selectedTask) {
      createSubtaskMutation.mutate({ taskId: selectedTask.id, title: newSubtask });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedTask) {
      createCommentMutation.mutate({ taskId: selectedTask.id, content: newComment });
    }
  };

  const openAddTask = (columnId: number) => {
    setSelectedColumnId(columnId);
    setCreateTaskDialogOpen(true);
  };

  const openTaskDetail = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, { credentials: "include" });
    const fullTask = await res.json();
    setSelectedTask(fullTask);
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <UnifiedSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 flex flex-col">
          <header className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="button-back-projects">
                <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Projects</span>
              </Button>
            </Link>
            <div 
              className="w-3 h-3 md:w-4 md:h-4 rounded-full" 
              style={{ backgroundColor: project.color }} 
            />
            <h1 className="font-display font-bold text-lg md:text-2xl flex-1 truncate">{project.name}</h1>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
              data-testid="button-refresh-board"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </header>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {project.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={project.tasks.filter(t => t.columnId === column.id)}
                  onAddTask={() => openAddTask(column.id)}
                  onTaskClick={openTaskDetail}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 w-72">
                  <h4 className="text-sm font-medium">{activeTask.title}</h4>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </main>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add more details..."
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  data-testid="input-task-due"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!newTask.title.trim() || createTaskMutation.isPending}
              data-testid="button-confirm-create-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateTaskMutation.mutate({
                          id: selectedTask.id,
                          data: { isCompleted: !selectedTask.isCompleted }
                        });
                        setSelectedTask({ ...selectedTask, isCompleted: !selectedTask.isCompleted });
                      }}
                      data-testid="button-toggle-complete"
                    >
                      <CheckSquare className={`w-4 h-4 mr-2 ${selectedTask.isCompleted ? 'text-green-600' : ''}`} />
                      {selectedTask.isCompleted ? 'Completed' : 'Mark Complete'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Delete this task?")) {
                          deleteTaskMutation.mutate(selectedTask.id);
                        }
                      }}
                      data-testid="button-delete-task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedTask.description || "No description"}</p>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                    <p className={`mt-1 text-sm px-2 py-1 rounded-full inline-block ${PRIORITY_COLORS[selectedTask.priority]}`}>
                      {selectedTask.priority}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p className="mt-1 text-sm">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No due date"}
                    </p>
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Subtasks ({selectedTask.subtasks?.filter(s => s.isCompleted).length || 0}/{selectedTask.subtasks?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {selectedTask.subtasks?.map((subtask) => (
                      <div 
                        key={subtask.id} 
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={() => toggleSubtaskMutation.mutate(subtask.id)}
                          className="rounded"
                          data-testid={`checkbox-subtask-${subtask.id}`}
                        />
                        <span className={subtask.isCompleted ? "line-through text-muted-foreground" : ""}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add a subtask..."
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                        data-testid="input-new-subtask"
                      />
                      <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments ({selectedTask.comments?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-3">
                    {selectedTask.comments?.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.author.firstName || comment.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                        data-testid="input-new-comment"
                      />
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
