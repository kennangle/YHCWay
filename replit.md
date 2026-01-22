# The YHC Way - Unified Workspace Application

## Overview

The YHC Way is a unified workspace application designed to streamline productivity by integrating various tools (Slack, Gmail, Google Calendar, Zoom, Apple Calendar, Asana, Calendly, Mindbody Analytics, Perkville, YHCTime) into a single interface. It features a unified activity feed, comprehensive service connection management, and an admin panel for system oversight. The application aims to enhance user efficiency through a centralized digital workspace, offering AI-powered assistance for daily briefings, smart search, email drafting, task generation, meeting preparation, and calendar optimization. It also includes robust native project management capabilities with Kanban boards, multi-homing tasks, and advanced task dependency tracking, along with a user-friendly glassmorphism UI.

## User Preferences

Preferred communication style: Simple, everyday language.
Documentation updates (!updatedocumentation): Include both technical documentation and User Guide sections.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack React Query for state management. Styling is handled by Tailwind CSS v4, implementing a custom glassmorphism design system. UI components are sourced from shadcn/ui (New York style) based on Radix UI primitives. Vite serves as the build tool. The architecture is page-based, featuring a dashboard, service connection management, settings, and an admin panel.

### Backend Architecture
The backend is an Express.js application with TypeScript, providing a RESTful JSON API. Session management uses `express-session` with a PostgreSQL store. Authentication is managed via Replit Auth using OpenID Connect and Passport.js. The server serves both API routes and static frontend assets in production.

### Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM. Key tables include `tenants`, `users`, `services`, `feedItems`, `apple_calendar_credentials`, `slack_channel_preferences`, and specific tables for project management features like `projects`, `tasks`, `task_collaborators`, `task_dependencies`, `task_projects`, `task_stories`, and `event_outbox`.

### Multi-Tenancy Architecture
The system supports multi-tenancy with tenant isolation enforced by a `tenantId` column in all tenant-scoped tables. Role-Based Access Control (RBAC) is implemented (Owner, Admin, Member, Guest). Tenant resolution occurs via `X-Tenant-Id` or `X-Tenant-Slug` headers, or defaults to the user's primary tenant. An audit logging system tracks all tenant actions for compliance.

### Native Project Management
The application includes robust project management with Kanban-style boards, supporting tasks with subtasks, priorities, due dates, recurring tasks, and commenting. Tasks can be assigned to teams and shared with collaborators (multi-homing), allowing a task to belong to multiple projects. Advanced features include drag-and-drop functionality, task dependencies with visual indicators and circular dependency prevention, and a quick filter bar for tasks. An Asana import feature allows for one-time migration of projects and tasks. Task stories provide a unified activity feed.

### AI Assistant Features
Integrated AI capabilities, powered by OpenAI GPT-4.1-mini, offer:
- Daily Briefings
- Smart Search across various data sources
- Email Drafting
- Smart Task Generation from unstructured text
- Meeting Preparation
- Calendar Optimization
- AI-powered Task Prioritization

### Authentication & Authorization
The system uses local email/password authentication with PostgreSQL-backed session cookies. Admin access is determined by an `isAdmin` flag and a hardcoded admin email. New users require admin approval, and password resets are handled via Brevo transactional emails. A guided tour onboarding process is implemented using `driver.js`.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: For type-safe database interactions and migrations.

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: For styling.
- **shadcn/ui**: UI component library.

### Service Integrations
- **Gmail & Google Calendar**: Via Google APIs for email and calendar management.
- **Slack**: Bot token for channel/DM access and message retrieval.
- **Zoom**: Server-to-server OAuth.
- **Apple Calendar**: CalDAV via `tsdav` for calendar synchronization.
- **Asana**: OAuth for one-time project/task data import.
- **Calendly**: Personal Access Token integration for scheduling and unified calendar view.
- **Mindbody Analytics**: External API via Bearer token for intro offer tracking.
- **Perkville**: Resource Owner Grant integration for loyalty rewards program, including business analytics and customer point lookup.
- **YHCTime**: Employee time tracking integration.
- **QR Tiger**: API integration for dynamic QR code generation and scan analytics.
- **Brevo (formerly Sendinblue)**: Transactional email service for password resets and notifications.

### Development Tools
- **Vite**: Development server and build tool.
- **esbuild**: Production server bundling.
- **TypeScript**: Language for type checking.

## User Guide

### Customizing Your Dashboard

The dashboard now features a customizable, drag-and-drop widget layout that allows you to personalize your workspace.

#### Available Widgets
- **Upcoming Events**: Shows your upcoming calendar events from Google Calendar and Apple Calendar
- **Insights & Stats**: Displays key metrics and statistics
- **Upcoming Tasks**: Lists your pending tasks with priority indicators
- **Service Summary**: Shows connected service status at a glance
- **Recent Activity**: Unified feed of Gmail, Slack, Zoom meetings, and intro offers
- **Quick Actions**: Fast access to common actions (compose email, view calendar, projects, etc.)

#### Rearranging Widgets
1. Click and hold any widget's header
2. Drag the widget to a new position on your dashboard
3. Release to drop it in place
4. Your layout is automatically saved

#### Showing/Hiding Widgets
1. Click the gear icon (⚙️) in the dashboard header to open Widget Settings
2. Toggle each widget on or off using the switches
3. Click "Reset to Default" to restore the original layout
4. Changes are saved automatically

#### Tips
- Drag widgets to prioritize the information most important to you
- Hide widgets for services you don't use to reduce clutter
- The dashboard remembers your preferences across sessions

### How to Use Task Dependencies

Task dependencies allow you to define relationships between tasks, ensuring work is completed in the correct order. When Task A depends on Task B, Task A is "blocked" until Task B is completed.

#### Adding Dependencies
1. Open a project and click on a task to open the task details panel
2. In the task panel, find the "Dependencies" section
3. Use the "Add blocking task..." dropdown to select a task that must be completed first
4. The selected task will appear as a dependency with a visual indicator showing if it's complete (green) or pending (amber)

#### Removing Dependencies
1. In the task details panel, find the dependency you want to remove
2. Click the X button next to the dependency to unlink it

#### Viewing the Dependency Tracker
1. From the project board, click the "Dependencies" button in the header
2. The Dependency Tracker shows:
   - **Bottlenecks**: Tasks that block 2 or more other tasks (high priority to complete)
   - **Blocked Tasks**: Tasks waiting on other tasks to be completed
   - **Visual dependency chains**: See the flow of work and how tasks relate

#### Dependency Types
Dependencies use a "Finish to Start" relationship by default, meaning Task B cannot start until Task A is finished. This is the most common dependency type for sequential work.

#### Tips
- Avoid creating circular dependencies (e.g., Task A depends on Task B, which depends on Task A) as this can cause issues with task completion tracking.

#### Best Practices
- Keep dependency chains short to avoid bottlenecks
- Complete bottleneck tasks first to unblock the most work
- Use the Dependency Tracker regularly to identify blocked work
- Mark tasks complete as soon as they're done to update blocked task status