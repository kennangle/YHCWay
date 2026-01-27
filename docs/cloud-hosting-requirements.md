# The YHC Way - Cloud Hosting Requirements

**Generated:** January 27, 2026  
**Application:** The YHC Way - Unified Workspace Platform

---

## Tech Stack Overview

### Frontend
| Category | Technology |
|----------|------------|
| **Framework** | React 18 |
| **Language** | TypeScript |
| **Build Tool** | Vite 7 |
| **Routing** | Wouter |
| **State Management** | TanStack React Query, Zustand |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Rich Text Editor** | TipTap |
| **Drag & Drop** | dnd-kit |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **Date Handling** | date-fns |
| **Animations** | Framer Motion |
| **Onboarding Tours** | Driver.js |

### Backend
| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM |
| **Session Store** | connect-pg-simple (PostgreSQL) |
| **Authentication** | Passport.js (Local + Google OAuth) |
| **Password Hashing** | bcryptjs |
| **WebSockets** | ws |
| **AI Integration** | OpenAI GPT-4.1-mini |
| **Email Service** | Brevo (Sendinblue) |
| **File Storage** | Google Cloud Storage |
| **Rate Limiting** | Custom in-memory implementation |
| **Caching** | Custom in-memory TTL cache with LRU |

### Development & Build
| Category | Technology |
|----------|------------|
| **Dev Server** | Vite |
| **Production Bundler** | esbuild |
| **TypeScript Runner** | tsx |
| **Testing** | Vitest |
| **Schema Validation** | Zod, drizzle-zod |
| **HTML Sanitization** | DOMPurify |

### External Service Integrations
| Service | SDK/Library |
|---------|-------------|
| **Google APIs** | googleapis, google-auth-library |
| **Slack** | REST API (custom) |
| **Zoom** | REST API (custom) |
| **Asana** | asana SDK |
| **Apple Calendar** | tsdav (CalDAV) |
| **Mindbody** | REST API (custom) |
| **Perkville** | REST API (custom) |
| **QR Tiger** | REST API (custom) |
| **Calendly** | REST API (custom) |

---

## 1. Runtime

| Component | Technology |
|-----------|------------|
| **Server** | Node.js + Express.js (TypeScript) |
| **Frontend** | React 18 + Vite (static build served by Express) |
| **Background Jobs** | Yes - Outbox worker, daily announcement scheduler |
| **WebSockets** | Yes - Real-time notifications via `ws` package |
| **Build Step** | `npm run build` → esbuild bundles to `dist/index.cjs` |
| **Start Command** | `NODE_ENV=production node dist/index.cjs` |

---

## 2. State (Data Storage)

| Type | Details |
|------|---------|
| **Database** | PostgreSQL (Drizzle ORM) |
| **File Storage** | Google Cloud Storage (Object Storage) for images, attachments |
| **Queues** | Event outbox table (database-backed, polled by worker) |
| **Cron/Scheduled Jobs** | `setInterval`-based: cache cleanup (1 min), rate limiter cleanup (1 min), daily announcements (5 PM PST), outbox processing |
| **Sessions** | PostgreSQL-backed via `connect-pg-simple` (7-day TTL) |
| **Cache** | In-memory TTL cache with LRU eviction |

### Database Tables (Key)
- `users` - User accounts and authentication
- `tenants` - Multi-tenancy support
- `projects` - Project management
- `tasks` - Task tracking with dependencies
- `project_columns` - Kanban board columns
- `gmail_accounts` - Multi-account Gmail integration
- `email_signatures` - Rich HTML signatures
- `user_notifications` - In-app notifications
- `activity_feed` - Unified activity stream
- `service_connections` - OAuth tokens for external services
- `changelog_entries` - Feature changelog
- `audit_logs` - Tenant action audit trail

---

## 3. Traffic Profile

| Aspect | Assessment |
|--------|------------|
| **Pattern** | Low/steady internal staff usage (4-10 concurrent users) |
| **Peak Times** | Business hours (9 AM - 6 PM PST weekdays) |
| **Long-running Requests** | AI operations (email drafting, briefings) - up to 30s |
| **WebSocket Connections** | Persistent for real-time notifications |
| **API Polling** | Gmail, Calendar sync every 60-120 seconds per user |

---

## 4. External Dependencies

### OAuth Integrations (Require Callback URLs)

| Service | Integration Type | Callback URL |
|---------|------------------|--------------|
| **Google (Gmail, Calendar, Drive, Docs, Sheets)** | OAuth 2.0 | `/api/auth/google/callback` |
| **Zoom** | Server-to-server OAuth | `/api/zoom/callback` |
| **Asana** | OAuth 2.0 | `/api/auth/asana/callback` |

### API Key Integrations

| Service | Purpose |
|---------|---------|
| **OpenAI** | AI-powered features (email drafting, briefings, smart search) |
| **Mindbody** | Intro offer tracking, member analytics |
| **Perkville** | Loyalty rewards program |
| **Brevo (Sendinblue)** | Transactional emails (password reset, verification) |
| **QR Tiger** | Dynamic QR code generation |

### Other Integrations

| Service | Integration Type |
|---------|------------------|
| **Slack** | Bot Token (channel/DM access) |
| **Apple Calendar** | CalDAV (username/password) |
| **Calendly** | Personal Access Token |
| **YHCTime** | Employee time tracking API |

