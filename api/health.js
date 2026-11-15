/* /api/health — diagnostica di build e variabili
   Risponde { ok, build, db, ts } SENZA toccare dati sensibili:
   "db" dice solo se DATABASE_URL è presente nel runtime, mai il valore.
   Firma duale: parla sia web (Response) sia classic (res.end). */
module.exports = (req, res) => {
  const body = JSON.stringify({
    ok: true,
    build: 'live-neon-2',
    db: process.env.DATABASE_URL ? 'set' : 'missing',
    ts: Date.now()
  });
  if (res && typeof res.end === 'function') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
    return;
  }
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
