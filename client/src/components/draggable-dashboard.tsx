import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { UpcomingEventsWidget } from "./widgets/upcoming-events-widget";
import { InsightsWidget } from "./widgets/insights-widget";
import { ServiceSummaryWidget } from "./widgets/service-summary-widget";
import { UpcomingTasksWidget } from "./widgets/upcoming-tasks-widget";
import { ActivityFeedWidget } from "./widgets/activity-feed-widget";
import { QuickActionsWidget } from "./widgets/quick-actions-widget";

export type WidgetId =
  | "upcoming-events"
  | "insights"
  | "upcoming-tasks"
  | "service-summary"
  | "activity-feed"
  | "quick-actions";

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  order: number;
}

interface WidgetDefinition {
  id: WidgetId;
  title: string;
  component: React.ComponentType;
  defaultVisible: boolean;
  size: "full" | "half" | "quarter";
}

const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { id: "upcoming-events", title: "Upcoming Events", component: UpcomingEventsWidget, defaultVisible: true, size: "full" },
  { id: "insights", title: "Insights & Stats", component: InsightsWidget, defaultVisible: true, size: "full" },
  { id: "upcoming-tasks", title: "Upcoming Tasks", component: UpcomingTasksWidget, defaultVisible: true, size: "half" },
  { id: "quick-actions", title: "Quick Actions", component: QuickActionsWidget, defaultVisible: true, size: "half" },
  { id: "activity-feed", title: "Recent Activity", component: ActivityFeedWidget, defaultVisible: true, size: "half" },
  { id: "service-summary", title: "Service Summary", component: ServiceSummaryWidget, defaultVisible: true, size: "full" },
];

export function getDefaultWidgets(): WidgetConfig[] {
  return WIDGET_DEFINITIONS.map((def, index) => ({
    id: def.id,
    visible: def.defaultVisible,
    order: index,
  }));
}

interface SortableWidgetProps {
  id: WidgetId;
  title: string;
  children: React.ReactNode;
  size: "full" | "half" | "quarter";
}

function SortableWidget({ id, title, children, size }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "glass-panel rounded-2xl transition-shadow",
        isDragging && "opacity-50 shadow-2xl ring-2 ring-primary/30 z-50",
        size === "full" && "col-span-full",
        size === "half" && "col-span-full lg:col-span-1",
        size === "quarter" && "col-span-1"
      )}
      data-testid={`widget-${id}`}
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        <button
          {...attributes}
          {...listeners}
          className="p-2 rounded-lg hover:bg-white/50 cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
          data-testid={`widget-drag-handle-${id}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 pt-0">{children}</div>
    </div>
  );
}

interface DraggableDashboardProps {
  widgets: WidgetConfig[];
  onWidgetsChange: (widgets: WidgetConfig[]) => void;
}

export function DraggableDashboard({ widgets, onWidgetsChange }: DraggableDashboardProps) {
  const [activeId, setActiveId] = useState<WidgetId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const sortedWidgets = useMemo(() => {
    return [...widgets]
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [widgets]);

  const widgetIds = useMemo(() => sortedWidgets.map((w) => w.id), [sortedWidgets]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as WidgetId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = sortedWidgets.findIndex((w) => w.id === active.id);
        const newIndex = sortedWidgets.findIndex((w) => w.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(sortedWidgets, oldIndex, newIndex);
          // Assign new order values to visible widgets based on their new positions
          // Hidden widgets keep order values beyond the visible range
          const maxVisibleOrder = reordered.length;
          let hiddenCounter = maxVisibleOrder;
          
          const updatedWidgets = widgets.map((w) => {
            const visibleIndex = reordered.findIndex((r) => r.id === w.id);
            if (visibleIndex !== -1) {
              return { ...w, order: visibleIndex };
            }
            // Hidden widget - assign order after all visible widgets
            return { ...w, order: hiddenCounter++ };
          });
          onWidgetsChange(updatedWidgets);
        }
      }
    },
    [sortedWidgets, widgets, onWidgetsChange]
  );

  const handleToggleWidget = (id: WidgetId, visible: boolean) => {
    // When showing a widget, give it the next order after visible widgets
    // When hiding, keep its order
    const visibleCount = widgets.filter((w) => w.visible && w.id !== id).length;
    const updated = widgets.map((w) => {
      if (w.id === id) {
        return { ...w, visible, order: visible ? visibleCount : w.order };
      }
      return w;
    });
    onWidgetsChange(updated);
  };

  const handleReset = () => {
    onWidgetsChange(getDefaultWidgets());
  };

  const activeWidget = activeId
    ? WIDGET_DEFINITIONS.find((w) => w.id === activeId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-customize-widgets"
            >
              <Settings2 className="w-4 h-4" />
              Customize Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Show or hide widgets. Drag widgets on the dashboard to reorder them.
              </p>
              {WIDGET_DEFINITIONS.map((def) => {
                const widget = widgets.find((w) => w.id === def.id);
                const isVisible = widget?.visible ?? def.defaultVisible;
                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center gap-3">
                      {isVisible ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Label htmlFor={def.id} className="text-sm font-medium cursor-pointer">
                        {def.title}
                      </Label>
                    </div>
                    <Switch
                      id={def.id}
                      checked={isVisible}
                      onCheckedChange={(checked) => handleToggleWidget(def.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </Button>
              <Button onClick={() => setSettingsOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedWidgets.map((widget) => {
              const def = WIDGET_DEFINITIONS.find((d) => d.id === widget.id);
              if (!def) return null;
              const WidgetComponent = def.component;
              return (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  title={def.title}
                  size={def.size}
                >
                  <WidgetComponent />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget && (
            <div className="glass-panel rounded-2xl shadow-2xl ring-2 ring-primary/30 p-4 opacity-90">
              <h3 className="font-display font-semibold text-lg">{activeWidget.title}</h3>
              <div className="h-20 flex items-center justify-center text-muted-foreground">
                Dragging...
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
