'use strict';
/* ============================================================
   live.js — sincronizzazione con Neon via /api/data
   Avvolge lo stato locale di script.js: ogni save() invia il
   nuovo stato al database, ogni avvio scarica la versione più
   recente (se più nuova della cache locale). Il browser resta
   una cache: la fonte di verità è il database.
   Richiede: ASILO (da script.js), state, save, KEY.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined' || typeof state === 'undefined') return;

  const API = 'api/data';
  const name = ASILO.cur();
  if (!name) return;

  /* ---------- utilità ---------- */
  const clean = st => {
    if (!st) return null;
    const c = Object.assign({}, st, { role: null, parentKid: null });
    return c;
  };
  const localRev = () => {
    try { return Number(state._rev) || 0; } catch (e) { return 0; }
  };

  /* ---------- upload: chiamato dopo ogni save ---------- */
  let pushTimer = null;
  function push() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const payload = clean(state);
      if (!payload) return;
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, state: payload })
      })
        .then(r => r.json())
        .then(d => {
          if (d && d.ok && typeof toast === 'function')
            toast('Salvato anche online ✓');
        })
        .catch(() => {
          if (typeof toast === 'function') toast('Offline: salvato solo qui, si sincronizzerà');
        });
    }, 400); // debounce: evita una richiesta per ogni tasto
  }

  /* aggancio a save(): ogni salvataggio locale parte anche per il db */
  if (typeof save === 'function') {
    const origSave = save;
    window.save = function () {
      origSave.apply(this, arguments);
      push();
    };
  }

  /* ---------- download all'avvio: vince la versione più recente ---------- */
  fetch(API + '?name=' + encodeURIComponent(name))
    .then(r => (r.status === 404 ? null : r.json()))
    .then(d => {
      if (!d || !d.ok || !d.state) return; // niente sul db: la cache locale comanda
      const remoteRev = Number(d.rev) || 0;
      if (remoteRev <= localRev()) return; // locale più recente (o pari)
      const merged = Object.assign({}, d.state, { role: null, parentKid: null });
      try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) { return; }
      location.reload(); // il reload fa ripartire script.js col nuovo stato
    })
    .catch(() => {}); // offline: si prosegue con la cache
})();
