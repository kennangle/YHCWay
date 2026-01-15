# The YHC Way - Unified Workspace Application

## Overview

The YHC Way is a unified workspace application that integrates multiple productivity tools (Slack, Gmail, Google Calendar, Zoom) into a single, cohesive interface. The application provides a dashboard with a unified feed of activities, service connection management, and an admin panel for managing users, services, and feed items.

The app uses a glassmorphism UI design with a modern React frontend and an Express.js backend, backed by PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with custom glassmorphism design system
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Build Tool**: Vite

The frontend follows a page-based architecture with shared components. Key pages include:
- Landing page (unauthenticated users)
- Dashboard (unified feed and service overview)
- Connect page (service management)
- Settings page
- Admin page (user/service/feed management)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful JSON API under `/api/*` routes
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **Authentication**: Replit Auth via OpenID Connect with Passport.js

The server handles both API routes and serves the static frontend in production. In development, Vite middleware provides hot module replacement.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Key Tables**:
  - `tenants` - Organizations/workspaces for multi-tenancy
  - `tenant_users` - Maps users to tenants with roles (owner, admin, member, guest)
  - `tenant_invitations` - Pending invitations to join organizations
  - `audit_logs` - Enterprise compliance audit trail
  - `users` - User accounts with admin flag
  - `sessions` - Session storage for authentication
  - `services` - Integrated service definitions (Slack, Gmail, etc.)
  - `feedItems` - Unified feed items from various services
  - `apple_calendar_credentials` - Apple CalDAV credentials for users
  - `slack_channel_preferences` - Per-user Slack channel filtering preferences

### Multi-Tenancy Architecture
- **Tenant Isolation**: All tenant-scoped tables include `tenantId` column
- **Role-Based Access Control (RBAC)**: Owner > Admin > Member > Guest
- **Tenant Resolution**: Via `X-Tenant-Id` or `X-Tenant-Slug` headers, or defaults to user's first tenant
- **Middleware**: `tenantMiddleware.ts` populates `req.tenantId` and `req.tenantRole`
- **Audit Logging**: All tenant actions are logged for enterprise compliance
- **SSO Ready**: Schema supports tenant-specific SSO configuration (SAML/OIDC)

### Native Project Management
- **Projects**: Kanban-style project boards with customizable columns
- **Tasks**: Full task management with subtasks, priorities, due dates, and recurring tasks
- **Comments**: Task-level commenting system for collaboration
- **Team Assignments**: Assign tasks and projects to team members
- **Task Sharing**: Share tasks with multiple team members for visibility (viewer/editor roles)
  - `task_collaborators` table tracks shared visibility
  - Collaborators can view/comment on tasks shared with them
  - Shared tasks appear in user's task views alongside their own tasks
  - Authorization: Only task creator/assignee can add/remove collaborators
  - API endpoints: `GET/POST/DELETE /api/tasks/:id/collaborators`
- **Drag & Drop**: @dnd-kit for intuitive task management
- **Asana Import**: One-time migration feature to import projects, sections (as columns), and tasks from Asana
  - Supports pagination for large projects (handles 100+ tasks)
  - Maps Asana sections to project columns
  - Preserves task completion status and due dates

### Asana-Style Multi-Homing System (New)
- **Multi-Homing**: Tasks can belong to multiple projects simultaneously via `task_projects` table
- **Placement Tracking**: Per-project column and sort order using `orderKey` (lexicographic) for fractional ordering
- **Task Stories**: Unified activity feed combining comments and automated activity logs via `task_stories` table
- **Event Outbox**: Transactional outbox pattern (`event_outbox` table) for reliable side effects
- **Background Worker**: `outboxWorker.ts` processes events asynchronously, creating activity stories for task movements
- **API Endpoints**:
  - `PATCH /api/tasks/:id/placement` - Update task's position in a project
  - `POST /api/tasks/:id/projects` - Add task to a project (multi-homing)
  - `DELETE /api/tasks/:taskId/projects/:projectId` - Remove task from a project
  - `GET /api/tasks/:id/stories` - Get unified activity/comment feed
  - `POST /api/tasks/:id/comments` - Add a comment (creates story entry)
  - `GET /api/projects/:projectId/board` - Get placement-aware board data

### AI Assistant Features
Powered by OpenAI GPT-4.1-mini via Replit AI Integrations (uses `AI_INTEGRATIONS_OPENAI_API_KEY`):
- **Daily Briefing**: Morning summary of tasks, meetings, and urgent messages
- **Smart Search**: Natural language search across emails, tasks, calendar, and Slack
- **Email Drafting**: Compose emails from simple prompts
- **Smart Task Generation**: Extract actionable tasks from emails/Slack/meeting notes
- **Meeting Prep**: Context summary before meetings (related emails, tasks, Slack)
- **Calendar Optimization**: Identify overloaded days and suggest focus time blocks
- **Task Prioritization**: AI-powered ranking of tasks by urgency and importance

