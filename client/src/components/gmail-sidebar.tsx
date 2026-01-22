import { useQuery } from "@tanstack/react-query";
import { 
  Inbox, Send, FileText, Mail, AlertTriangle, Trash2, 
  Archive, Tag, ChevronDown, ChevronRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface GmailLabel {
  id: string;
  name: string;
  type: "system" | "user";
  messagesTotal?: number;
  messagesUnread?: number;
  color?: {
    textColor?: string;
    backgroundColor?: string;
  };
}

type SystemFolder = "inbox" | "sent" | "trash" | null;

interface GmailSidebarProps {
  selectedLabel: string | null;
  selectedFolder: SystemFolder;
  onSelectLabel: (labelId: string | null) => void;
  onSelectFolder: (folder: SystemFolder) => void;
}

const SYSTEM_FOLDER_ORDER = ["SENT", "TRASH"];
const HIDDEN_LABELS = ["CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS", "UNREAD", "IMPORTANT", "CHAT"];

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  INBOX: Inbox,
  SENT: Send,
  DRAFT: FileText,
  STARRED: Mail,
  SPAM: AlertTriangle,
  TRASH: Trash2,
};

const FOLDER_NAMES: Record<string, string> = {
  INBOX: "Inbox",
  SENT: "Sent",
  DRAFT: "Drafts",
  STARRED: "Starred",
  SPAM: "Spam",
  TRASH: "Trash",
};

function getLabelColor(label: GmailLabel): string {
  if (label.color?.backgroundColor) {
    return label.color.backgroundColor;
  }
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", 
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"
  ];
  const hash = label.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const FOLDER_TO_FILTER: Record<string, SystemFolder> = {
  INBOX: "inbox",
  SENT: "sent",
  TRASH: "trash",
};

export function GmailSidebar({ selectedLabel, selectedFolder, onSelectLabel, onSelectFolder }: GmailSidebarProps) {
  const [labelsExpanded, setLabelsExpanded] = useState(true);
  
  const { data: labels = [], isLoading } = useQuery<GmailLabel[]>({
    queryKey: ["gmail-labels"],
    queryFn: async () => {
      const res = await fetch("/api/gmail/labels", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const systemFolders = labels
    .filter(l => l.type === "system" && SYSTEM_FOLDER_ORDER.includes(l.id))
    .sort((a, b) => SYSTEM_FOLDER_ORDER.indexOf(a.id) - SYSTEM_FOLDER_ORDER.indexOf(b.id));

  const userLabels = labels
    .filter(l => l.type === "user" && !HIDDEN_LABELS.includes(l.id) && !l.name.startsWith("CATEGORY_"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="w-56 flex-shrink-0 p-4">
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    );
  }

  const handleFolderClick = (folderId: string) => {
    const mappedFolder = FOLDER_TO_FILTER[folderId];
    if (mappedFolder) {
      onSelectLabel(null);
      onSelectFolder(mappedFolder);
    } else {
      onSelectFolder(null);
      onSelectLabel(folderId);
    }
  };

  const isSelected = (folderId: string) => {
    const mappedFolder = FOLDER_TO_FILTER[folderId];
    if (mappedFolder) {
      return selectedFolder === mappedFolder && selectedLabel === null;
    }
    return selectedLabel === folderId;
  };

  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200/50 bg-white/30 backdrop-blur-sm">
      <div className="p-3 space-y-1">
        <button
          onClick={() => {
            onSelectLabel(null);
            onSelectFolder("inbox");
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedFolder === "inbox" && selectedLabel === null
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-white/60"
          )}
          data-testid="gmail-folder-inbox-all"
        >
          <Inbox className="w-4 h-4" />
          <span className="flex-1 text-left">Inbox</span>
        </button>

        {systemFolders.map((folder) => {
          const Icon = FOLDER_ICONS[folder.id] || Mail;
          const displayName = FOLDER_NAMES[folder.id] || folder.name;
          const hasUnread = (folder.messagesUnread ?? 0) > 0;
          const selected = isSelected(folder.id);
          
          return (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                selected
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-white/60",
                hasUnread && !selected && "font-semibold"
              )}
              data-testid={`gmail-folder-${folder.id.toLowerCase()}`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{displayName}</span>
              {hasUnread && (
                <span className="text-xs font-bold">{folder.messagesUnread}</span>
              )}
            </button>
          );
        })}
      </div>

      {userLabels.length > 0 && (
        <div className="p-3 pt-0">
          <button
            onClick={() => setLabelsExpanded(!labelsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
            data-testid="gmail-labels-toggle"
          >
            {labelsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Labels
          </button>

          {labelsExpanded && (
            <div className="space-y-1 mt-1">
              {userLabels.map((label) => {
                const color = getLabelColor(label);
                const hasUnread = (label.messagesUnread ?? 0) > 0;
                
                return (
                  <button
                    key={label.id}
                    onClick={() => onSelectLabel(label.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedLabel === label.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-white/60",
                      hasUnread && "font-semibold"
                    )}
                    data-testid={`gmail-label-${label.id}`}
                  >
                    <Tag 
                      className="w-4 h-4 flex-shrink-0" 
                      style={{ color }}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {(label.messagesTotal ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {label.messagesTotal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
