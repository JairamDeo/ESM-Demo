# 🛡️ Vitric ESM — Backend API

**Node.js + Express + TypeScript + MongoDB**

ESM Grievance Management System backend for Nagpur Sub-Area — 10 Station HQs across Maharashtra & Gujarat.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) **or** a MongoDB Atlas URI

### Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI to your MongoDB connection string

# 3. Seed the database with sample data
npm run seed

# 4. Start development server
npm run dev
```

Server starts at → `http://localhost:5000`

---

## 🔐 Default Credentials (after seeding)

| Role          | Username   | Password     |
|---------------|------------|--------------|
| Super Admin   | `admin`    | `admin123`   |
| ESM Officer   | `esm`      | `esm123`     |
| Station HQ    | `station1` | `station123` |
| Record Office | `record`   | `record123`  |

**Test Veteran Phone:** `9876543210`  
**OTP (bypass mode):** `1234`

---

## 📁 Project Structure

```
src/
├── config/
│   └── database.ts          # MongoDB connection
├── controllers/
│   ├── authController.ts    # Login, OTP, JWT
│   ├── grievanceController.ts
│   ├── stationController.ts
│   ├── qrCodeController.ts
│   ├── officerController.ts
│   ├── escalationController.ts
│   └── miscControllers.ts   # Case types, Reports, Notifications
├── middleware/
│   ├── auth.ts              # JWT protect + role guards
│   └── errorHandler.ts      # Global error handler
├── models/
│   ├── Admin.ts
│   ├── User.ts              # Veteran (phone OTP)
│   ├── Station.ts
│   ├── Officer.ts
│   ├── Grievance.ts
│   ├── Escalation.ts
│   ├── CaseType.ts
│   ├── QRCode.ts
│   └── Notification.ts
├── routes/
│   ├── auth.ts
│   ├── grievances.ts
│   └── index.ts             # All other routes
├── utils/
│   └── seed.ts              # Database seeder
├── app.ts                   # Express app setup
└── index.ts                 # Entry point
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`.  
Protected routes require: `Authorization: Bearer <token>`

---

### 🔑 Authentication

| Method | Endpoint                   | Auth | Description              |
|--------|----------------------------|------|--------------------------|
| POST   | `/auth/admin/login`        | ❌   | Admin login              |
| GET    | `/auth/admin/me`           | ✅   | Get logged-in admin      |
| POST   | `/auth/admin/logout`       | ✅   | Logout admin             |
| POST   | `/auth/user/send-otp`      | ❌   | Send OTP to phone        |
| POST   | `/auth/user/verify-otp`    | ❌   | Verify OTP, get token    |
| GET    | `/auth/user/me`            | ✅   | Get logged-in veteran    |

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

---

### 📄 Grievances

| Method | Endpoint                       | Auth    | Description                    |
|--------|--------------------------------|---------|--------------------------------|
| GET    | `/grievances`                  | Admin   | List all (search+filter+pages) |
| POST   | `/grievances`                  | Any     | Submit new grievance           |
| GET    | `/grievances/dashboard`        | Admin   | Dashboard stats & charts       |
| GET    | `/grievances/track/:id`        | ❌      | Public grievance tracking      |
| GET    | `/grievances/my`               | User    | My grievances (veteran)        |
| GET    | `/grievances/:id`              | Admin   | Get single grievance           |
| PATCH  | `/grievances/:id/status`       | Admin   | Update status                  |
| PATCH  | `/grievances/:id/assign`       | Admin   | Assign officer                 |
| POST   | `/grievances/:id/comments`     | Any     | Add comment                    |
| DELETE | `/grievances/:id`              | Admin   | Soft delete                    |

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

---

### 🏢 Stations

| Method | Endpoint                        | Auth         | Description           |
|--------|---------------------------------|--------------|-----------------------|
| GET    | `/stations`                     | Admin        | List all stations     |
| POST   | `/stations`                     | Super/ESM    | Create station        |
| GET    | `/stations/:id`                 | Admin        | Get station           |
| PUT    | `/stations/:id`                 | Super/ESM    | Update station        |
| DELETE | `/stations/:id`                 | Super Admin  | Delete station        |
| POST   | `/stations/:id/generate-qr`     | Admin        | Generate QR for station |

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

---

### 📲 QR Codes

