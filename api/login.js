// Vercel API — Floox login

const {
  checkPassword,
  signToken,
  findUser,
  publicUser,
} = require('../netlify/functions/_utils');

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  return res.status(status).json(body);
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  let body = req.body || {};

  // In case the body arrives as a string
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  const { email, password } = body;

  if (!email || !password) {
    return sendJson(res, 400, {
      error: 'Email and password are required.'
    });
  }

  try {
    const normalEmail = email.toLowerCase().trim();

    const user = await findUser('email', 'eq', normalEmail);

    if (!user) {
      return sendJson(res, 401, {
        error: 'No account found with this email. Please sign up first.'
      });
    }

    const ok = await checkPassword(password, user.password_hash);

    if (!ok) {
      return sendJson(res, 401, {
        error: 'Incorrect password. Please try again.'
      });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email
    });

    return sendJson(res, 200, {
      token,
      user: publicUser(user)
    });

  } catch (err) {
    console.error('Login error:', err);

    return sendJson(res, 500, {
      error: 'Login failed. Please try again.'
    });
  }
};