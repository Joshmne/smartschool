# SmartSchool — Production-Ready Frontend + Backend Starter

> Revenue-Protected School OS for Nigerian schools.
> Offline-first PWA · Next.js 14 · TypeScript · Drizzle ORM · Turso (LibSQL) · Tailwind

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (PWA)                         │
│  Next.js 14 App Router · React 18 · TypeScript           │
│  Zustand (state) · React Query (server state)            │
│  Dexie/IndexedDB (offline) · Framer Motion (UI)         │
└─────────────┬───────────────────┬────────────────────────┘
              │ API Routes        │ Background Sync
              │ (Next.js edge)    │ (useOfflineSync hook)
┌─────────────▼───────────────────▼────────────────────────┐
│                   API LAYER (Edge Runtime)                │
│  Route handlers · Zod validation · JWT auth (jose)        │
│  Rate limiting · Error boundaries · Role guards           │
└─────────────────────────┬───────────────────────────────┘
                          │ Drizzle ORM
┌─────────────────────────▼───────────────────────────────┐
│                   DATABASE (Turso / LibSQL)               │
│  Embedded replica for zero-latency reads                  │
│  SQLite-compatible · Globally distributed                 │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (5 minutes)

### 1. Clone and install
```bash
git clone <your-repo-url> smartschool
cd smartschool
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Edit .env.local with your Turso + JWT credentials
```

### 3. Create Turso database (free tier works)
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create smartschool-prod

