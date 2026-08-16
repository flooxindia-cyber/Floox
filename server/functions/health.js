const { corsOk, json } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  return json(200, {
    ok: true,
    service: 'floox-api',
    timestamp: new Date().toISOString(),
    config: {
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      jwt: Boolean(process.env.JWT_SECRET),
      resend: Boolean(process.env.RESEND_API_KEY),
      cloudinary: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
    },
  });
};
