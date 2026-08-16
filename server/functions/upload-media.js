// Floox media upload
// Uses the existing public Supabase Storage bucket `floox-media`.
// This removes the old Cloudinary dependency and keeps uploads on the same backend.

const {
  corsOk, json,
  verifyToken, extractBearer,
} = require('./_utils');

function safeName(name = 'file') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-120) || 'file';
}

function extension(fileName, fileType) {
  const fromName = String(fileName || '').match(/\.([a-zA-Z0-9]{1,8})$/);
  if (fromName) return fromName[1].toLowerCase();
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  return map[fileType] || 'bin';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let claims;
  try {
    claims = verifyToken(token);
  } catch {
    return json(401, { error: 'Session expired.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const BUCKET = 'floox-media';

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { error: 'Media storage is not configured.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid request body.' }); }

  const { fileData, fileName, fileType, mediaType = 'image' } = body;
  if (!fileData || typeof fileData !== 'string') {
    return json(400, { error: 'No file data provided.' });
  }

  const match = fileData.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return json(400, { error: 'Invalid file data format.' });

  const contentType = String(fileType || match[1] || 'application/octet-stream');
  const base64 = match[2];
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return json(400, { error: 'Invalid base64 file data.' });
  }

  if (!buffer.length) return json(400, { error: 'Empty file.' });
  if (buffer.length > 50 * 1024 * 1024) {
    return json(413, { error: 'File is too large. Maximum size is 50 MB.' });
  }

  const typePrefix = mediaType === 'video' ? 'videos' : mediaType === 'audio' ? 'audio' : 'images';
  const userId = safeName(claims.id || 'user');
  const name = safeName(fileName || `upload.${extension(fileName, contentType)}`);
  const objectPath = `${userId}/${typePrefix}/${Date.now()}-${name}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
      body: buffer,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Supabase Storage error:', data);
      return json(res.status >= 400 && res.status < 500 ? res.status : 500, {
        error: data.message || data.error || 'Upload failed.'
      });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

    return json(200, {
      url: publicUrl,
      publicId: objectPath,
      format: extension(fileName, contentType),
      resourceType: mediaType,
      bytes: buffer.length,
      path: objectPath,
    });
  } catch (err) {
    console.error('Supabase Storage upload error:', err);
    return json(500, { error: 'Upload failed. Please try again.' });
  }
};
