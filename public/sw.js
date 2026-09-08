const CACHE='shoreline-install-v1';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/icons/icon-192.png','/icons/icon-512.png'])));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('shoreline-install-')&&key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate'&&new URL(event.request.url).origin===self.location.origin){
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));
 }
});
