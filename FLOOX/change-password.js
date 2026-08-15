// netlify/functions/change-password.js
// POST /.netlify/functions/change-password
// Requires: Authorization: Bearer <token>
// Body: { currentPassword, newPassword }

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { ok, err, preflight, findUser, updateUser } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Method not allowed', 405);

  if (!process.env.JWT_SECRET) return err('Server configuration error.', 500);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return err('Authentication required.', 401);
  let decoded;
  try { decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET); }
  catch { return err('Session expired. Please sign in again.', 401); }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return err('currentPassword and newPassword are required.');
  if (newPassword.length < 8)           return err('New password must be at least 8 characters.');
  if (currentPassword === newPassword)  return err('New password must be different from current password.');

  // ── Verify current password ───────────────────────────────────────────────
  let user;
  try { user = await findUser('id', decoded.id); }
  catch { return err('Database error.', 500); }
  if (!user) return err('Account not found.', 404);

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return err('Current password is incorrect.', 401);

  // ── Hash & save ───────────────────────────────────────────────────────────
  const password_hash = await bcrypt.hash(newPassword, 12);
  try { await updateUser(decoded.id, { password_hash }); }
  catch (e) { console.error('Update error:', e); return err('Could not update password.', 500); }

  console.log(`Password changed: ${user.email} at ${new Date().toISOString()}`);
  return ok({ message: 'Password updated successfully.' });
};
