const { corsOk, json, findUser, updateUser, hashPassword } = require('./_utils');
const { verify } = require('../otp');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const email = String(body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();
  const newPassword = String(body.newPassword || '');

  if (!email || !otp || !newPassword) return json(400, { error: 'Email, verification code, and new password are required.' });
  if (newPassword.length < 8) return json(400, { error: 'Password must be at least 8 characters.' });

  try {
    const user = await findUser('email', 'eq', email);
    if (!user) return json(404, { error: 'No account found with this email.' });

    const result = await verify(email, otp, 'password_reset');
    if (!result.ok) return json(400, { error: result.error });

    await updateUser(user.id, { password_hash: await hashPassword(newPassword) });
    return json(200, { message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('reset-password error:', err);
    return json(500, { error: err.message || 'Password reset failed. Please try again.' });
  }
};
