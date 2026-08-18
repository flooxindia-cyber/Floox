const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const base = fs.readFileSync(path.join(process.cwd(), 'floox-auth.js'), 'utf8');
    const artistLoader = `\n// Live artist dashboard connectors injected by Vercel route.\nif (/floox-dashboard-artist\\.html$/i.test(location.pathname)) {\n  const loadArtistDashboard = () => {\n    if (document.querySelector('script[data-floox-artist-live]')) return;\n    const live = document.createElement('script');\n    live.src = 'artist-dashboard-live.js';\n    live.async = false;\n    live.dataset.flooxArtistLive = '1';\n    document.head.appendChild(live);\n    const polish = document.createElement('script');\n    polish.src = 'artist-dashboard-polish.js';\n    polish.async = false;\n    polish.dataset.flooxArtistPolish = '1';\n    document.head.appendChild(polish);\n  };\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadArtistDashboard, { once: true });\n  else loadArtistDashboard();\n}\n`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(base + artistLoader);
  } catch (err) {
    console.error('auth-js error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.end('console.error("Floox authentication script could not be loaded.");');
  }
};
