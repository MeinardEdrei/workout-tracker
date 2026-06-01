# Workout Tracker

A mobile-first PWA for tracking gym splits and exercises. Built with React + Vite, Express.js, and MongoDB Atlas. Deployed on Vercel as a monorepo with Google OAuth authentication.

---

## Project Structure

```
workout-tracker/
├── api/                      # Express.js backend (serverless on Vercel)
│   ├── middleware/
│   │   └── auth.js           # JWT requireAuth / requireAdmin guards
│   ├── models/
│   │   ├── User.js
│   │   ├── AllowedEmail.js
│   │   └── Split.js
│   ├── routes/
│   │   ├── auth.js           # Google OAuth + JWT exchange
│   │   ├── admin.js          # Allowed-email management
│   │   ├── splits.js
│   │   └── logs.js
│   ├── index.js
│   ├── seed.js
│   └── .env.example
├── src/                      # React frontend
│   ├── api/
│   │   └── index.js          # Typed fetch helpers
│   ├── context/
│   │   └── AuthContext.jsx   # Auth state, token validation, OAuth callback handling
│   ├── hooks/
│   │   └── useStorage.js     # Routes to API (logged in) or localStorage (guest)
│   ├── pages/
│   │   ├── TodayPage.jsx
│   │   ├── SplitsPage.jsx
│   │   ├── EditPage.jsx
│   │   ├── StatsPage.jsx
│   │   └── AdminPage.jsx
│   ├── storage/
│   │   └── localStorageApi.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── vite.config.js
├── package.json
└── vercel.json
```

---

## Stack

- **Frontend** — React 18, Vite 5, vite-plugin-pwa, TanStack Query
- **Backend** — Express.js (serverless via `@vercel/node`)
- **Database** — MongoDB Atlas (free M0 tier) + Mongoose
- **Auth** — Google OAuth 2.0, stateless JWT (no sessions)
- **Deploy** — Vercel (monorepo, single project)

---

## Features

- **Today** — Active split with today's day highlighted. Tap to expand exercises. Checkboxes auto-reset each day via `lastCheckedDate`. Finish button logs the workout with volume stats and a shareable card.
- **Splits** — View all splits, set active, rename, delete. Header integrates auth controls so the avatar and + New button never overlap on mobile.
- **Edit** — Full editor for splits → days → exercises. Inline editing for sets, reps, weight, unit. Drag to reorder exercises. Toggle rest days.
- **Stats** — Weekly volume and workout history from saved logs.
- **Admin** — Manage the allowed-email allowlist (admin account only).
- **Auth** — Google Sign In with allowlist gate. Guest users get localStorage-backed data; logged-in users sync to MongoDB. Sign-in button shows a loading state and 5-second timeout with error recovery.
- **PWA** — Installable on mobile. Precached static assets. Service worker bypasses all `/api/*` routes to ensure OAuth redirects always hit the network.

---

## Local Development

### Prerequisites

- Node.js v26+
- MongoDB Atlas account
- Google Cloud Console project with OAuth 2.0 credentials

### Install

```bash
git clone https://github.com/MeinardEdrei/workout-tracker
cd workout-tracker
npm install
cd api && npm install
```

### Environment Variables

**`api/.env`**

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/workout-tracker?retryWrites=true&w=majority
PORT=3001
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
JWT_SECRET=<random-secret>
SESSION_SECRET=<random-secret>
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=<your-email>
```

**`.env`** (frontend, Vite)

```env
VITE_API_URL=http://localhost:3001
VITE_ADMIN_EMAIL=<your-email>
```

### Google Cloud Console Setup

1. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Authorized JavaScript origins: `http://localhost:5173`
4. Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Copy the client ID and secret into `api/.env`

### Add yourself to the allowlist

Before anyone can sign in, their email must be in the `allowedemails` MongoDB collection. Seed it manually or use the Admin panel once you're in.

```bash
# Quick seed via mongosh
use workout-tracker
db.allowedemails.insertOne({ email: "you@example.com" })
```

### Run locally

```bash
# Terminal 1 — backend (auto-restarts on save)
cd api && npm run dev

# Terminal 2 — frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## MongoDB Atlas Setup

1. Create a free account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free **M0** cluster
3. **Database Access** — add a user with read/write permissions
4. **Network Access** — add `0.0.0.0/0` (required for Vercel's dynamic IPs)
5. **Connect → Drivers** — copy the connection string, replace `<username>`/`<password>`, append `/workout-tracker` before the `?`

---

## Vercel Deployment

This is a monorepo deployed as a single Vercel project. Vite builds the frontend at the root; `api/index.js` runs as a serverless function.

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Environment Variables (Vercel Dashboard)

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/google/callback` |
| `JWT_SECRET` | Random secret (32+ chars) |
| `SESSION_SECRET` | Random secret (32+ chars) |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `ADMIN_EMAIL` | Your email |
| `VITE_API_URL` | `https://your-app.vercel.app` |
| `VITE_ADMIN_EMAIL` | Your email |

> **Note:** `VITE_*` variables are baked into the frontend bundle at build time. If you add or change them in Vercel, redeploy for the change to take effect.

### Deploy

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. **Framework Preset:** Vite — **Root Directory:** `./` — **Build Command:** `npm run build` — **Output Directory:** `dist`
4. Add all environment variables above
5. Add the production callback URL to Google Cloud Console → Authorized redirect URIs
6. Deploy

---

## Auth Flow

The app uses a stateless OAuth flow — no server-side sessions.

1. **Sign In clicked** → frontend fetches `/api/auth/google/url` (returns Google OAuth URL as JSON)
2. **Browser navigates** to `accounts.google.com` directly (avoids service worker interception)
3. **Google redirects** to `/api/auth/google/callback?code=...&state=...`
4. **If new SW is active** (denylist configured): serverless function exchanges the code, issues a JWT, redirects to `/?token=...`
5. **If old SW intercepts** the callback and serves `index.html`: `AuthContext` detects `?code=&state=` params and calls `/api/auth/google/exchange` to complete the flow client-side
6. JWT stored in `localStorage`, validated on every page load via `/api/auth/me`

---

## API Routes

```
GET    /api/auth/google
GET    /api/auth/google/url
GET    /api/auth/google/callback
GET    /api/auth/google/exchange
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/admin/users
DELETE /api/admin/users/:id
GET    /api/admin/allowed
POST   /api/admin/allowed
DELETE /api/admin/allowed/:id

GET    /api/splits
POST   /api/splits
PUT    /api/splits/:id
DELETE /api/splits/:id
PATCH  /api/splits/:id/activate

GET    /api/splits/:id/days
POST   /api/splits/:id/days
PUT    /api/splits/:id/days/:dayId
DELETE /api/splits/:id/days/:dayId

GET    /api/splits/:id/days/:dayId/exercises
POST   /api/splits/:id/days/:dayId/exercises
PUT    /api/splits/:id/days/:dayId/exercises/:exId
DELETE /api/splits/:id/days/:dayId/exercises/:exId
PATCH  /api/splits/:id/days/:dayId/exercises/:exId/toggle
PATCH  /api/splits/:id/days/:dayId/exercises/reorder

GET    /api/logs
POST   /api/logs
GET    /api/logs/week
GET    /api/logs/:date
DELETE /api/logs/:id
DELETE /api/logs/clear

GET    /api/health
```
