import { useState, useMemo } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { ArrowLeft, AlertTriangle, CheckCircle2, Circle, Link2, ChevronRight, ArrowRight, Users, Calendar, Flag } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Task {
  id: number;
  projectId: number;
  columnId: number | null;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  isCompleted: boolean;
  assigneeId: string | null;
}

interface Dependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: string;
}

interface Project {
  id: number;
  name: string;
}

interface DependencyNode {
  task: Task;
  dependsOn: Task[];
  blocks: Task[];
  isBottleneck: boolean;
  blockedCount: number;
}

export default function DependencyTracker() {
  const params = useParams<{ id: string }>();
  const projectId = params.id ? parseInt(params.id) : null;
  const mainContentClass = useMainContentClass();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/projects/${projectId}/tasks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: dependencies = [], isLoading: depsLoading } = useQuery<Dependency[]>({
    queryKey: ["project-dependencies", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/projects/${projectId}/dependencies`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const dependencyMap = useMemo(() => {
    const taskMap = new Map<number, Task>();
    tasks.forEach(t => taskMap.set(t.id, t));

    const nodes = new Map<number, DependencyNode>();
    
    tasks.forEach(task => {
      nodes.set(task.id, {
        task,
        dependsOn: [],
        blocks: [],
        isBottleneck: false,
        blockedCount: 0,
      });
    });

    dependencies.forEach(dep => {
      const taskNode = nodes.get(dep.taskId);
      const dependsOnTask = taskMap.get(dep.dependsOnTaskId);
      const dependsOnNode = nodes.get(dep.dependsOnTaskId);
      
      if (taskNode && dependsOnTask) {
        taskNode.dependsOn.push(dependsOnTask);
      }
      if (dependsOnNode && taskMap.get(dep.taskId)) {
        dependsOnNode.blocks.push(taskMap.get(dep.taskId)!);
        dependsOnNode.blockedCount++;
      }
    });

    nodes.forEach(node => {
      if (node.blockedCount >= 2 && !node.task.isCompleted) {
        node.isBottleneck = true;
      }
    });

    return nodes;
  }, [tasks, dependencies]);

  const bottlenecks = useMemo(() => {
    return Array.from(dependencyMap.values())
      .filter(node => node.isBottleneck)
      .sort((a, b) => b.blockedCount - a.blockedCount);
  }, [dependencyMap]);

  const blockedTasks = useMemo(() => {
    return Array.from(dependencyMap.values())
      .filter(node => 
        !node.task.isCompleted && 
        node.dependsOn.some(dep => !dep.isCompleted)
      );
  }, [dependencyMap]);

  const readyTasks = useMemo(() => {
    return Array.from(dependencyMap.values())
      .filter(node => 
        !node.task.isCompleted && 
        (node.dependsOn.length === 0 || node.dependsOn.every(dep => dep.isCompleted))
      );
  }, [dependencyMap]);

  const selectedNode = selectedTaskId ? dependencyMap.get(selectedTaskId) : null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-300";
      case "high": return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const currentProject = projects.find(p => p.id === projectId);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <UnifiedSidebar />
        <main
          className={`flex-1 flex flex-col min-h-screen ${mainContentClass}`}
          style={{
            backgroundImage: `url(${generatedBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        >
          <TopBar />
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-6">Select a Project</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                  <Link key={project.id} href={`/dependency-tracker/${project.id}`}>
                    <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer" data-testid={`project-card-${project.id}`}>
                      <CardHeader>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <UnifiedSidebar />
      <main
        className={`flex-1 flex flex-col min-h-screen ${mainContentClass}`}
        style={{
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <TopBar />
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/dependency-tracker">
                <Button variant="ghost" size="sm" data-testid="button-back-projects">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  All Projects
                </Button>
              </Link>
              <h2 className="text-2xl font-bold text-foreground">{currentProject?.name}</h2>
            </div>

            {(tasksLoading || depsLoading) ? (
              <div className="text-center py-12 text-muted-foreground">Loading dependencies...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {bottlenecks.length > 0 && (
                    <Card className="bg-red-50/90 backdrop-blur-sm border-red-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                          <AlertTriangle className="w-5 h-5" />
                          Bottlenecks ({bottlenecks.length})
                        </CardTitle>
                        <p className="text-sm text-red-600">Tasks blocking multiple others - prioritize these!</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {bottlenecks.map(node => (
                          <div
                            key={node.task.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedTaskId === node.task.id 
                                ? "bg-red-200 border-red-400" 
                                : "bg-white border-red-200 hover:bg-red-100"
                            }`}
                            onClick={() => setSelectedTaskId(node.task.id)}
                            data-testid={`bottleneck-task-${node.task.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Circle className="w-4 h-4 text-red-600" />
                                <span className="font-medium text-gray-900">{node.task.title}</span>
                              </div>
                              <Badge variant="destructive" className="text-xs">
                                Blocks {node.blockedCount} tasks
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {blockedTasks.length > 0 && (
                    <Card className="bg-amber-50/90 backdrop-blur-sm border-amber-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                          <Link2 className="w-5 h-5" />
                          Blocked Tasks ({blockedTasks.length})
                        </CardTitle>
                        <p className="text-sm text-amber-600">Tasks waiting on dependencies to complete</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {blockedTasks.map(node => (
                          <div
                            key={node.task.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedTaskId === node.task.id 
                                ? "bg-amber-200 border-amber-400" 
                                : "bg-white border-amber-200 hover:bg-amber-100"
                            }`}
                            onClick={() => setSelectedTaskId(node.task.id)}
                            data-testid={`blocked-task-${node.task.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Circle className="w-4 h-4 text-amber-600" />
                                <span className="font-medium text-gray-900">{node.task.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getPriorityColor(node.task.priority)} variant="outline">
                                  {node.task.priority}
                                </Badge>
                                <span className="text-xs text-amber-700">
                                  Waiting on {node.dependsOn.filter(d => !d.isCompleted).length} task(s)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {readyTasks.length > 0 && (
                    <Card className="bg-green-50/90 backdrop-blur-sm border-green-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                          <CheckCircle2 className="w-5 h-5" />
                          Ready to Start ({readyTasks.length})
                        </CardTitle>
                        <p className="text-sm text-green-600">Tasks with no blocking dependencies</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {readyTasks.slice(0, 10).map(node => (
                          <div
                            key={node.task.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedTaskId === node.task.id 
                                ? "bg-green-200 border-green-400" 
                                : "bg-white border-green-200 hover:bg-green-100"
                            }`}
                            onClick={() => setSelectedTaskId(node.task.id)}
                            data-testid={`ready-task-${node.task.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-gray-900">{node.task.title}</span>
                              </div>
                              <Badge className={getPriorityColor(node.task.priority)} variant="outline">
                                {node.task.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {readyTasks.length > 10 && (
                          <p className="text-sm text-green-600 text-center pt-2">
                            + {readyTasks.length - 10} more ready tasks
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {tasks.length === 0 && (
                    <Card className="bg-white/80 backdrop-blur-sm">
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No tasks found in this project. Add some tasks to see dependency tracking.
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  <Card className="bg-white/90 backdrop-blur-sm sticky top-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Task Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedNode ? (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{selectedNode.task.title}</h3>
                            {selectedNode.task.description && (
                              <p className="text-sm text-muted-foreground mt-1">{selectedNode.task.description}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className={getPriorityColor(selectedNode.task.priority)} variant="outline">
                              <Flag className="w-3 h-3 mr-1" />
                              {selectedNode.task.priority}
                            </Badge>
                            {selectedNode.task.isCompleted && (
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            )}
                            {selectedNode.isBottleneck && (
                              <Badge variant="destructive">Bottleneck</Badge>
                            )}
                          </div>

                          {selectedNode.task.dueDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              Due: {new Date(selectedNode.task.dueDate).toLocaleDateString()}
                            </div>
                          )}

                          {selectedNode.dependsOn.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1">
                                <ArrowRight className="w-4 h-4" />
                                Depends On ({selectedNode.dependsOn.length})
                              </h4>
                              <div className="space-y-1">
                                {selectedNode.dependsOn.map(dep => (
                                  <div 
                                    key={dep.id}
                                    className={`p-2 rounded text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 ${
                                      dep.isCompleted ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
                                    }`}
                                    onClick={() => setSelectedTaskId(dep.id)}
                                    data-testid={`depends-on-${dep.id}`}
                                  >
                                    {dep.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-amber-600" />
                                    )}
                                    {dep.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedNode.blocks.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1">
                                <Link2 className="w-4 h-4" />
                                Blocks ({selectedNode.blocks.length})
                              </h4>
                              <div className="space-y-1">
                                {selectedNode.blocks.map(blocked => (
                                  <div 
                                    key={blocked.id}
                                    className={`p-2 rounded text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 ${
                                      blocked.isCompleted ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-800"
                                    }`}
                                    onClick={() => setSelectedTaskId(blocked.id)}
                                    data-testid={`blocks-${blocked.id}`}
                                  >
                                    {blocked.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-gray-400" />
                                    )}
                                    {blocked.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedNode.dependsOn.length === 0 && selectedNode.blocks.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              This task has no dependencies.
                            </p>
                          )}

                          <Link href={`/projects/${projectId}`}>
                            <Button variant="outline" size="sm" className="w-full mt-4" data-testid="button-view-project">
                              View in Project Board
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          Select a task to view its dependency details
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Tasks</span>
                        <span className="font-medium">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dependencies</span>
                        <span className="font-medium">{dependencies.length}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Bottlenecks</span>
                        <span className="font-medium">{bottlenecks.length}</span>
                      </div>
                      <div className="flex justify-between text-amber-600">
                        <span>Blocked</span>
                        <span className="font-medium">{blockedTasks.length}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Ready to Start</span>
                        <span className="font-medium">{readyTasks.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
