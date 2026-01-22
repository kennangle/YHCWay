import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetWrapperProps {
  id: string;
  title: string;
  children: ReactNode;
  isDragging?: boolean;
  className?: string;
}

export function WidgetWrapper({ id, title, children, isDragging, className }: WidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "glass-panel rounded-2xl transition-shadow",
        dragging && "opacity-50 shadow-2xl ring-2 ring-primary/30",
        className
      )}
      data-testid={`widget-${id}`}
    >
      <div className="flex items-center justify-between p-4 pb-0">
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        <button
          {...attributes}
          {...listeners}
          className="p-2 rounded-lg hover:bg-white/50 cursor-grab active:cursor-grabbing text-muted-foreground"
          data-testid={`widget-drag-handle-${id}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 pt-2">{children}</div>
    </div>
  );
}

export function StaticWidgetWrapper({ title, children, className }: Omit<WidgetWrapperProps, "id" | "isDragging">) {
  return (
    <div className={cn("glass-panel rounded-2xl", className)}>
      <div className="p-4 pb-0">
        <h3 className="font-display font-semibold text-lg">{title}</h3>
      </div>
      <div className="p-4 pt-2">{children}</div>
    </div>
  );
}
