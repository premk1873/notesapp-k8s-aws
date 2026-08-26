// ============================================================
// app.js — CloudNotes entry point
// ============================================================
// Wires up the view engine, middleware, session store, and
// routes, then starts the HTTP server.
//
// Startup waits for MySQL to accept connections before the app
// starts listening, then ensures the schema exists before
// anything else runs. This matters on a fresh RDS instance or
// a rebuilt cluster, where the app container can come up before
// the database is ready or before its tables exist.
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const morgan = require('morgan');
const MySQLStoreFactory = require('express-mysql-session');

const pool = require('./database/db');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3000;

async function waitForDatabase(retries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to MySQL.');
      return;
    } catch (err) {
      console.log(`MySQL not ready yet, retrying... (${attempt}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Could not connect to MySQL after multiple attempts.');
}

// Applies database/schema.sql on every startup. Safe to run repeatedly —
// the schema uses CREATE TABLE IF NOT EXISTS, so this is a no-op against
// an already-initialized database and a first-time setup against a fresh
// RDS instance, with no separate manual step required either way.
async function initializeSchema() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
  const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log('Schema initialized (tables created if not already present).');
}

async function main() {
  await waitForDatabase();
  await initializeSchema();

  // ---------- Session store ----------
  // Sessions live in MySQL, not in server memory, so no user data is
  // lost if a pod is replaced or restarted.
  const MySQLStore = MySQLStoreFactory(session);
  const sessionStore = new MySQLStore({}, pool);
  await sessionStore.onReady(); // wait for the "sessions" table to exist

  // ---------- View engine ----------
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ---------- Core middleware ----------
  app.use(morgan('combined')); // request logs on stdout
  app.use(express.urlencoded({ extended: true })); // parses HTML form submissions
  app.use(express.static(path.join(__dirname, 'public')));

  // ---------- Health check ----------
  // Deliberately placed before the session middleware so it stays fast
  // and never touches the session store. Checks the database too, so
  // it reflects whether the app can actually serve requests, not just
  // whether the Node process is up.
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      res.status(503).json({ status: 'error' });
    }
  });

  app.use(session({
    key: 'cloudnotes_sid',
    secret: process.env.SESSION_SECRET || 'cloudnotes_dev_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  // Makes the logged-in user's name available to every view automatically.
  app.use((req, res, next) => {
    res.locals.userName = req.session.userName || null;
    next();
  });

  // ---------- Routes ----------
  app.get('/', (req, res) => {
    res.redirect(req.session.userId ? '/dashboard' : '/login');
  });

  app.use('/', authRoutes);
  app.use('/', notesRoutes);

  // ---------- 404 ----------
  app.use((req, res) => {
    res.status(404).send('Page not found');
  });

  // ---------- Error handler ----------
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong. Please try again.');
  });

  app.listen(PORT, () => {
    console.log(`CloudNotes server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start CloudNotes:', err);
  process.exit(1);
});