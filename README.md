# iOPEX AI FrontDoor Platform

**Version:** 1.0 | **Updated:** March 2026 | **Status:** Phase 1 In Progress

A ServiceNow-style enterprise Digital Front Door that iOPEX deploys for customers.
Employees get a single AI-powered surface for IT, HR, Finance, and Operations requests.
8-week deployment. No rip-and-replace of existing systems.

## Architecture

```
Engagement Gateway   →  Employee portal (chat-first PWA, white-labeled per customer)
Signal Engine        →  intent-classifier edge function (Gemini 2.5 Flash, <300ms)
WorkStream           →  Workflow engine (reused, enterprise templates added)
TrustCore            →  Audit logging + ai_routing_log + RLS/RBAC (zero-trust)
Nexus                →  Adapters: M365, Workday, SAP, ServiceNow ITSM, Jira, Slack
```

## Quick Start

```bash
npm install
npm run dev           # http://localhost:8080/employee-portal
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/employee-portal` | Employee-facing Digital Front Door (the product) |
| `/auth` | Authentication |
| `/portal` | Admin/ops portal (internal) |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `intent-classifier` | Signal Engine — classifies input, routes to catalog, logs to TrustCore |
| `intelligent-assistant` | General AI assistant (admin) |
| `workflow-executor` | WorkStream — executes multi-step workflows |
| `workflow-orchestrator` | WorkStream — coordinates workflow state |

## Environment Variables (Supabase Edge Functions)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

## Database

New tables added in Phase 1 migration (`20260319000001_frontdoor_phase1.sql`):

- `customer_branding` — white-label config per tenant
- `service_catalog` — request categories (IT, HR, Finance, Ops)
- `catalog_items` — individual request types with SLA + routing hints
- `ai_routing_log` — immutable audit of every Signal Engine decision
- `employee_requests` — employee request tracking with status + SLA

Seed default catalog for a new tenant:
```sql
SELECT public.seed_default_catalog('<customer_id>');
```

## Documentation Package

**🎯 START HERE**: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - Complete documentation catalog with export instructions

### Quick Links
- **[Platform Feature Index](./PLATFORM_FEATURE_INDEX.md)** - All 64+ pages, routes, and features
- **[Component Library](./COMPONENT_LIBRARY.md)** - 50+ components with usage examples
- **[Architecture Guide](./ARCHITECTURE.md)** - System design and patterns
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Recent Updates](./RECENT_FEATURES_DOCUMENTATION.md)** - Latest features (Oct 9, 2025)

### How to Export All Documentation
See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for complete export instructions via GitHub, Dev Mode, or manual download.

---

## 🎯 Platform Overview

OberaConnect is a clause-aware, multi-tenant SaaS platform that provides AI-powered integrations and department-specific dashboards for MSP (Managed Service Provider) operations. The platform enables seamless integration with billing, security, RMM, and compliance systems while maintaining customer-specific customization and branding.

### Platform Statistics
- **70+ Pages** across 8 department dashboards
- **65+ Database Tables** with Row Level Security
- **17 Edge Functions** for serverless backend
- **50+ React Components** in component library
- **7 External Integrations** (M365, CIPP, NinjaOne, Revio, SharePoint)
- **10+ Custom Hooks** for business logic
- **6-Category Navigation** with grid-based overlay menus

## 🏗️ Architecture Philosophy

This project follows a **modular, hub-and-spoke, database-centric** architecture designed for:
- **Resilience**: Platform remains operational regardless of team changes
- **Maintainability**: Clear separation of concerns and documentation
- **Extensibility**: New features can be added without full system knowledge
- **Scalability**: Multi-tenant database (Lovable Cloud) as central hub with feature "spokes"
- **AI Enhancement**: AI tools augment features but aren't required for core operations

## 📋 Quick Start

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Git

