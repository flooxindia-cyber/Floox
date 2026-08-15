// netlify/functions/upload-media.js
// POST /.netlify/functions/upload-media
// Body: { fileData (base64 w/ data: prefix), fileName, fileType, mediaType }
// Requires: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars

const {
  corsOk, json,
  verifyToken, extractBearer,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  try { verifyToken(token); }
  catch { return json(401, { error: 'Session expired.' }); }

  // ── Cloudinary credentials ────────────────────────────────────────────────
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET)
    return json(500, { error: 'Media upload not configured. Please contact support.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid request body.' }); }

  const { fileData, fileName, fileType, mediaType = 'image' } = body;
  if (!fileData) return json(400, { error: 'No file data provided.' });

  // ── Upload to Cloudinary ──────────────────────────────────────────────────
  try {
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${mediaType}/upload`;

    const timestamp = Math.round(Date.now() / 1000);
    const folder    = 'floox';

    // Build signature
    const crypto = require('crypto');
    const sigStr = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    // Build multipart form data string for Cloudinary
    const formData = new URLSearchParams();
    formData.append('file',       fileData);
    formData.append('api_key',    API_KEY);
    formData.append('timestamp',  timestamp);
    formData.append('signature',  signature);
    formData.append('folder',     folder);
    if (mediaType === 'video') formData.append('resource_type', 'video');

    const res  = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      console.error('Cloudinary error:', data);
      return json(500, { error: data.error?.message || 'Upload failed.' });
    }

    return json(200, {
      url:          data.secure_url,
      publicId:     data.public_id,
      format:       data.format,
      resourceType: data.resource_type,
      width:        data.width,
      height:       data.height,
      bytes:        data.bytes,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return json(500, { error: 'Upload failed. Please try again.' });
  }
};
