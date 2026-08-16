const { corsOk, json, findUser } = require('./_utils');
const { issue } = require('../otp');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const email = String(body.email || '').trim().toLowerCase();
  const purpose = String(body.purpose || 'registration').trim();
  if (!email) return json(400, { error: 'Email is required.' });
  if (!['registration', 'password_reset'].includes(purpose)) return json(400, { error: 'Invalid OTP purpose.' });

  try {
    const user = await findUser('email', 'eq', email);
    if (!user) return json(404, { error: 'No account found with this email.' });

    await issue(email, user.id, purpose, user.name);
    return json(200, { message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('resend-otp error:', err);
    return json(500, { error: err.message || 'Could not send verification code.' });
  }
};
