// Floox media upload — signed Cloudinary upload via backend
// POST /api/upload-media
// Body: { fileData (base64 data URL), fileName, fileType, mediaType ('image'|'video'|'audio') }

const crypto = require('crypto');
const { corsOk, json, verifyToken, extractBearer } = require('./_utils');

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let claims;
  try { claims = verifyToken(token); }
  catch { return json(401, { error: 'Session expired.' }); }

  // ── Cloudinary config ─────────────────────────────────────────────────────
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('Cloudinary env vars missing');
    return json(500, { error: 'Media storage is not configured.' });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid request body.' }); }

  const { fileData, fileName, fileType, mediaType = 'image' } = body;
  if (!fileData || typeof fileData !== 'string') {
    return json(400, { error: 'No file data provided.' });
  }

  // Validate base64 data URL
  const match = fileData.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return json(400, { error: 'Invalid file data format. Must be a base64 data URL.' });

  const detectedType = String(fileType || match[1] || 'image/jpeg');

  // Size guard before Cloudinary (50 MB max)
  const base64Payload = match[2];
  const approxBytes = Math.floor(base64Payload.length * 0.75);
  if (approxBytes > 50 * 1024 * 1024) {
    return json(413, { error: 'File is too large. Maximum size is 50 MB.' });
  }

  // ── Build signed Cloudinary upload ────────────────────────────────────────
  const resourceType = detectedType.startsWith('video/') || mediaType === 'video' ? 'video'
                     : detectedType.startsWith('audio/') || mediaType === 'audio' ? 'video' // Cloudinary uses 'video' for audio too
                     : 'image';
  const folder    = `floox/${claims.id || 'user'}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Params must be sorted alphabetically for the signature
  const sigParams = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = sha1(sigParams);

  const formData = new URLSearchParams();
  formData.append('file',      fileData);  // Cloudinary accepts base64 data URLs directly
  formData.append('folder',    folder);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key',   API_KEY);
  formData.append('signature', signature);

  try {
    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );

    const data = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      console.error('Cloudinary upload error:', data);
      return json(500, { error: data.error?.message || 'Upload failed.' });
    }

    return json(200, {
      url:          data.secure_url,
      publicId:     data.public_id,
      resourceType: data.resource_type,
      format:       data.format,
      bytes:        data.bytes,
    });
  } catch (err) {
    console.error('Cloudinary upload exception:', err);
    return json(500, { error: 'Upload failed. Please try again.' });
  }
};
