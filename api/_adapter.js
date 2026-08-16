function adapt(netlifyHandler) {
  return async function(req, res) {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      return res.status(204).end();
    }
    const event = {
      httpMethod: req.method,
      headers: req.headers || {},
      body: req.body == null ? '' : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)),
      queryStringParameters: req.query || {},
      path: req.url,
    };
    try {
      const result = await netlifyHandler(event, {});
      const headers = result?.headers || {};
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      return res.status(result?.statusCode || 200).send(result?.body || '');
    } catch (err) {
      console.error('API adapter error:', err);
      return res.status(500).json({error:'Internal server error.'});
    }
  };
}
module.exports = { adapt };
