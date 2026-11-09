'use strict';
/* ============================================================
   sw.js — service worker di Asilapp
   Precache dei file dell'app al primo avvio, poi:
   - navigazione: network-first (gli aggiornamenti arrivano
     subito) con fallback alla pagina in cache → offline ok
   - asset (css/js/immagini): cache-first, la cache si riempie
     anche a runtime (uploads compresi)
   I DATI degli asili non passano da qui: restano in localStorage
   del dispositivo, come sempre in Asilapp.
   ============================================================ */
const VER = 'asilapp-sw-v1';
const CORE = [
  './',
  './index.html',
  './style.css',
  './landing.css',
  './landing-extra.css',
  './script.js',
  './saas.js',
  './login.js',
  './demo.js',
  './demo-parent.js',
  './diario.js',
  './extra.js',
  './settings.js',
  './superadmin.js',
  './install.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    /* allSettled: un file mancante non blocca l'installazione */
    await Promise.allSettled(CORE.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* pagine: rete se c'è, cache altrimenti */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(VER);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const hit = (await caches.match(req)) || (await caches.match('./index.html'));
        return hit || Response.error();
      }
    })());
    return;
  }

  /* asset: cache-first, riempita a runtime */
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const c = await caches.open(VER);
        c.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});
