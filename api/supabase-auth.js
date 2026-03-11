// Supabase Auth & User Profile Handler
// This proxies Supabase calls server-side for operations that need service role key
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing Supabase config' });

  const { action, payload } = req.body;

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`
  };

  try {
    if (action === 'upsert_profile') {
      // Save user profile to Supabase users table
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          ...supabaseHeaders,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'get_profile') {
      const r = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(payload.email)}&select=*`, {
        headers: supabaseHeaders
      });
      const data = await r.json();
      return res.status(r.status).json(data[0] || null);
    }

    if (action === 'save_upload') {
      const r = await fetch(`${supabaseUrl}/rest/v1/resources`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'get_uploads') {
      const r = await fetch(`${supabaseUrl}/rest/v1/resources?user_id=eq.${payload.userId}&select=*&order=created_at.desc`, {
        headers: supabaseHeaders
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
