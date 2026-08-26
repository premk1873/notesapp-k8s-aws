// ============================================================
// routes/auth.js
// ============================================================
// Registration, login, and logout.
// Passwords are hashed with bcrypt before they ever reach the
// database — the plaintext password is never stored.
// ============================================================

const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../database/db');

const router = express.Router();
const SALT_ROUNDS = 10;

// ---------- Registration ----------

router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('register', { error: null, formData: {} });
});

router.post('/register', async (req, res) => {
  const { name, user_id, password } = req.body;
  const trimmedName = (name || '').trim();
  const trimmedUserId = (user_id || '').trim();

  // ---- Validate input ----
  const errors = [];

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    errors.push('Name must be between 2 and 100 characters.');
  }
  if (trimmedUserId.length < 3 || trimmedUserId.length > 50) {
    errors.push('User ID must be between 3 and 50 characters.');
  } else if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUserId)) {
    errors.push('User ID can only contain letters, numbers, dots, and underscores.');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).render('register', {
      error: errors.join(' '),
      formData: { name: trimmedName, user_id: trimmedUserId }
    });
  }

  try {
    // Friendly, fast check before we spend time hashing the password.
    const [existing] = await pool.query('SELECT id FROM users WHERE user_id = ?', [trimmedUserId]);
    if (existing.length > 0) {
      return res.status(400).render('register', {
        error: 'That User ID is already taken. Please choose another.',
        formData: { name: trimmedName, user_id: '' }
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query(
      'INSERT INTO users (name, user_id, password_hash) VALUES (?, ?, ?)',
      [trimmedName, trimmedUserId, passwordHash]
    );

    res.redirect('/login?registered=1');
  } catch (err) {
    // Belt-and-suspenders: the UNIQUE constraint on user_id is the real
    // safety net if two people register the same User ID at the same time.
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('register', {
        error: 'That User ID is already taken. Please choose another.',
        formData: { name: trimmedName, user_id: '' }
      });
    }
    console.error('Registration error:', err);
    res.status(500).render('register', {
      error: 'Something went wrong while creating your account. Please try again.',
      formData: { name: trimmedName, user_id: trimmedUserId }
    });
  }
});

// ---------- Login ----------

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null, registered: req.query.registered === '1' });
});

router.post('/login', async (req, res) => {
  const { user_id, password } = req.body;
  const trimmedUserId = (user_id || '').trim();

  if (!trimmedUserId || !password) {
    return res.status(400).render('login', {
      error: 'Please enter both your User ID and password.',
      registered: false
    });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [trimmedUserId]);
    const user = rows[0];

    // Compare against a hash either way so a valid vs. invalid User ID
    // takes roughly the same amount of time to respond.
    const passwordHash = user ? user.password_hash : '$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa';
    const match = await bcrypt.compare(password, passwordHash);

    if (!user || !match) {
      return res.status(401).render('login', {
        error: 'Invalid User ID or password.',
        registered: false
      });
    }

    // Regenerate the session on login to protect against session fixation.
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).render('login', {
          error: 'Something went wrong. Please try again.',
          registered: false
        });
      }
      req.session.userId = user.id;
      req.session.userName = user.name;
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('login', {
      error: 'Something went wrong. Please try again.',
      registered: false
    });
  }
});

// ---------- Logout ----------

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('cloudnotes_sid');
    res.redirect('/login');
  });
});

module.exports = router;
