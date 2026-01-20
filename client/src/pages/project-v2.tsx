import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { ProjectBoardView } from "@/features/projects/components/ProjectBoardView";
import { TaskPane } from "@/features/tasks/components/TaskPane";
import { ArchivedTasksDrawer } from "@/features/tasks/components/ArchivedTasksDrawer";
import { useProjectBoard, useProject } from "@/features/projects/hooks";
import { RefreshCw, Filter, X, Archive, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TaskLite } from "@/features/projects/types";

type FilterState = {
  assignee: string | null;
  priority: string | null;
  dueDate: "overdue" | "today" | "week" | "none" | null;
};

export default function ProjectPageV2() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const searchParams = new URLSearchParams(searchString);
  const viewMode = (searchParams.get("view") as "board" | "list") || "board";
  const selectedTaskIdFromUrl = searchParams.get("task");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(
    selectedTaskIdFromUrl ? parseInt(selectedTaskIdFromUrl) : null
  );

  const [filters, setFilters] = useState<FilterState>({
    assignee: null,
    priority: null,
    dueDate: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const taskId = selectedTaskIdFromUrl ? parseInt(selectedTaskIdFromUrl) : null;
    setSelectedTaskId(taskId);
  }, [selectedTaskIdFromUrl]);

  const { data: boardData, isLoading: boardLoading, refetch, isRefetching } = useProjectBoard(projectId);
  const { data: project, isLoading: projectLoading } = useProject(projectId);

  const allTasks = useMemo(() => {
    if (!boardData) return [];
    return Object.values(boardData.tasksByColumn).flat();
  }, [boardData]);

  const filterTask = useCallback((task: TaskLite): boolean => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.assignee && task.assigneeId !== filters.assignee) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.dueDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const taskDue = task.dueDate ? new Date(task.dueDate) : null;
      
      switch (filters.dueDate) {
        case "overdue":
          if (!taskDue || taskDue >= today) return false;
          break;
        case "today":
          if (!taskDue || taskDue.toDateString() !== today.toDateString()) return false;
          break;
        case "week": {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          if (!taskDue || taskDue > weekFromNow) return false;
          break;
        }
        case "none":
          if (taskDue) return false;
          break;
      }
    }
    return true;
  }, [filters, searchQuery]);

  const filteredTasksByColumn = useMemo(() => {
    if (!boardData) return {};
    const hasFilters = filters.assignee || filters.priority || filters.dueDate || searchQuery;
    if (!hasFilters) return boardData.tasksByColumn;
    
    const result: Record<string, TaskLite[]> = {};
    for (const [colId, tasks] of Object.entries(boardData.tasksByColumn)) {
      result[colId] = tasks.filter(filterTask);
    }
    return result;
  }, [boardData, filterTask, filters, searchQuery]);

  const activeFilterCount = [filters.assignee, filters.priority, filters.dueDate].filter(Boolean).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "Escape" && selectedTaskId) {
        handleClosePane();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateTasks(e.key);
      }

      if (e.key === "Enter" && !selectedTaskId && allTasks.length > 0) {
        const firstTask = allTasks[0];
        if (firstTask) handleSelectTask(firstTask.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId, allTasks]);

  const navigateTasks = (key: string) => {
    if (!boardData) return;
    const columns = [...boardData.columns].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    
    if (!selectedTaskId) {
      const firstCol = columns[0];
      const firstTasks = filteredTasksByColumn[String(firstCol?.id)] || [];
      if (firstTasks.length > 0) handleSelectTask(firstTasks[0].id);
      return;
    }

    let currentColIdx = -1;
    let currentTaskIdx = -1;
    
    for (let i = 0; i < columns.length; i++) {
      const colTasks = filteredTasksByColumn[String(columns[i].id)] || [];
      const taskIdx = colTasks.findIndex(t => t.id === selectedTaskId);
      if (taskIdx !== -1) {
        currentColIdx = i;
        currentTaskIdx = taskIdx;
        break;
      }
    }

    if (currentColIdx === -1) return;

    const currentColTasks = filteredTasksByColumn[String(columns[currentColIdx].id)] || [];

    if (key === "ArrowDown" && currentTaskIdx < currentColTasks.length - 1) {
      handleSelectTask(currentColTasks[currentTaskIdx + 1].id);
    } else if (key === "ArrowUp" && currentTaskIdx > 0) {
      handleSelectTask(currentColTasks[currentTaskIdx - 1].id);
    } else if (key === "ArrowRight" && currentColIdx < columns.length - 1) {
      const nextColTasks = filteredTasksByColumn[String(columns[currentColIdx + 1].id)] || [];
      if (nextColTasks.length > 0) {
        const idx = Math.min(currentTaskIdx, nextColTasks.length - 1);
        handleSelectTask(nextColTasks[idx].id);
      }
    } else if (key === "ArrowLeft" && currentColIdx > 0) {
      const prevColTasks = filteredTasksByColumn[String(columns[currentColIdx - 1].id)] || [];
      if (prevColTasks.length > 0) {
        const idx = Math.min(currentTaskIdx, prevColTasks.length - 1);
        handleSelectTask(prevColTasks[idx].id);
      }
    }
  };

  const handleSelectTask = (taskId: number) => {
    const freshParams = new URLSearchParams(window.location.search);
    freshParams.set("task", String(taskId));
    setLocation(`/projects/${projectId}?${freshParams.toString()}`);
    setSelectedTaskId(taskId);
  };

  const handleClosePane = () => {
    const freshParams = new URLSearchParams(window.location.search);
    freshParams.delete("task");
    const newSearch = freshParams.toString();
    setLocation(`/projects/${projectId}${newSearch ? `?${newSearch}` : ""}`);
    setSelectedTaskId(null);
  };

  const handleViewModeChange = (mode: "board" | "list") => {
    const freshParams = new URLSearchParams(window.location.search);
    freshParams.set("view", mode);
    setLocation(`/projects/${projectId}?${freshParams.toString()}`);
  };

  if (projectLoading || boardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || !boardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen">

        <ProjectHeader
          projectId={projectId}
          projectName={project.name}
          projectColor={project.color}
          tenantId={project.tenantId}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />

        <div className="px-4 py-2 border-b bg-white flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
              data-testid="input-search-tasks"
            />
          </div>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter">
                <Filter className="w-4 h-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Priority</label>
                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(v) => setFilters(f => ({ ...f, priority: v === "all" ? null : v }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-filter-priority">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Due Date</label>
                  <Select
                    value={filters.dueDate || "all"}
                    onValueChange={(v) => setFilters(f => ({ ...f, dueDate: v === "all" ? null : v as any }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-filter-duedate">
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="today">Due today</SelectItem>
                      <SelectItem value="week">Due this week</SelectItem>
                      <SelectItem value="none">No due date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setFilters({ assignee: null, priority: null, dueDate: null })}
                    data-testid="button-clear-filters"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {(activeFilterCount > 0 || searchQuery) && (
            <span className="text-xs text-gray-500">
              {searchQuery ? `Searching for "${searchQuery}"` : "Showing filtered results"}
            </span>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowArchivedTasks(true)}
            data-testid="button-view-archived"
          >
            <Archive className="w-4 h-4" />
            Archived
          </Button>

          <div className="ml-auto text-xs text-gray-400">
            Use arrow keys to navigate, Enter to select, Escape to close
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          <div className="flex-1 min-w-0 p-4 overflow-auto">
            {viewMode === "board" && (
              <ProjectBoardView
                projectId={projectId}
                columns={boardData.columns}
                tasksByColumn={filteredTasksByColumn}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTaskId}
              />
            )}

            {viewMode === "list" && (
              <div className="text-center py-8 text-gray-500">
                List view coming soon
              </div>
            )}
          </div>

          {selectedTaskId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div 
                className="absolute inset-0 bg-black/30"
                onClick={handleClosePane}
                data-testid="overlay-backdrop"
              />
              <div className="relative z-10 bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden">
                <TaskPane taskId={selectedTaskId} projectId={projectId} onClose={handleClosePane} />
              </div>
            </div>
          )}
        </div>

        <ArchivedTasksDrawer 
          projectId={projectId}
          isOpen={showArchivedTasks}
          onClose={() => setShowArchivedTasks(false)}
          onTaskClick={(taskId) => {
            setShowArchivedTasks(false);
            handleSelectTask(taskId);
          }}
        />
    </div>
  );
}
