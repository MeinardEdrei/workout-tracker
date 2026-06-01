const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const splitsRouter = require('./routes/splits');
const logsRouter = require('./routes/logs');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
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
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 3001, () => console.log('Server running on port', process.env.PORT || 3001));
  });
}

module.exports = app;
