'use strict';
/* ============================================================
   saas.js — multi-asilo (base SaaS lato client)
   Caricato PRIMA di script.js: espone window.ASILO, il registry
   degli asili e la landing page (scelta asilo + registrazione).
   Ogni asilo ha il suo stato in una chiave localStorage separata
   (asilapp_t_<id>); la demo usa la chiave storica asilapp_v1.
   L'asilo "corrente" vive in sessionStorage, così ogni tab del
   browser può anche restare su un asilo diverso.

   In coda: modulo «superadmin entra senza login» — aggiunge il
   bottone 🔑 sulle card del pannello superadmin e apre l'asilo
   come maestra senza chiedere credenziali.
   ============================================================ */
window.ASILO = (function () {
  const REG = 'asilapp_registry';
  const CUR = 'asilapp_cur';

  const slug = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asilo';

  function registry() {
    try {
      const r = JSON.parse(localStorage.getItem(REG));
      return Array.isArray(r) ? r.filter(a => a && a.id && a.name) : [];
    } catch (e) { return []; }
  }
  const saveReg = r => { try { localStorage.setItem(REG, JSON.stringify(r)); } catch (e) {} };

  return {
    cur: () => { try { return sessionStorage.getItem(CUR); } catch (e) { return null; } },
    enter: id => { try { sessionStorage.setItem(CUR, id); } catch (e) {} },
    exit: () => { try { sessionStorage.removeItem(CUR); } catch (e) {} },
    keyFor: id => (id === 'demo' || !id) ? 'asilapp_v1' : 'asilapp_t_' + id,
    registry,
    slug,
    resolve(name) {
      const q = slug(name);
      if (!q) return null;
      return registry().find(a => a.slug === q) || null;
    },
    /* registra un nuovo asilo: ritorna {id} o {err} */
    signup(name, pw) {
      const s = slug(name);
      if (registry().some(a => a.slug === s)) return { err: 'Esiste già un asilo con questo nome su questo dispositivo.' };
      const id = 'a' + Math.random().toString(36).slice(2, 9);
      const r = registry(); r.push({ id, name, slug: s }); saveReg(r);
      // stato iniziale pulito per il nuovo asilo (seed è di script.js, qui siamo su evento: esiste già)
      const st = (typeof seed === 'function') ? seed() : null;
      if (st) {
        st.school = name;
        st.pw = pw;
        st.sections = [{ id: (typeof uid === 'function' ? uid() : 's1'), name: 'Sezione unica' }];
        st.kids = []; st.memos = []; st.menu = {}; st.meals = {}; st.diary = {};
        st.msgs = [{ id: (typeof uid === 'function' ? uid() : 'm1'), text: 'Benvenute su Asilapp! Da qui invierete memo, menù e avvisi alle famiglie.', ts: Date.now(), reads: {} }];
        try { localStorage.setItem('asilapp_t_' + id, JSON.stringify(st)); }
        catch (e) { return { err: 'Salvataggio non riuscito: memoria del browser piena?' }; }
      }
      return { id };
    }
  };
})();

/* ---------- UI della landing (gira a fine caricamento, quando script.js è pronto) ---------- */
(function () {
  if (typeof ASILO === 'undefined') return;

  function showLanding() {
    if (typeof show !== 'function') return;
    show('viewLanding');
    const n = document.getElementById('signupName');
    if (n) n.focus();
  }

  function onSignup(e) {
    e.preventDefault();
    const err = document.getElementById('signupErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    const name = ((document.getElementById('signupName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const pw = (document.getElementById('signupPass') || {}).value || '';
    const pw2 = (document.getElementById('signupPass2') || {}).value || '';
    if (name.length < 3) return fail('Il nome dell\u2019asilo richiede almeno 3 lettere.');
    if (ASILO.resolve(name)) return fail('Esiste già un asilo con questo nome.');
    if (pw.length < 6) return fail('La password richiede almeno 6 caratteri.');
    if (pw !== pw2) return fail('Le due password non coincidono.');
    const r = ASILO.signup(name, pw);
    if (r.err) return fail(r.err);
    ASILO.enter(r.id);
    if (typeof toast === 'function') toast('Asilo registrato! Benvenute \u2713');
    setTimeout(() => location.reload(), 400);
  }

  function enter(id) {
    ASILO.enter(id);
    location.reload();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-action="asilo-enter"]');
    if (b) { enter(b.getAttribute('data-id')); return; }
    if (t.closest('[data-action="goto-demo"]')) { enter('demo'); return; }
    if (t.closest('[data-action="goto-login"]')) {
      if (typeof show === 'function') show('viewLogin');
      const a = document.getElementById('loginAsilo');
      if (a) a.focus();
      return;
    }
    if (t.closest('[data-action="goto-signup"]')) {
      const f = document.getElementById('signupName');
      if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus({ preventScroll: true }); }
      return;
    }
    if (t.closest('[data-action="switch-asilo"]')) { ASILO.exit(); location.reload(); }
  });
  document.addEventListener('submit', e => {
    if (e.target instanceof Element && e.target.id === 'signupForm') onSignup(e);
  });

  /* vista iniziale: senza asilo scelto si parte dalla landing */
  window.addEventListener('load', () => {
    if (!ASILO.cur()) showLanding();
    else {
      // asilo scelto: precompila il campo nome per il login
      const a = ASILO.registry().find(x => x.id === ASILO.cur());
      const inp = document.getElementById('loginAsilo');
      if (a && inp && !inp.value) inp.value = a.name;
    }
  });
})();

