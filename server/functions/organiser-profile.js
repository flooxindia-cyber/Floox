// Floox server function
// Internal server function

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
    if (user.role !== 'organiser')
      return json(403, { error: 'This endpoint is for Organiser accounts only.' });
    if (user.verified === false)
      return json(403, { error: 'Please verify your email before completing your profile.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const fieldMap = {
      orgName:          'org_name',
      orgType:          'org_type',
      bio:              'bio',
      city:             'city',
      phone:            'phone',
      website:          'website',
      gstNumber:        'gst_number',
      venueTypes:       'venue_types',
      avatar:           'avatar',
      coverImage:       'cover_image',
      mediaLinks:       'media_links',
      media_links:      'media_links',
      portfolio:        'portfolio',
      socialLinks:      'social_links',
      eventsPerYear:    'events_per_year',
      budgetRange:      'budget_range',
      preferredGenres:  'preferred_genres',
      profileComplete:  'profile_complete',
    };

    const patch = { profile_complete: true };
    Object.entries(fieldMap).forEach(([camel, snake]) => {
      if (body[camel] !== undefined) patch[snake] = body[camel];
    });

    // Organiser profile images must use the same canonical DB fields as the
    // artist flow, while accepting either frontend naming convention.
    if (body.coverImage !== undefined || body.cover_image !== undefined) {
      patch.cover_image = body.coverImage !== undefined
        ? body.coverImage
        : body.cover_image;
    }
    if (body.avatar !== undefined) {
      patch.avatar = body.avatar;
    }

    await updateUser(decoded.id, patch);

    // Re-read the organiser so the response/session always contains the
    // persisted cover/avatar values rather than relying on the PATCH payload.
    const refreshed = await findUser('id', 'eq', decoded.id);

    return json(200, {
      user: publicUser(refreshed),
      message: 'Organiser profile saved! You can now discover and book artists on Floox.',
    });
  } catch (err) {
    console.error('organiser-profile error:', err);
    return json(500, { error: 'Profile save failed. Please try again.' });
  }
};
