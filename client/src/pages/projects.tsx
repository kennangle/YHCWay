import { useState } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { FolderKanban, Plus, MoreVertical, Calendar, Users, Trash2, Edit, RefreshCw } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

const PROJECT_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

export default function Projects() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#3b82f6" });

  const { data: projects = [], isLoading, isFetching, refetch } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

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

      <main className="flex-1 ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl">Projects</h1>
                <p className="text-muted-foreground">Manage your projects and tasks</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
                data-testid="button-refresh-projects"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2"
                data-testid="button-create-project"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </header>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6">Create your first project to start organizing tasks</p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-project">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
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
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm" className="mt-4 w-full" data-testid={`button-open-project-${project.id}`}>
                        Open Board
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Dialog */}
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

      {/* Edit Project Dialog */}
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
