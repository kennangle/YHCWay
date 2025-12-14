import { cn } from "@/lib/utils";
import { Check, Plus, MessageCircle, Mail, Calendar, Video } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ServiceCardProps {
  id: number;
  name: string;
  icon: string;
  description: string;
  connected?: boolean;
  colorClass: string;
}

export function ServiceCard({ id, name, icon, description, connected = false, colorClass }: ServiceCardProps) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (newConnected: boolean) => {
      const res = await fetch(`/api/services/${id}/connection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: newConnected }),
      });
      if (!res.ok) throw new Error("Failed to update connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const getIcon = () => {
    switch (icon) {
      case "MessageCircle": return <MessageCircle className="w-6 h-6" />;
      case "Mail": return <Mail className="w-6 h-6" />;
      case "Calendar": return <Calendar className="w-6 h-6" />;
      case "Video": return <Video className="w-6 h-6" />;
      default: return <Calendar className="w-6 h-6" />;
    }
  };

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col h-full relative overflow-hidden group">
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500",
        colorClass.split(" ")[0]
      )} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-white",
          colorClass
        )}>
          {getIcon()}
        </div>
        <button
          onClick={() => toggleMutation.mutate(!connected)}
          disabled={toggleMutation.isPending}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5",
            connected 
              ? "bg-green-100 text-green-700 border border-green-200" 
              : "bg-white text-muted-foreground border border-border hover:border-primary hover:text-primary",
            toggleMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
          data-testid={`button-toggle-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {connected ? (
            <>
              <Check className="w-3 h-3" /> Connected
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" /> Connect
            </>
          )}
        </button>
      </div>

      <div className="mt-auto relative z-10">
        <h3 className="font-display font-semibold text-lg text-foreground mb-1" data-testid={`text-service-name-${name.toLowerCase().replace(/\s+/g, '-')}`}>{name}</h3>
        <p className="text-sm text-muted-foreground leading-snug">{description}</p>
      </div>
    </div>
  );
}
