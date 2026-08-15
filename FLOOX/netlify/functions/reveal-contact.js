// netlify/functions/reveal-contact.js
// POST /.netlify/functions/reveal-contact
//
// Two-step flow (like 99acres):
//   Step 1: action:"request"  → checks daily limit, sends OTP to requester's email
//   Step 2: action:"verify"   → verifies OTP, marks as verified, returns contact info
//
// Daily limit: DAILY_LIMIT reveals per calendar day (IST) per user.

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, publicUser,
} = require('./_utils');

const DAILY_LIMIT = 5; // max contact reveals per user per day

// ── Supabase helpers (not in _utils, so inline here) ─────────────────────────
function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return {
    'Content-Type':  'application/json',
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Prefer':        'return=representation',
  };
}
function sbUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

// Count today's verified reveals for this user (IST midnight boundaries)
async function todayRevealCount(revealerId) {
  // Get IST midnight in UTC
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  nowIST.setHours(0, 0, 0, 0);
  const utcMidnight = new Date(nowIST.getTime() - (5.5 * 60 * 60 * 1000)).toISOString();

  const headers = { ...sbHeaders(), 'Prefer': 'count=exact' };
  const qs = `revealer_id=eq.${encodeURIComponent(revealerId)}&otp_verified=eq.true&revealed_at=gte.${encodeURIComponent(utcMidnight)}&select=id`;
  const res = await fetch(sbUrl('contact_reveals', qs), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

// Check if this pair already has a verified reveal today
async function existingRevealToday(revealerId, revealedId) {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  nowIST.setHours(0, 0, 0, 0);
  const utcMidnight = new Date(nowIST.getTime() - (5.5 * 60 * 60 * 1000)).toISOString();

  const qs = `revealer_id=eq.${encodeURIComponent(revealerId)}&revealed_id=eq.${encodeURIComponent(revealedId)}&otp_verified=eq.true&revealed_at=gte.${encodeURIComponent(utcMidnight)}&limit=1`;
  const res = await fetch(sbUrl('contact_reveals', qs), { headers: sbHeaders() });
  const data = await res.json();
  return data.length > 0;
}

// Create a pending OTP record
async function createOtpRecord(revealerId, revealedId, otp) {
  const res = await fetch(sbUrl('contact_reveals'), {
    method:  'POST',
    headers: sbHeaders(),
    body:    JSON.stringify({
      revealer_id:  revealerId,
      revealed_id:  revealedId,
      otp_code:     otp,
      otp_verified: false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB insert error');
  return Array.isArray(data) ? data[0] : data;
}

// Find the most recent unverified OTP for this pair (within 10 minutes)
async function findPendingOtp(revealerId, revealedId, otp) {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const qs = `revealer_id=eq.${encodeURIComponent(revealerId)}&revealed_id=eq.${encodeURIComponent(revealedId)}&otp_code=eq.${encodeURIComponent(otp)}&otp_verified=eq.false&revealed_at=gte.${encodeURIComponent(tenMinsAgo)}&order=revealed_at.desc&limit=1`;
  const res = await fetch(sbUrl('contact_reveals', qs), { headers: sbHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB error');
  return data[0] || null;
}

// Mark OTP record as verified
async function markOtpVerified(recordId) {
  const qs = `id=eq.${encodeURIComponent(recordId)}`;
  const res = await fetch(sbUrl('contact_reveals', qs), {
    method:  'PATCH',
    headers: sbHeaders(),
    body:    JSON.stringify({ otp_verified: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB update error');
}

// Generate a 6-digit OTP
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Send OTP email using Resend API (set RESEND_API_KEY in Netlify env vars)
// Falls back gracefully if not configured (logs OTP to console in dev)
async function sendOtpEmail(toEmail, toName, otp, profileName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback: log to console (visible in Netlify function logs)
    console.log(`[DEV] OTP for ${toEmail}: ${otp}`);
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#100a02;color:#fff;border-radius:16px;padding:2rem;border:1px solid rgba(255,92,0,.3)">
      <div style="font-size:1.8rem;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#FFD600,#FF5C00,#FF2D78);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.3rem">Floox</div>
      <div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-bottom:2rem">Your contact reveal code</div>
      <p style="color:rgba(255,255,255,.75);font-size:.95rem;margin-bottom:1.5rem">Hi <strong>${toName}</strong>, use this code to reveal the contact details of <strong>${profileName}</strong>:</p>
      <div style="background:rgba(255,92,0,.1);border:2px solid rgba(255,92,0,.4);border-radius:14px;text-align:center;padding:1.5rem;margin-bottom:1.5rem">
        <div style="font-size:2.8rem;font-weight:900;letter-spacing:12px;color:#FF5C00">${otp}</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.5rem">Valid for 10 minutes</div>
      </div>
      <p style="color:rgba(255,255,255,.35);font-size:.78rem">If you didn't request this, ignore this email. Your limit is ${DAILY_LIMIT} reveals per day.</p>
    </div>`;

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      from:    'Floox <noreply@floox.in>',
      to:      [toEmail],
      subject: `${otp} — Your Floox contact reveal code`,
      html,
    }),
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Sign in to reveal contact details.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { action, profileId, otp: submittedOtp } = body;

  if (!profileId) return json(400, { error: 'profileId is required.' });
  if (!['request', 'verify'].includes(action)) return json(400, { error: 'action must be "request" or "verify".' });

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  const target = await findUser('id', 'eq', profileId);
  if (!target || !target.profile_complete) return json(404, { error: 'Profile not found.' });

  // Can't reveal your own contact
  if (caller.id === target.id) return json(400, { error: 'You cannot reveal your own contact.' });

  // ── Step 1: REQUEST ─────────────────────────────────────────────────────────
  if (action === 'request') {
    // If already revealed today for this same profile, just return success
    const alreadyDone = await existingRevealToday(caller.id, target.id);
    if (alreadyDone) {
      return json(200, {
        status:  'already_revealed',
        message: 'You have already revealed this contact today.',
      });
    }

    // Check daily limit
    const usedToday = await todayRevealCount(caller.id);
    const remaining = DAILY_LIMIT - usedToday;

    if (remaining <= 0) {
      return json(429, {
        error:     'Daily limit reached.',
        message:   `You can reveal up to ${DAILY_LIMIT} contacts per day. Your limit resets at midnight (IST).`,
        limit:     DAILY_LIMIT,
        remaining: 0,
      });
    }

    // Generate OTP & send email
    const otp = generateOtp();
    await createOtpRecord(caller.id, target.id, otp);

    try {
      const targetName = (target.role === 'organiser' ? target.org_name : target.stage_name) || target.name;
      await sendOtpEmail(caller.email, caller.name, otp, targetName);
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Don't fail the whole request if email fails — OTP is still in DB
    }

    return json(200, {
      status:    'otp_sent',
      message:   `A 6-digit code has been sent to ${caller.email}. Enter it below to reveal the contact.`,
      remaining: remaining - 1, // After this reveal is confirmed it'll be -1
    });
  }

  // ── Step 2: VERIFY ──────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!submittedOtp) return json(400, { error: 'OTP is required.' });

    const record = await findPendingOtp(caller.id, target.id, submittedOtp.toString().trim());
    if (!record) {
      return json(400, { error: 'Invalid or expired code. Please request a new one.' });
    }

    await markOtpVerified(record.id);

    // Return contact details
    const contactData = {};
    if (target.phone) contactData.phone = target.phone;
    if (target.email) contactData.email = target.email;

    const usedToday = await todayRevealCount(caller.id);

    return json(200, {
      status:    'revealed',
      contact:   contactData,
      remaining: Math.max(0, DAILY_LIMIT - usedToday),
      message:   'Contact details revealed successfully.',
    });
  }
};
