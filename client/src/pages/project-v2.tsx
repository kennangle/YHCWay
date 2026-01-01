import { useState, useEffect } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { ProjectBoardView } from "@/features/projects/components/ProjectBoardView";
import { TaskPane } from "@/features/tasks/components/TaskPane";
import { useProjectBoard, useProject } from "@/features/projects/hooks";
import { RefreshCw } from "lucide-react";

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

  useEffect(() => {
    const taskId = selectedTaskIdFromUrl ? parseInt(selectedTaskIdFromUrl) : null;
    setSelectedTaskId(taskId);
  }, [selectedTaskIdFromUrl]);

  const { data: boardData, isLoading: boardLoading, refetch, isRefetching } = useProjectBoard(projectId);
  const { data: project, isLoading: projectLoading } = useProject(projectId);

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
      <div className="min-h-screen bg-gray-50 flex">
        <UnifiedSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!project || !boardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <UnifiedSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <p className="text-gray-500">Project not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UnifiedSidebar />

      <main className="flex-1 md:ml-64 flex flex-col h-screen">
        <TopBar />

        <ProjectHeader
          projectName={project.name}
          projectColor={project.color}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 p-4 overflow-auto ${selectedTaskId ? "pr-0" : ""}`}>
            {viewMode === "board" && (
              <ProjectBoardView
                projectId={projectId}
                columns={boardData.columns}
                tasksByColumn={boardData.tasksByColumn}
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
            <TaskPane taskId={selectedTaskId} onClose={handleClosePane} />
          )}
        </div>
      </main>
    </div>
  );
}
