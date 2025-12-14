import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

interface ServiceCardProps {
  name: string;
  icon: React.ReactNode;
  description: string;
  connected?: boolean;
  colorClass: string; // e.g., "bg-slack text-white"
}

export function ServiceCard({ name, icon, description, connected = false, colorClass }: ServiceCardProps) {
  const [isConnected, setIsConnected] = useState(connected);

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col h-full relative overflow-hidden group">
      {/* Decorative background blob */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500",
        colorClass.split(" ")[0] // Hacky way to get bg color
      )} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-white",
          colorClass
        )}>
          {icon}
        </div>
        <button
          onClick={() => setIsConnected(!isConnected)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5",
            isConnected 
              ? "bg-green-100 text-green-700 border border-green-200" 
              : "bg-white text-muted-foreground border border-border hover:border-primary hover:text-primary"
          )}
        >
          {isConnected ? (
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
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground leading-snug">{description}</p>
      </div>
    </div>
  );
}