### Installation
```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

## 🧩 Technology Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui + Radix UI
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Lovable Cloud (Supabase)
- **State Management**: TanStack Query
- **Routing**: React Router v6
- **Authentication**: Supabase Auth

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn)
│   ├── rbac/           # Role-based access control
│   ├── AIMCPGenerator.tsx
│   ├── AppLauncher.tsx
│   ├── AutomationSuggestions.tsx
│   ├── CallToAction.tsx
│   ├── DashboardNavigation.tsx
│   ├── DepartmentAIAssistant.tsx
│   ├── EvidenceUpload.tsx
│   ├── ExternalSystemsBar.tsx
│   ├── FlowDiagram.tsx
│   ├── GlobalSearch.tsx
│   ├── Hero.tsx
│   ├── MCPServerStatus.tsx
│   ├── Microsoft365Integration.tsx
│   ├── Navigation.tsx
│   ├── RepetitiveTaskTester.tsx
│   ├── WorkflowBuilder.tsx
│   └── WorkflowExecutionHistory.tsx
├── pages/              # Route-level pages (61+ pages)
│   ├── Auth.tsx        # Authentication
│   ├── Index.tsx       # Landing page
│   ├── Portal.tsx      # Main employee portal
│   ├── *Dashboard.tsx  # 9 department dashboards
│   ├── AdminDashboard.tsx
│   ├── AnalyticsPortal.tsx
│   ├── CIPPDashboard.tsx
│   ├── CMDBDashboard.tsx
│   ├── ChangeManagement.tsx
│   ├── ClientPortal.tsx
│   ├── CompliancePortal.tsx
│   ├── CustomReportBuilder.tsx
│   ├── IncidentsDashboard.tsx
│   ├── IntegrationsPage.tsx
│   ├── KnowledgeBase.tsx
│   ├── MCPServerDashboard.tsx
│   ├── NetworkMonitoring.tsx  # NEW - SNMP/Syslog monitoring
│   ├── OnboardingDashboard.tsx
│   ├── RBACPortal.tsx
│   ├── SalesPortal.tsx
│   ├── SystemValidationDashboard.tsx
│   ├── WorkflowAutomation.tsx
│   └── [55+ other pages]
├── hooks/              # Custom React hooks
│   ├── useCustomerCustomization.tsx
│   ├── useDemoMode.tsx
│   ├── useAuditLog.tsx
│   ├── useRepetitiveTaskDetection.tsx
│   └── useRevioData.tsx
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client & types
├── lib/                # Utility functions
│   └── utils.ts
└── types/              # TypeScript type definitions
    ├── cipp.ts
    └── revio.ts

supabase/
├── functions/          # Edge functions (26 total)
│   ├── ai-mcp-generator/           # AI-powered MCP config generation
│   ├── analytics-processor/        # Analytics data processing
│   ├── auto-remediation/           # Automated incident remediation
│   ├── automation-suggester/       # Automation recommendations
│   ├── batch-evidence-generator/   # Compliance evidence generation
│   ├── change-impact-analyzer/     # Change impact analysis
│   ├── cipp-sync/                  # CIPP tenant synchronization
│   ├── client-portal/              # Client self-service portal
│   ├── comprehensive-test-data-generator/  # Test data generation
│   ├── custom-report-engine/       # Custom report builder
│   ├── customer-management/        # Customer CRUD operations
│   ├── database-flow-logger/       # Database flow tracing
│   ├── department-assistant/       # Department-specific AI chat
│   ├── device-poller/              # Network device SNMP polling (NEW)
│   ├── global-search/              # Cross-system search
│   ├── graph-api/                  # Microsoft 365 Graph API
│   ├── input-fuzzer/               # Security fuzz testing
│   ├── intelligent-assistant/      # General AI assistant
│   ├── knowledge-processor/        # Knowledge base AI processing
│   ├── mcp-server/                 # MCP protocol server
│   ├── ninjaone-sync/              # NinjaOne device sync
│   ├── ninjaone-ticket/            # NinjaOne ticket creation
│   ├── ninjaone-webhook/           # NinjaOne webhook receiver
│   ├── predictive-insights/        # Predictive analytics
│   ├── repetitive-task-detector/   # Task automation detection
│   ├── revio-data/                 # Revio billing integration
│   ├── sharepoint-sync/            # SharePoint document sync
│   ├── snmp-collector/             # SNMP trap collection (NEW)
│   ├── syslog-collector/           # Syslog message analysis (NEW)
│   ├── workflow-evidence-generator/  # Workflow evidence automation
│   ├── workflow-executor/          # Workflow execution engine
│   ├── workflow-insights/          # Workflow analytics
│   ├── workflow-orchestrator/      # Multi-workflow coordination
│   └── workflow-webhook/           # Workflow webhook triggers
├── migrations/         # Database migrations (93 tables)
└── config.toml         # Supabase configuration
```

## 🔑 Key Features

