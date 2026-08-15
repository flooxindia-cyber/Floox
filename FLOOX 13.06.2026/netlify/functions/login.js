// netlify/functions/login.js — Supabase edition
// POST /.netlify/functions/login
// Body: { email, password }

const {
  corsOk, json,
  checkPassword, signToken,
  findUser,
  publicUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { email, password } = body;
  if (!email || !password)
    return json(400, { error: 'Email and password are required.' });

  try {
    const normalEmail = email.toLowerCase().trim();
    const user = await findUser('email', 'eq', normalEmail);

    if (!user)
      return json(401, { error: 'No account found with this email. Please sign up first.' });

    const ok = await checkPassword(password, user.password_hash);
    if (!ok)
      return json(401, { error: 'Incorrect password. Please try again.' });

    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return json(200, { token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return json(500, { error: 'Login failed. Please try again.' });
  }
};
