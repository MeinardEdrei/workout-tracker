# 💪 Workout Tracker

A mobile-first, dark-themed workout tracker. React + Vite frontend, Express.js backend, MongoDB Atlas database.

---

## Project Structure

```
workout-tracker/
├── client/         # React (Vite) frontend
├── server/         # Express.js API
│   ├── models/
│   │   └── Split.js
│   ├── routes/
│   │   └── splits.js
│   ├── index.js
│   ├── seed.js
│   └── .env.example
├── vercel.json
└── README.md
```

---

## 1. MongoDB Atlas Setup (from scratch)

### Create a Free Account

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Try Free** → Sign up with email or Google
3. Complete onboarding (choose "Learn MongoDB" if prompted — doesn't matter)

### Create a Free Cluster

1. Click **Create a deployment**
2. Choose **M0 Free** tier (the free forever option)
3. Pick your preferred cloud provider and region (any is fine)
4. Name your cluster (e.g. `workout-tracker`)
5. Click **Create Deployment**

### Create a Database User

1. You'll be prompted to create a user automatically — or go to **Database Access** → **Add New Database User**
2. Choose **Password** authentication
3. Set a username (e.g. `admin`) and a strong password
4. Under **Database User Privileges**, select **Read and write to any database**
5. Click **Add User**

### Whitelist Your IP

1. Go to **Network Access** → **Add IP Address**
2. For local dev: click **Add Current IP Address**
3. For Vercel (production): click **Allow Access from Anywhere** (`0.0.0.0/0`) — Vercel uses dynamic IPs
4. Click **Confirm**

### Get Your Connection String

1. Go to **Clusters** → Click **Connect** on your cluster
2. Choose **Drivers**
3. Select **Node.js** driver
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials
6. Add your database name before `?`:
   ```
   mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/workout-tracker?retryWrites=true&w=majority
   ```

---

## 2. Local Development Setup

### Prerequisites

- Node.js v26+ (you have this)
- Git

### Clone and install

```bash
git clone <your-repo>
cd workout-tracker

# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

### Environment Variables

**Server** — create `server/.env`:
```bash
cp server/.env.example server/.env
# then edit server/.env with your actual Atlas URI
```

```env
MONGODB_URI=mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/workout-tracker?retryWrites=true&w=majority
PORT=3001
CLIENT_URL=http://localhost:5173
```

**Client** — create `client/.env`:
```bash
echo "VITE_API_URL=http://localhost:3001" > client/.env
```

> Note: Vite also has a proxy set up (`/api` → `localhost:3001`), so you can
> leave `VITE_API_URL` empty and calls to `/api/*` will work automatically in dev.

### Seed the database

```bash
cd server
node seed.js
```

This will:
- Clear any existing splits
- Insert PPL and Upper Lower splits with all exercises

### Start the servers

In two terminals:

```bash
# Terminal 1 — API server
cd server
npm run dev

# Terminal 2 — Vite dev server
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 3. API Reference

```
GET    /api/splits
POST   /api/splits                           { name }
PUT    /api/splits/:id                       { name }
DELETE /api/splits/:id
PATCH  /api/splits/:id/activate

GET    /api/splits/:id/days
POST   /api/splits/:id/days                  { name, tag, isRest }
PUT    /api/splits/:id/days/:dayId           { name?, tag?, isRest? }
DELETE /api/splits/:id/days/:dayId

GET    /api/splits/:id/days/:dayId/exercises
POST   /api/splits/:id/days/:dayId/exercises { name, sets, reps, weight, weightUnit }
PUT    /api/splits/:id/days/:dayId/exercises/:exId
DELETE /api/splits/:id/days/:dayId/exercises/:exId
PATCH  /api/splits/:id/days/:dayId/exercises/:exId/toggle
```

---

## 4. Deploying to Vercel

### Install Vercel CLI

```bash
npm i -g vercel
```

### Build the client first

```bash
cd client
npm run build
```

### Deploy

From the project root:

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Root directory: `.` (project root)
- Vercel will auto-detect `vercel.json`

### Set Environment Variables on Vercel

After first deploy, go to your project on [vercel.com](https://vercel.com) →
**Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `VITE_API_URL` | Your Vercel deployment URL (e.g. `https://workout-tracker.vercel.app`) |

Then redeploy:

```bash
vercel --prod
```

### Note on `VITE_API_URL` in production

In production, your frontend and backend are on the same Vercel domain, so you
can set `VITE_API_URL` to your Vercel URL or leave it empty — the API proxy in
`vite.config.js` only applies in dev. In production, calls to `/api/*` go to
the same origin, which Vercel routes to `server/index.js` via `vercel.json`.

---

## 5. Features

- **Today tab** — Shows the active split, highlights the current day of week, opens exercise list, checkbox to mark exercises done. Checkboxes auto-reset each new day.
- **Splits tab** — List all splits, tap the circle to set active, rename/delete via icons.
- **Edit tab** — Select a split → manage days (add/delete/toggle rest) → tap a day → manage exercises inline (edit sets/reps/weight/unit, delete).

---

## 6. Tech Notes

- Exercise checkbox auto-reset: the `lastCheckedDate` field (YYYY-MM-DD string) is compared to today's date on both client and server. If they differ, the checkbox renders as unchecked.
- The `PATCH /:id/activate` route deactivates all splits before activating the target, ensuring only one is active at a time.
- CORS is configured to accept requests from `CLIENT_URL` env var (or `*` as fallback for local dev).
