# The YHC Way - Unified Workspace Application

## Overview
The YHC Way is a unified workspace application designed to centralize productivity by integrating various external tools (e.g., Slack, Gmail, Google Calendar, Zoom, Asana) into a single interface. It provides a unified activity feed, comprehensive service connection management, and an administrative panel for system oversight. The application aims to enhance user efficiency through a centralized digital workspace, offering AI-powered assistance for daily briefings, smart search, email drafting, task generation, meeting preparation, and calendar optimization. It also includes robust native project management capabilities with Kanban boards, multi-homing tasks, advanced task dependency tracking, and a user-friendly glassmorphism UI.

## User Preferences
Preferred communication style: Simple, everyday language.
Documentation updates (!updatedocumentation): Include both technical documentation and User Guide sections.

## Bang Commands (CRITICAL)
**IMPORTANT**: This project uses bang commands for AI workflow automation. When the user types ANY message starting with `!`, you MUST:

1. **FIRST**: Read `docs/bangcommands.md` to understand the command's purpose, behavior, and expected output format
2. **THEN**: Execute the command according to its specification

### Available Commands Reference
| Command | Purpose |
|---------|---------|
| `!timereport [date]` | Generate time and progress report (today, yesterday, specific date) |
| `!analyze` | Comprehensive analysis with structured reporting |
| `!arch` | Consult architect agent for code review/guidance |
| `!ask` | Get confirmation before implementing changes |
| `!bug` | Capture and document issues systematically |
| `!codecheck` | Full quality audit (Prettier, ESLint, TypeScript) |
| `!debug` | Multi-tenant aware debugging |
| `!deep` | Thorough investigation and root cause analysis |
| `!design` | Apply design standards from design.md |
| `!diagnose` | Systematic problem diagnosis |
| `!gr` | Guardrails compliance review |
| `!mobile [subcommand]` | Mobile-first optimization (touch, forms, navigation, etc.) |
| `!narrative` | Update PROJECT_NARRATIVE_REPORT.md |
| `!security` | Comprehensive security audit |
| `!suggest` | Solution proposals without implementation |
| `!unanswered` | Find pending questions in conversation |
| `!updatedocumentation` | Update all documentation files |

### Command Documentation Location
Full command specifications: `docs/bangcommands.md`

## Daily Announcement Process
**IMPORTANT**: At the end of each working session (or at 5 PM PST if session is active), create a notification announcement summarizing:
- New features added that day
- Modifications or changes made
- Bug fixes implemented

Use the admin broadcast endpoint (`POST /api/admin/announcements/broadcast`) or direct SQL insert to `user_notifications` table with:
- type: `'daily.summary'`
- title: `'Daily Update: [Date]'`
- body: Summary of changes
- tenant_id: NULL (global announcement)
- expires_at: 14 days from creation

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack React Query for state management. Styling utilizes Tailwind CSS v4 with a custom glassmorphism design system. UI components are from shadcn/ui (New York style) based on Radix UI primitives. Vite is used for building. The architecture is page-based, including a dashboard, service connection management, settings, and an admin panel. A Tiptap-based rich text editor supports image uploads and tables for email signatures and composition.

### Backend
The backend is an Express.js application with TypeScript, providing a RESTful JSON API. Session management uses `express-session` with a PostgreSQL store. Authentication is handled via Replit Auth (OpenID Connect) and Passport.js. The server serves both API routes and static frontend assets. Multi-tenancy is supported with `tenantId` isolation and Role-Based Access Control (RBAC) for `admin`, `member`, and `guest` roles. An audit logging system tracks tenant actions.

### Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM. Key tables support tenants, users, services, activity feeds, and extensive project management features including projects, tasks, collaborators, dependencies, and event outboxes.

