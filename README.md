# 💪 Workout Tracker

A mobile-first PWA for tracking gym splits and exercises. Built with React + Vite, Express.js, and MongoDB Atlas. Deployed on Vercel as a monorepo.

---

## Project Structure

```
workout-tracker/
├── api/                  # Express.js backend (serverless on Vercel)
│   ├── models/
│   │   └── Split.js
│   ├── routes/
│   │   └── splits.js
│   ├── index.js
│   ├── seed.js
│   └── .env.example
├── src/                  # React frontend
│   ├── api/
│   │   └── index.js      # API fetch functions
│   ├── pages/
│   │   ├── TodayPage.jsx
│   │   ├── SplitsPage.jsx
│   │   └── EditPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── icon.svg
├── index.html
├── vite.config.js
├── package.json
└── vercel.json
```

---

## Stack

- **Frontend** — React 18, Vite 5, vite-plugin-pwa
- **Backend** — Express.js (serverless via `@vercel/node`)
- **Database** — MongoDB Atlas (free M0 tier) + Mongoose
- **Deploy** — Vercel (monorepo, single project)

---

## Local Development

### Prerequisites

- Node.js v26+
- MongoDB Atlas account (see below)

### Install

```bash
git clone https://github.com/MeinardEdrei/workout-tracker
cd workout-tracker
npm install        # frontend deps
cd api && npm install  # backend deps
```

### Environment Variables

Create `api/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.xxxxx.mongodb.net/workout-tracker?retryWrites=true&w=majority
PORT=3001
```

### Seed the database

```bash
cd api
node seed.js
```

Clears existing data and inserts PPL + Upper Lower splits with all exercises.

### Run locally

```bash
# Terminal 1 — backend
cd api && node --watch index.js

# Terminal 2 — frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## MongoDB Atlas Setup

1. Create a free account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free **M0** cluster
3. Under **Database Access** — add a user with read/write permissions
4. Under **Network Access** — add `0.0.0.0/0` (required for Vercel's dynamic IPs)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<username>`, `<password>`, and add `/workout-tracker` before the `?`

---

## Vercel Deployment

This is a monorepo deployed as a single Vercel project. The frontend (Vite) builds at the root and the backend (`api/index.js`) runs as a serverless function.

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Deploy

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (blank)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable: `MONGODB_URI`
5. Deploy

---

## API Routes

```
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
```

---

## Features

- **Today** — Active split with current day highlighted. Tap to open exercises. Checkboxes auto-reset each new day based on `lastCheckedDate`.
- **Splits** — View all splits, set active, rename, delete.
- **Edit** — Full editor for splits → days → exercises. Inline editing for sets, reps, weight, unit. Toggle rest days.
- **PWA** — Installable on mobile. Works offline (cached assets + NetworkFirst for API).
