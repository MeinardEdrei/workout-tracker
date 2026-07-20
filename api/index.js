const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const splitsRouter = require('./_lib/routes/splits');
const logsRouter = require('./_lib/routes/logs');
const authRouter = require('./_lib/routes/auth');
const adminRouter = require('./_lib/routes/admin');
const exercisesRouter = require('./_lib/routes/exercises');
const inviteRouter = require('./_lib/routes/invite');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

const WorkoutLog = require('./_lib/models/WorkoutLog');

let isConnected = false;
let isMigrated = false;

async function runLogVolumeMigration() {
  try {
    console.log('Starting WorkoutLog volume migration...');
    const logs = await WorkoutLog.find({ 'exercises.weightUnit': 'lbs' });
    console.log(`Found ${logs.length} logs with potential lbs exercises.`);
    
    let updatedCount = 0;
    for (const log of logs) {
      const correctVol = Math.round((log.exercises || []).reduce((sum, ex) => {
        const w = ex.weight || 0;
        const weightInKg = (ex.weightUnit === 'lbs') ? (w / 2.20462) : w;
        return sum + (ex.sets || 0) * (ex.reps || 0) * weightInKg;
      }, 0));
      
      if (log.totalVolume !== correctVol) {
        log.totalVolume = correctVol;
        await log.save();
        updatedCount++;
      }
    }
    console.log(`WorkoutLog volume migration completed: updated ${updatedCount} logs.`);
  } catch (err) {
    console.error('WorkoutLog volume migration failed:', err);
  }
}

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  if (!isMigrated) {
    isMigrated = true;
    runLogVolumeMigration().catch(err => console.error('Migration async error:', err));
  }
}

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/splits', splitsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/invite', inviteRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 3001, () => console.log('Server running on port', process.env.PORT || 3001));
  });
}

module.exports = app;
