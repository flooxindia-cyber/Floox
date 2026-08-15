// netlify/functions/register.js — Supabase edition
// POST /.netlify/functions/register
// Body: { role, email, password, name, phone?, city? }

const {
  corsOk, json,
  hashPassword,
  findUser, createUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { role, email, password, name, phone = '', city = '' } = body;

  if (!role || !['fan', 'artist', 'organiser'].includes(role))
    return json(400, { error: 'Invalid role. Must be fan, artist, or organiser.' });
  if (!email || !email.includes('@'))
    return json(400, { error: 'Please provide a valid email address.' });
  if (!password || password.length < 8)
    return json(400, { error: 'Password must be at least 8 characters.' });
  if (!name || name.trim().length < 2)
    return json(400, { error: 'Please provide your full name.' });

  const normalEmail = email.toLowerCase().trim();

  try {
    const existing = await findUser('email', 'eq', normalEmail);
    if (existing)
      return json(409, { error: 'An account with this email already exists. Please sign in.' });

    const now = new Date().toISOString();
    const newUser = {
      role,
      email:         normalEmail,
      name:          name.trim(),
      phone:         phone.trim(),
      city:          city.trim(),
      password_hash: await hashPassword(password),
      created_at:    now,
      updated_at:    now,
      bio:           '',
      avatar:        '',
      genres:        [],
      social_links:  {},
      stage_name:    '',
      performer_type:'',
      org_name:      '',
      org_type:      '',
      verified:      false,
      profile_complete: false,
    };

    const created = await createUser(newUser);
    const roleLabels = { fan: 'Fan', artist: 'Artist', organiser: 'Event Organiser' };

    return json(201, {
      message: `Welcome to Floox, ${name.split(' ')[0]}! ${
        role === 'fan'
          ? 'Your account is ready — start exploring events!'
          : `Your ${roleLabels[role]} account was created. Complete your full profile to get discovered.`
      }`,
      userId: created.id,
      role,
    });
  } catch (err) {
    console.error('Register error:', err);
    return json(500, { error: 'Registration failed. Please try again.' });
  }
};
