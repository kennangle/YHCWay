# Projects Feature Documentation

The YHC Way includes a comprehensive native project management system with Kanban boards, task management, and team collaboration features.

---

## Overview

The Projects feature provides a full-featured project management system that allows teams to organize work, track progress, and collaborate effectively. It includes visual Kanban boards, flexible task management, and powerful organizational tools.

---

## Kanban Board

### Board View
- **Visual columns** - Tasks are organized into customizable columns representing different workflow stages
- **Drag and drop** - Move tasks between columns by dragging them
- **Task counts** - Each column displays the number of tasks it contains
- **Color coding** - Columns have customizable colors for visual organization

### Column Management (NEW)
Columns can be fully customized to match your workflow:

#### Adding Columns
- Click the **"+ Add column"** button at the end of the board
- Enter a name for the new column
- Choose a color from the color picker
- Click **"Add column"** to create it

#### Renaming Columns
- Click directly on the column name to edit it inline
- Or click the **three-dot menu (⋯)** and select **"Rename"**
- Press Enter or click away to save

#### Changing Column Colors
- Click the **three-dot menu (⋯)** on the column header
- Select **"Change color"**
- Choose from 8 preset colors: Amber, Blue, Green, Red, Purple, Pink, Gray, Teal

#### Reordering Columns
- Drag columns by their **grip handle** (⋮⋮) on the left side of the header
- Drop the column in its new position
- Column order is saved automatically

#### Deleting Columns
- Click the **three-dot menu (⋯)** on the column header
- Select **"Delete column"**
- Confirm the deletion in the dialog
- Tasks in deleted columns will be moved or become unassigned

---

## Task Management

### Creating Tasks
- Click **"+ Add task"** in any column
- Enter the task title
- Optionally set:
  - **Priority** (Low, Medium, High, Urgent)
  - **Assignee** - Assign to a team member
  - **Due date** - Set a deadline
- Press **Cmd/Ctrl + Enter** or click **Add** to create the task

### Task Details
Click on any task to open the detail panel with full editing capabilities:

- **Title and description** - Rich text editing support
- **Priority levels** - Low, Medium, High, Urgent with color indicators
- **Due dates** - Calendar picker for deadlines
- **Start dates** - Track when work begins
- **Progress tracking** - 0-100% completion slider
- **Assignee** - Assign tasks to team members
- **Labels** - Tag tasks with custom labels
- **Milestone flag** - Mark important deliverables

### Task States
- **Active** - Tasks currently being worked on
- **Completed** - Mark tasks as done with a checkbox
- **Archived** - Hide completed tasks from the board (accessible via Archive drawer)

### Subtasks
Break down complex tasks into smaller actionable items:
- Add subtasks within any task
- Check off subtasks as you complete them
- Track subtask completion progress
- Reorder subtasks by dragging

### Recurring Tasks
Set up tasks that repeat automatically:
- **Daily** - Every day
- **Weekly** - Same day each week
- **Biweekly** - Every two weeks
- **Monthly** - Same date each month
- **Custom** - Set a custom interval
- Optional end date for recurring series

---

## Task Dependencies

### Visual Dependency Tracking
- Click **"Dependencies"** in the header to view the dependency graph
- See which tasks must be completed before others can start
- Visual lines connect dependent tasks

### Dependency Types
- **Finish to Start** - Task B can't start until Task A finishes (default)
- **Start to Start** - Task B can't start until Task A starts
- **Finish to Finish** - Task B can't finish until Task A finishes
- **Start to Finish** - Task B can't finish until Task A starts

### Circular Dependency Prevention
- The system automatically detects and prevents circular dependencies
- You cannot create a dependency that would create an infinite loop

---

## Multi-Homing (Multi-Project Tasks)

Tasks can belong to multiple projects simultaneously:
- A single task can appear in different projects
- Each project can have its own column placement for the task
- Changes to the task are reflected across all projects
- Useful for cross-functional work or shared deliverables

---

## Task Filtering

### Quick Filter Bar
Filter tasks to find what you need:
- **Search** - Type to filter by task title
- **Assignee** - Show only tasks assigned to specific people
- **Priority** - Filter by priority level
- **Due date filters**:
  - Overdue - Past due date
  - Today - Due today
  - This week - Due within 7 days
  - No due date - Tasks without deadlines

### Archived Tasks
- Click the **Archive** button to view archived tasks
- Restore tasks from the archive back to the board

---

## Team Collaboration

### Project Members
- Add team members to projects
- Assign roles (Owner, Admin, Member)
- Control who can edit vs view

### Task Assignment
- Assign tasks to any project member
- Filter the board by assignee
- See who's working on what

### Comments and Activity
- Add comments to tasks for discussion
- View activity history showing all changes
- @mention team members in comments

---

## Project Settings

### Project Details
- **Name** - The project title
- **Description** - Project overview and goals
- **Color** - Project color for visual identification

### Sharing
- Click **"Share"** to manage project access
- Invite team members by email
- Set permissions for each member

---

## Keyboard Shortcuts

Navigate efficiently with keyboard:
- **Arrow keys** - Move between tasks and columns
- **Enter** - Open selected task
- **Escape** - Close task panel or cancel editing
- **Cmd/Ctrl + Enter** - Save when creating/editing

---

## Asana Import

Migrate from Asana to The YHC Way:
- Import projects with all tasks
- Preserve task details, assignees, and due dates
- Map Asana sections to Kanban columns
- Keep your work history intact

---

## Views

### Board View (Default)
- Visual Kanban board with columns
- Drag and drop task management
- Best for workflow visualization

### List View
- Traditional list format
- Sortable columns
- Better for bulk task review

Toggle between views using the **Board/List** buttons in the header.

---

## Best Practices

1. **Keep columns focused** - Use 4-6 columns for optimal workflow visibility
2. **Set clear due dates** - Help team members prioritize
3. **Use priorities wisely** - Reserve "Urgent" for truly time-sensitive items
4. **Break down large tasks** - Use subtasks for complex work
5. **Archive completed tasks** - Keep your board clean and focused
6. **Review regularly** - Check dependencies and blocked tasks

---

## Recent Updates

### January 2026 - Column Management
- **Add columns** - Create new workflow stages as needed
- **Rename columns** - Click to edit column names inline
- **Change colors** - Customize column colors for visual organization
- **Reorder columns** - Drag columns to rearrange your workflow
- **Delete columns** - Remove columns you no longer need
