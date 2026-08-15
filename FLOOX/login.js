// netlify/functions/login.js
// POST /.netlify/functions/login
// Body: { email, password }

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { ok, err, preflight, findUser, publicUser } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Method not allowed', 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const { email, password } = body;

  if (!email || !password) return err('Email and password are required.');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return err('Server configuration error. Please contact support.', 500);
  if (!process.env.JWT_SECRET)
    return err('Server configuration error (JWT). Please contact support.', 500);

  // ── Look up user ──────────────────────────────────────────────────────────
  let user;
  try {
    user = await findUser('email', email.toLowerCase().trim());
  } catch (e) {
    console.error('DB error:', e);
    return err('Database error. Please try again.', 500);
  }

  // Use a constant-time comparison regardless of whether user exists
  // to avoid timing-based email enumeration
  const hash = user?.password_hash || '$2a$12$invalidhashpaddingtomakeconstanttime000000000000000000';
  const match = await bcrypt.compare(password, hash);

  if (!user || !match) {
    return err('Incorrect email or password.', 401);
  }

  // ── Issue JWT ─────────────────────────────────────────────────────────────
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  console.log(`Login: ${user.email} (${user.role}) at ${new Date().toISOString()}`);

  return ok({ token, user: publicUser(user) });
};