# Get credentials
turso db show smartschool-prod --url
turso db tokens create smartschool-prod
```
Paste those values into `.env.local`.

### 4. Run migrations + seed
```bash
npm run db:generate   # generate migration files
npm run db:migrate    # apply to Turso
npx tsx scripts/seed.ts  # seed demo data
```

### 5. Start dev server
```bash
npm run dev
# → http://localhost:3000
```

**Demo credentials:**
| Role    | Phone        | PIN  |
|---------|--------------|------|
| Teacher | 08012345678  | 1234 |
| MD      | 08099999999  | 9999 |

---

## Project Structure

```
smartschool/
├── app/
│   ├── globals.css              # Design tokens + utility classes
│   ├── layout.tsx               # Root layout (Providers, PWA meta)
│   ├── page.tsx                 # Splash + Login screen
│   ├── teacher/
│   │   ├── page.tsx             # Teacher Dashboard
│   │   ├── scores/page.tsx      # Offline Broadsheet (class → subject → grid)
│   │   ├── results/page.tsx     # Result Gate (generate + lock/unlock)
│   │   ├── pulse/page.tsx       # Friday Behavioral Pulse
│   │   ├── analytics/page.tsx   # Trendlines + Heatmap + AI Recommendations
│   │   └── messages/page.tsx    # WhatsApp-style inbox + compose
│   ├── md/
│   │   ├── page.tsx             # Net-Cash Dashboard (live refresh)
│   │   ├── expenses/page.tsx    # SmartSpend (submit + MD approve)
│   │   └── messages/page.tsx    # MD messages view
│   └── api/
│       ├── auth/login/          # POST – rate-limited login, JWT cookie
│       ├── auth/logout/         # POST – clear session cookie
│       ├── students/            # GET  – students by classId
│       ├── subjects/            # GET  – subjects by classId
│       ├── classes/             # GET  – school classes
│       ├── terms/               # GET  – school terms
│       ├── scores/              # GET/POST – score CRUD
│       ├── scores/bulk/         # POST – offline sync flush
│       ├── pulse/               # GET/POST – behavioral ratings
│       ├── pulse/bulk/          # POST – offline pulse sync
│       ├── reports/             # GET  – report cards
│       ├── reports/generate/    # POST – generate reports + positions
│       ├── fees/                # GET  – fee records
│       ├── fees/summary/        # GET  – net cash summary (MD)
│       ├── fees/unlock/         # POST – Result Gate payment unlock
│       ├── expenses/            # GET/POST – imprest requests
│       ├── expenses/approve/    # PATCH – MD approve/decline
│       ├── messages/            # GET/POST – school messages
│       └── analytics/student/  # GET  – student analytics + AI recommendation
│
├── components/
│   ├── Providers.tsx            # QueryClient + OfflineBanner + Toast
│   ├── layouts/
│   │   └── BottomNav.tsx        # Role-aware bottom navigation
│   └── ui/
│       └── shared.tsx           # All reusable components
│                                # (BackHeader, CircularProgress, StarRating,
│                                #  Skeleton, EmptyState, ErrorState, BottomSheet,
│                                #  ProgressBar, useConfetti, gradeColor, heatColor)
│
├── lib/
│   ├── types.ts                 # ALL domain types + Zod schemas (single source of truth)
│   ├── store.ts                 # Zustand stores (auth + UI + score drafts)
│   ├── auth.ts                  # JWT sign/verify/session (jose, Edge-compatible)
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema (all tables + indexes)
│   │   ├── client.ts            # Singleton DB client
│   │   └── offline.ts           # Dexie/IndexedDB client + helpers
│   ├── hooks/
│   │   ├── useQueries.ts        # ALL React Query hooks (centralised)
│   │   └── useOfflineSync.ts    # Background sync engine
│   └── utils/
│       └── api.ts               # ok/err helpers, parseBody, rateLimit, getGrade, genId
│
├── middleware.ts                # Auth guard + role enforcement
├── scripts/seed.ts              # Database seeder
├── drizzle.config.ts            # Drizzle Kit config
├── next.config.js               # Next.js + PWA config
├── tailwind.config.js           # Full design token palette
├── .env.example                 # All required env vars documented
└── public/manifest.json         # PWA manifest
```

---

## Key Architectural Decisions & Why

### 1. Turso (LibSQL) — not PostgreSQL
- Runs at the **edge** — co-located with your API routes on Vercel Edge Network
- Embedded replica = **sub-millisecond reads** for frequently-accessed data
- Free tier handles schools with 50–500 students easily
- Upgrade path to PostgreSQL is seamless via Drizzle (swap driver, same schema)

### 2. Offline-first with Dexie + React Query `networkMode: 'offlineFirst'`
- Every score/pulse edit writes to **IndexedDB first** (zero latency)
- Background sync engine (`useOfflineSync`) flushes dirty records every 8s when online
- React Query serves from cache when offline, syncs when reconnected
- Teachers in low-connectivity Lagos classrooms never lose work

### 3. Zustand for client state, React Query for server state
- No Redux — Zustand is 1KB and type-safe
- Score drafts persisted to `localStorage` (survive page refreshes before sync)
- Clear separation: UI state (Zustand) ≠ server data (React Query)

### 4. JWT in HttpOnly cookie — not localStorage
- CSRF-safe (SameSite=Strict), XSS-safe (HttpOnly)
- Works with Next.js middleware for server-side route protection
- 7-day expiry; refresh token pattern can be added

### 5. Zod validation on EVERY API input
- No raw `req.body` access anywhere
- Schema errors return structured 422 with field-level messages
- Same schemas reused on the frontend via `zodResolver`

---

## Production Checklist

### Security
- [x] JWT in HttpOnly cookies (not localStorage)
- [x] Zod validation on all API inputs
- [x] Role-based middleware guards
- [x] Rate limiting on login (10 req/min)
- [x] bcryptjs for PIN hashing
- [ ] Replace in-memory rate limiter with Upstash Redis in prod
- [ ] Add CSRF token for state-changing requests
- [ ] Set up Sentry for error tracking

### Performance
- [x] React Query staleTime + gcTime tuned per endpoint
- [x] Turso embedded replica for low-latency reads
- [x] Offline-first with IndexedDB
- [x] PWA with service worker caching
- [ ] Add `@vercel/og` for report card image generation
- [ ] Implement virtual scrolling for large student lists (>100)

### Payments (connect to complete Result Gate)
1. Install Paystack SDK: `npm install @paystack/inline-js`
2. In `app/teacher/results/page.tsx`, replace the mock `pay()` call:
```typescript
import PaystackPop from '@paystack/inline-js';

