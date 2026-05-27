// OpenClaw Gateway Health - Server-side proxy (no CORS)
// GET /api/openclaw-health

const http = require('http');

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const options = {
    hostname: '100.108.29.115',
    port: 18789,
    path: '/health',
    method: 'GET',
    timeout: 8000,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', (chunk) => { body += chunk; });
    proxyRes.on('end', () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', 'application/json');
      try {
        res.status(proxyRes.statusCode || 200).json(JSON.parse(body));
      } catch {
        res.status(proxyRes.statusCode || 200).send(body);
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error('Gateway proxy error:', err.message);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(503).json({ ok: false, status: 'error', error: err.message });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(504).json({ ok: false, status: 'timeout' });
  });

  proxyReq.end();
};
