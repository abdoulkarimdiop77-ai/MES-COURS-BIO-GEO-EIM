// KOTO — service worker : fonctionnement sans internet.
// Les données (Supabase) ne sont jamais mises en cache ici : elles sont gardées par l'application elle-même.
const VERSION='koto-v5';
const COEUR=['./','index.html','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png'];
const BIBLIOTHEQUES=[
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(async c=>{
    await Promise.all(COEUR.map(u=>c.add(u).catch(()=>{})));
    await Promise.all(BIBLIOTHEQUES.map(u=>c.add(u).catch(()=>{})));
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname.endsWith('supabase.co'))return; // données : toujours en direct
  const memeSite=url.origin===location.origin;
  const cdn=/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname);
  if(memeSite){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c));}return r;}).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
  }else if(cdn){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(n=>{const c=n.clone();caches.open(VERSION).then(x=>x.put(req,c));return n;})));
  }
});

