// T1Dy AI server. Keeps the Claude API key secret on the server.
// Set ANTHROPIC_API_KEY in Netlify: Project configuration > Environment variables.
// Check it works by opening /api/ai?test=1 in a browser.
const MODELS_QUICK = ['claude-haiku-5-5', 'claude-haiku-4-5'];
const MODELS_FULL  = ['claude-sonnet-5-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'];
const SYSTEM = 'You power the features of T1Dy, a UK app for people with type 1 diabetes. Follow the instructions in each request exactly. Never tell the person how much insulin to take.';

async function ask(key, models, content, maxTokens) {
  let last = { status: 500, error: 'unknown', detail: '' };
  for (const model of models) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000); // Netlify stops functions at 10 s
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctl.signal,
        headers: { 'x-api-key': key.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content }] })
      });
    } catch (e) {
      clearTimeout(t);
      return { status: 504, error: 'timeout', detail: 'Claude took too long to answer.' };
    }
    clearTimeout(t);
    if (r.ok) {
      const j = await r.json();
      return { text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''), model };
    }
    const body = await r.text();
    let msg = body; try { msg = JSON.parse(body).error.message } catch {}
    if (r.status === 401) return { status: 401, error: 'bad_key', detail: msg };
    if (r.status === 429) return { status: 429, error: 'rate_limited', detail: msg };
    if (r.status === 400 && /credit|billing|balance/i.test(msg)) return { status: 402, error: 'no_credit', detail: msg };
    last = { status: 502, error: 'upstream', detail: `${model}: ${r.status} ${msg}`.slice(0, 300) };
    if (r.status !== 404 && !/model/i.test(msg)) break; // only try the next model if this one isn't available
  }
  return last;
}

export default async (req) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const url = new URL(req.url);
  if (req.method === 'GET') {
    if (!url.searchParams.has('test')) return Response.json({ ready: !!key });
    if (!key) return Response.json({ ok: false, problem: 'No ANTHROPIC_API_KEY set in Netlify, or the project was not redeployed after adding it.' });
    const r = await ask(key, MODELS_QUICK, [{ type: 'text', text: 'Reply with the word ready.' }], 20);
    return Response.json(r.text != null ? { ok: true, model: r.model, reply: r.text } : { ok: false, problem: r.error, detail: r.detail });
  }
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
  // Photos and quick lookups use the fast model so they finish inside Netlify's 10-second limit.
  const models = (body.quick || images.length) ? MODELS_QUICK : MODELS_FULL;
  const r = await ask(key, models, content, images.length ? 700 : 1200);
  if (r.text != null) return Response.json({ text: r.text });
  return Response.json({ error: r.error, detail: r.detail }, { status: r.status });
};

export const config = { path: '/api/ai' };