All AI features are user-scoped for security (data isolation per user). Note: Calendar data uses the Replit Google Calendar connector which is app-level (admin's calendar shared with team).

### Service Integrations
- **Gmail & Google Calendar**: OAuth via Google APIs (gmail.modify, gmail.send scopes)
- **Slack**: Bot token for channel/DM access + user-specific message retrieval
- **Zoom**: Server-to-server OAuth
- **Apple Calendar**: CalDAV via tsdav library (requires user app-specific password)
- **Asana**: OAuth for project/task data import (one-time migration, not ongoing sync)
- **Calendly**: Personal Access Token integration for scheduling
  - Events merged with Google Calendar in unified calendar view
  - Displays in Dashboard "Upcoming Events" widget with blue "Calendly" badge
  - Visual distinction with Calendly blue (#006BFF) color in calendar legend
  - Requires user to enter their Calendly Personal Access Token via Connect page
- **Mindbody Analytics**: External API integration via Bearer token for intro offer tracking
  - Dedicated `/intro-offers` page for viewing and managing intro offers
- **Perkville**: Resource Owner Grant integration for loyalty rewards program
  - Uses password-based authentication (admin enters Perkville email/password)
  - **Business ID**: Configured via `PERKVILLE_BUSINESS_ID` environment variable (defaults to 7128 for Yoga Health Center)
  - Dedicated `/rewards` page with dual views:
    - **Business Analytics**: Total points across all customers, customer count, top customer leaderboard
    - **Customer Lookup**: Search customers by email to view their point balance
    - **Personal Account**: View your own points (total/available/pending) and recent activity history
  - API endpoints:
    - `connect` (POST with username/password), `disconnect`, `status`
    - `me`, `points`, `rewards`, `activity` - Personal account data
    - `businesses` - Fetches specific business by ID (not all businesses)
    - `customers?businessId=X` - Get all customers with merged point balances
    - `balances?businessId=X` - Get aggregated totals (total points, customer count)
    - `search?email=X` - Search customer by email with balance lookup
  - Data merging: `/customers` endpoint fetches both customer list and connection-balances, merges via Map(connectionId → balance) to ensure accurate point totals
  - Scopes granted: PUBLIC, ADMIN_CUSTOMER_INFO
  - Requires `PERKVILLE_CLIENT_ID`, `PERKVILLE_CLIENT_SECRET`, and `PERKVILLE_BUSINESS_ID` environment variables
- **YHCTime**: Employee time tracking integration
  - **Prerequisite**: Users must link their YHC Way account to a YHCTime employee ID before they can enter time (via Settings page)
  - Sessions API for creating, viewing, and deleting time entries
  - Role-based access: Non-admins only see their own entries, admins see all
  - User linking: Users can link their account to a YHCTime employee ID in Settings
  - Dedicated `/time-tracking` page for managing time entries

### Development Changelog
- **Automated Git Sync**: Ingests git commits and categorizes them by type (feature, fix, improvement, docs, deploy)
- **Manual Entries**: Admins can add manual changelog entries for non-code work
- **Date Filtering**: View changelog entries by date range
- **Duplicate Prevention**: Tracks last synced commit hash to prevent re-importing
- **Admin Only**: All changelog routes require admin access
- **Database Tables**: `changelog_entries` (entries), `changelog_sync_state` (sync tracking)
- **API Endpoints**:
  - `GET /api/changelog?from=&to=` - Fetch entries by date range
  - `POST /api/changelog` - Add manual entry
  - `POST /api/changelog/sync` - Sync git commits to changelog
- **UI**: Dedicated `/changelog` page accessible from sidebar (Operations > Changelog)

### Other Integrations (continued)
  - **YHCTime** requires `YHCTIME_API_KEY` environment variable
- **QR Tiger**: API integration for dynamic QR code generation and tracking
  - Creates dynamic QR codes with customizable colors
  - Tracks scan analytics (requires valid QR Tiger ID)
  - Local database persistence for QR codes created in-app
  - Requires `QR_TIGER_API_KEY` environment variable
  - API limitation: Cannot list existing QR codes from QR Tiger account, only tracks codes created in-app

### Authentication & Authorization
- **Method**: Local email/password authentication with session cookies
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Admin Access**: Determined by `isAdmin` flag on user record, with a hardcoded admin email constant
- **Password Reset**: Via Brevo transactional emails (requires verified sender in Brevo)
- **User Approval**: New users require admin approval before accessing the app

### Guided Tour (Onboarding)
- **Implementation**: driver.js library for step-by-step walkthrough
- **Tracking**: Stored in database per user (`hasCompletedTour` field)
- **Behavior**: Only shows for new users with `hasCompletedTour === false`
- **API**: `POST /api/auth/tour-completed` marks tour as done

### Email Service (Brevo)
- **Provider**: Brevo (formerly Sendinblue) transactional emails
- **Templates**: Password reset, user invitation, notifications
- **Sender**: Configured via `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`
- **Important**: Sender email must be verified in Brevo, and recipient emails must not be on Brevo's blocklist
- **IP Blocking**: Must be deactivated in Brevo for Replit deployments (dynamic IPs)

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and query client
│   │   └── pages/        # Page components
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations
│   └── replitAuth.ts # Authentication setup
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema and types
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations with `drizzle-kit` for migrations

### Authentication
- **Replit Auth**: OpenID Connect provider (configured via `ISSUER_URL`)
- **Required Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Secret for session encryption
  - `REPL_ID` - Replit environment identifier

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management
- **embla-carousel-react**: Carousel functionality
- **react-day-picker**: Calendar/date picker
- **vaul**: Drawer component
- **cmdk**: Command palette

### Development Tools
- **Vite**: Development server and build tool
- **esbuild**: Production server bundling
- **TypeScript**: Type checking across the stack