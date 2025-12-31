import { useState, useCallback, useMemo } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { ArrowLeft, Plus, MoreVertical, Calendar, User, Clock, Flag, MessageSquare, CheckSquare, RefreshCw, GripVertical, Trash2, Edit, LayoutGrid, List, Search, Filter, X, Users, UserPlus, UserMinus, GanttChart, CalendarRange } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProjectColumn {
  id: number;
  projectId: number;
  name: string;
  color: string;
  sortOrder: number;
}

interface Task {
  id: number;
  projectId: number;
  columnId: number | null;
  title: string;
  description: string | null;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  isMilestone: boolean;
  assigneeId: string | null;
  isCompleted: boolean;
  isRecurring: boolean;
  recurrencePattern: string | null;
  sortOrder: number;
  createdAt: string;
  subtasks?: TaskSubtask[];
  comments?: TaskComment[];
}

interface TaskSubtask {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

interface TaskComment {
  id: number;
  taskId: number;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string; email: string };
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  columns: ProjectColumn[];
  tasks: Task[];
  members: any[];
  labels: any[];
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "Overdue", className: "text-red-600" };
    if (diffDays === 0) return { text: "Today", className: "text-orange-600" };
    if (diffDays === 1) return { text: "Tomorrow", className: "text-yellow-600" };
    return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), className: "text-muted-foreground" };
  };

  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group ${
        task.isCompleted ? "opacity-60" : ""
      }`}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-grab"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            {dueInfo && (
              <span className={`text-[10px] flex items-center gap-1 ${dueInfo.className}`}>
                <Calendar className="w-3 h-3" />
                {dueInfo.text}
              </span>
            )}
            {task.isRecurring && (
              <span className="text-[10px] flex items-center gap-1 text-purple-600">
                <Clock className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onAddTask, onTaskClick }: { 
  column: ProjectColumn; 
  tasks: Task[]; 
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", column },
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex-shrink-0 w-64 sm:w-72 bg-gray-50/80 rounded-xl p-3"
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={onAddTask}
          className="p-1 hover:bg-gray-200 rounded"
          data-testid={`button-add-task-${column.id}`}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <SortableContext items={tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function GanttView({ 
  tasks, 
  columns,
  onTaskClick, 
  onUpdateTask,
  users 
}: { 
  tasks: Task[]; 
  columns: ProjectColumn[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (id: number, data: any) => void;
  users: User[];
}) {
  const today = new Date();
  const startOfView = new Date(today);
  startOfView.setDate(today.getDate() - 7);
  const endOfView = new Date(today);
  endOfView.setDate(today.getDate() + 60);
  
  const totalDays = Math.ceil((endOfView.getTime() - startOfView.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = 30;
  
  const weeks: { start: Date; end: Date }[] = [];
  let currentDate = new Date(startOfView);
  while (currentDate < endOfView) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({ start: weekStart, end: weekEnd > endOfView ? endOfView : weekEnd });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  const getTaskPosition = (task: Task) => {
    const taskStart = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : today);
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(taskStart.getTime() + 24 * 60 * 60 * 1000);
    
    const startOffset = Math.max(0, (taskStart.getTime() - startOfView.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return { left: startOffset * dayWidth, width: Math.max(duration * dayWidth, 30) };
  };

  const getProgressColor = (task: Task, column: ProjectColumn | undefined) => {
    if (task.isCompleted) return "bg-green-500";
    if (task.isMilestone) return "bg-purple-500";
    return column?.color ? `bg-[${column.color}]` : "bg-primary";
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-max">
        <div className="flex border-b bg-gray-50/80 sticky top-0 z-10">
          <div className="w-64 p-3 border-r bg-gray-100/80 font-semibold text-sm sticky left-0 z-20">
            Task Name
          </div>
          <div className="flex">
            {weeks.map((week, i) => (
              <div key={i} className="border-r" style={{ width: 7 * dayWidth }}>
                <div className="p-2 text-xs text-center font-medium border-b bg-gray-100/50">
                  {week.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div className="flex">
                  {Array.from({ length: 7 }, (_, j) => {
                    const date = new Date(week.start);
                    date.setDate(date.getDate() + j);
                    const isToday = date.toDateString() === today.toDateString();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <div 
                        key={j} 
                        className={`text-center text-xs py-1 ${isToday ? 'bg-primary/20 font-bold' : isWeekend ? 'bg-gray-100/50' : ''}`}
                        style={{ width: dayWidth }}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tasks to display. Create tasks with start dates and due dates to see them on the Gantt chart.
            </div>
          ) : (
            tasks.map((task) => {
              const position = getTaskPosition(task);
              const column = columns.find(c => c.id === task.columnId);
              const assignee = users.find(u => u.id === task.assigneeId);
              
              return (
                <div key={task.id} className="flex border-b hover:bg-gray-50/50">
                  <div 
                    className="w-64 p-3 border-r bg-white/80 sticky left-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${task.isCompleted ? 'bg-green-500' : ''}`}
                        style={{ backgroundColor: task.isCompleted ? undefined : column?.color || '#6b7280' }}
                      />
                      <span className={`text-sm font-medium truncate ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    {assignee && (
                      <div className="text-xs text-muted-foreground mt-1 ml-5">
                        {assignee.firstName || assignee.email}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1" style={{ minWidth: totalDays * dayWidth }}>
                    {weeks.map((_, weekIndex) => 
                      Array.from({ length: 7 }, (_, j) => {
                        const date = new Date(startOfView);
                        date.setDate(date.getDate() + weekIndex * 7 + j);
                        const isToday = date.toDateString() === today.toDateString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <div 
                            key={`${weekIndex}-${j}`}
                            className={`absolute h-full border-r ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-gray-50/50' : ''}`}
                            style={{ left: (weekIndex * 7 + j) * dayWidth, width: dayWidth }}
                          />
                        );
                      })
                    )}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        left: position.left,
                        width: position.width,
                        backgroundColor: task.isCompleted ? '#22c55e' : (column?.color || '#FD971E'),
                      }}
                      onClick={() => onTaskClick(task)}
                      title={`${task.title}${task.progress ? ` - ${task.progress}%` : ''}`}
                    >
                      {task.isMilestone ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 bg-purple-600 rotate-45" />
                        </div>
                      ) : task.progress && task.progress > 0 ? (
                        <div 
                          className="h-full rounded-full opacity-60"
                          style={{ width: `${task.progress}%`, backgroundColor: 'rgba(255,255,255,0.4)' }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineView({ 
  tasks, 
  columns,
  onTaskClick,
  users 
}: { 
  tasks: Task[]; 
  columns: ProjectColumn[];
  onTaskClick: (task: Task) => void;
  users: User[];
}) {
  const today = new Date();
  
  const groupedByDate: Record<string, Task[]> = {};
  const upcoming: Task[] = [];
  const overdue: Task[] = [];
  const noDate: Task[] = [];
  
  tasks.forEach(task => {
    if (!task.dueDate) {
      noDate.push(task);
      return;
    }
    
    const dueDate = new Date(task.dueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0 && !task.isCompleted) {
      overdue.push(task);
    } else {
      const dateKey = dueDate.toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(task);
    }
  });
  
  const sortedDates = Object.keys(groupedByDate).sort();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 0 && diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const TaskItem = ({ task }: { task: Task }) => {
    const column = columns.find(c => c.id === task.columnId);
    const assignee = users.find(u => u.id === task.assigneeId);
    
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onTaskClick(task)}
        data-testid={`timeline-task-${task.id}`}
      >
        <div 
          className={`w-3 h-3 rounded-full flex-shrink-0`}
          style={{ backgroundColor: task.isCompleted ? '#22c55e' : (column?.color || '#6b7280') }}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {column && (
              <span className="text-xs text-muted-foreground">{column.name}</span>
            )}
            {task.priority && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </span>
            )}
          </div>
        </div>
        {assignee && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{assignee.firstName || assignee.email.split('@')[0]}</span>
          </div>
        )}
        {task.isMilestone && (
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
            Milestone
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      {overdue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Overdue ({overdue.length})
          </h3>
          <div className="space-y-2 pl-6">
            {overdue.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}
      
      {sortedDates.map(dateStr => (
        <div key={dateStr}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(dateStr)}
            <span className="text-muted-foreground font-normal">({groupedByDate[dateStr].length})</span>
          </h3>
          <div className="space-y-2 pl-6">
            {groupedByDate[dateStr].map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      ))}
      
      {noDate.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            No Due Date ({noDate.length})
          </h3>
          <div className="space-y-2 pl-6">
            {noDate.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}
      
      {tasks.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No tasks to display. Create tasks with due dates to see them on the timeline.
        </div>
      )}
    </div>
  );
}

export default function ProjectBoard() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const queryClient = useQueryClient();
  
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    priority: "medium",
    dueDate: "",
    assigneeId: "",
  });
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list" | "gantt" | "timeline">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: project, isLoading, refetch } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: projectMembers = [], refetch: refetchMembers } = useQuery<{ userId: string; role: string; user: User }[]>({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      refetchMembers();
      setSelectedUserId("");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      refetchMembers();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setCreateTaskDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, columnId, sortOrder }: { taskId: number; columnId: number; sortOrder: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ columnId, sortOrder }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setSelectedTask(null);
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (data: { taskId: number; title: string }) => {
      const res = await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewSubtask("");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/subtasks/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle subtask");
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { taskId: number; content: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = parseInt((active.id as string).replace("task-", ""));
    const task = project?.tasks.find(t => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over || !project) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    if (activeId === overId) return;
    
    const taskId = parseInt(activeId.replace("task-", ""));
    let targetColumnId: number | null = null;
    
    if (overId.startsWith("column-")) {
      targetColumnId = parseInt(overId.replace("column-", ""));
    } else if (overId.startsWith("task-")) {
      const overTaskId = parseInt(overId.replace("task-", ""));
      const overTask = project.tasks.find(t => t.id === overTaskId);
      targetColumnId = overTask?.columnId || null;
    }
    
    if (targetColumnId !== null) {
      const tasksInColumn = project.tasks.filter(t => t.columnId === targetColumnId);
      moveTaskMutation.mutate({
        taskId,
        columnId: targetColumnId,
        sortOrder: tasksInColumn.length,
      });
    }
  };

  const handleCreateTask = () => {
    if (newTask.title.trim() && selectedColumnId !== null) {
      createTaskMutation.mutate({
        projectId,
        columnId: selectedColumnId,
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        assigneeId: newTask.assigneeId || undefined,
      });
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim() && selectedTask) {
      createSubtaskMutation.mutate({ taskId: selectedTask.id, title: newSubtask });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedTask) {
      createCommentMutation.mutate({ taskId: selectedTask.id, content: newComment });
    }
  };

  const openAddTask = (columnId: number) => {
    setSelectedColumnId(columnId);
    setCreateTaskDialogOpen(true);
  };

  const openTaskDetail = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, { credentials: "include" });
    const fullTask = await res.json();
    setSelectedTask(fullTask);
  };

  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return project.tasks.filter(task => {
      if (!showCompleted && task.isCompleted) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [project?.tasks, searchQuery, priorityFilter, showCompleted]);

  const getColumnTasks = (columnId: number) => {
    return filteredTasks.filter(t => t.columnId === columnId);
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <UnifiedSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 flex flex-col">
          <header className="mb-4 md:mb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <Link href="/projects">
                <Button variant="ghost" size="sm" data-testid="button-back-projects">
                  <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Projects</span>
                </Button>
              </Link>
              <div 
                className="w-3 h-3 md:w-4 md:h-4 rounded-full" 
                style={{ backgroundColor: project.color }} 
              />
              <h1 className="font-display font-bold text-lg md:text-2xl flex-1 truncate">{project.name}</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                className="flex items-center gap-1.5"
                data-testid="button-share-project"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
                {projectMembers.length > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-1.5 rounded-full">{projectMembers.length}</span>
                )}
              </Button>
              <button
                onClick={() => refetch()}
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                data-testid="button-refresh-board"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative min-w-[150px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/80 h-9"
                  data-testid="input-search-tasks"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-9 bg-white/80" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showCompleted ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
                className="h-9"
                data-testid="button-toggle-completed"
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                {showCompleted ? "Hide Done" : "Show Done"}
              </Button>

              <div className="flex border rounded-lg bg-white/80 overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setViewMode("board")}
                  className={`p-2 transition-colors ${viewMode === "board" ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                  data-testid="button-view-board"
                  title="Board View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                  data-testid="button-view-list"
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("gantt")}
                  className={`p-2 transition-colors ${viewMode === "gantt" ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                  data-testid="button-view-gantt"
                  title="Gantt Chart"
                >
                  <GanttChart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`p-2 transition-colors ${viewMode === "timeline" ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                  data-testid="button-view-timeline"
                  title="Timeline View"
                >
                  <CalendarRange className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {viewMode === "board" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {project.columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={getColumnTasks(column.id)}
                    onAddTask={() => openAddTask(column.id)}
                    onTaskClick={openTaskDetail}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeTask && (
                  <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 w-72">
                    <h4 className="text-sm font-medium">{activeTask.title}</h4>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {viewMode === "list" && (
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-3 font-medium text-sm w-8"></th>
                    <th className="text-left p-3 font-medium text-sm">Task</th>
                    <th className="text-left p-3 font-medium text-sm hidden md:table-cell">Status</th>
                    <th className="text-left p-3 font-medium text-sm hidden md:table-cell">Priority</th>
                    <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Due Date</th>
                    <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {searchQuery || priorityFilter !== "all" ? "No tasks match your filters" : "No tasks yet"}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const column = project.columns.find(c => c.id === task.columnId);
                      const assignee = users.find(u => u.id === task.assigneeId);
                      return (
                        <tr 
                          key={task.id} 
                          className="border-b last:border-0 hover:bg-white/50 transition-colors cursor-pointer"
                          onClick={() => openTaskDetail(task)}
                          data-testid={`row-task-${task.id}`}
                        >
                          <td className="p-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskMutation.mutate({
                                  id: task.id,
                                  data: { isCompleted: !task.isCompleted }
                                });
                              }}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                task.isCompleted ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-primary"
                              }`}
                              data-testid={`checkbox-task-${task.id}`}
                            >
                              {task.isCompleted && <CheckSquare className="w-3 h-3 text-white" />}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className={task.isCompleted ? "line-through text-muted-foreground" : ""}>
                              <p className="font-medium text-sm">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column?.color || "#ccc" }} />
                              <span className="text-sm">{column?.name || "Backlog"}</span>
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-sm">
                            {assignee ? (
                              <span>{assignee.firstName || assignee.email}</span>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === "gantt" && (
            <div className="glass-panel rounded-xl overflow-hidden flex-1 p-6" data-testid="gantt-view">
              <GanttView 
                tasks={filteredTasks} 
                columns={project.columns}
                onTaskClick={openTaskDetail}
                onUpdateTask={(id, data) => updateTaskMutation.mutate({ id, data })}
                users={users}
              />
            </div>
          )}

          {viewMode === "timeline" && (
            <div className="glass-panel rounded-xl overflow-hidden flex-1 p-6" data-testid="timeline-view">
              <TimelineView 
                tasks={filteredTasks} 
                columns={project.columns}
                onTaskClick={openTaskDetail}
                users={users}
              />
            </div>
          )}
        </div>
      </main>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add more details..."
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  data-testid="input-task-due"
                />
              </div>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={newTask.assigneeId || "unassigned"} onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v === "unassigned" ? "" : v })}>
                <SelectTrigger data-testid="select-task-assignee">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName || user.email} {user.lastName || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!newTask.title.trim() || createTaskMutation.isPending}
              data-testid="button-confirm-create-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateTaskMutation.mutate({
                          id: selectedTask.id,
                          data: { isCompleted: !selectedTask.isCompleted }
                        });
                        setSelectedTask({ ...selectedTask, isCompleted: !selectedTask.isCompleted });
                      }}
                      data-testid="button-toggle-complete"
                    >
                      <CheckSquare className={`w-4 h-4 mr-2 ${selectedTask.isCompleted ? 'text-green-600' : ''}`} />
                      {selectedTask.isCompleted ? 'Completed' : 'Mark Complete'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Delete this task?")) {
                          deleteTaskMutation.mutate(selectedTask.id);
                        }
                      }}
                      data-testid="button-delete-task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedTask.description || "No description"}</p>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                    <p className={`mt-1 text-sm px-2 py-1 rounded-full inline-block ${PRIORITY_COLORS[selectedTask.priority]}`}>
                      {selectedTask.priority}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p className="mt-1 text-sm">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No due date"}
                    </p>
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Subtasks ({selectedTask.subtasks?.filter(s => s.isCompleted).length || 0}/{selectedTask.subtasks?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {selectedTask.subtasks?.map((subtask) => (
                      <div 
                        key={subtask.id} 
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={() => toggleSubtaskMutation.mutate(subtask.id)}
                          className="rounded"
                          data-testid={`checkbox-subtask-${subtask.id}`}
                        />
                        <span className={subtask.isCompleted ? "line-through text-muted-foreground" : ""}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add a subtask..."
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                        data-testid="input-new-subtask"
                      />
                      <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments ({selectedTask.comments?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-3">
                    {selectedTask.comments?.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.author.firstName || comment.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                        data-testid="input-new-comment"
                      />
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Project Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Share Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Add Team Member</Label>
              <div className="flex gap-2 mt-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-add-member">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => !projectMembers.some(m => m.userId === u.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName || user.email} {user.lastName || ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedUserId) {
                      addMemberMutation.mutate({ userId: selectedUserId, role: "member" });
                    }
                  }}
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  data-testid="button-add-member"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Current Members ({projectMembers.length})</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {projectMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No members yet. Add team members to collaborate on this project.
                  </p>
                ) : (
                  projectMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      data-testid={`member-${member.userId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                          {(member.user?.firstName?.[0] || member.user?.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user?.firstName || member.user?.email} {member.user?.lastName || ''}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
