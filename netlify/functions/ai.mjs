// Steddi AI server. Keeps the Claude API key secret on the server.
// Set ANTHROPIC_API_KEY in Netlify: Site configuration > Environment variables.
const MODEL_QUICK = 'claude-haiku-5-5';
const MODEL_FULL  = 'claude-sonnet-5-5';
const SYSTEM = 'You power the features of Steddi, a UK app for people with type 1 diabetes. Follow the instructions in each request exactly. Never tell the person how much insulin to take.';

export default async (req) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return Response.json({ ready: !!key });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!key) return Response.json({ error: 'not_configured' }, { status: 503 });

  let body;
  try { body = await req.json() } catch { return Response.json({ error: 'bad_request' }, { status: 400 }) }
  const prompt = String(body.prompt || '').slice(0, 20000);
  const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
  if (!prompt) return Response.json({ error: 'bad_request' }, { status: 400 });

  const content = [
    ...images.map(data => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
    { type: 'text', text: prompt }
  ];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: body.quick && !images.length ? MODEL_QUICK : MODEL_FULL,
      max_tokens: 1500, system: SYSTEM,
      messages: [{ role: 'user', content }]
    })
  });
  if (r.status === 429) return Response.json({ error: 'rate_limited' }, { status: 429 });
  if (!r.ok) return Response.json({ error: 'upstream', detail: (await r.text()).slice(0, 300) }, { status: 502 });
  const j = await r.json();
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  return Response.json({ text });
};

export const config = { path: '/api/ai' };
