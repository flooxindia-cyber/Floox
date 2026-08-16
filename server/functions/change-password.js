// Floox server function
// Internal server function
// Body: { currentPassword, newPassword }

const {
  corsOk, json,
  verifyToken, extractBearer,
  checkPassword, hashPassword,
  findUser, updateUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword)
    return json(400, { error: 'Both current and new passwords are required.' });
  if (newPassword.length < 8)
    return json(400, { error: 'New password must be at least 8 characters.' });

  try {
    const user = await findUser('id', 'eq', decoded.id);
    if (!user) return json(404, { error: 'Account not found.' });

    const ok = await checkPassword(currentPassword, user.password_hash);
    if (!ok) return json(401, { error: 'Current password is incorrect.' });

    await updateUser(decoded.id, { password_hash: await hashPassword(newPassword) });
    return json(200, { message: 'Password changed successfully.' });
  } catch (err) {
    console.error('change-password error:', err);
    return json(500, { error: 'Password change failed. Please try again.' });
  }
};
