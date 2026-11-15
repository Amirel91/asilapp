'use strict';
/* ============================================================
   live.js — sincronizza lo stato di Asilapp con Neon via /api/data
   Caricato PRIMA di script.js (entrambi defer: esecuzione in ordine).
   1) patch di localStorage.setItem: ogni stato asilapp salvato sale
      sul database (debounce), tranne la demo in sola lettura
   2) all'avvio: pull sincrono — se il database ha una versione più
      recente (_rev) la scrive in locale e ricarica, una volta sola
   3) login: se il browser non ha lo spazio dell'asilo digitato, lo
      scarica dal database prima che script.js processi il login
   La password resta nello stato (limite dichiarato). Nessun segreto
   nel codice: il driver legge process.env.DATABASE_URL su Vercel.
   ============================================================ */
(function () {

  const PREFIX = 'asilapp';
  const STORE = '/api/data';
  const PULLED_FLAG = 'asilapp_live_pulled';

  /* ---------- utilità ---------- */
  const isStateKey = k => k && k.indexOf(PREFIX) === 0 && k.indexOf('_cur') === -1;
  function readLocal(k) {
    try { const v = JSON.parse(localStorage.getItem(k)); return (v && typeof v === 'object') ? v : null; }
    catch (e) { return null; }
  }
  const nameOf = st => String((st && (st.school || st.schoolName || st.name)) || '').trim().replace(/\s+/g, ' ');
  const demoRo = () => {
    if (typeof ASILO === 'undefined') return false;
    let sa = false;
    try { sa = sessionStorage.getItem('asilapp_sa_entered') === '1'; } catch (e) {}
    return ASILO.cur() === 'demo' && !sa;
  };

  /* richieste sincrone: girano prima che script.js legga lo stato */
  function xhr(method, url, body) {
    try {
      const x = new XMLHttpRequest();
      x.open(method, url, false);
      if (body) x.setRequestHeader('Content-Type', 'application/json');
      x.send(body ? JSON.stringify(body) : null);
      if (x.status >= 200 && x.status < 300) return JSON.parse(x.responseText || 'null');
      if (x.status === 404) return { ok: false };
      return null;
    } catch (e) { return null; }
  }
  function xhrAsync(method, url, body) {
    try {
      fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      }).catch(() => {});
    } catch (e) {}
  }

  /* ---------- 1) push: ogni salvataggio sale sul database ---------- */
  let timer = null;
  function pushNow() {
    if (demoRo()) return;
    Object.keys(localStorage).forEach(k => {
      if (!isStateKey(k)) return;
      const st = readLocal(k);
      if (!st) return;
      const name = nameOf(st);
      if (!name) return;
      st._rev = st._rev || Date.now();
      xhrAsync('POST', STORE, { name, state: st });
    });
  }
  const origSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (!isStateKey(k)) return;
    clearTimeout(timer);
    timer = setTimeout(pushNow, 600);
  };

  /* ---------- 2) pull all'avvio: il più recente vince ---------- */
  (function pull() {
    let pulled = false;
    try { pulled = sessionStorage.getItem(PULLED_FLAG) === '1'; } catch (e) {}
    if (pulled) return;
    Object.keys(localStorage).forEach(k => {
      if (pulled || !isStateKey(k)) return;
      const local = readLocal(k);
      const name = nameOf(local);
      if (!name) return;
      const r = xhr('GET', STORE + '?name=' + encodeURIComponent(name));
      if (!r || !r.ok || !r.state) return;
      const remoteRev = Number(r.rev) || 0;
      const localRev = Number(local._rev) || 0;
      if (remoteRev <= localRev) return;
      const clean = Object.assign({}, r.state, { role: null, parentKid: null });
      origSet(k, JSON.stringify(clean));
      try { sessionStorage.setItem(PULLED_FLAG, '1'); } catch (e) {}
      location.reload();
      pulled = true;
    });
  })();

  /* ---------- 3) login da dispositivo nuovo: scarica lo spazio ---------- */
  function seedRemote(name) {
    if (typeof ASILO === 'undefined') return false;
    let key = null;
    try { key = ASILO.keyFor(name); } catch (e) { key = null; }
    const local = key ? readLocal(key) : null;
    if (local && nameOf(local) === name) return false; // già presente
    const r = xhr('GET', STORE + '?name=' + encodeURIComponent(name));
    if (!r || !r.ok || !r.state) return false;
    if (key) {
      const clean = Object.assign({}, r.state, { role: null, parentKid: null });
      clearTimeout(timer); // il setItem non deve rispingere subito
      origSet(key, JSON.stringify(clean));
    }
    return true;
  }

  document.addEventListener('submit', e => {
    const f = e.target;
    if (!(f instanceof Element) || f.id !== 'loginForm') return;
    const a = document.getElementById('loginAsilo');
    const code = document.getElementById('loginCode');
    // solo se il campo asilo è visibile (login maestre o genitori col nome asilo)
    if (!a || (a.closest('.field') && a.closest('.field').hidden)) return;
    const name = String(a.value || '').trim();
    if (name.length < 2) return;
    try { seedRemote(name.replace(/\s+/g, ' ')); } catch (err) {}
  }, true); // capture: prima del listener di script.js
})();
