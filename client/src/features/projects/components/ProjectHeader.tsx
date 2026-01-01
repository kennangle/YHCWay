import { ArrowLeft, LayoutGrid, List, Users, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectHeaderProps {
  projectName: string;
  projectColor: string;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
  onRefresh: () => void;
  isRefetching?: boolean;
}

export function ProjectHeader({
  projectName,
  projectColor,
  viewMode,
  onViewModeChange,
  onRefresh,
  isRefetching,
}: ProjectHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
      <Link href="/projects">
        <Button variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Projects
        </Button>
      </Link>

      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: projectColor }}
      />

      <h1 className="text-xl font-semibold text-gray-900 flex-1">{projectName}</h1>

      <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as "board" | "list")}>
        <TabsList>
          <TabsTrigger value="board" className="gap-2" data-testid="tab-board">
            <LayoutGrid className="w-4 h-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2" data-testid="tab-list">
            <List className="w-4 h-4" />
            List
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button variant="outline" size="sm" data-testid="button-share">
        <Users className="w-4 h-4 mr-2" />
        Share
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isRefetching}
        data-testid="button-refresh"
      >
        <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
