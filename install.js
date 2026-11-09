'use strict';
/* ============================================================
   install.js — rende Asilapp installabile
   1) registra il service worker (solo su https o localhost)
   2) bottone «📲 Installa l'app» nella landing e nella barra del
      pannello maestre, appena il browser espone il prompt
      (Chrome, Edge, Android, desktop) tramite beforeinstallprompt
   3) iPhone/iPad: Safari non ha prompt → il bottone apre un
      banner con la via manuale (Condividi → Aggiungi a Home)
   Se l'app è già installata (display-mode standalone) non mostra
   nulla. Stili propri con prefisso pwa-*: zero CSS esterni.
   ============================================================ */
(function () {

  /* ---------- 1) service worker ---------- */
  const local = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  /* ---------- stato ---------- */
  let promptEvent = null;
  const installed = () => matchMedia('(display-mode: standalone)').matches
    || (window.navigator && window.navigator.standalone === true);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const usable = () => !installed() && (!!promptEvent || isIOS);

  /* ---------- stili del banner iOS ---------- */
  const css = document.createElement('style');
  css.textContent = [
    '.pwa-ios{position:fixed;left:.7rem;right:.7rem;bottom:calc(.7rem + env(safe-area-inset-bottom));z-index:60;',
    'display:grid;gap:.45rem;background:var(--card,#fff);border:1px solid var(--line,#e7e5e4);',
    'border-radius:var(--r-lg,1.1rem);padding:.8rem .9rem;box-shadow:var(--sh-md,0 10px 30px rgba(0,0,0,.12));}',
    '.pwa-ios p{margin:0;font-size:.84rem;color:var(--ink-soft,#57534e);line-height:1.5;}',
    '.pwa-ios strong{font-size:.9rem;color:var(--ink,#292524);}',
    '.pwa-ios .btn{justify-self:end;}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- 2) bottoni «Installa» ---------- */
  function mountButtons() {
    const show = usable();

    /* landing: accanto ad «Accedi al tuo asilo» */
    const nav = document.querySelector('.landing-nav');
    let bl = nav && nav.querySelector('[data-install-btn]');
    if (nav && !bl) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-outline btn-sm';
      b.setAttribute('data-install-btn', '1');
      b.setAttribute('data-action', 'install-app');
      b.textContent = '📲 Installa l\u2019app';
      nav.appendChild(b);
      bl = b;
    }
    if (bl) bl.hidden = !show;

    /* pannello maestre: icona nella barra in alto */
    const tb = document.querySelector('.topbar-right');
    let ba = tb && tb.querySelector('[data-install-btn]');
    if (tb && !ba) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-ghost btn-sm';
      b.setAttribute('data-install-btn', '1');
      b.setAttribute('data-action', 'install-app');
      b.title = 'Installa Asilapp su questo dispositivo';
      b.setAttribute('aria-label', 'Installa Asilapp su questo dispositivo');
      b.textContent = '📲';
      tb.insertBefore(b, tb.firstChild);
      ba = b;
    }
    if (ba) ba.hidden = !show;
  }

  /* ---------- 3) banner istruzioni iPhone ---------- */
  function hideIosBar() { const b = document.getElementById('pwaIosBar'); if (b) b.remove(); }
  function showIosBar() {
    if (document.getElementById('pwaIosBar')) return;
    const bar = document.createElement('div');
    bar.id = 'pwaIosBar';
    bar.className = 'pwa-ios';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Come installare Asilapp su iPhone');
    bar.innerHTML =
      '<p><strong>Installa Asilapp su iPhone o iPad</strong><br>' +
      'Tocca il tasto <strong>Condividi</strong> ⬆️ nella barra di Safari, ' +
      'poi scegli <strong>«Aggiungi a Home»</strong>: l\u2019app si aprirà a tutto schermo, con la sua icona.</p>' +
      '<button type="button" class="btn btn-outline btn-sm" data-ios-close="1">Ho capito</button>';
    document.body.appendChild(bar);
  }

  /* ---------- eventi ---------- */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    promptEvent = e;
    mountButtons();
  });

  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    if (typeof toast === 'function') toast('Asilapp installata ✓ La trovi nella schermata Home');
    mountButtons();
  });

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ios-close]')) { hideIosBar(); return; }
    const b = t.closest('[data-action="install-app"]');
    if (!b) return;
    if (promptEvent) {
      const ev = promptEvent;
      promptEvent = null;
      ev.prompt();
      ev.userChoice
        .then(ch => {
          if (ch.outcome !== 'accepted') promptEvent = ev;
          mountButtons();
        })
        .catch(() => { promptEvent = ev; mountButtons(); });
    } else {
      showIosBar();
    }
  });

  window.addEventListener('load', () => {
    mountButtons();
    new MutationObserver(mountButtons).observe(document.body, { childList: true, subtree: true });
  });
})();
