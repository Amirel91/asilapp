'use strict';
/* ============================================================
   settings.js — le impostazioni diventano una pagina a se stante
   Il bottone ⚙ della barra apre e chiude #paneSettings: una pagina
   vera e propria, non più una card sopra la sezione corrente.
   Riusa switchTab di script.js, che già nasconde tutti i tabpane
   (quindi anche questa pagina quando si cambia tab) e spegne le
   tab perché nessuna si chiama "settings". Zero modifiche a script.js.
   ============================================================ */
(function () {
  if (typeof switchTab === 'undefined') return; // script.js assente: niente da fare

  let lastTab = 'kids'; // tab a cui tornare chiudendo le impostazioni

  const isOn = () => {
    const p = document.getElementById('paneSettings');
    return !!p && !p.hidden;
  };
  function markBtn(on) {
    document.querySelectorAll('[data-action="toggle-settings"]').forEach(b => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  function openSettings() {
    const cur = document.querySelector('.tab[aria-selected="true"]');
    lastTab = (cur && cur.dataset.tab) || 'kids';
    switchTab('settings'); // nessuna tab ha data-tab="settings": restano tutte spente
    markBtn(true);
    window.scrollTo({ top: 0 });
  }
  function closeSettings() {
    switchTab(lastTab || 'kids');
    markBtn(false);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-action="toggle-settings"]')) {
      isOn() ? closeSettings() : openSettings();
      return;
    }
    const tab = t.closest('[data-action="tab"]');
    if (tab) {
      if (isOn()) lastTab = tab.dataset.tab || 'kids'; // chiusura implicita: switchTab ha già nascosto la pagina
      markBtn(false);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOn()) closeSettings();
  });
})();
