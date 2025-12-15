# Development Workflow and AI Interaction Commands

**Note: Development Mode Only** - These bang commands (!) are available exclusively in development mode through the CommandPalette UI component (`client/src/components/CommandPalette.tsx`). The CommandPalette is accessible via keyboard shortcut (Cmd+K or Ctrl+K) and automatically excluded from production builds using `import.meta.env.DEV`.

This application supports enhanced AI interaction through bang commands for automated development workflow and quality assurance.

## Available Commands

| Command                 | Purpose                    | Usage                                           |
| ----------------------- | -------------------------- | ----------------------------------------------- |
| `!analyze`              | Comprehensive analysis     | Detailed situation analysis and insights        |
| `!arch`                 | Architect consultation     | Consult with architect agent for review/guidance |
| `!ask`                  | Confirmation before action | Get summary and approval before implementation  |
| `!bug`                  | Bug reporting              | Capture and document issues systematically      |
| `!codecheck`            | Full quality audit         | Prettier, ESLint, TypeScript, multi-tenancy checks |
| `!debug`                | Debug with tenancy checks  | Multi-tenant aware debugging and issue analysis |
| `!deep`                 | Comprehensive diagnosis    | Thorough investigation and root cause analysis  |
| `!design`               | Apply design standards     | Automatic design pattern application            |
| `!diagnose`             | Issue investigation        | Systematic problem diagnosis with solutions     |
| `!gr`                   | Guardrails review          | Check policy compliance and violations          |
| `!mobile`               | Mobile-first optimization  | Review code and apply mobile-first principles   |
| `!mobile accessibility` | Mobile A11y focus          | Check screen reader and mobile accessibility    |
| `!mobile audit`         | Full mobile review         | Comprehensive mobile optimization audit         |
| `!mobile critical`      | Critical mobile issues     | Show only blocking mobile problems              |
| `!mobile forms`         | Mobile form analysis       | Optimize form layouts and input types           |
| `!mobile gestures`      | Touch interaction patterns | Review swipe, scroll, and gesture handling      |
| `!mobile landscape`     | Orientation handling       | Test landscape mode adaptation                  |
| `!mobile navigation`    | Navigation UX review       | Analyze mobile navigation patterns              |
| `!mobile overflow`      | Viewport overflow check    | Detect horizontal scroll and fixed-width issues |
| `!mobile performance`   | Mobile performance check   | Identify performance issues on mobile devices   |
| `!mobile quick`         | Quick mobile check         | Fast scan of common mobile problems             |
| `!mobile safe-areas`    | Safe area compliance       | Check notch and home indicator compatibility    |
| `!mobile touch`         | Touch target audit         | Verify 44px touch targets and spacing           |
| `!mobile typography`    | Mobile text optimization   | Check font sizes, line heights, text overflow   |
| `!narrative`            | Update project narrative   | Update the Complete Project Narrative report     |
| `!security`             | Security audit             | Comprehensive security vulnerability assessment |
| `!suggest`              | Solution suggestions       | Detailed proposals without implementation       |
| `!timereport [date]`    | Daily time and progress    | Generate time report for today, yesterday, etc  |
| `!unanswered`           | Find pending questions     | Identify unresolved questions in conversation   |
| `!updatedocumentation`  | Update all documentation   | Update all relevant user guides and docs        |

## Key Command Details

### `!analyze` - Comprehensive Analysis

- **Purpose**: Advanced multi-dimensional analysis with structured reporting
- **Enhanced Features**:
  - Structured analysis types (performance, security, technical, business, data)
  - Multi-dimensional framework (current state, root causes, impact, risk, opportunities)
  - Automated data collection from logs, git history, database metrics
  - Visual analysis reports with priority-ranked action items
  - Context-aware intelligence that remembers previous analyses
- **Example**: `!analyze performance database query slowdown`

### `!arch` - Architect Consultation

- **Purpose**: Consult with the architect agent for code review, architectural guidance, or strategic recommendations
- **Behavior**: Invokes the architect tool to analyze code, provide architectural insights, review implementations, suggest improvements, and validate design decisions
- **Use Cases**:
  - Review code quality and architecture patterns
  - Get strategic recommendations for complex features
  - Validate technical decisions and design patterns
  - Analyze root causes of technical issues
  - Plan complex refactoring or system improvements
