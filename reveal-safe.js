'use strict';
/* ============================================================
   reveal-safe.js — rete di sicurezza CONDIVISA del reveal
   Qualunque .reveal non ancora attivato dal motore locale
   (IntersectionObserver, timing dello screenshot, JS lento)
   diventa visibile entro mezzo secondo. Idempotente: se il
   motore della pagina ha già fatto il suo lavoro, qui non
   resta nulla da mostrare e non si tocca nulla.
   Caricato da info.html, registrazione.html e contatti.html
   insieme al loro script principale.
   ============================================================ */
(function () {
  function showAll() {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(showAll, 400));
  } else {
    setTimeout(showAll, 400);
  }
  // secondo giro dopo il load: copre render tardivi e screenshot a pagina intera
  window.addEventListener('load', () => setTimeout(showAll, 600));
})();
