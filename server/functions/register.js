// Floox server function
// Registration + OTP initiation

const {
  corsOk, json,
  hashPassword,
  findUser, createUser,
} = require('./_utils');
const { issue } = require('../otp');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const role = String(body.role || '').trim().toLowerCase();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const city = String(body.city || '').trim();
  const state = String(body.state || '').trim();
  const extra = body.data && typeof body.data === 'object' ? body.data : {};

  if (!['fan', 'artist', 'organiser'].includes(role))
    return json(400, { error: 'Invalid role. Must be fan, artist, or organiser.' });
  if (!email || !email.includes('@'))
    return json(400, { error: 'Please provide a valid email address.' });
  if (password.length < 8)
    return json(400, { error: 'Password must be at least 8 characters.' });
  if (name.length < 2)
    return json(400, { error: 'Please provide your full name.' });

  try {
    const existing = await findUser('email', 'eq', email);
    if (existing) {
      if (existing.verified === false) {
        try { await issue(email, existing.id, 'registration', existing.name); }
        catch (otpErr) { console.error('OTP resend during registration:', otpErr); return json(500, { error: otpErr.message || 'Could not send verification code.' }); }
        return json(200, {
          message: 'Your account already exists but is not verified. A new verification code has been sent.',
          userId: existing.id,
          role: existing.role,
          requiresOtp: true,
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
      bio: String(extra.bio || ''),
      avatar: String(extra.avatar || ''),
      genres: Array.isArray(extra.genres) ? extra.genres : [],
      social_links: extra.socialLinks && typeof extra.socialLinks === 'object' ? extra.socialLinks : {},
      stage_name: String(extra.stageName || ''),
      performer_type: String(extra.performerType || ''),
      org_name: String(extra.orgName || ''),
      org_type: String(extra.orgType || ''),
      languages: Array.isArray(extra.languages) ? extra.languages : [],
      performance_types: Array.isArray(extra.performanceTypes) ? extra.performanceTypes : [],
      event_types: Array.isArray(extra.eventTypes) ? extra.eventTypes : [],
      experience: String(extra.experience || ''),
      min_fee: extra.minFee == null ? '' : String(extra.minFee),
      max_fee: extra.maxFee == null ? '' : String(extra.maxFee),
      currency: String(extra.currency || 'INR'),
      website: String(extra.website || ''),
      cover_image: String(extra.coverImage || ''),
      portfolio: Array.isArray(extra.portfolio) ? extra.portfolio : [],
      rider_notes: String(extra.riderNotes || ''),
      equipment: Array.isArray(extra.equipment) ? extra.equipment : [],
      gst_number: String(extra.gstNumber || extra.gst || ''),
      venue_types: Array.isArray(extra.venueTypes) ? extra.venueTypes : [],
      events_per_year: String(extra.eventsPerYear || extra.frequency || ''),
      budget_range: String(extra.budgetRange || extra.budget || ''),
      preferred_genres: Array.isArray(extra.preferredGenres) ? extra.preferredGenres : [],
      verified: false,
      profile_complete: false,
    };

    const created = await createUser(newUser);

    // OTP must be issued before telling the frontend to show verification UI.
    await issue(email, created.id, 'registration', name);

    return json(201, {
      message: `Welcome to Floox, ${name.split(' ')[0]}! Please verify your email to continue.`,
      userId: created.id,
      role,
      requiresOtp: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    return json(500, { error: err.message || 'Registration failed. Please try again.' });
  }
};
