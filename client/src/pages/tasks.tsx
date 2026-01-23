import { useState, useRef } from "react";
import { ListTodo, Plus, RefreshCw, Calendar, Flag, CheckCircle2, Circle, Clock, Filter, ChevronDown, ChevronRight, FolderKanban, MoreHorizontal, ArrowRight, Link2, Download, Upload, ArrowUpDown } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: number;
  projectId: number;
  columnId: number | null;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  creatorId: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  labels: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
  color: string;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

type FilterType = "all" | "today" | "upcoming" | "overdue" | "completed";
type GroupByType = "project" | "priority";

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupBy, setGroupBy] = useState<GroupByType>("project");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedPriorities, setExpandedPriorities] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "" });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [], isLoading: tasksLoading, isFetching, refetch } = useQuery<Task[]>({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/all", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number; isCompleted: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isCompleted }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof newTask & { projectId: number }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate || undefined,
          assigneeId: data.assigneeId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      setCreateDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "" });
      setSelectedProjectId(null);
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: number; projectId: number }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      const project = projects.find(p => p.id === projectId);
      toast({ title: "Task moved", description: `Moved to ${project?.name || "project"}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to move task", variant: "destructive" });
    },
  });

  const linkTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: number; projectId: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to link task");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      const project = projects.find(p => p.id === projectId);
      toast({ title: "Task linked", description: `Also added to ${project?.name || "project"}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to link task", variant: "destructive" });
    },
  });

  const filterTasks = (taskList: Task[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case "today":
        return taskList.filter(t => {
          if (!t.dueDate || t.isCompleted) return false;
          const due = new Date(t.dueDate);
          return due >= today && due < tomorrow;
        });
      case "upcoming":
        return taskList.filter(t => {
          if (!t.dueDate || t.isCompleted) return false;
          const due = new Date(t.dueDate);
          return due >= today && due < nextWeek;
        });
      case "overdue":
        return taskList.filter(t => {
          if (!t.dueDate || t.isCompleted) return false;
          const due = new Date(t.dueDate);
          return due < today;
        });
      case "completed":
        return taskList.filter(t => t.isCompleted);
      default:
        return taskList.filter(t => !t.isCompleted);
    }
  };

  const filteredTasks = filterTasks(tasks);

  const tasksByProject = filteredTasks.reduce((acc, task) => {
    const projectId = task.projectId;
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  const priorityOrder = ["high", "medium", "low"];
  const priorityLabels: Record<string, string> = {
    high: "High Priority",
    medium: "Medium Priority", 
    low: "Low Priority"
  };
  const priorityColors: Record<string, string> = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#22c55e"
  };

  const tasksByPriority = filteredTasks.reduce((acc, task) => {
    const priority = task.priority || "medium";
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const togglePriority = (priority: string) => {
    setExpandedPriorities(prev => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  };

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50";
      case "high": return "text-orange-600 bg-orange-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Overdue`, className: "text-red-600 bg-red-50" };
    if (diffDays === 0) return { text: "Today", className: "text-orange-600 bg-orange-50" };
    if (diffDays === 1) return { text: "Tomorrow", className: "text-yellow-600 bg-yellow-50" };
    if (diffDays <= 7) return { text: format(date, "EEE"), className: "text-blue-600 bg-blue-50" };
    return { text: format(date, "MMM d"), className: "text-gray-600 bg-gray-50" };
  };

  const handleCreateTask = () => {
    if (newTask.title.trim() && selectedProjectId) {
      createTaskMutation.mutate({ ...newTask, projectId: selectedProjectId });
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch("/api/tasks/export/csv", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to export tasks");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Tasks exported", description: "Your tasks have been downloaded as a CSV file." });
    } catch (error) {
      toast({ title: "Export failed", description: "Failed to export tasks.", variant: "destructive" });
    }
  };

  const handleUploadCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error("CSV file is empty or has no data rows");
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });
      
      const res = await fetch("/api/tasks/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows }),
      });
      
      if (!res.ok) throw new Error("Failed to import tasks");
      const result = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      toast({ 
        title: "Tasks imported", 
        description: `Updated ${result.updated} tasks, created ${result.created} new tasks.${result.errors?.length ? ` ${result.errors.length} errors.` : ''}` 
      });
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message || "Failed to import tasks.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isLoading = tasksLoading;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 relative z-10">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListTodo className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl md:text-3xl">Tasks</h1>
                <p className="text-muted-foreground text-sm md:text-base">All your tasks across projects</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleUploadCSV}
                className="hidden"
                data-testid="input-upload-csv"
              />
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200"
                title="Download tasks as spreadsheet"
                data-testid="button-download-csv"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
                title="Upload modified spreadsheet"
                data-testid="button-upload-csv"
              >
                <Upload className={`w-4 h-4 ${isUploading ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
                data-testid="button-refresh-tasks"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                disabled={projects.length === 0}
                className="flex items-center gap-2"
                data-testid="button-create-task"
              >
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            </div>
          </header>

          <div className="flex gap-2 mb-6 flex-wrap items-center">
            {[
              { id: "all", label: "Active", icon: Circle },
              { id: "today", label: "Today", icon: Clock },
              { id: "upcoming", label: "Upcoming", icon: Calendar },
              { id: "overdue", label: "Overdue", icon: Flag },
              { id: "completed", label: "Completed", icon: CheckCircle2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id as FilterType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  filter === id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                }`}
                data-testid={`filter-${id}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            
            <div className="ml-auto">
              <button
                onClick={() => setGroupBy(groupBy === "project" ? "priority" : "project")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  groupBy === "priority"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                }`}
                data-testid="toggle-group-by"
              >
                <ArrowUpDown className="w-4 h-4" />
                {groupBy === "priority" ? "By Priority" : "By Project"}
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
              </h2>
              {isFetching && !isLoading && (
                <span className="text-sm text-muted-foreground">Refreshing...</span>
              )}
            </div>

            {isLoading ? (
              <div className="text-center text-muted-foreground py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p>Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">
                  {filter === "all" ? "No active tasks" : `No ${filter} tasks`}
                </p>
                {projects.length === 0 ? (
                  <Link href="/projects">
                    <Button variant="outline" className="mt-4">
                      <FolderKanban className="w-4 h-4 mr-2" />
                      Create a Project First
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                )}
              </div>
            ) : groupBy === "project" ? (
              <div className="space-y-4">
                {Object.entries(tasksByProject).map(([projectIdStr, projectTasks]) => {
                  const projectId = parseInt(projectIdStr);
                  const project = projects.find(p => p.id === projectId);
                  const isExpanded = expandedProjects.has(projectId) || expandedProjects.size === 0;

                  return (
                    <div key={projectId} className="border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleProject(projectId)}
                        className="w-full flex items-center gap-3 p-4 bg-white/50 hover:bg-white/80 transition-colors"
                        data-testid={`project-header-${projectId}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project?.color || "#3b82f6" }}
                        />
                        <span className="font-medium">{project?.name || "Unknown Project"}</span>
                        <span className="text-sm text-muted-foreground">({projectTasks.length})</span>
                      </button>

                      {(isExpanded || expandedProjects.size === 0) && (
                        <div className="divide-y">
                          {projectTasks.map(task => {
                            const dueInfo = formatDueDate(task.dueDate);
                            return (
                              <div
                                key={task.id}
                                className="flex items-start gap-4 p-4 hover:bg-white/50 transition-colors"
                                data-testid={`task-item-${task.id}`}
                              >
                                <button
                                  onClick={() => toggleTaskMutation.mutate({ taskId: task.id, isCompleted: !task.isCompleted })}
                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                                    task.isCompleted
                                      ? "bg-green-500 border-green-500"
                                      : "border-gray-300 hover:border-primary"
                                  }`}
                                  data-testid={`toggle-task-${task.id}`}
                                >
                                  {task.isCompleted && (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                    {dueInfo && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${dueInfo.className}`}>
                                        {dueInfo.text}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Link href={`/projects/${task.projectId}`}>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                                      View
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`task-menu-${task.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <ArrowRight className="mr-2 h-4 w-4" />
                                          Move to project
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent>
                                            {projects.filter(p => p.id !== task.projectId).map(p => (
                                              <DropdownMenuItem
                                                key={p.id}
                                                onClick={() => moveTaskMutation.mutate({ taskId: task.id, projectId: p.id })}
                                                data-testid={`move-task-${task.id}-to-${p.id}`}
                                              >
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                                {p.name}
                                              </DropdownMenuItem>
                                            ))}
                                            {projects.filter(p => p.id !== task.projectId).length === 0 && (
                                              <DropdownMenuItem disabled>No other projects</DropdownMenuItem>
                                            )}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <Link2 className="mr-2 h-4 w-4" />
                                          Add to project
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent>
                                            {projects.filter(p => p.id !== task.projectId).map(p => (
                                              <DropdownMenuItem
                                                key={p.id}
                                                onClick={() => linkTaskMutation.mutate({ taskId: task.id, projectId: p.id })}
                                                data-testid={`link-task-${task.id}-to-${p.id}`}
                                              >
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                                {p.name}
                                              </DropdownMenuItem>
                                            ))}
                                            {projects.filter(p => p.id !== task.projectId).length === 0 && (
                                              <DropdownMenuItem disabled>No other projects</DropdownMenuItem>
                                            )}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {priorityOrder.map(priority => {
                  const priorityTasks = tasksByPriority[priority] || [];
                  if (priorityTasks.length === 0) return null;
                  const isExpanded = expandedPriorities.has(priority);

                  return (
                    <div key={priority} className="border rounded-xl overflow-hidden">
                      <button
                        onClick={() => togglePriority(priority)}
                        className="w-full flex items-center gap-3 p-4 bg-white/50 hover:bg-white/80 transition-colors"
                        data-testid={`priority-header-${priority}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: priorityColors[priority] }}
                        />
                        <span className="font-medium">{priorityLabels[priority]}</span>
                        <span className="text-sm text-muted-foreground">({priorityTasks.length})</span>
                      </button>

                      {isExpanded && (
                        <div className="divide-y">
                          {priorityTasks.map(task => {
                            const dueInfo = formatDueDate(task.dueDate);
                            const project = projects.find(p => p.id === task.projectId);
                            return (
                              <div
                                key={task.id}
                                className="flex items-start gap-4 p-4 hover:bg-white/50 transition-colors"
                                data-testid={`task-item-${task.id}`}
                              >
                                <button
                                  onClick={() => toggleTaskMutation.mutate({ taskId: task.id, isCompleted: !task.isCompleted })}
                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                                    task.isCompleted
                                      ? "bg-green-500 border-green-500"
                                      : "border-gray-300 hover:border-primary"
                                  }`}
                                  data-testid={`toggle-task-${task.id}`}
                                >
                                  {task.isCompleted && (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {project && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 border flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                                        {project.name}
                                      </span>
                                    )}
                                    {dueInfo && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${dueInfo.className}`}>
                                        {dueInfo.text}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Link href={`/projects/${task.projectId}`}>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                                      View
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`task-menu-${task.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <ArrowRight className="mr-2 h-4 w-4" />
                                          Move to project
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent>
                                            {projects.filter(p => p.id !== task.projectId).map(p => (
                                              <DropdownMenuItem
                                                key={p.id}
                                                onClick={() => moveTaskMutation.mutate({ taskId: task.id, projectId: p.id })}
                                                data-testid={`move-task-${task.id}-to-${p.id}`}
                                              >
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                                {p.name}
                                              </DropdownMenuItem>
                                            ))}
                                            {projects.filter(p => p.id !== task.projectId).length === 0 && (
                                              <DropdownMenuItem disabled>No other projects</DropdownMenuItem>
                                            )}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <Link2 className="mr-2 h-4 w-4" />
                                          Add to project
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent>
                                            {projects.filter(p => p.id !== task.projectId).map(p => (
                                              <DropdownMenuItem
                                                key={p.id}
                                                onClick={() => linkTaskMutation.mutate({ taskId: task.id, projectId: p.id })}
                                                data-testid={`link-task-${task.id}-to-${p.id}`}
                                              >
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                                {p.name}
                                              </DropdownMenuItem>
                                            ))}
                                            {projects.filter(p => p.id !== task.projectId).length === 0 && (
                                              <DropdownMenuItem disabled>No other projects</DropdownMenuItem>
                                            )}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to your project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="task-project">Project</Label>
              <Select value={selectedProjectId?.toString() || ""} onValueChange={(v) => setSelectedProjectId(parseInt(v))}>
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-title">Task Title</Label>
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
            <div>
              <Label htmlFor="task-assignee">Assignee (optional)</Label>
              <Select value={newTask.assigneeId || "unassigned"} onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v === "unassigned" ? "" : v })}>
                <SelectTrigger data-testid="select-assignee">
                  <SelectValue placeholder="Assign to someone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName || user.lastName 
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger data-testid="select-priority">
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
                <Label htmlFor="task-due-date">Due Date (optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTask.title.trim() || !selectedProjectId || createTaskMutation.isPending}
              data-testid="button-confirm-create-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