- **Example**: `!arch review the import worker architecture for potential improvements`

### `!ask` - Ask for Confirmation

- **Purpose**: Get user approval before implementing changes
- **Behavior**: AI summarizes request and waits for explicit confirmation
- **Example**: `!ask implement user authentication system`

### `!bug` - Bug Report Documentation

- **Purpose**: Systematically capture and document reported issues
- **Behavior**: Captures facts, adds structured entry to bugs.md, includes technical details, assesses impact, assigns tracking number
- **Example**: `!bug users can't clock out after break ends`

### `!codecheck` - Full Code Quality Audit with Multi-Tenancy Validation

- **Purpose**: Run comprehensive code quality checks including formatting, linting, type checking, and multi-tenancy compliance
- **Behavior**: Executes four-step quality audit:
  1. **Prettier** - Checks code formatting consistency (line width, indentation, quotes, semicolons)
  2. **ESLint** - Analyzes code quality and best practices (TypeScript, React rules, policy violations)
  3. **TypeScript** - Verifies type safety and catches type errors
  4. **Multi-Tenancy Validation** - Ensures strict tenant isolation compliance:
     - **Data Isolation**: All database queries filter by `organizationId`
     - **API Security**: All routes enforce organization-level scoping
     - **Session Validation**: User sessions validate organizationId before accessing data
     - **Webhook Scoping**: Webhook subscriptions scoped by eventType AND siteId
     - **Schema Compliance**: Organization-specific tables include organization_id with proper indexing
     - **Support Access**: Support session tokens validate per-request
     - **No Hardcoded IDs**: No hardcoded organization IDs in code
     - **Cross-Tenant Prevention**: API responses don't leak cross-tenant data
- **Multi-Tenancy Audit Checklist**:
  - ✅ All queries filter by organizationId
  - ✅ Storage methods enforce tenant scoping
  - ✅ Background jobs/scheduled tasks verify organizationId
  - ✅ Session middleware validates organization access
  - ✅ Support access tokens validate on every request
  - ✅ No cross-tenant data leaks in responses
- **Auto-fix Available**: Run `./codecheck.sh --fix` or use the auto-fix commands in output
- **Configuration**: `.prettierrc`, `eslint.config.js`, `tsconfig.json`
- **Use Cases**:
  - Before committing code to ensure quality and multi-tenancy compliance
  - Regular code health checks during development
  - Validating new features don't violate tenant isolation
  - Post-merge verification of external contributions
- **Example**: `!codecheck`
- **Documentation**: See `!codecheck.md` for detailed usage and troubleshooting

### `!debug` - Multi-Tenant Aware Debugging

- **Purpose**: Debug issues with explicit multi-tenancy compliance checks
- **Behavior**: Investigates reported issues while enforcing strict multi-tenancy validation:
  - **Data Isolation Verification**: Confirms all database queries filter by `organizationId`
  - **Tenant Scoping Checks**: Validates API routes, storage methods, and background jobs enforce organization-level scoping
  - **Session Security**: Ensures user sessions validate organizationId before accessing organization data
  - **Cross-Tenant Leak Prevention**: Identifies potential data leakage between organizations
  - **Webhook Multi-Tenancy**: Verifies webhook subscriptions are scoped by both eventType AND siteId
  - **Audit Trail**: Confirms all tenant-switching actions (support mode) are logged
  - **Schema Compliance**: Validates organization-specific tables include organization_id columns with proper indexing
- **Multi-Tenancy Audit Checklist**:
  - ✅ All queries filter by organizationId
  - ✅ Storage methods enforce tenant scoping
  - ✅ Background jobs/scheduled tasks verify organizationId
  - ✅ Session middleware validates organization access
  - ✅ No hardcoded organization IDs in code
  - ✅ Support access tokens validate per-request
  - ✅ API responses don't leak cross-tenant data
- **Use Cases**:
  - Debugging features that handle organization-specific data
  - Investigating potential data isolation issues
  - Validating new features comply with multi-tenancy requirements
  - Troubleshooting support access or session switching
