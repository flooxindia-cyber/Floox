// netlify/functions/artist-profile.js — Supabase edition
// POST /.netlify/functions/artist-profile

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, updateUser,
  publicUser,
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

  try {
    const user = await findUser('id', 'eq', decoded.id);
    if (!user) return json(404, { error: 'Account not found.' });
    if (user.role !== 'artist')
      return json(403, { error: 'This endpoint is for Artist accounts only.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const fieldMap = {
      stageName:        'stage_name',
      performerType:    'performer_type',
      bio:              'bio',
      city:             'city',
      phone:            'phone',
      genres:           'genres',
      languages:        'languages',
      performanceTypes: 'performance_types',
      eventTypes:       'event_types',
      minFee:           'min_fee',
      maxFee:           'max_fee',
      currency:         'currency',
      avatar:           'avatar',
      coverImage:       'cover_image',
      mediaLinks:       'media_links',
      portfolio:        'portfolio',
      socialLinks:      'social_links',
      riderNotes:       'rider_notes',
      equipment:        'equipment',
      profileComplete:  'profile_complete',
    };

    const patch = { profile_complete: true };
    Object.entries(fieldMap).forEach(([camel, snake]) => {
      if (body[camel] !== undefined) patch[snake] = body[camel];
    });

    const updated = await updateUser(decoded.id, patch);
    return json(200, {
      user: publicUser(updated),
      message: 'Artist profile saved successfully! You are now discoverable by event organisers.',
    });
  } catch (err) {
    console.error('artist-profile error:', err);
    return json(500, { error: 'Profile save failed. Please try again.' });
  }
};
