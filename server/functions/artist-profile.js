// Floox server function
// Artist profile persistence

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, updateUser,
  publicUser,
} = require('./_utils');

function isComplete(fields) {
  const required = [
    fields.name,
    fields.stage_name,
    fields.city,
    fields.performer_type,
    fields.bio,
  ];
  return required.every(v => String(v || '').trim().length > 0)
    && Array.isArray(fields.genres) && fields.genres.length > 0
    && (fields.min_fee !== '' || fields.max_fee !== '');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  try {
    const user = await findUser('id', 'eq', decoded.id);
    if (!user) return json(404, { error: 'Account not found.' });
    if (user.role !== 'artist') return json(403, { error: 'This endpoint is for Artist accounts only.' });
    if (user.verified === false) return json(403, { error: 'Please verify your email before completing your profile.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const fieldMap = {
      name: 'name', stageName: 'stage_name', stage_name: 'stage_name',
      performerType: 'performer_type', performer_type: 'performer_type',
      bio: 'bio', city: 'city', phone: 'phone',
      genres: 'genres', languages: 'languages',
      performanceTypes: 'performance_types', performance_types: 'performance_types',
      eventTypes: 'event_types', event_types: 'event_types',
      minFee: 'min_fee', min_fee: 'min_fee', maxFee: 'max_fee', max_fee: 'max_fee',
      currency: 'currency', avatar: 'avatar', coverImage: 'cover_image', cover_image: 'cover_image',
      mediaLinks: 'media_links', media_links: 'media_links', portfolio: 'portfolio',
      socialLinks: 'social_links', social_links: 'social_links',
      riderNotes: 'rider_notes', rider_notes: 'rider_notes',
      equipment: 'equipment', profileComplete: 'profile_complete',
    };

    const patch = {};
    Object.entries(fieldMap).forEach(([input, column]) => {
      if (body[input] !== undefined) patch[column] = body[input];
    });

    const merged = { ...user, ...patch };
    patch.profile_complete = isComplete(merged);

    const updated = await updateUser(decoded.id, patch);
    return json(200, {
      user: publicUser(updated),
      message: updated.profile_complete
        ? 'Profile saved successfully! Your profile is now complete and discoverable.'
        : 'Profile saved. Add the remaining details to complete your profile.',
      profile_complete: updated.profile_complete,
    });
  } catch (err) {
    console.error('artist-profile error:', err);
    return json(500, { error: 'Profile save failed. Please try again.' });
  }
};
