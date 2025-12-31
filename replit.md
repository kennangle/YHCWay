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
- **Drag & Drop**: @dnd-kit for intuitive task management
- **Asana Import**: One-time migration feature to import projects, sections (as columns), and tasks from Asana
  - Supports pagination for large projects (handles 100+ tasks)
  - Maps Asana sections to project columns
  - Preserves task completion status and due dates

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
- **Mindbody Analytics**: External API integration via Bearer token for intro offer tracking
  - Dedicated `/intro-offers` page for viewing and managing intro offers
  - Intro offers also appear in the dashboard unified feed
  - Requires `MINDBODY_API_KEY` environment variable

### Authentication & Authorization
- **Method**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions
- **Admin Access**: Determined by `isAdmin` flag on user record, with a hardcoded admin email constant

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