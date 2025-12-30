import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Mail,
  Calendar,
  FolderKanban,
  MessageSquare,
  Settings,
  Users,
  PenTool,
  Gift,
  Plus,
  Search,
  FileText,
  Keyboard,
} from "lucide-react";
import { getShortcutsList } from "@/hooks/useKeyboardShortcuts";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Project {
  id: number;
  name: string;
}

interface TaskTemplate {
  id: number;
  name: string;
  description: string | null;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const res = await fetch("/api/task-templates", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; projectId?: number; templateId?: number }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          projectId: data.projectId || null,
          priority: "medium",
          templateId: data.templateId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setShowShortcuts(false);
    }
  }, [open]);

  const handleSelect = (action: string) => {
    if (action.startsWith("navigate:")) {
      navigate(action.replace("navigate:", ""));
      onOpenChange(false);
    } else if (action.startsWith("create-task:")) {
      const projectId = parseInt(action.replace("create-task:", ""));
      createTaskMutation.mutate({ title: search || "New Task", projectId: isNaN(projectId) ? undefined : projectId });
    } else if (action.startsWith("template:")) {
      const templateId = parseInt(action.replace("template:", ""));
      createTaskMutation.mutate({ title: search || "New Task", templateId });
    } else if (action === "show-shortcuts") {
      setShowShortcuts(true);
    } else if (action === "back") {
      setShowShortcuts(false);
    }
  };

  const shortcuts = getShortcutsList();

  if (showShortcuts) {
    return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Keyboard shortcuts..." value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>No shortcuts found.</CommandEmpty>
          <CommandGroup heading="Navigation Shortcuts">
            {shortcuts.map((shortcut, i) => (
              <CommandItem key={i} onSelect={() => handleSelect("back")} className="flex justify-between">
                <span>{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, j) => (
                    <kbd key={j} className="px-2 py-1 text-xs font-mono bg-muted rounded">
                      {key}
                    </kbd>
                  ))}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect("navigate:/")}>
            <Home className="mr-2 h-4 w-4" />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/inbox")}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Go to Inbox</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/calendar")}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Go to Calendar</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Go to Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/chat")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Go to Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Go to Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/intro-offers")}>
            <Gift className="mr-2 h-4 w-4" />
            <span>Go to Mindbody Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/email-builder")}>
            <PenTool className="mr-2 h-4 w-4" />
            <span>Go to Email Builder</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("navigate:/admin")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Go to Admin</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect("create-task:")}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Task{search ? `: "${search}"` : ""}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("show-shortcuts")}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>View Keyboard Shortcuts</span>
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Create Task in Project">
              {projects.slice(0, 5).map((project) => (
                <CommandItem key={project.id} onSelect={() => handleSelect(`create-task:${project.id}`)}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  <span>New task in {project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {templates.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Create from Template">
              {templates.slice(0, 5).map((template) => (
                <CommandItem key={template.id} onSelect={() => handleSelect(`template:${template.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{template.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
