/* /api/data — stato asili su Neon
   GET  ?name=NomeAsilo → { ok, rev, state } | { ok:false }
   POST { name, state } → upsert, risponde { ok, rev }
   Firma duale (Request/Response + IncomingMessage/ServerResponse). */
const { sql } = require('@neondatabase/serverless');

function send(res, data, status) {
  if (res && typeof res.end === 'function') {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
    return null;
  }
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
function urlOf(req) {
  const u = req.url || '';
  return u.startsWith('http') ? new URL(u) : new URL(u, 'https://x.local');
}
async function bodyOf(req) {
  if (typeof req.json === 'function') return req.json().catch(() => null);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'); } catch (e) { return null; }
}
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 60);

module.exports = async (req, res) => {
  try {
    await sql`CREATE TABLE IF NOT EXISTS schools (
      name TEXT PRIMARY KEY,
      rev BIGINT NOT NULL DEFAULT 0,
      data JSONB NOT NULL
    )`;

    const method = (req.method || 'GET').toUpperCase();
    const url = urlOf(req);

    if (method === 'GET') {
      const name = norm(url.searchParams.get('name'));
      if (!name) return send(res, { ok: false, err: 'name mancante' }, 400);
      const rows = await sql`SELECT rev, data FROM schools WHERE name = ${name} LIMIT 1`;
      if (!rows.length) return send(res, { ok: false, err: 'not-found' }, 404);
      return send(res, { ok: true, rev: Number(rows[0].rev), state: rows[0].data });
    }

    if (method === 'POST') {
      const body = await bodyOf(req);
      const name = norm(body && body.name);
      const state = body && body.state;
      if (!name || !state || typeof state !== 'object')
        return send(res, { ok: false, err: 'payload non valido' }, 400);
      const rev = Date.now();
      const clean = Object.assign({}, state, { role: null, parentKid: null, _rev: rev });
      await sql`INSERT INTO schools (name, rev, data)
                VALUES (${name}, ${rev}, ${JSON.stringify(clean)})
                ON CONFLICT (name) DO UPDATE SET rev = ${rev}, data = ${JSON.stringify(clean)}`;
      return send(res, { ok: true, rev });
    }

    return send(res, { ok: false, err: 'metodo non supportato' }, 405);
  } catch (e) {
    return send(res, { ok: false, err: String(e && e.message || e) }, 500);
  }
};
