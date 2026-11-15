/* /api/health — diagnostica di build, variabili e connessione DB
   Risponde { ok, build, db, dbPing, ts } SENZA mai toccare dati sensibili:
   - "db" dice solo se DATABASE_URL è presente nel runtime, mai il valore
   - "dbPing" prova una SELECT 1 su Neon e riporta 'ok', 'skipped'
     (variabile assente) o il messaggio d'errore esatto del driver
   Firma duale: parla sia web (Response) sia classic (res.end). */
module.exports = async (req, res) => {
  let dbPing = 'skipped';
  if (process.env.DATABASE_URL) {
    try {
      const { sql } = require('@neondatabase/serverless');
      await sql`SELECT 1`;
      dbPing = 'ok';
    } catch (e) {
      dbPing = 'err: ' + String((e && e.message) || e);
    }
  }
  const body = JSON.stringify({
    ok: true,
    build: 'health-ping-1',
    db: process.env.DATABASE_URL ? 'set' : 'missing',
    dbPing,
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
