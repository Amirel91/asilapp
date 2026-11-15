/* /api/health — marcatore di build: verifica senza toccare dati sensibili */
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, build: 'live-neon-1', ts: Date.now() }));
};
