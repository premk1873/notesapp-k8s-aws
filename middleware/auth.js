// ============================================================
// middleware/auth.js
// ============================================================
// Guards routes that should only be reachable by a logged-in
// user. Any request without an active session is sent to the
// login page instead.
// ============================================================

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = { isAuthenticated };
