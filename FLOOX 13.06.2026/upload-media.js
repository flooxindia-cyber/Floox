// netlify/functions/upload-media.js
// POST /.netlify/functions/upload-media
// Requires: Authorization: Bearer <token>
// Body: { fileData (base64 data URL), fileName, fileType, mediaType ('image'|'video'|'audio') }
// Uploads to Cloudinary and returns the secure URL

const jwt = require('jsonwebtoken');
const { ok, err, preflight } = require('./_utils');

const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY      = process.env.CLOUDINARY_API_KEY;
const API_SECRET   = process.env.CLOUDINARY_API_SECRET;

// Simple SHA-1 for Cloudinary signature (Node built-in crypto)
const crypto = require('crypto');
function sha1(str) { return crypto.createHash('sha1').update(str).digest('hex'); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Method not allowed', 405);

  if (!process.env.JWT_SECRET) return err('Server configuration error.', 500);
  if (!CLOUD_NAME || !API_KEY || !API_SECRET)
    return err('Media upload is not configured. Please contact support.', 500);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return err('Authentication required.', 401);
  let decoded;
  try { decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET); }
  catch { return err('Session expired. Please sign in again.', 401); }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const { fileData, fileName, fileType, mediaType = 'image' } = body;
  if (!fileData) return err('fileData is required.');

  // Validate mediaType
  const resourceType = ['video', 'audio'].includes(mediaType) ? 'video' : 'image';

  // ── Cloudinary signed upload ──────────────────────────────────────────────
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = `floox/${decoded.id}`;

  // Build signature string (params sorted alphabetically)
  const sigParams = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = sha1(sigParams);

  // Build multipart form
  const formData = new URLSearchParams();
  formData.append('file',          fileData);
  formData.append('timestamp',     String(timestamp));
  formData.append('api_key',       API_KEY);
  formData.append('signature',     signature);
  formData.append('folder',        folder);
  formData.append('resource_type', resourceType);

  let uploadRes;
  try {
    uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );
  } catch (e) {
    return err('Upload network error. Please try again.', 500);
  }

  const data = await uploadRes.json();
  if (!uploadRes.ok) {
    console.error('Cloudinary error:', data);
    return err(data.error?.message || 'Upload failed.', 500);
  }

  return ok({
    url:          data.secure_url,
    public_id:    data.public_id,
    resource_type: data.resource_type,
    format:       data.format,
    bytes:        data.bytes,
  });
};
