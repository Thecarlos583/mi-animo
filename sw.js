// Service worker: guarda la app para que funcione sin internet y manda el recordatorio diario.
// Al cambiar cualquier archivo, sube VERSION para que el teléfono descargue lo nuevo.
const VERSION = 'mi-animo-v2';
const CACHE_AJUSTES = 'mi-animo-ajustes'; // ajustes del recordatorio (los escribe app.js)
const ARCHIVOS = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== CACHE_AJUSTES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la caché (rápido y sin internet); si hay red, se actualiza en segundo plano
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const guardado = await cache.match(e.request, { ignoreSearch: true });
      const red = fetch(e.request).then(r => {
        if (r.ok) cache.put(e.request, r.clone());
        return r;
      }).catch(() => null);
      return guardado || (await red) || (e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    })
  );
});

/* ---------- Recordatorio diario (Chrome en Android, con la app instalada) ---------- */

const dos = n => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
const urlAjustes = () => new URL('./ajustes-recordatorio', self.registration.scope).href;

async function revisarRecordatorio() {
  const cache = await caches.open(CACHE_AJUSTES);
  const r = await cache.match(urlAjustes());
  if (!r) return;
  const aj = await r.json();
  const k = hoy();
  if (!aj.activo || aj.ultimo === k || aj.animoHoy === k) return;
  const [h, m] = String(aj.hora || '20:00').split(':').map(Number);
  const ahora = new Date();
  if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return;
  await cache.put(urlAjustes(), new Response(JSON.stringify({ ...aj, ultimo: k }), { headers: { 'Content-Type': 'application/json' } }));
  await self.registration.showNotification('Mi Ánimo', {
    body: '¿Cómo estás hoy? Si quieres, marca tu ánimo. Sin presión.',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'recordatorio-animo',
  });
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'recordatorio-animo') e.waitUntil(revisarRecordatorio());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
      const abierta = ventanas.find(v => v.url.startsWith(self.registration.scope));
      return abierta ? abierta.focus() : self.clients.openWindow('./');
    })
  );
});
