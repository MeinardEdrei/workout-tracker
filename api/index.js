const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

// Sessions — only needed to hold OAuth state during the Google redirect flow
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 5 * 60, // 5 minutes — sessions only live long enough for the OAuth round-trip
    autoRemove: 'native',
  }),
  cookie: {
    maxAge: 5 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

// Passport — Google OAuth strategy
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  (_accessToken, _refreshToken, profile, done) => done(null, profile)
));

app.use(passport.initialize());
app.use(passport.session());

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
