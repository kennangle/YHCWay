import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Flag, User, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, Pencil, Trash2, Palette, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { TaskCard } from "./TaskCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ProjectColumn, TaskLite } from "../types";

interface TeamUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-gray-500" },
  { value: "medium", label: "Medium", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "urgent", label: "Urgent", color: "text-red-500" },
];

const COLUMN_COLORS = [
  { value: "#f59e0b", label: "Amber" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#ef4444", label: "Red" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
  { value: "#14b8a6", label: "Teal" },
];

interface BoardColumnProps {
  column: ProjectColumn;
  tasks: TaskLite[];
  projectId: number;
  onSelectTask: (taskId: number) => void;
  selectedTaskId: number | null;
  onCreateTask: (columnId: number, title: string, options?: { priority?: string; assigneeId?: string; dueDate?: string }) => void;
  onToggleComplete?: (taskId: number, completed: boolean) => void;
  users?: TeamUser[];
  onRenameColumn?: (columnId: number, name: string) => void;
  onDeleteColumn?: (columnId: number) => void;
  onChangeColumnColor?: (columnId: number, color: string) => void;
  isDraggable?: boolean;
}

export function BoardColumn({
  column,
  tasks,
  onSelectTask,
  selectedTaskId,
  onCreateTask,
  onToggleComplete,
  users = [],
  onRenameColumn,
  onDeleteColumn,
  onChangeColumnColor,
  isDraggable = false,
}: BoardColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string | undefined>(undefined);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-sortable-${column.id}`,
    data: { type: "column-sortable", column },
    disabled: !isDraggable,
  });

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", column },
  });

  const sortableItems = tasks.map((t) => `task-${t.id}`);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(column.id, newTaskTitle.trim(), {
        priority: newTaskPriority,
        assigneeId: newTaskAssignee,
        dueDate: newTaskDueDate?.toISOString(),
      });
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskAssignee(undefined);
      setNewTaskDueDate(undefined);
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewTaskTitle("");
    setNewTaskPriority("medium");
    setNewTaskAssignee(undefined);
    setNewTaskDueDate(undefined);
  };

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === newTaskPriority) || PRIORITY_OPTIONS[1];
  const selectedUser = users.find(u => u.id === newTaskAssignee);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== column.name && onRenameColumn) {
      onRenameColumn(column.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id);
    }
    setShowDeleteDialog(false);
  };

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      className={`
        flex-shrink-0 w-72 bg-gray-50 rounded-lg flex flex-col max-h-full
        ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}
        ${isDragging ? "shadow-lg z-50" : ""}
      `}
    >
      <div className="p-3 flex items-center gap-2 border-b border-gray-200">
        {isDraggable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 -ml-1"
            data-testid={`column-drag-handle-${column.id}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color || "#6b7280" }}
        />
        {isRenaming ? (
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setRenameValue(column.name);
                setIsRenaming(false);
              }
            }}
            className="h-6 text-sm font-medium flex-1"
            data-testid={`input-rename-column-${column.id}`}
          />
        ) : (
          <h3 
            className="font-medium text-sm text-gray-700 flex-1 cursor-pointer hover:text-gray-900"
            onClick={() => {
              setRenameValue(column.name);
              setIsRenaming(true);
            }}
            data-testid={`column-name-${column.id}`}
          >
            {column.name}
          </h3>
        )}
        <span className="text-xs text-gray-400">{tasks.length}</span>
        {(onRenameColumn || onDeleteColumn || onChangeColumnColor) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
                data-testid={`column-menu-${column.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onRenameColumn && (
                <DropdownMenuItem 
                  onClick={() => {
                    setRenameValue(column.name);
                    setIsRenaming(true);
                  }}
                  data-testid={`menu-rename-column-${column.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onChangeColumnColor && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger data-testid={`menu-color-column-${column.id}`}>
                    <Palette className="w-4 h-4 mr-2" />
                    Change color
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {COLUMN_COLORS.map((color) => (
                      <DropdownMenuItem
                        key={color.value}
                        onClick={() => onChangeColumnColor(column.id, color.value)}
                        data-testid={`color-option-${color.label.toLowerCase()}-${column.id}`}
                      >
                        <div 
                          className="w-4 h-4 rounded-full mr-2" 
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                        {column.color === color.value && <span className="ml-auto text-green-600">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {onDeleteColumn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                    data-testid={`menu-delete-column-${column.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete column
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{column.name}" column?</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length > 0 
                ? `This column contains ${tasks.length} task(s). Tasks will be moved to the first column or become unassigned.`
                : "This action cannot be undone."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`cancel-delete-column-${column.id}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              data-testid={`confirm-delete-column-${column.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-2 border-b border-gray-200">
        {isAdding ? (
          <div className="space-y-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleAddTask();
                if (e.key === "Escape") resetForm();
              }}
              className="text-sm"
              data-testid={`input-new-task-${column.id}`}
            />
            <div className="flex flex-wrap gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                    data-testid={`button-priority-${column.id}`}
                  >
                    <Flag className={`w-3 h-3 ${selectedPriority.color}`} />
                    <span className={selectedPriority.color}>{selectedPriority.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1" align="start">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`w-full text-left px-2 py-1 text-xs rounded flex items-center gap-1 hover:bg-gray-100 ${newTaskPriority === opt.value ? "bg-gray-100" : ""}`}
                      onClick={() => setNewTaskPriority(opt.value)}
                      data-testid={`option-priority-${opt.value}-${column.id}`}
                    >
                      <Flag className={`w-3 h-3 ${opt.color}`} />
                      <span className={opt.color}>{opt.label}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                    data-testid={`button-assignee-${column.id}`}
                  >
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[60px]">{selectedUser ? selectedUser.firstName : "Assign"}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 max-h-48 overflow-y-auto" align="start">
                  <button
                    className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${!newTaskAssignee ? "bg-gray-100" : ""}`}
                    onClick={() => setNewTaskAssignee(undefined)}
                    data-testid={`option-assignee-unassigned-${column.id}`}
                  >
                    Unassigned
                  </button>
                  {users.map(user => (
                    <button
                      key={user.id}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${newTaskAssignee === user.id ? "bg-gray-100" : ""}`}
                      onClick={() => setNewTaskAssignee(user.id)}
                      data-testid={`option-assignee-${user.id}-${column.id}`}
                    >
                      {user.firstName} {user.lastName}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                    data-testid={`button-duedate-${column.id}`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    <span>{newTaskDueDate ? newTaskDueDate.toLocaleDateString() : "Due date"}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTaskDueDate}
                    onSelect={setNewTaskDueDate}
                    initialFocus
                  />
                  {newTaskDueDate && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs" 
                        onClick={() => setNewTaskDueDate(undefined)}
                        data-testid={`button-clear-duedate-${column.id}`}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleAddTask} 
                disabled={!newTaskTitle.trim()}
                data-testid={`button-confirm-add-task-${column.id}`}
              >
                Add
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={resetForm}
                data-testid={`button-cancel-add-task-${column.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-full p-2 rounded hover:bg-gray-100 transition-colors"
            data-testid={`button-add-task-${column.id}`}
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]"
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onSelectTask(task.id)}
              isSelected={selectedTaskId === task.id}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAdding && (
          <div className="text-center text-xs text-gray-400 py-4">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
