import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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

export function NotificationsBanner() {
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery<{ notifications: UserNotification[] }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=10", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000,
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
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
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
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = countData?.count || 0;

  if (isLoading || notifications.length === 0) {
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
      default:
        return "🔔";
    }
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

      <div className="space-y-2">
        {notifications.slice(0, 5).map((notification) => {
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
        })}
      </div>

      {notifications.length > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          +{notifications.length - 5} more notifications
        </p>
      )}
    </div>
  );
}
