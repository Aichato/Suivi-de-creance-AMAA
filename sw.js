/* Service worker : fonctionnement hors ligne.
   Changez la version ci-dessous à chaque mise à jour pour renouveler le cache. */
var CACHE = 'creances-v1';
var LOCAL = ['./', 'index.html', 'logo.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
var OPTIONAL = ['xlsx.full.min.js']; // copie locale de SheetJS si vous l'ajoutez au dossier
var EXTERNAL = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
var HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    var jobs = [c.addAll(LOCAL)];
    OPTIONAL.forEach(function (u) { jobs.push(c.add(u).catch(function () {})); });
    EXTERNAL.forEach(function (u) {
      jobs.push(fetch(new Request(u, { mode: 'no-cors' })).then(function (r) { return c.put(u, r); }).catch(function () {}));
    });
    return Promise.all(jobs);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  if (!same && HOSTS.indexOf(url.hostname) < 0) return;

  if (same) { // réseau d'abord (pour recevoir les mises à jour), cache en secours
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
    }));
  } else { // ressources externes : cache d'abord
    e.respondWith(caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return r;
      });
    }));
  }
});
