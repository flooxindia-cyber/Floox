// Floox server function
// Internal server function
// Auth: Bearer token required
// Body: { receiverId, subject, body, eventDate?, eventType?, budget? }
// Returns: { message: "Sent!", messageId: uuid }

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser,
  createMessage,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  // ── Auth required ──────────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Sign in to send messages.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { receiverId, subject, body: msgBody, eventDate = '', eventType = '', budget = '' } = body;

  if (!receiverId)          return json(400, { error: 'receiverId is required.' });
  if (!msgBody || msgBody.trim().length < 10)
                            return json(400, { error: 'Message must be at least 10 characters.' });
  if (receiverId === decoded.id)
                            return json(400, { error: "You can't message yourself." });

  // ── Check receiver exists ──────────────────────────────────────────────────
  const receiver = await findUser('id', 'eq', receiverId);
  if (!receiver)            return json(404, { error: 'Recipient profile not found.' });
  if (!receiver.profile_complete)
                            return json(400, { error: 'This profile is not yet active.' });

  try {
    const msg = await createMessage({
      senderId:   decoded.id,
      receiverId,
      subject:    (subject || '').trim().slice(0, 200),
      body:       msgBody.trim().slice(0, 2000),
      eventDate:  eventDate.trim(),
      eventType:  eventType.trim(),
      budget:     budget.trim(),
    });

    // Personalised confirmation with receiver name
    const receiverName = receiver.stage_name || receiver.org_name || receiver.name || 'them';
    return json(201, {
      message: `Your message to ${receiverName} was sent! They'll reach out to you at ${caller.email}.`,
      messageId: msg.id,
    });
  } catch (err) {
    console.error('send-message error:', err);
    return json(500, { error: 'Could not send message. Please try again.' });
  }
};
