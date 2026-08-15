// netlify/functions/register.js
// POST /.netlify/functions/register
// Body: { role, email, password, name, phone?, city? }

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { ok, err, preflight, findUser, createUser, publicUser } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Method not allowed', 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const { role, email, password, name, phone = '', city = '' } = body;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!['fan', 'artist', 'organiser'].includes(role))
    return err('Invalid role. Must be fan, artist, or organiser.');
  if (!email || !email.includes('@'))  return err('Valid email required.');
  if (!password || password.length < 8) return err('Password must be at least 8 characters.');
  if (!name || name.trim().length < 2)  return err('Name is required.');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return err('Server configuration error. Please contact support.', 500);
  if (!process.env.JWT_SECRET)
    return err('Server configuration error (JWT). Please contact support.', 500);

  // ── Check duplicate ───────────────────────────────────────────────────────
  try {
    const existing = await findUser('email', email.toLowerCase().trim());
    if (existing) return err('An account with this email already exists.', 409);
  } catch (e) {
    console.error('DB lookup error:', e);
    return err('Database error. Please try again.', 500);
  }

  // ── Hash password & insert ────────────────────────────────────────────────
  const password_hash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await createUser({
      role,
      email:         email.toLowerCase().trim(),
      name:          name.trim(),
      phone:         phone.trim(),
      city:          city.trim(),
      password_hash,
    });
  } catch (e) {
    console.error('Create user error:', e);
    return err('Could not create account. Please try again.', 500);
  }

  // ── Issue JWT ─────────────────────────────────────────────────────────────
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  console.log(`Registered: ${user.email} (${user.role}) at ${new Date().toISOString()}`);

  return ok({ token, user: publicUser(user) }, 201);
};