- **Example**: `!debug users can see data from other organizations in the dashboard`

### `!deep` - Deep Analysis and Diagnosis

- **Purpose**: Comprehensive investigation requiring thorough research
- **Behavior**: Performs extensive diagnosis, researches dependencies, analyzes impacts, and provides detailed findings before asking for confirmation
- **Example**: `!deep the login system is failing intermittently`

### `!design` - Apply Design Standards

- **Purpose**: Automatically apply established design patterns and standards
- **Behavior**: References design.md standards, applies proven patterns, ensures Safari compatibility, implements consistent typography
- **Example**: `!design create a user profile settings modal`

### `!diagnose` - System Diagnosis

- **Purpose**: Systematic problem investigation and solution identification
- **Behavior**: Investigates thoroughly, analyzes code/config, checks logs, tests functionality, presents diagnosis with specific fixes
- **Example**: `!diagnose database connection timeouts`

### `!gr` - Guardrails Compliance Review

- **Purpose**: Comprehensive review for policy compliance and violations
- **Behavior**: Reviews recent changes for NO TIME CONVERSION policy, Safari compatibility, compact design system (24px heights), dropdown standards
- **Example**: `!gr`

### `!mobile` - Mobile-First Optimization

- **Purpose**: Review code and apply mobile-first design principles
- **Behavior**: Analyzes components for mobile usability, ensures 24px minimum touch targets, applies responsive breakpoints, optimizes for touch interactions, verifies mobile layouts and navigation patterns
- **Example**: `!mobile optimize the time entry form for mobile devices`

### `!mobile accessibility` - Mobile A11y Focus

- **Purpose**: Ensure mobile accessibility compliance
- **Behavior**: Verifies screen reader navigation, checks focus management with virtual keyboards, reviews contrast ratios, ensures voice-over navigation
- **Example**: `!mobile accessibility check screen reader compatibility`

### `!mobile audit` - Full Mobile Review

- **Purpose**: Comprehensive mobile optimization analysis
- **Behavior**: Runs all mobile checks systematically, provides detailed report with priority rankings, includes performance metrics and user experience analysis
- **Example**: `!mobile audit complete mobile assessment`

### `!mobile critical` - Critical Mobile Issues

- **Purpose**: Focus on blocking mobile problems only
- **Behavior**: Shows only critical issues that prevent mobile usage, prioritizes by impact severity, provides immediate fixes for urgent problems
- **Example**: `!mobile critical find blocking mobile issues`

### `!mobile forms` - Mobile Form Analysis

- **Purpose**: Optimize forms for mobile devices
- **Behavior**: Checks input types are mobile-optimized, verifies form layouts stack properly, ensures labels are visible, checks mobile-friendly validation patterns
- **Example**: `!mobile forms optimize the registration form layout`

### `!mobile gestures` - Touch Interaction Patterns

- **Purpose**: Review touch and gesture interactions
- **Behavior**: Checks swipe navigation implementation, verifies pull-to-refresh, reviews scroll behavior and momentum, checks for conflicting touch events
- **Example**: `!mobile gestures optimize swipe interactions`

### `!mobile landscape` - Orientation Handling

- **Purpose**: Test layout adaptation to landscape mode
- **Behavior**: Tests layout in landscape orientation, checks content accessibility, verifies keyboard doesn't obscure inputs, reviews media query breakpoints
- **Example**: `!mobile landscape test form usability in landscape mode`

### `!mobile navigation` - Navigation UX Review

- **Purpose**: Analyze mobile navigation patterns
- **Behavior**: Reviews navigation patterns (bottom nav, hamburger), checks sticky elements, verifies thumb-reachable navigation, reviews breadcrumbs and back buttons
- **Example**: `!mobile navigation review the main navigation system`

### `!mobile overflow` - Viewport Overflow Detection

- **Purpose**: Identify content that overflows mobile screens
- **Behavior**: Scans for fixed-width elements, checks horizontal scroll issues, identifies tables/forms needing responsive treatment, flags elements with fixed pixel widths
- **Example**: `!mobile overflow find elements causing horizontal scroll`

### `!mobile performance` - Mobile Performance Check

