// Floox server function
// POST /api/register
// Creates the account, stores role-specific registration data,
// and sends the first email OTP. The account becomes verified only after OTP.

const {
  corsOk, json,
  hashPassword,
  findUser, createUser,
} = require('./_utils');
const { issue } = require('../otp');

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const role = cleanString(body.role).toLowerCase();
  const email = cleanString(body.email).toLowerCase();
  const password = String(body.password || '');
  const name = cleanString(body.name);
  const phone = cleanString(body.phone);
  const city = cleanString(body.city);
  const state = cleanString(body.state);
  const data = body.data && typeof body.data === 'object' ? body.data : {};

  if (!['fan', 'artist', 'organiser'].includes(role))
    return json(400, { error: 'Invalid role. Must be fan, artist, or organiser.' });
  if (!email || !email.includes('@'))
    return json(400, { error: 'Please provide a valid email address.' });
  if (!password || password.length < 8)
    return json(400, { error: 'Password must be at least 8 characters.' });
  if (!name || name.length < 2)
    return json(400, { error: 'Please provide your full name.' });

  try {
    const existing = await findUser('email', 'eq', email);
    if (existing) {
      if (existing.verified === false) {
        return json(409, {
          error: 'An account exists but the email is not verified. Please verify it or request a new code.',
          requiresOtp: true,
          role: existing.role,
        });
      }
      return json(409, { error: 'An account with this email already exists. Please sign in.' });
    }

    const now = new Date().toISOString();
    const newUser = {
      role,
      email,
      name,
      phone,
      city,
      state,
      password_hash: await hashPassword(password),
      created_at: now,
      updated_at: now,
      bio: '',
      avatar: '',
      genres: [],
      social_links: {},
      stage_name: '',
      performer_type: '',
      org_name: '',
      org_type: '',
      verified: false,
      profile_complete: false,
    };

    // Preserve the detailed registration form instead of silently discarding it.
    if (role === 'artist') {
      newUser.stage_name = cleanString(data.stageName);
      newUser.genres = cleanArray(data.genres);
      newUser.performance_types = cleanArray(data.performanceTypes);
      newUser.event_types = cleanArray(data.eventTypes);
      newUser.bio = cleanString(data.bio);
      newUser.min_fee = data.minFee !== undefined && data.minFee !== '' ? Number(data.minFee) || 0 : null;
      newUser.social_links = {
        instagram: cleanString(data.instagram),
        youtube: cleanString(data.youtube),
        spotify: cleanString(data.spotify),
        website: cleanString(data.website),
      };
      newUser.portfolio = cleanArray(data.ytLinks);
    }

    if (role === 'organiser') {
      newUser.org_name = cleanString(data.orgName);
      newUser.org_type = cleanString(data.designation);
      newUser.bio = cleanString(data.bio);
      newUser.website = cleanString(data.website);
      newUser.gst_number = cleanString(data.gst);
      newUser.venue_types = cleanArray(data.eventTypes);
      newUser.preferred_genres = cleanArray(data.cities);
      newUser.budget_range = data.budget !== undefined ? String(data.budget) : '';
      newUser.events_per_year = cleanString(data.frequency);
      newUser.social_links = { social: cleanString(data.social) };
    }

    const created = await createUser(newUser);

    try {
      await issue(email, created.id, 'registration', created.name);
    } catch (mailErr) {
      console.error('Initial registration OTP error:', mailErr);
      return json(503, {
        error: mailErr.message || 'Account created, but the verification email could not be sent. Please use Resend OTP.',
        userId: created.id,
        requiresOtp: true,
        role,
      });
    }

    return json(201, {
      message: 'Account created. Please verify your email with the 6-digit code we sent you.',
      userId: created.id,
      role,
      requiresOtp: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    return json(500, { error: 'Registration failed. Please try again.' });
  }
};
