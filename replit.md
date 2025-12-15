# UniWork - Unified Workspace Application

## Overview

UniWork is a unified workspace application that integrates multiple productivity tools (Slack, Gmail, Google Calendar, Zoom) into a single, cohesive interface. The application provides a dashboard with a unified feed of activities, service connection management, and an admin panel for managing users, services, and feed items.

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
  - `users` - User accounts with admin flag
  - `sessions` - Session storage for authentication
  - `services` - Integrated service definitions (Slack, Gmail, etc.)
  - `feedItems` - Unified feed items from various services
  - `apple_calendar_credentials` - Apple CalDAV credentials for users
  - `slack_channel_preferences` - Per-user Slack channel filtering preferences

### Service Integrations
- **Gmail & Google Calendar**: OAuth via Google APIs
- **Slack**: Bot token for channel/DM access
- **Zoom**: Server-to-server OAuth
- **Apple Calendar**: CalDAV via tsdav library (requires user app-specific password)

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