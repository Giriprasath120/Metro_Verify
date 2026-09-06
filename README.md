# Metro Verify — Digital Legal Metrology Platform (SIH26036)

**Digital Legal Metrology Verification & Lifecycle Management Platform**  
*Built for the Smart India Hackathon 2026 (Problem Statement SIH26036)*

Metro Verify is a mobile application and backend service built for India's Legal Metrology ecosystem (traders/owners of weighing and measuring instruments, Legal Metrology Officers, Government Approved Test Centres, and state administrators). It complements India's existing national portal (**eMaap**) by providing the missing pieces: **field verification workspaces, dynamic officer slot allocation, digital instrument passports with verifiable QR codes, explainable compliance health scoring, and offline-first field synchronization.**

---

## 🏗️ Tech Stack

- **Frontend:** React Native + Expo (SDK 52) + TypeScript
- **Navigation:** React Navigation v7 (nested bottom tabs and native stacks per role)
- **Certificates & QR Codes:** `react-native-qrcode-svg` (tamper-proof cryptographic QR payloads)
- **Backend Service:** Node.js + Express + TypeScript (`/server` running on **Port 4000**)
- **Deterministic Slot Allocation:** Live scoring algorithm (`scoreOfficer`) factoring jurisdiction, travel proximity, officer workload, and slot availability
- **AI Metrology Assistant:** Google Gemini API (`@google/generative-ai`, model `gemini-2.5-flash`), with resilient local rule fallback when no API key is set
- **Statutory Pricing Schedule:** Legal Metrology (General) Rules, 2011 (Schedule IX) dynamic fee calculator

---

## 📁 Project Structure (Open in VS Code)

You can open this exact folder directly in **Visual Studio Code**:
```
C:\Users\Admin\.gemini\antigravity\scratch\metro-verify\
```

```
metro-verify/
├── App.tsx                      # Root Application & SafeAreaProvider
├── app.json                     # Expo configuration
├── package.json                 # Expo dependencies & scripts
├── tsconfig.json                # Strict TypeScript configuration
├── data/
│   └── mockData.ts              # 12 Indian owners, 18 instruments, 9 officers, certificates
├── utils/
│   └── allocationEngine.ts      # Deterministic scoreOfficer() & bulk batch distribution logic
├── src/
│   ├── config/
│   │   ├── api.ts               # Centralized API endpoints (PORT 4000)
│   │   └── pricing.ts           # Centralized Schedule IX statutory fee calculator
│   ├── theme/
│   │   └── colors.ts            # Government-tech palette (Deep Navy, Warm Amber, Status tokens)
│   ├── components/
│   │   ├── GovHeader.tsx        # National portal header with emblem & role switcher
│   │   ├── StatusBadge.tsx      # Color-coded badges (Pending, Scheduled, In Progress, Verified, Expiring, Expired, WITHDRAWN)
│   │   ├── ComplianceGauge.tsx  # Visual circular health score gauge (0–100)
│   │   ├── PassportTimeline.tsx # Vertical lifecycle timeline
│   │   └── CertificateModal.tsx # Digital certificate modal with live SVG QR code & PDF download
│   ├── screens/
│   │   ├── common/
│   │   │   └── RoleSelectScreen.tsx # Simulated login gateway (Owner, Officer, Admin)
│   │   ├── owner/
│   │   │   ├── OwnerDashboardScreen.tsx   # Compliance ring, active applications & withdrawal, metrics
│   │   │   ├── MyInstrumentsScreen.tsx    # Searchable data registry table & Passport access
│   │   │   ├── InstrumentPassportScreen.tsx # Permanent lifecycle history & readings
│   │   │   ├── NewRequestScreen.tsx       # Dynamic Schedule IX fees, Single & Bulk submissions
│   │   │   ├── CertificatesScreen.tsx     # Verifiable certificate registry (View & Download PDF)
│   │   │   └── AIChatScreen.tsx           # Mobile chat UI connected to Gemini API
│   │   ├── officer/
│   │   │   ├── OfficerDashboardScreen.tsx # Today's scheduled inspections & offline toggle
│   │   │   ├── FieldVerificationScreen.tsx# Test readings, mock GPS, photo evidence & pass/fail
│   │   │   └── OfflineQueueScreen.tsx     # Offline field queue & central ledger sync
│   │   └── admin/
│   │       ├── AdminDashboardScreen.tsx   # Statewide stats & monthly verification SVG chart
│   │       ├── SmartAllocationScreen.tsx  # Live slot allocation rankings & explainable chips
│   │       ├── ComplianceAlertsScreen.tsx # Watchlist & risk deductions (-15 pts overdue, etc.)
│   │       └── BulkBatchMonitorScreen.tsx # Multi-officer batch tracker with drill-down
│   └── navigation/
│       └── RootNavigator.tsx    # Nested navigators with role switcher (5 owner tabs)
└── server/
    ├── package.json             # Express backend dependencies
    ├── tsconfig.json            # Server TypeScript configuration
    ├── .env                     # PORT=4000, GEMINI_API_KEY=your_key_here
    ├── .gitignore
    └── src/
        ├── server.ts            # Express server (Port 4000, EADDRINUSE safety)
        ├── config/
        │   └── pricing.ts       # Server-side Schedule IX statutory fee calculator
        ├── data/mockData.ts     # Server mock datasets
        ├── utils/allocationEngine.ts # Shared deterministic scoring logic
        └── routes/
            ├── applications.ts  # POST /api/applications, GET /api/applications, POST /:id/withdraw
            ├── bulkRequests.ts  # POST /api/bulk-requests, GET /api/bulk-requests
            ├── instruments.ts   # GET /api/instruments, GET /:id, GET /:id/passport
            ├── certificates.ts  # GET /api/certificates, GET /:id, GET /:id/pdf
            ├── auth.ts          # POST /auth/login
            ├── verification.ts  # POST /verification-requests, POST /verification-requests/bulk
            ├── batches.ts       # GET /batches/:id
            ├── schedule.ts      # POST /schedule/allocate (REAL COMPUTED SCORING)
            ├── officer.ts       # POST /verifications/:id/record
            ├── compliance.ts    # GET /compliance/:ownerId/score
            ├── dashboard.ts     # GET /dashboard/:role
            ├── notifications.ts # POST /notifications/expiry-check
            └── chatbot.ts       # POST /chatbot/query (REAL GEMINI API CALL)
```