/* ============================================================
   SUPERADMIN — accesso diretto agli asili (bypass del login)
   Sulla card di ogni asilo del pannello superadmin compare
   «🔑 Entra senza login»: imposta l'asilo come corrente, carica
   il suo stato (KEY + load() di script.js) e apre la vista
   maestre con showAdmin(), senza toccare la password dell'asilo.
   Un banner ambra ricorda la sessione speciale; «Esci» o il
   bottone del banner riportano al pannello superadmin.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined') return;
  const FLAG = 'asilapp_sa_entered';

  const saToast = m => { if (typeof toast === 'function') toast(m); };
  const inSuper = () => { try { return sessionStorage.getItem(FLAG) === '1'; } catch (e) { return false; } };
  const known = id => id === 'demo' || ASILO.registry().some(x => x.id === id);

  function backToSuper() {
    try { sessionStorage.removeItem(FLAG); } catch (e) {}
    ASILO.exit();
    location.hash = 'superadmin'; // alla load il pannello si riapre (sessione superadmin ancora valida in sessionStorage)
    location.reload();
  }

  function enterAsilo(id) {
    if (typeof load !== 'function' || typeof showAdmin !== 'function') return; // script.js assente
    if (!known(id)) { saToast('Asilo non trovato'); return; }
    const a = id === 'demo' ? { name: 'Asilo Nido Arcobaleno (demo)' } : ASILO.registry().find(x => x.id === id);
    ASILO.enter(id);
    try {
      KEY = ASILO.keyFor(id);  // let di script.js: da qui in poi save() scrive sull'asilo giusto
      state = load();
    } catch (e) { saToast('Impossibile aprire l\u2019asilo'); return; }
    try { sessionStorage.setItem(FLAG, '1'); } catch (e) {}
    showAdmin();
    mountBanner();
    saToast('Entrata in «' + a.name + '» senza login \u2713');
  }

  /* banner «sei dentro come superadmin» sopra le tab dell'asilo */
  function mountBanner() {
    if (!inSuper()) return;
    const view = document.getElementById('viewAdmin');
    if (!view || view.hidden || document.getElementById('saEnterBar')) return;
    const bar = document.createElement('div');
    bar.id = 'saEnterBar';
    bar.className = 'sa-enter-bar';
    bar.innerHTML =
      '<span>\uD83D\uDD11 Sei dentro come <strong>superadmin</strong>: puoi modificare tutto senza login.</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-sa-back="1">\u2190 Pannello superadmin</button>';
    const tabs = view.querySelector('.tabs');
    view.insertBefore(bar, tabs || view.firstChild);
  }

  /* inietta il bottone sulle card asilo del pannello superadmin */
  function decorate() {
    document.querySelectorAll('.sa-item').forEach(card => {
      if (card.querySelector('[data-sa-enter]')) return;
      let id = card.getAttribute('data-id');
      if (!id) { const b = card.querySelector('[data-id]'); id = b && b.getAttribute('data-id'); }
      if (!id || !known(id)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm';
      btn.setAttribute('data-sa-enter', id);
      btn.textContent = '\uD83D\uDD11 Entra senza login';
      (card.querySelector('.sa-actions') || card).appendChild(btn);
    });
    mountBanner();
  }

  /* questo file è caricato prima di script.js: i listener qui
     registrati girano PRIMA dei suoi, quindi posso fermare il
     logout standard quando la sessione superadmin è attiva */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-sa-enter]');
    if (b) { e.stopImmediatePropagation(); enterAsilo(b.getAttribute('data-sa-enter')); return; }
    if (t.closest('[data-sa-back]')) { e.stopImmediatePropagation(); backToSuper(); return; }
    if (inSuper() && t.closest('[data-action="logout"]')) {
      e.stopImmediatePropagation(); // niente logout normale: si torna al pannello
      backToSuper();
    }
  });

  window.addEventListener('load', () => {
    decorate();
    new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
  });
})();