| Method | Endpoint                        | Auth   | Description               |
|--------|---------------------------------|--------|---------------------------|
| GET    | `/qr-codes`                     | Admin  | List all QR codes         |
| POST   | `/qr-codes`                     | Admin  | Generate new QR code      |
| GET    | `/qr-codes/:id/view`            | ❌     | View QR as SVG image      |
| GET    | `/qr-codes/:id/download`        | ❌     | Download QR as PNG        |
| POST   | `/qr-codes/:id/regenerate`      | Admin  | Regenerate QR code        |
| PATCH  | `/qr-codes/:id/toggle`          | Admin  | Toggle active/inactive    |
| POST   | `/qr-codes/scan/:code`          | ❌     | Record a scan             |
| GET    | `/qr-codes/:id`                 | Admin  | Get single QR             |

**Download QR PNG:**  
`GET /api/qr-codes/:id/download` → returns PNG file for direct download

**View QR SVG:**  
`GET /api/qr-codes/:id/view` → returns SVG (embed in `<img>` tag)

---

### 👮 Officers

| Method | Endpoint                           | Auth        | Description          |
|--------|------------------------------------|-------------|----------------------|
| GET    | `/officers`                        | Admin       | List all officers    |
| POST   | `/officers`                        | Super/ESM   | Add officer          |
| GET    | `/officers/:id`                    | Admin       | Get officer          |
| PUT    | `/officers/:id`                    | Super/ESM   | Update officer       |
| PATCH  | `/officers/:id/toggle-status`      | Super/ESM   | Toggle active status |
| DELETE | `/officers/:id`                    | Super Admin | Delete officer       |

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

---

### 📋 Case Types

| Method | Endpoint           | Auth        | Description       |
|--------|--------------------|-------------|-------------------|
| GET    | `/case-types`      | Admin       | List all 16 types |
| POST   | `/case-types`      | Super Admin | Create type       |
| GET    | `/case-types/:id`  | Admin       | Get type          |
| PUT    | `/case-types/:id`  | Super Admin | Update type       |

---

### ⚠️ Escalations

| Method | Endpoint                        | Auth  | Description           |
|--------|---------------------------------|-------|-----------------------|
| GET    | `/escalations`                  | Admin | List all escalations  |
| POST   | `/escalations`                  | Admin | Create escalation     |
| GET    | `/escalations/:id`              | Admin | Get escalation        |
| PATCH  | `/escalations/:id/resolve`      | Admin | Resolve escalation    |

**Resolve Body:**
```json
{ "resolutionNote": "Coordinated with Record Office. Case closed." }
```

---

### 📊 Reports

| Method | Endpoint              | Auth  | Description                   |
|--------|-----------------------|-------|-------------------------------|
| GET    | `/reports`            | Admin | Full analytics (6 months)     |

**Query Params:** `?months=6`

**Response includes:**
- Summary totals
- Monthly received vs resolved
- SLA compliance %
- Station performance
- Case type distribution

---

### 🔔 Notifications

| Method | Endpoint                     | Auth | Description            |
|--------|------------------------------|------|------------------------|
| GET    | `/notifications`             | ✅   | Get my notifications   |
| PATCH  | `/notifications/:id/read`    | ✅   | Mark as read           |
| PATCH  | `/notifications/all/read`    | ✅   | Mark all as read       |

**Query Params:** `?unreadOnly=true`

---

### 👤 User Profile

| Method | Endpoint            | Auth | Description         |
|--------|---------------------|------|---------------------|
| PUT    | `/users/profile`    | User | Update veteran profile |

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

---

## 🏗️ MongoDB Schemas

| Collection      | Key Fields |
|-----------------|-----------|
| `admins`        | username, password (hashed), role, station |
| `users`         | phone, otp, isVerified (veteran) |
| `stations`      | name, city, state, officerCount, totalCases |
| `officers`      | name, role, stationName, email, status |
| `grievances`    | grievanceId, type, status, priority, timeline[], comments[] |
| `escalations`   | escalationId, grievanceCode, daysOpen, status |
| `casetypes`     | id, name, totalCases, pendingCases |
| `qrcodes`       | code, qrData, svgContent, totalScans, status |
| `notifications` | recipientId, type, isRead |

---

## 🔒 Role Permissions

| Role              | Access |
|-------------------|--------|
| `super_admin`     | Full access — all CRUD |
| `esm_officer`     | All grievances, officers, stations, reports |
| `station_officer` | Own station grievances + officers |
| `record_office`   | View grievances + pension types |
| `user` (veteran)  | Submit grievance, track own cases |

---

## ⚙️ Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vitric_esm
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
OTP_BYPASS=true          # Set false in production
OTP_BYPASS_CODE=1234
CORS_ORIGIN=http://localhost:5173
```

---

## 🏃 Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm run start    # Production server
npm run seed     # Seed MongoDB with sample data
```

---

*Built for Vitric Business Solutions Pvt. Ltd. — Nagpur, March 2026*
