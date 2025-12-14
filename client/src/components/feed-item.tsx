import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Calendar } from "lucide-react";

export type FeedType = "email" | "slack" | "calendar";

interface FeedItemProps {
  type: FeedType;
  title: string;
  subtitle?: string;
  time: string;
  sender?: string;
  avatar?: string; // Color or image url
  urgent?: boolean;
}

export function FeedItem({ type, title, subtitle, time, sender, avatar, urgent }: FeedItemProps) {
  const getIcon = () => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4 text-white" />;
      case "slack": return <MessageSquare className="w-4 h-4 text-white" />;
      case "calendar": return <Calendar className="w-4 h-4 text-white" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "email": return "bg-red-500";
      case "slack": return "bg-purple-600";
      case "calendar": return "bg-blue-500";
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border border-transparent hover:bg-white/60 transition-colors group cursor-pointer flex gap-4 items-start",
      urgent ? "bg-red-50/50 border-red-100" : "bg-white/40 border-white/40"
    )}>
      <div className="relative shrink-0">
        {avatar ? (
          <img src={avatar} alt={sender} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
            {sender ? sender[0] : "?"}
          </div>
        )}
        <div className={cn(
          "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white",
          getBgColor()
        )}>
          {getIcon()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className={cn("font-medium text-sm truncate pr-2", urgent ? "text-red-700 font-semibold" : "text-foreground")}>
            {sender}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
        </div>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