- **Purpose**: Identify mobile performance bottlenecks
- **Behavior**: Identifies heavy components, checks unnecessary animations, flags large images, reviews bundle size impact of mobile features
- **Example**: `!mobile performance analyze dashboard loading speed`

### `!mobile quick` - Quick Mobile Check

- **Purpose**: Fast scan of common mobile problems
- **Behavior**: Rapid check of most common mobile issues, focuses on viewport, touch targets, and basic responsiveness, provides quick wins
- **Example**: `!mobile quick scan for obvious mobile problems`

### `!mobile safe-areas` - Safe Area Compliance

- **Purpose**: Ensure compatibility with device safe areas
- **Behavior**: Checks proper safe area CSS usage, verifies content isn't cut off by notches, ensures sticky elements respect safe areas, reviews full-screen layouts
- **Example**: `!mobile safe-areas check iPhone X compatibility`

### `!mobile touch` - Touch Target Audit

- **Purpose**: Comprehensive touch interaction analysis
- **Behavior**: Scans all interactive elements, verifies 44px minimum touch targets, checks spacing between touch targets (8px minimum), reports elements needing `touch-target` classes
- **Example**: `!mobile touch check button sizes in the dashboard`

### `!mobile typography` - Mobile Text Optimization

- **Purpose**: Optimize text for mobile readability
- **Behavior**: Verifies minimum 16px font sizes (prevents iOS zoom), checks line heights and spacing, ensures text doesn't overflow containers, reviews heading hierarchy
- **Example**: `!mobile typography check text readability on small screens`

### `!narrative` - Update Project Narrative Report

- **Purpose**: Update the "Mindbody Data Analysis SaaS Platform: Complete Project Narrative" report with recent accomplishments
- **Behavior**: Reviews recent conversation history, identifies completed features and milestones, and adds them chronologically to PROJECT_NARRATIVE_REPORT.md as new phases
- **What to Include**:
  - New features implemented with problem/solution structure
  - Critical bug fixes and their impact
  - Technical challenges overcome
  - Performance improvements and optimizations
  - Business impact of changes
  - Updated "current capabilities" section
  - Increment version number and update date
- **Structure**: Follow existing phase format (Problem → Solution → Technical Implementation → Impact)
- **Example**: `!narrative add the timezone support implementation`

### `!security` - Security Audit with Multi-Tenancy Compliance

- **Purpose**: Perform a comprehensive security vulnerability assessment with strict multi-tenancy validation
- **Behavior**: Conducts thorough security analysis across multiple vectors:
  - **Authentication & Authorization**: Verifies proper session management, password handling, OAuth implementation, role-based access control
  - **Multi-Tenant Data Isolation** (CRITICAL):
    - All database queries filter by `organizationId` to prevent cross-tenant access
    - API routes enforce organization-level scoping on all endpoints
    - User sessions validate organizationId before accessing organization data
    - Storage methods enforce tenant scoping across all CRUD operations
    - Background jobs and scheduled tasks verify organizationId
    - Webhook subscriptions scoped by both eventType AND siteId
    - Support access tokens validate organizationId on every request
    - No hardcoded organization IDs in codebase
    - API responses sanitized to prevent cross-tenant data leaks
  - **Injection Vulnerabilities**: Checks for SQL injection, XSS, command injection risks in user inputs and database queries
  - **API Security**: Reviews endpoint authentication, authorization checks, rate limiting, input validation, tenant isolation
  - **Secret Management**: Scans for exposed API keys, hardcoded credentials, insecure environment variable usage
  - **CSRF Protection**: Verifies CSRF tokens on state-changing operations
  - **Data Exposure**: Checks for sensitive data leaks in logs, error messages, and API responses (including cross-tenant leaks)
  - **Dependency Security**: Reviews npm packages for known vulnerabilities
  - **Session Security**: Validates cookie settings (httpOnly, secure, sameSite), session timeout, session fixation prevention
  - **Input/Output Handling**: Checks input sanitization, output encoding, file upload security
  - **Access Control**: Verifies multi-tenant data isolation, proper authorization on all routes, role-based permissions
  - **Security Headers**: Reviews CORS configuration, CSP, X-Frame-Options, and other security headers
  - **Database Security**: Checks for proper parameterized queries, least privilege principles, organization_id indexes
  - **Support Access Security**: Validates support session token lifecycle, revocation enforcement, audit logging