const paystack = new PaystackPop();
paystack.newTransaction({
  key:       process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  email:     parentEmail,
  amount:    card.feesOwed * 100, // Paystack uses kobo
  onSuccess: async (transaction) => {
    await unlock({ studentId: card.studentId, termId: card.termId,
                   paymentRef: transaction.reference, channel: 'paystack' });
  },
});
```

### WhatsApp Notifications (connect to complete Pulse + Messages)
```typescript
// lib/utils/whatsapp.ts
export async function sendWhatsApp(to: string, message: string) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_WHATSAPP_FROM!,
        To:   `whatsapp:${to}`,
        Body: message,
      }),
    }
  );
  return response.json();
}
```

### PDF Report Cards
```bash
npm install @react-pdf/renderer
# Create components/pdf/ReportCard.tsx
# Call from /api/reports/pdf/[studentId]/route.ts
```

### Deploy to Vercel
```bash
vercel --prod
# Set env vars in Vercel dashboard (same as .env.local)
# Enable Edge Runtime: add `export const runtime = 'edge'` to API routes
```

---

## Data Flow: Offline Score Entry

```
Teacher enters score
       │
       ▼
useScoreDraftStore.setScore()  ← Zustand (instant UI update)
       │
       ▼
upsertScore() in Dexie         ← IndexedDB (offline persistence)
       │
   [online?]──── NO ──► Show "Saved locally" toast
       │                 isDirty = true
       │ YES
       ▼
/api/scores/bulk POST          ← Auto-sync every 8s
       │
       ▼
Turso database                 ← Server truth
       │
       ▼
React Query cache invalidated  ← UI updates
```

---

## Data Flow: Result Gate Payment

```
Parent/Teacher clicks "Pay & Unlock"
       │
       ▼
Paystack/Flutterwave popup
       │
  [payment success]
       │
       ▼
/api/fees/unlock POST
       │
       ├── Update fees table (amountPaid = amountDue)
       ├── WhatsApp receipt to parent
       └── Return { unlocked: true }
       │
       ▼
React Query invalidates ['results']
       │
       ▼
Card flips from 🔒 to ✅
Confetti fires 🎉
```

---

## Adding a New Screen (Zero-Debt Pattern)

1. **Add types** to `lib/types.ts`
2. **Add API route** in `app/api/[resource]/route.ts` using `withErrorBoundary` + `ok`/`err`
3. **Add React Query hook** in `lib/hooks/useQueries.ts`
4. **Add page** in `app/[role]/[screen]/page.tsx` using existing shared components
5. **Add nav item** to `BottomNav.tsx` if needed

No new dependencies, no new patterns — everything slots in consistently.

---

## Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes in one repo |
| Language | TypeScript (strict) | Zero runtime type surprises |
| Styling | Tailwind CSS | Consistent design tokens |
| Animation | Framer Motion | Declarative, performant |
| State (UI) | Zustand | Tiny, type-safe, no boilerplate |
| State (server) | React Query v5 | Caching, offline, auto-refetch |
| Database | Turso (LibSQL) | Edge-native SQLite, free tier |
| ORM | Drizzle ORM | Type-safe, zero magic |
| Offline | Dexie (IndexedDB) | Best-in-class offline DB |
| Auth | jose (JWT) | Edge-compatible, no Node deps |
| Validation | Zod | Single schema, frontend + backend |
| Charts | Recharts | Lightweight, React-native |
| Forms | react-hook-form + zod | Zero re-renders, typed |
| PWA | next-pwa | Service worker + manifest |
| Deploy | Vercel (recommended) | Zero-config Next.js |
