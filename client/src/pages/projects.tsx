import { useState } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { 
  FolderKanban, Plus, MoreVertical, Calendar, Trash2, Edit, RefreshCw, 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, LayoutGrid, List,
  Search, Filter, ChevronRight, Users, ListTodo
} from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface Task {
  id: number;
  projectId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectWithStats extends Project {
  taskCount: number;
  completedCount: number;
  overdueCount: number;
  recentTasks: Task[];
}

const PROJECT_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

type ViewMode = "grid" | "list";

export default function Projects() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#3b82f6" });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects = [], isLoading: projectsLoading, isFetching, refetch } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/all", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const projectsWithStats: ProjectWithStats[] = projects.map(project => {
    const projectTasks = allTasks.filter(t => t.projectId === project.id);
    const completedCount = projectTasks.filter(t => t.isCompleted).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = projectTasks.filter(t => {
      if (t.isCompleted || !t.dueDate) return false;
      return new Date(t.dueDate) < today;
    }).length;
    const recentTasks = projectTasks
      .filter(t => !t.isCompleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
    
    return {
      ...project,
      taskCount: projectTasks.length,
      completedCount,
      overdueCount,
      recentTasks,
    };
  });

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.isCompleted).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = allTasks.filter(t => {
    if (t.isCompleted || !t.dueDate) return false;
    return new Date(t.dueDate) < today;
  }).length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const completedThisWeek = allTasks.filter(t => t.isCompleted && new Date(t.updatedAt) >= weekStart).length;

  const filteredProjects = projectsWithStats.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof newProject) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateDialogOpen(false);
      setNewProject({ name: "", description: "", color: "#3b82f6" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Project> }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingProject(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleCreateProject = () => {
    if (newProject.name.trim()) {
      createProjectMutation.mutate(newProject);
    }
  };

  const handleUpdateProject = () => {
    if (editingProject) {
      updateProjectMutation.mutate({
        id: editingProject.id,
        data: {
          name: editingProject.name,
          description: editingProject.description,
          color: editingProject.color,
        },
      });
    }
  };

  const getProgressPercent = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const isLoading = projectsLoading;

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
        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl md:text-3xl">Projects</h1>
                <p className="text-muted-foreground text-sm md:text-base">Manage your projects and track progress</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
                data-testid="button-refresh-projects"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2 flex-1 sm:flex-initial justify-center"
                data-testid="button-create-project"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedThisWeek}</p>
                  <p className="text-xs text-muted-foreground">Done This Week</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueTasks}</p>
                  <p className="text-xs text-muted-foreground">Overdue Tasks</p>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</p>
                  <p className="text-xs text-muted-foreground">Overall Progress</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/80"
                data-testid="input-search-projects"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "bg-white/80 text-muted-foreground hover:bg-white"}`}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-white/80 text-muted-foreground hover:bg-white"}`}
                data-testid="button-view-list"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">
                {searchQuery ? "No matching projects" : "No projects yet"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? "Try a different search term" : "Create your first project to start organizing tasks"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const progress = getProgressPercent(project.completedCount, project.taskCount);
                return (
                  <div
                    key={project.id}
                    className="glass-panel rounded-xl overflow-hidden hover:bg-white/80 transition-colors group"
                    data-testid={`card-project-${project.id}`}
                  >
                    <div 
                      className="h-2" 
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/projects/${project.id}`}>
                          <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                            {project.name}
                          </h3>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded" data-testid={`button-project-menu-${project.id}`}>
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingProject(project)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this project? All tasks will be deleted.")) {
                                  deleteProjectMutation.mutate(project.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{project.completedCount} of {project.taskCount} tasks</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <ListTodo className="w-3.5 h-3.5" />
                          {project.taskCount - project.completedCount} active
                        </span>
                        {project.overdueCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {project.overdueCount} overdue
                          </span>
                        )}
                      </div>

                      {project.recentTasks.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-muted-foreground mb-2">Recent tasks:</p>
                          <div className="space-y-1">
                            {project.recentTasks.map(task => (
                              <div key={task.id} className="text-xs text-foreground truncate flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                {task.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm" className="mt-4 w-full" data-testid={`button-open-project-${project.id}`}>
                          Open Board
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-4 font-medium text-sm">Project</th>
                    <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Tasks</th>
                    <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Progress</th>
                    <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">Created</th>
                    <th className="text-right p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const progress = getProgressPercent(project.completedCount, project.taskCount);
                    return (
                      <tr key={project.id} className="border-b last:border-0 hover:bg-white/50 transition-colors" data-testid={`row-project-${project.id}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                            <div>
                              <Link href={`/projects/${project.id}`}>
                                <span className="font-medium hover:text-primary cursor-pointer">{project.name}</span>
                              </Link>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{project.taskCount} total</span>
                            {project.overdueCount > 0 && (
                              <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{project.overdueCount} overdue</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10">{progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(project.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="ghost" size="sm">Open</Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    if (confirm("Delete this project and all its tasks?")) {
                                      deleteProjectMutation.mutate(project.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Enter project name"
                data-testid="input-project-name"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea
                id="project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="What is this project about?"
                data-testid="input-project-description"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newProject.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewProject({ ...newProject, color })}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || createProjectMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-project-name">Project Name</Label>
                <Input
                  id="edit-project-name"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  data-testid="input-edit-project-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-project-description">Description</Label>
                <Textarea
                  id="edit-project-description"
                  value={editingProject.description || ""}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  data-testid="input-edit-project-description"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingProject.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingProject({ ...editingProject, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdateProject}
              disabled={updateProjectMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
