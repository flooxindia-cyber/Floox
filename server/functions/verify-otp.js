const { corsOk, json, findUser, updateUser, signToken, publicUser } = require('./_utils');
const { verify } = require('../otp');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const email = String(body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();
  const purpose = String(body.purpose || 'registration').trim();

  if (!email || !otp) return json(400, { error: 'Email and verification code are required.' });
  if (!['registration', 'password_reset'].includes(purpose)) return json(400, { error: 'Invalid verification purpose.' });

  try {
    const user = await findUser('email', 'eq', email);
    if (!user) return json(404, { error: 'No account found with this email.' });

    const result = await verify(email, otp, purpose);
    if (!result.ok) return json(400, { error: result.error });

    if (purpose === 'registration') {
      const updated = await updateUser(user.id, { verified: true });
      const token = signToken({ id: updated.id, role: updated.role, email: updated.email });
      return json(200, { message: 'Email verified successfully.', token, user: publicUser(updated) });
    }

    return json(200, { message: 'Code verified successfully.', userId: user.id });
  } catch (err) {
    console.error('verify-otp error:', err);
    return json(500, { error: err.message || 'Verification failed. Please try again.' });
  }
};
