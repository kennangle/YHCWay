# The YHC Way - Unified Workspace Application

## Overview

The YHC Way is a unified workspace application designed to streamline productivity by integrating various tools (Slack, Gmail, Google Calendar, Zoom, Apple Calendar, Asana, Calendly, Mindbody Analytics, Perkville, YHCTime) into a single interface. It features a unified activity feed, comprehensive service connection management, and an admin panel for system oversight. The application aims to enhance user efficiency through a centralized digital workspace, offering AI-powered assistance for daily briefings, smart search, email drafting, task generation, meeting preparation, and calendar optimization. It also includes robust native project management capabilities with Kanban boards, multi-homing tasks, and advanced task dependency tracking, along with a user-friendly glassmorphism UI.

## User Preferences

Preferred communication style: Simple, everyday language.
Documentation updates (!updatedocumentation): Include both technical documentation and User Guide sections.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack React Query for state management. Styling is handled by Tailwind CSS v4, implementing a custom glassmorphism design system. UI components are sourced from shadcn/ui (New York style) based on Radix UI primitives. Vite serves as the build tool. The architecture is page-based, featuring a dashboard, service connection management, settings, and an admin panel.

**Rich Text Editor** (`client/src/components/rich-text-editor.tsx`)
- Built with Tiptap editor framework
- Supports Image extension with file picker for uploading images (base64 encoded)
- Supports Table extension for structured layouts (tables, rows, cells)
- Used for email signatures and email composition
- Images auto-sized to 120px max width for professional appearance

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

### Infrastructure & Scaling Features
The application includes enterprise-ready infrastructure components:

**Caching System** (`server/cache.ts`)
- In-memory TTL-based cache for frequently accessed data
- Pre-defined cache keys for Gmail labels, calendar events, user preferences
- Automatic cache cleanup and LRU eviction
- Helper functions: `getOrFetch`, `invalidateGmailCache`, `getCacheStats`

**Rate Limiting** (`server/rate-limiter.ts`)
- Login rate limiter: 5 attempts per 15 minutes, 30-minute block on abuse
- Signup rate limiter: 3 attempts per hour per IP
- API rate limiter: 100 requests per minute
- Gmail-specific limiter: 30 requests per minute
- Exponential backoff retry logic for external API calls

**Security Tables**
- `login_attempts`: Tracks all login attempts with IP, user agent, success status
- `email_verification_tokens`: Email verification tokens with expiration
- `two_factor_secrets`: Optional 2FA with backup codes support

**Monitoring** (`server/monitoring.ts`)
- Error logging with severity levels (info, warn, error, critical)
- Service health tracking with consecutive failure detection
- Metrics recording for operation durations
- Admin endpoints: `/api/admin/system-health`, `/api/admin/error-logs`

**Session Security**
- 7-day session TTL with PostgreSQL session store
- Secure cookie settings: httpOnly, secure, sameSite=none, partitioned
- Trust proxy enabled for proper IP detection

**Modular Routes (V2 API)**
- Located in `server/routes/` folder with domain-specific modules (admin.ts, gmail.ts)
- V2 endpoints registered at `/api/v2/*` with centralized error handling
- Error utilities in `server/errors.ts`: AppError, asyncHandler, globalErrorHandler
- User-friendly error messages for external service failures
- OAuth callbacks protected by signed state tokens (not session auth)
- V1 routes remain at `/api/*` for backward compatibility during migration

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
- **Gmail & Google Calendar**: Via Google APIs for email and calendar management. Supports multiple Gmail accounts per user with OAuth-based authentication. Account-specific label fetching via `getGmailLabelsForUser()` with account isolation enforced server-side.
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

### Email Signatures with Rich Formatting

Create professional email signatures with logos, images, and structured layouts.

#### Creating a Signature
1. Go to Settings and scroll to the "Email Signature" section
2. Use the rich text editor to format your signature
3. Your signature is automatically appended to composed emails

#### Adding Images and Logos
1. In the signature editor, click the image icon in the toolbar
2. Select an image file from your computer (PNG, JPG, GIF supported)
3. Images are automatically sized to a maximum width of 120px for professional appearance
4. You can add multiple images (e.g., company logo, social media icons)

#### Using Tables for Structured Layouts
1. Click the table icon in the toolbar to insert a table
2. Tables are useful for creating side-by-side layouts (e.g., logo next to contact info)
3. Tables display with dashed borders in the editor for visibility, but appear cleanly formatted in sent emails
4. Resize columns by adjusting content or adding/removing cells

#### Tips
- Keep signatures concise and professional
- Use tables to align logos with contact information
- Test your signature by composing a test email to yourself
- Images are embedded as base64, so they display without external hosting

### Multi-Account Gmail Management

Manage multiple Gmail accounts from a single inbox view.

#### Viewing All Accounts
- Select "All Accounts" from the account dropdown to see a unified inbox with emails from all connected accounts
- When viewing all accounts, the folder/label sidebar is hidden since labels are account-specific

#### Viewing a Specific Account
1. Click the account dropdown at the top of the inbox
2. Select the specific Gmail account you want to view
3. The sidebar will show folders (Inbox, Sent, Trash) and custom labels for that account only
4. Email filters and searches apply to the selected account

#### Account Identification
- Each email shows which account it belongs to with an account indicator
- The account dropdown displays the email address for each connected account
- Primary accounts are marked for easy identification

#### Connecting Additional Gmail Accounts
1. Go to Settings > Connected Services
2. Click "Add Gmail Account" 
3. Follow the Google authorization flow
4. The new account will appear in the account dropdown