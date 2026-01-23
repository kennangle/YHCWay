import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, CheckCheck, ExternalLink, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  };
}

interface NotificationGroup {
  id: number;
  userId: string;
  groupKey: string;
  groupType: string;
  title: string;
  summary: string | null;
  itemCount: number | null;
  notificationIds: string[] | null;
  priority: string | null;
  metadata: Record<string, any> | null;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  lastUpdatedAt: string;
}

export function NotificationsBanner() {
  const [showGrouped, setShowGrouped] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery<{ notifications: UserNotification[] }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=20", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: groupsData } = useQuery<{ groups: NotificationGroup[] }>({
    queryKey: ["/api/notifications/grouped"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/grouped?limit=10", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notification groups");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: showGrouped,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch count");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to dismiss");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/grouped"] });
    },
    onError: (error) => {
      console.error("Dismiss error:", error);
      toast.error("Could not dismiss notification");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/grouped"] });
    },
  });

  const markGroupReadMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/notifications/groups/${groupId}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark group as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/grouped"] });
    },
  });

  const dismissGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await fetch(`/api/notifications/groups/${groupId}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to dismiss group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/grouped"] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const groups = groupsData?.groups || [];
  const unreadCount = countData?.count || 0;

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const hasGroups = groups.length > 0;

  if (isLoading || (notifications.length === 0 && groups.length === 0)) {
    return null;
  }

  const getNotificationLink = (notification: UserNotification): string | null => {
    if (notification.resourceType === "task" && notification.metadata?.projectId) {
      return `/projects/${notification.metadata.projectId}`;
    }
    if (notification.resourceType === "project" && notification.resourceId) {
      return `/projects/${notification.resourceId}`;
    }
    return null;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task.assigned":
        return "📋";
      case "project.member_added":
        return "📁";
      case "task.comment":
        return "💬";
      case "mention":
        return "📣";
      case "meeting_context":
        return "📅";
      case "email_thread":
        return "📧";
      case "task_updates":
        return "✅";
      default:
        return "🔔";
    }
  };

  const getGroupIcon = (groupType: string) => {
    switch (groupType) {
      case "meeting_context":
        return "📅";
      case "email_thread":
        return "📧";
      case "task_updates":
        return "✅";
      case "project_activity":
        return "📁";
      default:
        return "📦";
    }
  };

  const getGroupLink = (group: NotificationGroup): string | null => {
    if (group.metadata?.projectId) {
      return `/projects/${group.metadata.projectId}`;
    }
    if (group.metadata?.taskId && group.metadata?.projectId) {
      return `/projects/${group.metadata.projectId}`;
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-xl p-4 mb-6" data-testid="notifications-banner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full" data-testid="unread-count">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasGroups && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGrouped(!showGrouped)}
              className={`text-xs ${showGrouped ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}
              data-testid="button-toggle-grouped"
            >
              <Layers className="w-4 h-4 mr-1" />
              {showGrouped ? "Grouped" : "All"}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {showGrouped && groups.length > 0 ? (
          groups.slice(0, 5).map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const isUnread = !group.readAt;
            const link = getGroupLink(group);
            const itemCount = group.itemCount || 1;

            return (
              <div
                key={group.id}
                className={`rounded-lg transition-colors ${
                  isUnread ? "bg-amber-50/50 border border-amber-200/50" : "bg-white/30"
                }`}
                data-testid={`notification-group-${group.id}`}
              >
                <div className="flex items-start gap-3 p-3">
                  <span className="text-lg" role="img" aria-label="group type">
                    {getGroupIcon(group.groupType)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${isUnread ? "font-medium" : ""} text-foreground`}>
                            {group.title}
                          </p>
                          {itemCount > 1 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                              {itemCount} items
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        {group.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {group.summary}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(group.lastUpdatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {link && (
                          <Link href={link}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (isUnread) {
                                  markGroupReadMutation.mutate(group.id);
                                }
                              }}
                              data-testid={`button-view-group-${group.id}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => markGroupReadMutation.mutate(group.id)}
                            disabled={markGroupReadMutation.isPending}
                            data-testid={`button-read-group-${group.id}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => dismissGroupMutation.mutate(group.id)}
                          disabled={dismissGroupMutation.isPending}
                          data-testid={`button-dismiss-group-${group.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && group.notificationIds && group.notificationIds.length > 0 && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/30 ml-9">
                    <div className="space-y-1.5 pt-2">
                      {notifications
                        .filter(n => group.notificationIds?.includes(n.id))
                        .slice(0, 5)
                        .map((notification) => {
                          const notifLink = getNotificationLink(notification);
                          return (
                            <div 
                              key={notification.id}
                              className="flex items-center justify-between gap-2 p-2 bg-white/40 rounded text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{notification.title}</p>
                                {notification.body && (
                                  <p className="text-muted-foreground truncate">{notification.body}</p>
                                )}
                              </div>
                              {notifLink && (
                                <Link href={notifLink}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          notifications.slice(0, 5).map((notification) => {
            const link = getNotificationLink(notification);
            const isUnread = !notification.readAt;

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isUnread ? "bg-amber-50/50 border border-amber-200/50" : "bg-white/30"
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <span className="text-lg" role="img" aria-label="notification type">
                  {getNotificationIcon(notification.type)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isUnread ? "font-medium" : ""} text-foreground truncate`}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {link && (
                        <Link href={link}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (isUnread) {
                                markReadMutation.mutate(notification.id);
                              }
                            }}
                            data-testid={`button-view-${notification.id}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          data-testid={`button-read-${notification.id}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissMutation.mutate(notification.id)}
                        disabled={dismissMutation.isPending}
                        data-testid={`button-dismiss-${notification.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {(showGrouped ? groups.length : notifications.length) > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          +{(showGrouped ? groups.length : notifications.length) - 5} more
        </p>
      )}
    </div>
  );
}
