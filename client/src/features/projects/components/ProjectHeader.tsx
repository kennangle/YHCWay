import { useState } from "react";
import { ArrowLeft, LayoutGrid, List, Users, RefreshCw, Trash2, UserPlus, X, GitBranch } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  addedAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface TenantUser {
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface ProjectHeaderProps {
  projectId: number;
  projectName: string;
  projectColor: string;
  tenantId?: string | null;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
  onRefresh: () => void;
  isRefetching?: boolean;
}

export function ProjectHeader({
  projectId,
  projectName,
  projectColor,
  tenantId,
  viewMode,
  onViewModeChange,
  onRefresh,
  isRefetching,
}: ProjectHeaderProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: projectMembers = [] } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${projectId}/members`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showShareDialog,
  });

  const { data: tenantUsers = [] } = useQuery<TenantUser[]>({
    queryKey: ["/api/tenants/users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await fetch(`/api/tenants/${tenantId}/users`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showShareDialog && !!tenantId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member added to project");
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      setSelectedUserId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member removed from project");
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const availableUsers = tenantUsers.filter(
    (tu) => !projectMembers.some((pm) => pm.userId === tu.userId)
  );

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

      <Link href={`/dependency-tracker/${projectId}`}>
        <Button variant="outline" size="sm" data-testid="button-dependencies">
          <GitBranch className="w-4 h-4 mr-2" />
          Dependencies
        </Button>
      </Link>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-share">
            <Users className="w-4 h-4 mr-2" />
            Share
            {projectMembers.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {projectMembers.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {tenantId ? (
              <>
                <div className="flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1" data-testid="select-add-member">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length > 0 ? (
                        availableUsers.map((tu) => (
                          <SelectItem key={tu.userId} value={tu.userId}>
                            {tu.user.firstName
                              ? `${tu.user.firstName} ${tu.user.lastName || ""}`.trim()
                              : tu.user.email}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          All team members added
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId)}
                    disabled={!selectedUserId || addMemberMutation.isPending}
                    data-testid="button-add-member"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>

                {projectMembers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Project Members</p>
                    {projectMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                            {(member.user.firstName?.[0] || member.user.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member.user.firstName
                                ? `${member.user.firstName} ${member.user.lastName || ""}`.trim()
                                : member.user.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          data-testid={`button-remove-project-member-${member.userId}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No team members added yet</p>
                    <p className="text-xs">Add members to collaborate on this project</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No organization yet</p>
                <p className="text-xs">Create an organization in Settings to share projects</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