- **Multi-Tenancy Security Checklist**:
  - ✅ All queries filter by organizationId (no exceptions)
  - ✅ API routes validate organization access before processing
  - ✅ Session middleware enforces organizationId validation
  - ✅ Database schema includes organization_id with proper indexes
  - ✅ Support tokens validate on every request (not just on creation)
  - ✅ No cross-tenant data visible in responses
  - ✅ Webhooks scoped by both eventType AND siteId
  - ✅ Background jobs can't access wrong organization's data
  - ✅ File uploads scoped to organization (if applicable)
  - ✅ Audit logs capture all tenant-switching actions
- **Report Includes**:
  - **Critical Vulnerabilities**: Immediate security risks requiring urgent fixes (including tenant isolation breaches)
  - **High Priority Issues**: Significant security concerns that should be addressed soon
  - **Medium Priority Issues**: Security improvements and best practice violations
  - **Multi-Tenancy Violations**: Any potential data leakage between organizations
  - **Recommendations**: Specific actionable fixes with code examples
  - **Compliance Check**: Verification against OWASP Top 10 security risks plus multi-tenancy requirements
- **Example**: `!security perform full security audit with multi-tenancy validation`

### `!suggest` - Solution Suggestions

- **Purpose**: Provide detailed solution proposals without implementing
- **Behavior**: Analyzes requirements, presents detailed approach, outlines steps, discusses trade-offs, asks for confirmation
- **Example**: `!suggest adding real-time notifications to the dashboard`

### `!timereport` - Daily Time and Progress Report

- **Purpose**: Generate a comprehensive report of time spent and accomplishments for a specific day
- **Behavior**: Tracks time from the first conversation of the specified day until the last message. Reviews conversation history for that day, calculates elapsed time, and provides a detailed summary of what was accomplished
- **Supported Date Parameters**:
  - No parameter (default) - Report for today
  - `yesterday` - Report for yesterday's work
  - `X days ago` - Report from specific days back (e.g., "2 days ago", "5 days ago")
  - `YYYY-MM-DD` - Report for specific date (e.g., "2024-11-05")
  - `last week` - Report from 7 days ago
  - `last month` - Report from 30 days ago
- **Report Includes**:
  - **Time Elapsed**: Hours and minutes since work began on the specified day
  - **Start Time**: When the first message was sent that day
  - **End Time**: When the last message was sent that day
  - **Accomplishments**: Detailed chronological list of all features, fixes, and tasks completed
  - **Technical Work**: Code changes, debugging, refactoring, testing
  - **Configuration Changes**: Environment setup, deployments, integrations
  - **Documentation**: Updates to docs, comments, project files
  - **Challenges Overcome**: Issues encountered and how they were resolved
  - **Current Status**: What's working and what's pending
- **Format**: Clear, organized report suitable for time tracking and project updates
- **Examples**:
  - `!timereport` - Generate report for today
  - `!timereport yesterday` - Generate report for yesterday
  - `!timereport 2 days ago` - Generate report from 2 days ago
  - `!timereport 2024-11-05` - Generate report for specific date

### `!unanswered` - Find Pending Questions

- **Purpose**: Identify questions that remain unanswered in the conversation
- **Behavior**: Searches conversation thread, identifies AI questions lacking responses, presents organized list
- **Example**: `!unanswered`

### `!updatedocumentation` - Update All Documentation

- **Purpose**: Update all relevant user guides and documentation to reflect recent changes and new features
- **Behavior**: Reviews recent changes from conversation history and updates all applicable documentation files to ensure they remain current and accurate
- **Documentation Files to Update**:
  - **platformadmin.md** - Platform Administration technical documentation for super admins
  - **superadmin.md** - Platform Administrator user guide for super admin workflows
  - **userguide.md** - End-user documentation for regular organization users
  - **onboarding.md** - Multi-tenant onboarding and registration guide
  - **replit.md** - Project memory with recent changes and architecture overview
  - **PROJECT_NARRATIVE_REPORT.md** - Complete project narrative with chronological development phases, accomplishments, and current capabilities
  - **Other specialized guides** - As needed (DATA_IMPORT_GUIDE.md, WEBHOOKS_AND_API_GUIDE.md, etc.)