---

## 5. Non-Functional Requirements

| Requirement | Status/Notes |
|-------------|--------------|
| **Uptime Expectation** | Business hours critical (99% during 8 AM - 6 PM PST) |
| **HIPAA/PII** | Contains employee emails, member contact info - standard business data, not PHI |
| **Audit Logging** | Yes - tenant action audit trail in database |
| **Rate Limiting** | Implemented (login: 5/15min, signup: 3/hour, API: 100/min, Gmail: 30/min) |
| **Security** | bcrypt passwords, session-based auth, CORS, DOMPurify HTML sanitization |
| **Backup** | Database backup endpoint (`/api/admin/database/backup`) |
| **Testing** | Vitest unit/integration tests |

---

## 6. Deployment Shape

### Build & Start Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Push database schema
npm run db:push

# Start production server
NODE_ENV=production node dist/index.cjs
```

### Port Configuration

- **Port 5000**: Frontend + API (same Express server)

### Required Secrets

```
SESSION_SECRET              # Session encryption key
GOOGLE_CLIENT_ID            # Google OAuth
GOOGLE_CLIENT_SECRET        # Google OAuth
AI_INTEGRATIONS_OPENAI_API_KEY    # OpenAI API
AI_INTEGRATIONS_OPENAI_BASE_URL   # OpenAI endpoint
QR_TIGER_API_KEY            # QR code generation
MINDBODY_API_KEY            # Mindbody analytics
PERKVILLE_CLIENT_ID         # Perkville OAuth
PERKVILLE_CLIENT_SECRET     # Perkville OAuth
ZOOM_CLIENT_ID              # Zoom OAuth
ZOOM_CLIENT_SECRET          # Zoom OAuth
BREVO_API_KEY               # Transactional email (optional - uses integration)
```

### Required Environment Variables

```
APP_URL=https://yhcway.com
BREVO_SENDER_EMAIL=ken@yogahealthcenter.com
BREVO_SENDER_NAME=Ken Nangle
PERKVILLE_BUSINESS_ID=7128
GUSTO_USE_PRODUCTION=true
NODE_ENV=production
```

### Database Connection

```
DATABASE_URL=postgresql://user:pass@host:5432/database
# OR individual variables:
PGHOST=host
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=database
```

---

## 7. Domain/SSL

| Item | Details |
|------|---------|
| **Custom Domain** | `yhcway.com` |
| **SSL** | Required (HTTPS for OAuth callbacks, cookies) |
| **Subdomains** | None (single-tenant deployment) |
| **Cookie Settings** | httpOnly, secure, sameSite=none, partitioned |

### OAuth Callback URLs to Update

When migrating to new hosting, update these in provider consoles:

1. **Google Cloud Console**: `https://yhcway.com/api/auth/google/callback`
2. **Zoom Marketplace**: `https://yhcway.com/api/zoom/callback`
3. **Asana Developer Console**: `https://yhcway.com/api/auth/asana/callback`

---

## 8. Migration Checklist

### Database
- [ ] Provision managed PostgreSQL (Neon, Supabase, RDS, PlanetScale, etc.)
- [ ] Export data from current database
- [ ] Import to new database
- [ ] Run `npm run db:push` to verify schema

### Object Storage
- [ ] Create GCS bucket or S3-compatible storage
- [ ] Migrate existing files
- [ ] Update storage configuration

### OAuth Providers
- [ ] Update Google OAuth callback URLs
- [ ] Update Zoom OAuth callback URLs
- [ ] Update Asana OAuth callback URLs
- [ ] Re-authenticate connected services

### Environment
- [ ] Configure all secrets in new platform
- [ ] Set environment variables
- [ ] Configure custom domain DNS
- [ ] Provision SSL certificate

### Testing
- [ ] Verify authentication flow
- [ ] Test Gmail integration
- [ ] Test Calendar sync
- [ ] Verify WebSocket notifications
- [ ] Test AI features
- [ ] Confirm database backup works

---

## 9. Hosting Platform Considerations

### Recommended Features
- Managed PostgreSQL
- Persistent WebSocket support
- Custom domain + SSL
- Environment variable management
- Container or Node.js runtime support
- Health checks

### Compatible Platforms
- **Railway** - Easy migration, managed Postgres
- **Render** - Good for Node.js, managed DB
- **Fly.io** - Global edge deployment
- **DigitalOcean App Platform** - Straightforward pricing
- **AWS (ECS/Elastic Beanstalk)** - Enterprise-grade
- **Google Cloud Run** - Serverless containers
- **Heroku** - Simple deployment (higher cost)

### Not Recommended
- Vercel (serverless, no WebSocket support for background jobs)
- Netlify (frontend-focused, limited backend)
- Static hosting (requires separate API deployment)

---

## 10. Cost Estimates

### Compute
- Small Node.js instance: $5-25/month
- With 4-10 users, minimal compute needed

### Database
- Managed PostgreSQL (1GB): $5-15/month
- Storage grows slowly (mostly text data)

### Object Storage
- Current usage minimal: <$5/month
- Mainly email signatures and attachments

### Total Estimated Monthly Cost
- **Budget option**: $15-30/month
- **Production option**: $40-75/month (includes backups, monitoring)