---

## 🚀 Quick Start Guide

### 1. Start the Express Backend Server
In a terminal inside `metro-verify/server`:
```bash
cd server
npm run dev
```
The server will start at `http://localhost:4000` (defaults strictly to Port 4000, never 5000, with graceful `EADDRINUSE` handling).

### 2. Configure Google Gemini API Key
In `server/.env`:
```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Note: If no key is set, the chatbot automatically uses its intelligent domain rule fallback so the application never crashes during demonstrations.*

### 3. Start the Mobile Client
In a separate terminal in the root `metro-verify` directory:
```bash
# Start the Expo development server
npm start

# Or launch directly in your web browser
npm run web
```

---

## 📡 Backend API Endpoints (Port 4000)

All endpoints are hosted under `http://localhost:4000`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/applications` | Creates new verification application, returns `APP-2026-XXXX`, calculates dynamic statutory fee |
| `GET` | `/api/applications` | Lists applications with status (`?ownerId=`) |
| `GET` | `/api/applications/:id` | Returns single application detail |
| `POST` | `/api/applications/:id/withdraw` | Changes application status to `WITHDRAWN` |
| `POST` | `/api/bulk-requests` | Creates owner bulk verification request, returns `BLK-2026-XXXX` |
| `GET` | `/api/bulk-requests` | Lists bulk requests with status |
| `GET` | `/api/instruments` | Lists registered instruments (`?ownerId=`) |
| `GET` | `/api/instruments/:id` | Returns instrument detail |
| `GET` | `/api/instruments/:id/passport` | Returns digital passport verification history & timeline |
| `GET` | `/api/certificates/:id` | Returns certificate detail with verifiable QR payload |
| `GET` | `/api/certificates/:id/pdf` | Returns downloadable PDF metadata & generation data |
| `POST` | `/chatbot/query` | Gemini AI legal metrology chatbot endpoint |
| `POST` | `/schedule/allocate` | Real slot allocation scoring engine |

---

## ⚖️ Statutory Verification Pricing (Schedule IX)

Dynamically computed per Legal Metrology (General) Rules, 2011:
- **Electronic Weighbridge:** Statutory ₹3,500 + Haulage ₹1,500 = **₹ 5,000**
- **NAWI Class I (High Precision Bullion):** Statutory ₹5,000 + Haulage ₹500 = **₹ 5,500**
- **NAWI Class II (Laboratory Balances):** Statutory ₹2,500 + Haulage ₹400 = **₹ 2,900**
- **NAWI Class III (Standard Commercial Scale):** Statutory ₹400 + Haulage ₹100 = **₹ 500**
- **NAWI Class IV (Heavy Floor Platform):** Statutory ₹1,000 + Haulage ₹300 = **₹ 1,300**
- **Coriolis Flow Meter:** Statutory ₹8,000 + Haulage ₹1,000 = **₹ 9,000**
- **Energy Meter (HT AC Static):** Statutory ₹4,500 + Haulage ₹500 = **₹ 5,000**
- **Water Meter (Bulk Woltman):** Statutory ₹2,000 + Haulage ₹400 = **₹ 2,400**
- **Petrol Pump Dispensing Unit:** Statutory ₹2,500 + Haulage ₹500 = **₹ 3,000**

---

## 🏛️ Instrument Owner Experience

1. **Dashboard:**
   - Compliance health gauge and deductions summary
   - Real-time priority expiration alert
   - Active Applications list with **"Withdraw Request"** action (updates status to `WITHDRAWN` immediately)
   - Bottom navigation: **Dashboard / Instruments / New Request / Certificates / AI Chat** (no duplicate action cards)
2. **Instruments & Digital Passport:**
   - Permanent registry of owner's equipment
   - Distinct **Digital Passport** with immutable lifecycle timeline, readings, and audit trail
3. **New Request (Single & Bulk):**
   - Dynamic statutory fee recalculation on instrument selection
   - Real submission generating `APP-2026-XXXX`
   - Bulk tab: clean owner submission with batch count & estimated fees, generating `BLK-2026-XXXX`
4. **Certificates & QR Code:**
   - Single-event legal verification document (Form VI)
   - Distinct **"View Certificate"** (with embedded QR code) and **"Download PDF"** buttons
5. **AI Metrology Assistant:**
   - Connected via `API_ENDPOINTS.chatbotQuery` (Port 4000)
