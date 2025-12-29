import { useEffect } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { CheckSquare, RefreshCw, ExternalLink } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery } from "@tanstack/react-query";

interface AsanaTask {
  id: string;
  name: string;
  completed: boolean;
  dueOn: string | null;
  dueAt: string | null;
  assignee: { name: string; email?: string } | null;
  projectName: string | null;
  notes: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
}

export default function Tasks() {
  const { data: asanaTasks = [], isLoading, isFetching, refetch } = useQuery<AsanaTask[]>({
    queryKey: ["asana-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/asana/tasks", { credentials: "include" });
      if (!res.ok) {
        console.warn("Asana integration not available");
        return [];
      }
      return res.json();
    },
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleRefresh = () => {
    refetch();
  };

  const formatDueDate = (dueOn: string | null) => {
    if (!dueOn) return null;
    const date = new Date(dueOn);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, className: "text-red-600 bg-red-50" };
    if (diffDays === 0) return { text: "Due today", className: "text-orange-600 bg-orange-50" };
    if (diffDays === 1) return { text: "Due tomorrow", className: "text-yellow-600 bg-yellow-50" };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, className: "text-blue-600 bg-blue-50" };
    return { text: date.toLocaleDateString(), className: "text-muted-foreground bg-muted" };
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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F06A6A]/10 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-[#F06A6A]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">Tasks</h1>
              <p className="text-muted-foreground">Your Asana tasks in one place</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
            data-testid="button-refresh-tasks"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh</span>
          </button>
        </header>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">
              {asanaTasks.length} {asanaTasks.length === 1 ? 'Task' : 'Tasks'}
            </h2>
            {isFetching && !isLoading && (
              <span className="text-sm text-muted-foreground">Refreshing...</span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[#F06A6A]" />
              <p>Loading tasks...</p>
            </div>
          ) : asanaTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No tasks assigned to you</p>
              <p className="text-sm text-muted-foreground">Tasks from Asana will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {asanaTasks.map((task) => {
                const dueInfo = formatDueDate(task.dueOn);
                return (
                  <a
                    key={task.id}
                    href={task.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-xl bg-white/50 hover:bg-white/80 transition-all border border-gray-100 hover:border-gray-200 hover:shadow-sm group"
                    data-testid={`task-item-${task.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-[#F06A6A]'}`}>
                        {task.completed && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.name}
                          </p>
                          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {task.projectName && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                              {task.projectName}
                            </span>
                          )}
                          {dueInfo && (
                            <span className={`text-xs px-2 py-1 rounded-full ${dueInfo.className}`}>
                              {dueInfo.text}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
