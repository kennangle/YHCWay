import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, GripVertical, Calendar, TrendingUp, ListTodo, LayoutGrid, Clock } from "lucide-react";

export type WidgetId = "upcoming-events" | "insights" | "upcoming-tasks" | "service-summary" | "time-tracker";

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "upcoming-events", visible: true, order: 0 },
  { id: "insights", visible: true, order: 1 },
  { id: "upcoming-tasks", visible: true, order: 2 },
  { id: "time-tracker", visible: true, order: 3 },
  { id: "service-summary", visible: true, order: 4 },
];

const WIDGET_LABELS: Record<WidgetId, { label: string; icon: React.ReactNode }> = {
  "upcoming-events": { label: "Upcoming Events", icon: <Calendar className="w-4 h-4" /> },
  "insights": { label: "Insights & Quick Actions", icon: <TrendingUp className="w-4 h-4" /> },
  "upcoming-tasks": { label: "Upcoming Tasks", icon: <ListTodo className="w-4 h-4" /> },
  "time-tracker": { label: "Time Tracker", icon: <Clock className="w-4 h-4" /> },
  "service-summary": { label: "Service Summary", icon: <LayoutGrid className="w-4 h-4" /> },
};

interface DashboardWidgetConfigProps {
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
}

export function getDefaultWidgets(): WidgetConfig[] {
  return [...DEFAULT_WIDGETS];
}

export function DashboardWidgetConfig({ widgets, onSave }: DashboardWidgetConfigProps) {
  const [open, setOpen] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([...widgets]);

  const handleToggle = (id: WidgetId, visible: boolean) => {
    setLocalWidgets(prev => prev.map(w => w.id === id ? { ...w, visible } : w));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...localWidgets];
    [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
    newWidgets.forEach((w, i) => w.order = i);
    setLocalWidgets(newWidgets);
  };

  const handleMoveDown = (index: number) => {
    if (index === localWidgets.length - 1) return;
    const newWidgets = [...localWidgets];
    [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    newWidgets.forEach((w, i) => w.order = i);
    setLocalWidgets(newWidgets);
  };

  const handleSave = () => {
    onSave(localWidgets);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalWidgets(getDefaultWidgets());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLocalWidgets([...widgets]); }}>
      <DialogTrigger asChild>
        <button 
          className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/80 transition-colors"
          data-testid="button-customize-widgets"
          title="Customize Dashboard"
        >
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Show, hide, and reorder widgets on your dashboard.
          </p>
          {localWidgets.sort((a, b) => a.order - b.order).map((widget, index) => (
            <div 
              key={widget.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <GripVertical className="w-3 h-3 rotate-180" />
                  </button>
                  <button 
                    onClick={() => handleMoveDown(index)}
                    disabled={index === localWidgets.length - 1}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {WIDGET_LABELS[widget.id].icon}
                  <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                    {WIDGET_LABELS[widget.id].label}
                  </Label>
                </div>
              </div>
              <Switch
                id={widget.id}
                checked={widget.visible}
                onCheckedChange={(checked) => handleToggle(widget.id, checked)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