### 1. Employee Portal & Application Launcher (NEW)
- 🏢 **Unified Employee Portal**: Single sign-on access to all work applications
- 🚀 **App Launcher**: Dynamic application tiles based on role/department
- 🔐 **Microsoft 365 Integration**: Native OAuth authentication with account linking
- 🎯 **Role-Based Access**: Applications shown based on employee department (IT, HR, Finance, Sales, Operations, Executive)
- ⚙️ **Admin Panel**: Manage applications and configure department access (`/admin/applications`)
- 📱 **Scalable**: Add new applications without code changes

**⚠️ CRITICAL SETUP REQUIRED:**
1. **Enable Azure Provider** in Lovable Cloud backend (Item #1 in [`URGENT_NEXT_STEPS.md`](./URGENT_NEXT_STEPS.md))
2. Configure Azure AD app permissions (Item #2)

### 2. Microsoft 365 Integration
- 🔐 **Single Sign-On**: Native Microsoft 365 OAuth authentication
- 🔗 **Account Linking**: Link Microsoft 365 to existing email accounts
- 📧 **Email Access**: View recent emails with read status
- 📅 **Calendar Integration**: Display upcoming calendar events
- 💬 **Teams Integration**: Access recent Teams chats and conversations
- 📁 **OneDrive/SharePoint**: File browser (coming soon)
- 👤 **User Profile**: Sync Microsoft 365 profile data
- 🔄 **Reconnect Flow**: Graceful token expiration handling

**Technical Details:** See [`MICROSOFT365_INTEGRATION.md`](./MICROSOFT365_INTEGRATION.md)

### 3. Customer Customization
- Per-customer branding (logo, colors)
- Enabled features and integrations
- Custom dashboard layouts
- Role-based access control

### 4. Department-Specific Dashboards
- **Admin**: Customer management and system overview
- **Compliance**: Framework tracking, controls, evidence
- **IT & Security**: Integration status, server health, anomalies
- **Operations**: Workflow efficiency, ML insights
- **HR**: Employee management, session tracking
- **Finance**: Revenue, subscriptions, customer data
- **Sales**: Pipeline, deals, forecasting with dedicated Sales Portal
- **Executive**: KPIs, compliance metrics, strategic overview
- **Network Monitoring**: Real-time SNMP trap collection, syslog analysis, device polling, and intelligent alerting (NEW)
- **Privileged Access Audit**: Comprehensive audit logging for RMM and privileged system access with compliance tracking

**NEW - Sales Portal** (`/sales-portal`):
- Personal performance metrics dashboard
- Pipeline management and deal tracking
- Activity timeline with recent touchpoints
- Customer quick access directory
- Territory performance analytics
- Direct links to workflow automation for deals, customers, leads
- Department-specific AI assistant

### 5. Testing & Validation Infrastructure (NEW)
- 🧪 **System Validation Dashboard**: Comprehensive testing at `/test/validation`
  - Database schema validation with RLS policy testing
  - Edge function health checks and response time monitoring
  - Data integrity verification across all tables
  - Performance benchmarks and optimization insights
  - UI component validation
- 🔬 **Comprehensive Test Dashboard**: Advanced testing at `/test/comprehensive`
  - Automated test data generation for all modules
  - Security fuzz testing (SQL injection, XSS, buffer overflow)
  - Database flow tracing and query analysis
  - Integration with CI/CD pipelines
- 📊 **Workflow Execution Detail**: Clickable execution logs with full debugging info
- 📚 **Complete Test Documentation**: See [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)

### Integration Management
- **Microsoft 365**: Calendar, Email, Teams, OneDrive (ACTIVE)
- **CIPP**: Centralized M365 tenant management and security automation (ACTIVE)
- **Network Monitoring**: SNMP trap collection, syslog analysis, device polling, and intelligent alerting (NEW)
- **Revio**: Billing & Revenue data (Infrastructure complete, live API pending OneBill migration)
- OneBill (Current billing system, migration to Revio in progress)
- Azure, Lighthouse (Cloud & Identity)
- SonicWall, UniFi, MikroTik (Network Security)
- Keeper Security (Password & Access Management)
- NinjaOne (RMM & Infrastructure)
- Threatdown, OpenText (Cybersecurity)

### 7. AI-Powered Assistance
- Department-specific AI assistants
- MCP (Model Context Protocol) server integration
- Lovable AI for seamless model access

## 🗄️ Database Schema

### Core Tables (93 Total)

**Customer & User Management**
- `customers` - Customer organizations
- `customer_accounts` - Customer account management (NEW - Oct 10)
- `customer_contacts` - Customer contact information (NEW - Oct 10)
- `customer_sites` - Customer site locations (NEW - Oct 10)
- `customer_assets` - Customer asset tracking (NEW - Oct 10)
- `customer_service_history` - Service history tracking (NEW - Oct 10)
- `user_profiles` - User accounts with department roles
- `customer_customizations` - Per-customer UI/feature settings
- `customer_details` - Extended customer business information
- `customer_billing` - Billing and invoicing records
- `user_roles` - Role-based access control
- `roles` - System roles and permissions
- `role_permissions` - Granular permission management

**Application & Integration Management**
- `applications` - Employee application registry
- `application_access` - Role/department-based app access control
- `integrations` - System integration configurations
- `integration_credentials` - Encrypted API credentials
- `mcp_servers` - MCP server registry

**CMDB & Asset Management (NEW - ServiceNow Parity)**
- `configuration_items` - IT asset inventory with full lifecycle tracking
- `ci_relationships` - Asset dependencies and relationships
- `ci_audit_log` - Complete CI change history (NEW)
- `ci_health_metrics` - AI-powered health scoring (NEW)
- `ci_overview` - Optimized CI reporting view

**Change Management**
- `change_requests` - RFC tracking with approval workflows
- `change_approvals` - Multi-level approval process
- `change_impact_analysis` - AI-powered impact assessment
- `change_schedules` - Maintenance window planning

**Network Monitoring**
- `network_devices` - Network device inventory
- `snmp_traps` - SNMP trap collection
- `syslog_messages` - Syslog message collection
- `device_metrics` - Device performance metrics
- `network_alerts` - Network alert management
- `network_alert_rules` - Alert rule configuration

**Microsoft 365 & CIPP**
- `cipp_tenants` - CIPP managed Microsoft 365 tenants
- `cipp_security_baselines` - CIPP security configurations
- `cipp_policies` - CIPP policy management
- `cipp_tenant_health` - CIPP health monitoring
- `cipp_audit_logs` - CIPP action audit trail

**Compliance & Security**
- `compliance_frameworks` - Framework tracking (ISO, SOC 2, HIPAA, etc.)
- `compliance_controls` - Control requirements and mappings
- `compliance_evidence` - Evidence collection and storage
- `compliance_reports` - Audit reports and attestations
- `audit_logs` - System-wide audit trail
- `incidents` - Security incident management

**Workflow & Automation**
- `workflows` - Operations workflow management
- `workflow_executions` - Execution history and logs
- `workflow_triggers` - Event-based triggers
- `ml_insights` - Machine learning analytics

**Support & Ticketing**
- `support_tickets` - Internal support tickets
- `client_tickets` - Client portal tickets
- `client_portal_users` - Client portal access

**Knowledge Management**
- `knowledge_articles` - Knowledge base content
- `knowledge_categories` - Article categorization

Plus 40+ additional tables for analytics, billing, onboarding, and specialized features.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed schema documentation.

## 🔐 Security & Authentication

### Enterprise-Grade Security
- ✅ **Row Level Security (RLS)**: All 93 tables protected with multi-tenant isolation
- ✅ **Organization-Level Isolation**: Users can only access data within their organization
- ✅ **Role-Based Access Control (RBAC)**: Granular permissions via `user_roles` and `role_permissions`
- ✅ **Audit Logging**: Comprehensive audit trail for all critical operations
- ✅ **CI Change Tracking**: Complete history of all configuration item modifications
- ✅ **Encrypted Credentials**: Integration credentials stored with encryption
- ✅ **Service Role Protection**: API keys restricted to service role only
- ✅ **Draft Protection**: Knowledge base drafts only visible to creators
- ✅ **Leaked Password Protection**: Enabled via Lovable Cloud
- ✅ **Input Validation**: Zod schemas with XSS sanitization on all forms

### Security Scan Results
- **Latest Scan**: 2025-10-09
- **Critical Issues**: 0 (all resolved)
- **Total Issues**: 6 (5 acceptable SECURITY_DEFINER views + 1 password warning)
- **Tables Protected**: 93/93 (100%)
- **Coverage**: All PII, infrastructure, and business data secured

### Authentication Methods
- Microsoft 365 OAuth (SSO)
- Email/Password with auto-confirm (development)
- Magic link authentication
- Role-based dashboard access

## 🚀 Deployment

### Via Lovable
1. Open [Lovable Project](https://lovable.dev/projects/2e37e4cf-64eb-4e9a-8cf1-14b876d69899)
2. Click Share → Publish

### Custom Domain
Navigate to Project > Settings > Domains and click Connect Domain.
[Documentation](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 📚 Complete Documentation (25+ Guides)

### 🎯 Master Index
**[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete documentation package with:
- All 25+ documentation files organized
- Export instructions (GitHub, Dev Mode, Manual)
- Reading order by role (Developer, PM, QA, Security)
- Quick access guide

### 🆕 Recently Added (October 9, 2025)
- **[PLATFORM_FEATURE_INDEX.md](./PLATFORM_FEATURE_INDEX.md)** - Complete feature catalog
- **[COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md)** - Component and hook reference
- **[RECENT_FEATURES_DOCUMENTATION.md](./RECENT_FEATURES_DOCUMENTATION.md)** - Latest updates

### 🚨 Priority Documentation (Read First)
- [**DOCUMENTATION_INDEX.md**](./DOCUMENTATION_INDEX.md) - **Master documentation catalog**
- [**PLATFORM_FEATURE_INDEX.md**](./PLATFORM_FEATURE_INDEX.md) - **All features and routes**
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - **System architecture**
- [**URGENT_NEXT_STEPS.md**](./URGENT_NEXT_STEPS.md) - Critical action items

### Essential Development Docs
- [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md) - 50+ components with examples
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [ONBOARDING.md](./ONBOARDING.md) - New developer guide (Week 1)
- [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) - Knowledge transfer
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing framework

### Integration & Feature Guides (10+)
- [MICROSOFT365_INTEGRATION.md](./MICROSOFT365_INTEGRATION.md) - M365 OAuth and Graph API
- [CIPP_INTEGRATION_GUIDE.md](./CIPP_INTEGRATION_GUIDE.md) - CIPP tenant management
- [REVIO_INTEGRATION_GUIDE.md](./REVIO_INTEGRATION_GUIDE.md) - Revio billing integration
- [CMDB_CHANGE_MANAGEMENT_GUIDE.md](./CMDB_CHANGE_MANAGEMENT_GUIDE.md) - Change management
- [AUDIT_LOGGING_GUIDE.md](./AUDIT_LOGGING_GUIDE.md) - Compliance audit tracking
- [SNMP_SYSLOG_IMPLEMENTATION.md](./SNMP_SYSLOG_IMPLEMENTATION.md) - Network monitoring
- [REPETITIVE_TASK_AUTOMATION.md](./REPETITIVE_TASK_AUTOMATION.md) - Task automation

### Security & Compliance
- [CISSP_SECURITY_ASSESSMENT.md](./CISSP_SECURITY_ASSESSMENT.md) - Security assessment
- [SECURITY_REPORT.md](./SECURITY_REPORT.md) - Security scan results
- [TEST_RESULTS_OCT5.md](./TEST_RESULTS_OCT5.md) - Production readiness

**See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for complete catalog (25+ docs)**

## 🔄 Development Workflow

### Version Control Discipline
- Feature branches for all new work
- Pull request reviews required
- Commit messages follow conventional commits
- All changes traceable and reversible

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code quality
- Component-driven development
- Design system tokens for all styling (no hardcoded colors)

### Testing Strategy
- **Automated Validation**: System Validation Dashboard (`/test/validation`)
- **Security Testing**: Comprehensive fuzz testing for SQL injection, XSS, input validation
- **Performance Monitoring**: Real-time benchmarks for queries, edge functions, page loads
- **Integration Testing**: Critical flows validated with automated test data generation
- **Database Testing**: Schema validation, RLS policy verification, flow tracing
- **Manual Testing**: Preview environment for UI/UX validation
- **CI/CD Integration**: Automated tests via edge function APIs
- **Documentation**: Complete testing guide in [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes with clear commit messages
3. Test thoroughly in preview environment
4. Create pull request with description
5. Update relevant documentation

## 📞 Support & Resources

- **Lovable Documentation**: [docs.lovable.dev](https://docs.lovable.dev/)
- **Project URL**: [Lovable Project](https://lovable.dev/projects/2e37e4cf-64eb-4e9a-8cf1-14b876d69899)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)

## 📄 License

Proprietary - OberaConnect Platform

---

**Developer Continuity Note**: This project is designed for organizational resilience. All strategic design decisions, architecture patterns, and business logic are documented to ensure continuity across team transitions.