// ============================================================
// routes/notes.js
// ============================================================
// The dashboard and all note CRUD operations.
// Every route below is protected by isAuthenticated, and every
// query is scoped with "AND user_id = ?" so a user can never
// read, edit, or delete another user's notes — even if they
// guess a note's id.
// ============================================================

const express = require('express');
const pool = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

// Formats a MySQL timestamp as "19 Jul 2026, 3:45 PM" — written out
// manually so the format is identical for every visitor, regardless
// of their browser or server locale settings.
function formatDate(value) {
  const d = new Date(value);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

// ---------- Dashboard: every note belonging to the logged-in user ----------
router.get('/dashboard', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
      [req.session.userId]
    );
    const notes = rows.map((note) => ({
      ...note,
      created_display: formatDate(note.created_at),
      updated_display: formatDate(note.updated_at)
    }));
    res.render('dashboard', { notes, error: null });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', { notes: [], error: 'Could not load your notes right now.' });
  }
});

// ---------- Create a note ----------
router.post('/notes/create', async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) return res.redirect('/dashboard');

  try {
    await pool.query('INSERT INTO notes (user_id, content) VALUES (?, ?)', [req.session.userId, content]);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Create note error:', err);
    res.redirect('/dashboard');
  }
});

// ---------- Show the edit form for a single note ----------
router.get('/notes/edit/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (rows.length === 0) return res.redirect('/dashboard');

    const note = {
      ...rows[0],
      created_display: formatDate(rows[0].created_at),
      updated_display: formatDate(rows[0].updated_at)
    };
    res.render('edit-note', { note, error: null });
  } catch (err) {
    console.error('Edit note error:', err);
    res.redirect('/dashboard');
  }
});

// ---------- Save changes to a note ----------
router.post('/notes/update/:id', async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) return res.redirect(`/notes/edit/${req.params.id}`);

  try {
    await pool.query(
      'UPDATE notes SET content = ? WHERE id = ? AND user_id = ?',
      [content, req.params.id, req.session.userId]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Update note error:', err);
    res.redirect('/dashboard');
  }
});

// ---------- Delete a note ----------
router.post('/notes/delete/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Delete note error:', err);
    res.redirect('/dashboard');
  }
});

module.exports = router;
