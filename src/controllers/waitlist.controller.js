const https = require('https');
const { env } = require('../config/env');

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function createWaitlistController() {
  async function submit(req, res) {
    const { email, name, language, source } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const token = env.AIRTABLE_TOKEN;
    const baseId = env.AIRTABLE_BASE_ID;
    const table = env.AIRTABLE_TABLE || 'Waitlist';

    if (!token || !baseId) {
      console.warn('[Waitlist] Airtable not configured — AIRTABLE_TOKEN or AIRTABLE_BASE_ID missing');
      return res.status(500).json({ error: 'Waitlist service not configured' });
    }

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

    try {
      const result = await httpsPost(
        url,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        {
          fields: {
            Email: String(email).trim(),
            Name: String(name || '').trim(),
            Language: String(language || 'it'),
            Source: String(source || ''),
          },
        }
      );

      if (result.status === 200 || result.status === 201) {
        return res.json({ success: true });
      }

      console.error('[Waitlist] Airtable error:', result.status, result.body);
      return res.status(500).json({ error: 'Failed to save to waitlist' });
    } catch (err) {
      console.error('[Waitlist] Request failed:', err.message);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return { submit };
}

module.exports = { createWaitlistController };
