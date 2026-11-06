// Connects the app's AI features to this site's own AI server (/api/ai) when it runs outside Claude.
(function(){
  if (window.claude && window.claude.use) return;
  const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
  function err(code, msg){ const e = new Error(msg || code); e.code = code; return e }
  async function shrink(file){
    // Phone photos are large: resize to 1280px JPEG before sending.
    const url = URL.createObjectURL(file);
    try{
      const img = await new Promise((ok, no)=>{ const i = new Image(); i.onload=()=>ok(i); i.onerror=()=>no(err('image_rejected')); i.src = url });
      const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth*k); c.height = Math.round(img.naturalHeight*k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.75).split(',')[1];
    } finally { URL.revokeObjectURL(url) }
  }
  async function call(prompt, opts){
    opts = opts || {};
    const images = [];
    for (const f of (opts.images || [])) images.push(await shrink(f));
    let res;
    try{
      res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, signal: opts.signal,
        body: JSON.stringify({ prompt: String(prompt), images, quick: opts.modelTier === 'quick' }) });
    }catch(e){ if (e && e.name === 'AbortError') throw err('cancelled'); throw err('network', 'No connection') }
    if (!res.ok){
      let j = {}; try{ j = await res.json() }catch(e){}
      if (res.status === 429) throw err('rate_limited');
      throw err(j.error || (res.status === 502 || res.status === 504 ? 'timeout' : 'unavailable'), j.detail || ('AI server error ' + res.status));
    }
    const data = await res.json();
    const text = data.text || '';
    if (opts.onText) try{ opts.onText({ text }) }catch(e){}
    return text;
  }
  const sample = (prompt, opts) => call(prompt, opts);
  sample.json = async (prompt, opts) => {
    const t = await call(prompt + '\n\nReply with only the JSON object, no other text.', opts);
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw err('bad_json');
    try{ return JSON.parse(m[0]) }catch(e){ throw err('bad_json') }
  };
  sample.limits = async () => ({ images: { mediaTypes: TYPES } });
  window.claude = { use: async name => {
    if (name !== 'sample') return null;
    // Only switch AI on if the server is set up.
    try{ const r = await fetch('/api/ai', { method:'GET' }); if (!r.ok) return null; const j = await r.json(); if (!j.ready) return null }catch(e){ return null }
    return sample;
  } };
})();