- **What to Update**:
  - **New Features**: Add comprehensive documentation for newly implemented features
  - **API Changes**: Update endpoint documentation with new routes, parameters, and responses
  - **UI Changes**: Document new UI components, workflows, and user interactions
  - **Configuration**: Update setup instructions and configuration options
  - **Troubleshooting**: Add new common issues and solutions
  - **Version Numbers**: Increment version and update "Last Updated" dates
  - **Best Practices**: Add new recommendations based on recent learnings
- **Documentation Standards**:
  - Clear, concise language suitable for non-technical users
  - Step-by-step instructions with numbered lists
  - Include visual indicators (✅, ⚠️, 🔒) for important callouts
  - Provide API examples with request/response formats
  - Document safety features and validation rules
  - Include use cases and workflow examples
  - Maintain consistent formatting and structure
- **When to Use**:
  - After implementing major new features
  - When adding new API endpoints or modifying existing ones
  - After changing user workflows or UI components
  - When fixing bugs that affect documented behavior
  - Periodically to ensure documentation stays current
- **Example**: `!updatedocumentation`

## Best Practices for Command Usage

1. **Use the right command**: Choose the command that best matches your specific need
2. **Be specific**: Provide clear context when using commands
3. **Combine commands**: Some commands work well together (e.g., `!deep` followed by `!suggest`)
4. **Regular checks**: Use `!codecheck` and `!gr` regularly to maintain code quality and multi-tenancy compliance
5. **Document issues**: Use `!bug` to formally track problems for resolution
6. **Before commits**: Run `!codecheck` to ensure clean, consistent code with multi-tenancy compliance
7. **Security reviews**: Run `!security` before major releases to catch vulnerabilities and tenant isolation issues

## Command Integration with Time Tracking System

These commands are particularly valuable for maintaining the time tracking application's strict requirements:

- **Time Handling Compliance**: `!gr` checks for violations of the NO TIME CONVERSION policy
- **Safari Compatibility**: `!design` and `!gr` ensure Safari-specific requirements are met
- **Mobile-First Design**: `!mobile` ensures components meet 24px touch targets and responsive design standards
- **Touch Target Compliance**: `!mobile touch` verifies 44px minimum touch targets and proper spacing
- **Viewport Optimization**: `!mobile overflow` prevents horizontal scroll and content overflow
- **Mobile Typography**: `!mobile typography` ensures readable text on small screens
- **Form Optimization**: `!mobile forms` optimizes form layouts for mobile input
- **Navigation UX**: `!mobile navigation` ensures thumb-reachable, intuitive mobile navigation
- **Mobile Performance**: `!mobile performance` identifies and fixes mobile-specific performance issues
- **Safe Area Support**: `!mobile safe-areas` ensures compatibility with notched devices
- **Orientation Handling**: `!mobile landscape` optimizes layouts for both portrait and landscape
- **Touch Interactions**: `!mobile gestures` optimizes swipe, scroll, and gesture handling
- **Mobile Accessibility**: `!mobile accessibility` ensures screen reader and assistive technology support
- **Code Quality**: `!codecheck` runs full quality audit (Prettier + ESLint + TypeScript + Multi-Tenancy Validation)
- **Bug Tracking**: `!bug` documents issues with break management, clock in/out functionality
- **Performance Analysis**: `!analyze performance` monitors database query performance for time entries
- **Architecture Review**: `!arch` provides expert analysis of system design, code quality, and strategic technical decisions
- **Project Documentation**: `!narrative` keeps the Complete Project Narrative current with recent accomplishments
- **Security Compliance**: `!security` performs comprehensive vulnerability assessment covering authentication, authorization, injection risks, multi-tenant isolation, and OWASP Top 10
- **Multi-Tenancy Debugging**: `!debug` provides explicit multi-tenancy compliance validation during debugging
- **Daily Time Tracking**: `!timereport` generates comprehensive reports of hours worked and accomplishments for the day