### Native Project Management
The application offers comprehensive project management with Kanban boards, tasks supporting subtasks, priorities, due dates, recurring elements, and commenting. Tasks can be assigned to teams and multi-homed across projects. Features include drag-and-drop functionality, visual task dependencies with circular dependency prevention, and a quick filter bar. An Asana import feature is available for migration.

### AI Assistant
Integrated AI capabilities, powered by OpenAI GPT-4.1-mini, provide:
- Daily Briefings
- Smart Search
- Email Drafting
- Smart Task Generation
- Meeting Preparation
- Calendar Optimization
- AI-powered Task Prioritization

### Authentication & Authorization
Uses local email/password authentication with PostgreSQL-backed session cookies. Admin access is managed by an `isAdmin` flag. New users require admin approval, and password resets use Brevo for transactional emails. A `driver.js` guided tour handles user onboarding.

### Infrastructure & Scaling
The application includes:
- **Caching System**: In-memory, TTL-based cache for frequently accessed data with LRU eviction.
- **Rate Limiting**: Configurable rate limits for login, signup, general API, and specific service calls (e.g., Gmail).
- **Security**: Tracks login attempts, uses email verification tokens, and supports optional two-factor authentication.
- **Monitoring**: Error logging, service health tracking, and metrics recording, accessible via admin endpoints and a dedicated System Health Dashboard.
- **Session Security**: 7-day TTL, httpOnly, secure, sameSite=none, and partitioned cookies.
- **Modular Routes**: V2 API routes organized by domain (admin, gmail, tasks, slack, projects) with centralized error handling and OAuth callback protection.
- **Testing Infrastructure**: Vitest for unit and integration tests, including coverage reporting.

### Testing Infrastructure

The application uses Vitest for automated testing with the following commands:

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode (auto-rerun on file changes)
- `npm run test:coverage` - Run tests with coverage report

Test files are located in the `tests/` directory:
- `tests/unit/server/cache.test.ts` - Cache module tests (TTL, getOrFetch, invalidation)
- `tests/unit/server/auth.test.ts` - Authentication validation tests (password, email)
- `tests/unit/server/task-dependencies.test.ts` - Circular dependency detection
- `tests/integration/api.test.ts` - API route pattern and error handling tests

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe database interactions.

### Authentication
- **Replit Auth**: OpenID Connect provider.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Styling framework.
- **shadcn/ui**: UI component library.

### Service Integrations
- **Gmail & Google Calendar**: Via Google APIs for email and calendar management, supporting multiple accounts.
- **Slack**: Bot token for channel/DM access.
- **Zoom**: Server-to-server OAuth.
- **Apple Calendar**: CalDAV via `tsdav` for synchronization.
- **Asana**: OAuth for project/task import.
- **Calendly**: Personal Access Token for scheduling.
- **Mindbody Analytics**: External API for intro offer tracking. Full API documentation: `docs/mbanalytics.ai`
- **Perkville**: Resource Owner Grant for loyalty rewards.
- **YHCTime**: Employee time tracking integration.
- **QR Tiger**: API for dynamic QR code generation.
- **Brevo (formerly Sendinblue)**: Transactional email service.

### Development Tools
- **Vite**: Development server and build tool.
- **esbuild**: Production server bundling.
- **TypeScript**: Language for type checking.

## Important Maintenance Notes

### drizzle-kit Removed for Deployment (Feb 20, 2026)
**CRITICAL**: `drizzle-kit` was removed from devDependencies to pass Replit's deployment security scan (it had 4 moderate vulnerabilities via its esbuild dependency chain). 

**Before making ANY database schema changes** (adding/removing columns, creating new tables, modifying table structures in `shared/schema.ts`), you MUST:
1. Re-install drizzle-kit: `npm install -D drizzle-kit`
2. Make the schema changes
3. Run `npm run db:push` to sync the database
4. Uninstall drizzle-kit again before deploying: `npm uninstall drizzle-kit`

The Drizzle ORM (runtime query library) is still installed — only the schema migration CLI tool was removed. The app runs fine without it.