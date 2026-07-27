# 🛡️ Vitric ESM — Ex-Servicemen Grievance Management System

**MERN Stack + TypeScript** — Backend: Node.js / Express 5 / MongoDB · Frontend: React 18 / Vite

A grievance management platform for Ex-Servicemen (veterans), covering the Nagpur Sub-Area across multiple Station HQs in Maharashtra & Gujarat. Every grievance moves through a defined, accountable lifecycle — submitted, assigned, tracked, and automatically escalated if left unresolved.

---

## Table of Contents

1. [Overview](#overview)
2. [Organizational Hierarchy](#organizational-hierarchy)
3. [Grievance Lifecycle](#grievance-lifecycle)
4. [Concern Workflow](#concern-workflow)
5. [SLA & Auto-Escalation](#sla--auto-escalation)
6. [Roles & Permissions (RBAC)](#roles--permissions-rbac)
7. [Case Types & Categories](#case-types--categories)
8. [Tech Stack](#tech-stack)
9. [Project Structure — Backend](#project-structure--backend)
10. [Project Structure — Frontend](#project-structure--frontend)
11. [Key Features](#key-features)
12. [Setup & Run](#setup--run)
13. [Environment Variables](#environment-variables)
14. [Known Gaps / Open Items](#known-gaps--open-items)

---

## Overview

Vitric ESM replaces manual, paperwork-driven grievance handling with a digital system that gives every case a defined owner and a defined deadline. If an officer doesn't act in time, the system automatically escalates the case up the chain of command — nothing sits untouched indefinitely.

The system serves two user groups:
- **Veterans** — raise and track grievances via a dedicated mobile-first portal
- **Officers** — Super Admin, Area, Headquarter, and Station HQ tiers, each with scoped access to manage and resolve cases via a separate Admin Portal

---

## Organizational Hierarchy

Administrative access follows a **four-tier hierarchy**, mirroring a real chain of command:

```
Super Admin (full system oversight)
        │
      Area            (e.g. Area 1, Maharashtra, Gujarat — multiple allowed)
        │
  Headquarter          (e.g. Area 1 → HQ 1, HQ 2 — multiple per Area)
        │
   Station HQ          (e.g. HQ 1 → Station 1, Station 2 — multiple per HQ)
```

Every **Area, Headquarter, and Station HQ** has its own independent set of three **officer levels — L1, L2, L3**:
- **L1** — first point of contact / default assignment target for auto-escalation
- **L2 / L3** — manual review layer; can view/act on a case only once specifically assigned by an admin — not part of the automatic escalation chain

Structure is built **top-down**: Areas → Headquarters → Station HQs → Officers, in that order, via the **Organization** module. Who can create structure at each level is itself permission-gated (see RBAC section).

---

## Grievance Lifecycle

1. **Submission** — a veteran raises a grievance via:
   - Self-service portal
   - QR code scan at a physical Station HQ
   - Walk-in entry, filed by an officer on the veteran's behalf (via **New Grievance** in the Admin Portal)
2. **Assignment** — auto-assigned to the selected Station HQ's **L1 officer**, or manually assigned by an admin to any level (L1/L2/L3)
3. **Escalation** — if the case type's SLA time is breached, the system **auto-escalates**:
   `Station HQ L1 → Headquarter L1 → Area L1` (final tier in the automatic chain)
4. **Status** — every grievance carries one of four statuses: `Pending`, `In Progress`, `Resolved`, `Escalated`
5. **Resolution** — an officer marks the case resolved once complete

Super Admin has full visibility into every case at every stage, independent of the escalation chain.

---

## Concern Workflow

A separate, non-escalating clarification loop between an officer and the veteran:

1. An officer reviewing a grievance can raise a **concern** — e.g. requesting a corrected or missing document
2. The veteran sees an **"Action Required"** banner on their Complaint Details screen, with the officer's note and the specific flagged documents
3. The veteran responds via a guided 3-step correction flow: **Correct Details → Review (re-upload flagged) Documents → Review & Submit** with an optional note
4. The response is logged in a **Query History**, and the case's Tracking History timeline reflects the correction

This resolves small issues without escalating the whole case, and preserves a full audit trail visible to the veteran.

---

## SLA & Auto-Escalation

- Every **case type** has a **fully customizable SLA time** — no fixed system default; admin sets each one as needed
- SLA can be configured two ways:
  - **Common** — one SLA time applies uniformly across Station HQ, Headquarter, and Area
  - **Separate** — a distinct SLA duration per tier (Station HQ / Headquarter / Area)
- SLA settings track **who last edited** the value and maintain a **full change history**
- Auto-escalation always moves **current tier L1 → next tier L1** (`Station HQ L1 → Headquarter L1 → Area L1`); L2/L3 are not part of this automatic chain
- Escalation reasons logged include: `SLA breach` and `No response — officer has not raised any concern`
- The **Escalations** module (Super Admin + Area only) shows every open/resolved escalation with full From → Escalated To trail, days open, and a Resolve action

---

## Roles & Permissions (RBAC)

Permissions are defined per role (`super_admin`, `area`, `headquarter`, `station_hq`, `user`) and are DB-backed (editable at runtime by Super Admin via Settings → Role-Based Access Control).

| Capability | Super Admin | Area | Headquarter | Station HQ |
|---|:---:|:---:|:---:|:---:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Grievances | ✅ | ✅ | ✅ | ❌ |
| Update Grievance Status | ✅ | ✅ | ✅ | ✅ |
| Delete Grievances | ✅ | ❌ | ❌ | ❌ |
| Escalate Grievances (manual) | ✅ | ✅ | ✅ | ✅ |
| Reassign Officer on a Case | ✅ | ✅ | ❌ | ❌ |
| View SLA Settings | ✅ | ✅ | ✅ | ❌ |
| Edit SLA Settings | ✅ | ✅ | ❌ | ❌ |
| Manage Case Types / Categories | ✅ | ❌ | ❌ | ❌ |
| Manage Required Documents | ✅ | ✅ | ✅ | ❌ (view only) |
| Manage Stations | ✅ | ✅ | ✅ | ❌ |
| Manage QR Codes | ✅ | ❌ | ❌ | ❌ |
| Manage Officers | ✅ | ✅ (own Area) | ✅ (own HQ) | ❌ |
| View / Resolve Escalations | ✅ | ✅ | ❌ | ❌ |
| View / Export Reports | ✅ | ✅ | ❌ | ✅ (view only, no export confirmed) |
| Manage Settings / RBAC | ✅ | ❌ (view only) | ❌ | ❌ |
| Create Announcements | ✅ | ❌ (view only) | ✅ | ❌ (view only, unconfirmed) |
| Login As Veteran (Use Veteran Portal) | ❌ | ✅ | ✅ | ✅ |

**Organization creation permissions (top-down):**
- Super Admin → creates Areas, and HQ/Station HQ officers anywhere
- Area Officer → creates Headquarters & Station HQ officers within their own Area
- HQ Officer → creates Station HQ officers under their own HQ

**Note:** Headquarter's RBAC config lists "View Settings" as enabled, but the Settings module does not currently appear in the Headquarter sidebar — flagged as a gap to verify, not confirmed intended behavior.

**Veteran Portal Access (no separate registration):** Officers added under the Officers tab can log into the veteran-facing app using their own registered phone number, if their role has the **"Use veteran portal"** permission enabled. Veterans are not self-registered by admins — they access the portal through this mechanism, or register themselves directly via OTP.

---

## Case Types & Categories

18 case types, grouped into 4 categories:

| Category | Case Types |
|---|---|
| **Identity & Personal** | Update DOB · Update Name in PPO · Update Surname · Update First and Middle Name · Update Aadhaar Card · Pension Start for Unmarried/Divorced and Unemployed Daughter |
| **Pension & Financial** | Resolve Pension Issues · Stop FMA · Monthly Pay Slip · Pension Payment Order |
| **Family Details** | Add Nominee · Update DOB of Spouse · Update Spouse Details · Add/Update Family Details |
| **Requests & Tracking** | Death Intimation · Grievance for Increment · Track Case Status · SMS / Portal Alerts |

Each case type can define:
- Required documents (lettered A, B, C…), each with mandatory flag and optional downloadable PDF template/annexure
- Additional custom questions
- Guidelines (shown to veterans before filing)
- Accepted file formats (PDF, JPG, JPEG, PNG) and max file size (default 5MB)
- Active/visible toggle — a checklist can be built in advance and hidden until ready

---

## Tech Stack

### Backend
- **Runtime:** Node.js, Express 5, TypeScript
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs`
- **Validation:** Zod
- **Media:** Cloudinary (storage), Multer (uploads), Sharp (image processing)
- **QR:** `qrcode`
- **Push Notifications:** `web-push`
- **i18n:** `@vitalets/google-translate-api`
- **OTP Delivery:** MSG91 SMS in production, with a dev/testing bypass code (`1234`) when SMS is disabled
- **Security:** Helmet, CORS, `express-rate-limit`
- **Logging:** Morgan

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **UI:** shadcn/ui, Tailwind CSS, `lucide-react`, `@iconify/react`
- **State:** Zustand, TanStack Query (React Query)
- **Routing:** React Router v6
- **HTTP:** Axios
- **i18n:** `react-i18next` (English/Hindi)
- **Charts:** Recharts
- **QR (display):** `react-qr-code`
- **Dashboard Layout:** `react-grid-layout` + `react-resizable` — drag/resize customizable dashboard, saved per user
- **Notifications UI:** `sonner`
- **Testing:** Vitest, Testing Library

---

## Project Structure — Backend

```
Backend/
├── src/
│   ├── config/                  # database.ts, env.ts
│   ├── constants/                # officer hierarchy, levels, roles, org tiers, permissions
│   ├── controllers/              # auth, grievance, escalation, hq, officer, qrCode, rbac,
│   │                              # sla, state, station, veteranDocuments, dashboardLayout,
│   │                              # caseTypeDocuments, announcement
│   ├── middleware/                # requirePermission.ts, upload.ts
│   ├── models/                    # Admin, Announcement, AuditActor, AuditLog, CaseType,
│   │                              # CaseTypeRequiredDocuments, Category, DashboardLayout,
│   │                              # Escalation, Grievance, HeadQuarter, Notification,
│   │                              # Officer, PushDevice, PushSubscription, QRCode,
│   │                              # RolePermission, SlaConfig, State, Station, User,
│   │                              # VeteranRequiredDocumentUpload
│   ├── routes/                    # auth, dashboardLayout, grievances, rbac, translate,
│   │                              # veteranDocuments, index
│   ├── scripts/                   # one-off migration & backfill scripts (see below)
│   ├── services/                  # auditService, cloudinaryService, concernHelpers,
│   │                              # concernWorkflow, grievanceActionGuard,
│   │                              # grievanceDocuments, grievanceOfficerResolver,
│   │                              # hqStationSync, msg91Service, notificationService,
│   │                              # officerAssignment, officerHierarchy, pushDeviceService,
│   │                              # rbacService, slaAuditService, slaConfigService,
│   │                              # slaEscalationService, storageResolver, storageService,
│   │                              # superAdminBootstrap, translateService,
│   │                              # veteranDocumentStorage
│   ├── utils/
│   │   ├── admin/                 # DashboardLayoutDefaults.ts
│   │   ├── escalationId.ts, grievanceLookup.ts, network.ts, scopeFilter.ts,
│   │   │   seed.ts, webPush.ts
│   ├── app.ts, index.ts
├── .env / .env.example
├── package.json / tsconfig.json / nodemon.json
```

**Notable migration/setup scripts:**
- `seed.ts` — full database seeder (states, HQs, stations, officers, case types, categories, grievances, escalations, notifications, RBAC defaults)
- `seedTestHierarchy.ts`, `seedOrgOfficers.ts` — test hierarchy data
- `migrate-admins-to-officers.ts` — legacy admin→officer model migration
- `backfill-hq-area.ts`, `fixStationsHqAreaMapping.ts` — org hierarchy backfills
- `migrate-local-uploads-to-cloudinary.ts`, `verify-cloudinary.ts` — Cloudinary migration
- `migrate-category-icons-to-cloudinary.ts`
- `setOfficerPasswords.ts`, `backfillCategoryCaseTypeHi.ts`

---

## Project Structure — Frontend

```
Frontend/
├── src/
│   ├── components/
│   │   ├── dashboard-dynamic/
│   │   │   ├── config/            # dashboardLayoutDefaults.ts
│   │   │   └── widgets/           # AvgResolutionTime, CaseType, EscalationRate,
│   │   │                          # GrievanceStats, Priority, QuickCounts,
│   │   │                          # RecentGrievances, SlaCompliance, StatusBreakdown,
│   │   │                          # SubmissionSource, TopStations, TrendOverTime,
│   │   │                          # ChartTypeMenu, DashboardDataContext,
│   │   │                          # DynamicDashboard, WidgetRenderer, WidgetShell
│   │   ├── AdminLayout, AnimatedCircularProgress, ConfirmDialog,
│   │   │   DocumentPreviewModal, NavLink, PermissionRouteGuard,
│   │   │   RBACHydrator, UserLayout
│   ├── contexts/                  # AuthContext.tsx
│   ├── hooks/                     # use-mobile, use-toast, useApi, useChartTheme,
│   │                              # useGrievanceDraft, usePushSync, useTheme
│   ├── lib/                       # apiBase, categoryIcons, concernUtils, grievanceDraft,
│   │                              # officerHierarchy, pushNotifications, queryClient,
│   │                              # queryKeys, rbacRole, utils, veteranDocuments
│   ├── pages/
│   │   ├── user/                  # (veteran-facing)
│   │   │   Login, VerifyOTP, CompleteProfile, UserHome, Services,
│   │   │   DocumentRequiredInfo, RaiseGrievance, DocumentCheckList,
│   │   │   ReviewSubmit, Success, MyComplaints, TrackCase,
│   │   │   ConcernReviewSubmit, Notifications, UserProfile, UserSettings
│   │   ├── AdminLogin, Announcements, CaseTypes, Categories, Dashboard,
│   │   │   Escalations, Grievances, Organization, QRCodes, Reports,
│   │   │   RequiredDocuments, SettingsPage, Stations, UsersOfficers,
│   │   │   NotFound
│   ├── stores/                    # rbac.ts (Zustand — role permissions store)
│   ├── utils/                     # translationHelper.ts
│   ├── App.tsx, App.css, main.tsx, i18n.ts, index.css
├── .env.example
├── package.json / eslint.config.js / postcss.config.js / components.json
```

---

## Key Features

- **4-tier hierarchical grievance routing** with independent L1/L2/L3 officer levels per tier
- **SLA-driven auto-escalation** — configurable per case type, common or per-tier
- **Manual escalation & officer reassignment** (Super Admin, Area)
- **Concern Workflow** — officer-to-veteran clarification loop, separate from escalation
- **Customizable, per-user dashboard** — drag/resize widgets, saved layout
- **Multi-channel grievance submission** — portal, QR code, walk-in
- **Assisted veteran login** — officers can access the veteran portal via their own registered number, permission-gated
- **Role-Based Access Control (RBAC)** — DB-backed, live-editable by Super Admin, with sensitive permissions explicitly flagged
- **Document checklist engine** — per case type, with mandatory flags, downloadable templates, guidelines, and visibility toggle
- **QR code generation & tracking** — per Station HQ, with scan counts and status
- **Announcements** — SMS/Push broadcast to Station HQs (Super Admin & Headquarter can create; Area is view-only)
- **Reports & Analytics** — grievance stats, monthly trends, SLA compliance, station performance, downloadable reports (Monthly Summary, Station-wise Performance, Case Type Analysis, Escalation Report, Officer Workload Report, Veteran Satisfaction Report)
- **Full audit trail** — every significant action logged (`AuditLog`, `AuditActor` models)
- **Bilingual support** — English/Hindi across both static UI and dynamic content
- **Push notifications** — web-push based, per-device subscription tracking
- **Light/Dark/System theme** support throughout

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

> ⚠️ **Note:** This section is carried over from an earlier backend README. Some details (role names, case type count, station count) reflect an older version of the system and conflict with the confirmed current data elsewhere in this document — see inline flags below. Endpoint paths/methods should still be accurate but have not been re-verified against the current controllers/routes folder.

### 🔑 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/admin/login` | ❌ | Admin login |
| GET | `/auth/admin/me` | ✅ | Get logged-in admin |
| POST | `/auth/admin/logout` | ✅ | Logout admin |
| POST | `/auth/user/send-otp` | ❌ | Send OTP to phone |
| POST | `/auth/user/verify-otp` | ❌ | Verify OTP, get token |
| GET | `/auth/user/me` | ✅ | Get logged-in veteran |

**Admin Login Body:**
```json
{ "username": "admin", "password": "admin123" }
```

**Send OTP Body:**
```json
{ "phone": "9876543210" }
```

**Verify OTP Body:**
```json
{ "phone": "9876543210", "otp": "1234" }
```

### 📄 Grievances

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/grievances` | Admin | List all (search+filter+pages) |
| POST | `/grievances` | Any | Submit new grievance |
| GET | `/grievances/dashboard` | Admin | Dashboard stats & charts |
| GET | `/grievances/track/:id` | ❌ | Public grievance tracking |
| GET | `/grievances/my` | User | My grievances (veteran) |
| GET | `/grievances/:id` | Admin | Get single grievance |
| PATCH | `/grievances/:id/status` | Admin | Update status |
| PATCH | `/grievances/:id/assign` | Admin | Assign officer |
| POST | `/grievances/:id/comments` | Any | Add comment |
| DELETE | `/grievances/:id` | Admin | Soft delete |

**Query Params for GET `/grievances`:**
```
?page=1&limit=10&search=pension&status=pending&priority=high
&station=Pune&type=Update Name&sortBy=createdAt&sortOrder=desc
&startDate=2026-01-01&endDate=2026-04-21
```

**Submit Grievance Body:**
```json
{
  "type": "Resolve Pension Issues",
  "veteranName": "Col. R.K. Sharma",
  "veteranPhone": "+91 9876543210",
  "veteranArmyNo": "IC-45678",
  "veteranRank": "Colonel",
  "stationName": "Pune Station HQ",
  "description": "Pension arrears pending...",
  "priority": "high",
  "submissionSource": "portal"
}
```

**Update Status Body:**
```json
{ "status": "in-progress", "note": "Documents received", "officerName": "Maj. P. Kulkarni" }
```

### 🏢 Stations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stations` | Admin | List all stations |
| POST | `/stations` | Super/ESM | Create station |
| GET | `/stations/:id` | Admin | Get station |
| PUT | `/stations/:id` | Super/ESM | Update station |
| DELETE | `/stations/:id` | Super Admin | Delete station |
| POST | `/stations/:id/generate-qr` | Admin | Generate QR for station |

**Create Station Body:**
```json
{
  "name": "Amravati Station HQ",
  "city": "Amravati",
  "state": "Maharashtra",
  "officerCount": 4,
  "address": "Station Road, Amravati"
}
```

**Query Params:** `?search=Nagpur&state=Maharashtra&qrActive=true`

### 📲 QR Codes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/qr-codes` | Admin | List all QR codes |
| POST | `/qr-codes` | Admin | Generate new QR code |
| GET | `/qr-codes/:id/view` | ❌ | View QR as SVG image |
| GET | `/qr-codes/:id/download` | ❌ | Download QR as PNG |
| POST | `/qr-codes/:id/regenerate` | Admin | Regenerate QR code |
| PATCH | `/qr-codes/:id/toggle` | Admin | Toggle active/inactive |
| POST | `/qr-codes/scan/:code` | ❌ | Record a scan |
| GET | `/qr-codes/:id` | Admin | Get single QR |

**Download QR PNG:** `GET /api/qr-codes/:id/download` → returns PNG file for direct download
**View QR SVG:** `GET /api/qr-codes/:id/view` → returns SVG (embed in `<img>` tag)

### 👮 Officers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/officers` | Admin | List all officers |
| POST | `/officers` | Super/ESM | Add officer |
| GET | `/officers/:id` | Admin | Get officer |
| PUT | `/officers/:id` | Super/ESM | Update officer |
| PATCH | `/officers/:id/toggle-status` | Super/ESM | Toggle active status |
| DELETE | `/officers/:id` | Super Admin | Delete officer |

**Query Params:** `?search=Kulkarni&role=ESM Officer&station=Pune&status=active`

**Add Officer Body:**
```json
{
  "name": "Maj. R. Sharma",
  "rank": "Major",
  "role": "Station HQ Officer",
  "stationName": "Surat Station HQ",
  "email": "r.sharma@army.in",
  "phone": "9876543210"
}
```

### 📋 Case Types

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/case-types` | Admin | List all types ⚠️ *old doc says 16 — confirmed current count is **18*** |
| POST | `/case-types` | Super Admin | Create type |
| GET | `/case-types/:id` | Admin | Get type |
| PUT | `/case-types/:id` | Super Admin | Update type |

### ⚠️ Escalations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/escalations` | Admin | List all escalations |
| POST | `/escalations` | Admin | Create escalation |
| GET | `/escalations/:id` | Admin | Get escalation |
| PATCH | `/escalations/:id/resolve` | Admin | Resolve escalation |

**Resolve Body:**
```json
{ "resolutionNote": "Coordinated with Record Office. Case closed." }
```

### 📊 Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports` | Admin | Full analytics (6 months) |

**Query Params:** `?months=6`

**Response includes:** Summary totals · Monthly received vs resolved · SLA compliance % · Station performance · Case type distribution

### 🔔 Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | Get my notifications |
| PATCH | `/notifications/:id/read` | ✅ | Mark as read |
| PATCH | `/notifications/all/read` | ✅ | Mark all as read |

**Query Params:** `?unreadOnly=true`

### 👤 User Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/users/profile` | User | Update veteran profile |

**Update Profile Body:**
```json
{
  "name": "Col. R.K. Sharma (Retd.)",
  "rank": "Colonel",
  "serviceNumber": "IC-45678",
  "email": "sharma@example.com",
  "address": "123 Defence Colony, Pune",
  "stationHQ": "Pune Station HQ"
}
```

### MongoDB Collections (legacy summary — see [Project Structure — Backend](#project-structure--backend) for the current model list)

| Collection | Key Fields |
|---|---|
| `admins` | username, password (hashed), role, station ⚠️ *superseded by unified `officers` model* |
| `users` | phone, otp, isVerified (veteran) |
| `stations` | name, city, state, officerCount, totalCases |
| `officers` | name, role, stationName, email, status |
| `grievances` | grievanceId, type, status, priority, timeline[], comments[] |
| `escalations` | escalationId, grievanceCode, daysOpen, status |
| `casetypes` | id, name, totalCases, pendingCases |
| `qrcodes` | code, qrData, svgContent, totalScans, status |
| `notifications` | recipientId, type, isRead |

> ⚠️ **Role naming conflict:** this legacy table lists `super_admin`, `esm_officer`, `station_officer`, `record_office`, `user`. These are **outdated** — the confirmed current roles (per the live RBAC store and UI) are `super_admin`, `area`, `headquarter`, `station_hq`, `user`. See [Roles & Permissions (RBAC)](#roles--permissions-rbac) above for the accurate, current matrix.

---

## Setup & Run

### Backend
```bash
cd Backend
npm install
cp .env.example .env      # configure MONGODB_URI, JWT_SECRET, etc.
npm run seed               # seed sample data
npm run dev                 # start dev server → http://localhost:5000
```

**All backend scripts:**
```bash
npm run dev                          # Development with hot reload
npm run build                        # Compile TypeScript
npm run start                        # Production server
npm run seed                         # Seed MongoDB with sample data
npm run migrate:officers             # Migrate legacy admins → officers model
npm run backfill:hq-area             # Backfill HQ/Area org mapping
npm run backfill:required-documents  # Backfill required-document checklists
npm run migrate:category-icons       # Migrate category icons to Cloudinary
npm run migrate:local-uploads        # Migrate local file uploads to Cloudinary
npm run verify:cloudinary            # Verify Cloudinary connection/config
npm run seed:test-hierarchy          # Seed test Area/HQ/Station hierarchy
npm run seed:org-officers            # Seed organizational officer accounts
npm run set:officer-passwords        # Set/reset officer passwords
npm run backfill:category-casetype-hi # Backfill Hindi translations for categories/case types
npm run fix:stations-hq-mapping      # Fix Station↔HQ mapping inconsistencies
```

### Frontend
```bash
cd Frontend
npm install
cp .env.example .env
npm run dev                 # start dev server (Vite)
```

### Test Credentials (after seeding)
| Role | Username | Password |
|---|---|---|
| Super Admin | `admin` | `admin123` |
| Area | `area` | `area123` |
| Headquarter | `headquarter` | `headquarter123` |
| Station HQ | `stationhq` | `stationhq123` |

**Test Veteran Phone:** `9876543210` · **Dev OTP bypass:** `1234`

---

## Environment Variables

```env
# Backend
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vitric_esm
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
OTP_BYPASS=true              # set false in production
OTP_BYPASS_CODE=1234
CORS_ORIGIN=http://localhost:5173
# + Cloudinary, MSG91, and web-push keys (see .env.example)
```

---

## Known Gaps / Open Items

*(For internal dev team reference — not exhaustive, flagged during documentation review)*

- **Required Documents:** only 6 of 18 case types currently have their document checklist fully configured
- **Headquarter RBAC:** "View Settings" is enabled in the permission config, but no Settings entry currently appears in the Headquarter sidebar — needs verification
- **SPARSH Integration:** listed in System Information as an "Independent Module" — not yet confirmed whether real integration with the official SPARSH pension system is planned
- **Announcements — Station HQ access:** unconfirmed whether Station HQ has view access to Announcements; not yet verified against a real screenshot
- **Reports — Station HQ:** RBAC lists `viewReports: true, exportReports: true` for Station HQ, but this hasn't been confirmed against the actual UI/sidebar yet

---

*Built for Vitric Business Solutions Pvt. Ltd. — Nagpur Sub-Area*