/* O Girrr · Copia offline (Claude, 9 novembre 2026, richiesta di Gianluca dal treno).
   Va nella radice del sito (/o-fant-a-girrr/sw.js) e lo registra offline.js.

   Cosa fa:
   - Con la rete funziona come prima: pagine e dati arrivano sempre dal sito, e intanto se ne salva una copia.
   - Se la rete non c'è, o non risponde entro pochi secondi (treno, galleria), mostra l'ultima copia salvata.
   - Ogni 30 minuti, quando l'app è aperta (e in sottofondo dove il telefono lo permette), rinfresca la copia
     completa: pagine di Lega e Stadio, dati, Giornale, immagini, e le letture dal database (Curva, Totogirrr,
     Derby, notifiche) che la persona ha già aperto.
   - Al database non scrive mai: le scritture (post, voti, schedine) passano come prima e senza rete non partono.
*/
'use strict';

var VERSIONE = 'off-1';
var SP = self.GIRRR_SPECCHIO || null;            /* solo nella prova del Lab: vedi lab/offline/sw-prova.js */
var AMBITO = self.registration.scope;            /* cartella servita dal service worker */
var BASE = SP ? SP.base : AMBITO;                /* https://giandjcosta.github.io/o-fant-a-girrr/ */
var PRE = SP ? 'girrr-prova-' : 'girrr-';
var C_SITO = PRE + 'sito', C_DATI = PRE + 'dati', C_DB = PRE + 'db', C_EXT = PRE + 'esterni', C_META = PRE + 'meta';
var CHIAVE_META = BASE + '__girrr/meta';
var ATTESA_PAGINE = 4000, ATTESA_DATI = 5000, ATTESA_FILE = 5000;
var ATTESA_IN_COPIA = 700;                        /* pagina già arrivata dalla copia: script e dati non aspettano oltre */
var INTERVALLO = 30 * 60 * 1000;                  /* ogni mezz'ora */
var SUPA = 'https://qmjqfgmvimsuxvghetgi.supabase.co';
/* Solo letture: si salvano e, senza rete, si rileggono. Tutto il resto passa e basta. */
var LETTURE = /^(curva_feed|curva_img|curva_adm_img|curva_pimg|toto_pr_pubblico|[a-z_]+_stato)$/;
var DA_RINFRESCARE = /^(curva_feed|toto_pr_pubblico|[a-z_]+_stato)$/;

var PAGINE = [
  'index.html', 'riepilogo.html', 'apri.html',
  'girrr/index.html', 'girrr/app.html', 'girrr/campo.html', 'girrr/tabellone.html', 'girrr/curva.html',
  'girrr/notifiche.html', 'girrr/albo.html', 'girrr/derby.html', 'girrr/rivalita.html', 'girrr/giornale.html',
  'girrr/squadre.html', 'girrr/statistiche.html', 'girrr/totogirrr.html', 'girrr/versioni.html',
  'stadio/girrr/index.html', 'stadio/girrr/app.html', 'stadio/girrr/campo.html', 'stadio/girrr/tabellone.html',
  'stadio/girrr/curva.html', 'stadio/girrr/notifiche.html', 'stadio/girrr/albo.html', 'stadio/girrr/derby.html',
  'stadio/girrr/rivalita.html', 'stadio/girrr/giornale.html', 'stadio/girrr/squadre.html',
  'stadio/girrr/statistiche.html', 'stadio/girrr/totogirrr.html', 'stadio/girrr/versioni.html'
];
var DATI = [
  'data.json', 'formazioni.json', 'toto-quote.json', 'testi.json', 'manifest.webmanifest', 'versioni.json', 'riepiloghi/indice.json',
  'girrr/dati/borsino.json', 'girrr/dati/cronache.json', 'girrr/dati/fiducia.json', 'girrr/dati/lab-dati.json',
  'girrr/dati/moviola.json', 'girrr/dati/probabilita.json', 'girrr/v55/allenatori.json', 'girrr/v55/annuario.json',
  'girrr/voci/puntata.json', 'girrr/voci/archivio.json', 'girrr/voci/elenco.json', 'girrr/voci/elenco2.json'
];

/* Clienti (schede aperte) che stanno usando una copia: id -> ora della copia più vecchia usata */
var USATE = {};

/* ---------- Indirizzi ---------- */
function stessaOrigine(u) { return u.origin === self.location.origin; }
function nelSito(u) { return stessaOrigine(u) && u.href.indexOf(AMBITO) === 0; }
function estensione(u) { var m = /\.([a-z0-9]+)$/i.exec(u.pathname); return m ? m[1].toLowerCase() : (/\/$/.test(u.pathname) ? 'html' : ''); }
/* Chiave della copia: «girrr/» vale «girrr/index.html»; per pagine e dati si ignorano i ?v=… e ?_=… */
function chiave(href) {
  var u = new URL(href); u.hash = '';
  if (/\/$/.test(u.pathname)) u.pathname += 'index.html';
  var e = estensione(u);
  if (e === 'html' || e === 'json' || e === 'pdf' || e === 'webmanifest') u.search = '';
  return u.href;
}

/* ---------- Rete ---------- */
function daRete(req, init) {
  var href = typeof req === 'string' ? req : req.url;
  if (SP && stessaOrigine(new URL(href))) return SP.prendi(href, init || {});
  return fetch(req, init);
}
function conTempo(p, ms) {
  return new Promise(function (ok, ko) {
    var t = setTimeout(function () { ko(new Error('tempo')); }, ms);
    p.then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); ko(e); });
  });
}
/* Copia con l'ora del salvataggio; si ricostruisce la risposta (niente «redirected», niente lunghezze sbagliate) */
function marca(r) {
  return r.blob().then(function (b) {
    var h = new Headers();
    var ct = r.headers.get('content-type'); if (ct) h.set('content-type', ct);
    h.set('x-girrr-salvato', String(Date.now()));
    return new Response(b, { status: 200, statusText: 'OK', headers: h });
  });
}
function salva(nomeCache, k, r) {
  if (!r || !r.ok || (r.type !== 'basic' && r.type !== 'cors' && r.type !== 'default')) return Promise.resolve();
  return marca(r.clone()).then(function (c) {
    return caches.open(nomeCache).then(function (cache) { return cache.put(k, c); });
  }).catch(function () {});
}
function dallaCopia(nomeCache, k) {
  return caches.open(nomeCache).then(function (cache) {
    return cache.match(k).then(function (r) { return r || cache.match(k, { ignoreSearch: true }); });
  });
}
function oraCopia(r) { return +(r && r.headers.get('x-girrr-salvato')) || 0; }
function segna(idCliente, r) {
  var ora = oraCopia(r); if (!idCliente || !ora) return;
  if (!USATE[idCliente] || ora < USATE[idCliente]) USATE[idCliente] = ora;
  self.clients.get(idCliente).then(function (c) { if (c) c.postMessage({ tipo: 'girrr-copia', ora: USATE[idCliente] }); }).catch(function () {});
}

/* Prima la rete; se non c'è o non risponde in tempo, la copia. La rete, se arriva dopo, aggiorna la copia. */
function primaLaRete(event, req, nomeCache, k, attesa, idCliente) {
  var finito = false;
  if (idCliente && USATE[idCliente] && req.mode !== 'navigate') attesa = ATTESA_IN_COPIA;
  var rete = daRete(req).then(function (r) {
    if (r && r.ok) event.waitUntil(salva(nomeCache, k, r));
    return r;
  });
  event.waitUntil(rete.catch(function () {}));
  return new Promise(function (ok, ko) {
    function usaCopia(oppure) {
      return dallaCopia(nomeCache, k).then(function (c) {
        if (finito) return;
        if (c) { finito = true; segna(idCliente, c); ok(c); }
        else if (oppure) { finito = true; oppure(); }
      });
    }
    var t = setTimeout(function () { usaCopia(null); }, attesa);
    rete.then(function (r) {
      if (finito) return;
      if (r && r.status >= 500) { clearTimeout(t); usaCopia(function () { ok(r); }); return; }
      finito = true; clearTimeout(t); ok(r);
    }, function (e) {
      clearTimeout(t);
      usaCopia(function () { ko(e); }).catch(function () { if (!finito) { finito = true; ko(e); } });
    });
  });
}

/* Immagini e caratteri: subito dalla copia se c'è, intanto si aggiorna in sottofondo */
function primaLaCopia(event, req, nomeCache, k) {
  return dallaCopia(nomeCache, k).then(function (c) {
    var rete = daRete(req).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) {
        var copia = r.clone();
        event.waitUntil(r.type === 'opaque'
          ? caches.open(nomeCache).then(function (cc) { return cc.put(k, copia); }).catch(function () {})
          : salva(nomeCache, k, copia));
      }
      return r;
    });
    event.waitUntil(rete.catch(function () {}));
    return c || rete;
  });
}

function paginaSenzaCopia() {
  var h = '<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>O Girrr · Offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1d2a52;color:#fbf6ec;' +
    'font:600 15px/1.5 Inter,system-ui,sans-serif;padding:24px 16px;box-sizing:border-box}main{max-width:420px}h1{font-size:26px;margin:0 0 8px}' +
    'p{color:#bfe3ff;margin:0 0 18px}a{display:inline-block;margin:0 8px 10px 0;padding:11px 16px;border-radius:999px;background:#d62839;color:#fff;' +
    'text-decoration:none;font-weight:800}a.s{background:#ffd166;color:#1d2a52}</style><main><h1>Sei offline</h1>' +
    '<p>Questa pagina non è ancora nella copia salvata sul telefono. Le pagine principali sì: aprile da qui.</p>' +
    '<a href="' + BASE + 'girrr/">Home Lega</a><a class="s" href="' + BASE + 'stadio/girrr/">Home Stadio</a></main></html>';
  return new Response(h, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/* ---------- Letture dal database (Supabase, chiamate POST) ---------- */
function impronta(testo) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo)).then(function (b) {
    return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 32);
  });
}
function letturaDb(event, req, nome) {
  var copiaReq = req.clone();
  return copiaReq.text().then(function (corpo) {
    return impronta(nome + '|' + corpo).then(function (imp) {
      var k = SUPA + '/rest/v1/rpc/' + nome + '?__copia=' + imp;
      var testate = {};
      ['apikey', 'authorization', 'content-type', 'accept', 'prefer', 'content-profile', 'accept-profile'].forEach(function (n) {
        var v = req.headers.get(n); if (v) testate[n] = v;
      });
      if (DA_RINFRESCARE.test(nome) && !/"p_before"\s*:\s*[^n]/.test(corpo)) event.waitUntil(ricorda(nome, corpo, testate, k));
      return primaLaRete(event, req, C_DB, k, ATTESA_DATI, event.clientId);
    });
  });
}
function leggiMeta() {
  return caches.open(C_META).then(function (c) { return c.match(CHIAVE_META); })
    .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}
function scriviMeta(m) {
  return caches.open(C_META).then(function (c) {
    return c.put(CHIAVE_META, new Response(JSON.stringify(m), { headers: { 'content-type': 'application/json' } }));
  });
}
var codaMeta = Promise.resolve();
function cambiaMeta(f) {
  codaMeta = codaMeta.then(function () { return leggiMeta().then(function (m) { f(m); return scriviMeta(m); }); }).catch(function () {});
  return codaMeta;
}
function ricorda(nome, corpo, testate, k) {
  return cambiaMeta(function (m) {
    var l = (m.db || []).filter(function (x) { return x.k !== k; });
    l.unshift({ k: k, n: nome, b: corpo, h: testate });
    m.db = l.slice(0, 30);
  });
}

/* ---------- Copia completa (ogni 30 minuti) ---------- */
var inCorso = null;
function aCoppie(lista, n, f) {
  var i = 0;
  function prossimo() { if (i >= lista.length) return Promise.resolve(); var x = lista[i++]; return Promise.resolve(f(x)).catch(function () {}).then(prossimo); }
  var p = []; for (var j = 0; j < n; j++) p.push(prossimo());
  return Promise.all(p);
}
var FILE_UTILI = /\.(js|css|png|jpe?g|webp|svg|gif|ico|woff2?)$/i;
function fileDellaPagina(testo, indirizzo, insieme) {
  var re = /(?:src|href)\s*=\s*["']([^"'#]+)["']/g, m;
  while ((m = re.exec(testo))) {
    try {
      var u = new URL(m[1], indirizzo);
      if (nelSito(u) && FILE_UTILI.test(u.pathname)) insieme[u.href] = 1;
    } catch (e) {}
  }
}
function scarica(nomeCache, href) {
  return conTempo(daRete(href, { cache: 'no-cache' }), 30000).then(function (r) {
    if (!r || !r.ok) return null;
    return salva(nomeCache, chiave(href), r.clone()).then(function () { return r; });
  });
}
function aggiornaCopia(forza) {
  if (inCorso) return inCorso;
  inCorso = leggiMeta().then(function (m) {
    if (!forza && m.ultimo && Date.now() - m.ultimo < INTERVALLO - 60000) return false;
    var files = {}, conto = 0;
    var pagine = aCoppie(PAGINE, 3, function (p) {
      return scarica(C_SITO, BASE + p).then(function (r) {
        if (!r) return;
        conto++;
        return r.text().then(function (t) { fileDellaPagina(t, BASE + p, files); });
      });
    });
    var dati = aCoppie(DATI, 3, function (p) {
      return scarica(C_DATI, BASE + p).then(function (r) {
        if (!r) return;
        conto++;
        if (p !== 'riepiloghi/indice.json') return;
        /* Giornale: copertine degli ultimi numeri e il PDF dell'ultimo */
        return r.json().then(function (ind) {
          ind = (ind || []).filter(function (x) { return !x.pub || Date.parse(x.pub) <= Date.now(); })
            .sort(function (a, b) { return b.n - a.n; });
          ind.slice(0, 4).forEach(function (x) { if (x.copertina) files[new URL(x.copertina, BASE).href] = 1; });
          if (ind[0] && ind[0].pdf) files[new URL(ind[0].pdf, BASE).href] = 1;
        }).catch(function () {});
      });
    });
    return Promise.all([pagine, dati]).then(function () {
      return caches.open(C_SITO).then(function (cache) {
        return aCoppie(Object.keys(files), 4, function (href) {
          var u = new URL(href);
          /* Le immagini cambiano di rado: si scaricano solo se mancano. Script e stili si ricontrollano (304 se uguali). */
          if (/\.(js|css|pdf)$/i.test(u.pathname)) return scarica(C_SITO, href);
          return cache.match(chiave(href)).then(function (c) { if (!c) return scarica(C_SITO, href); });
        });
      });
    }).then(function () {
      /* Letture dal database già aperte dalla persona (Curva, Totogirrr, Derby, notifiche…) */
      return aCoppie((m.db || []).slice(0, 30), 3, function (x) {
        return conTempo(fetch(SUPA + '/rest/v1/rpc/' + x.n, { method: 'POST', headers: x.h, body: x.b }), 20000)
          .then(function (r) { if (r && r.ok) return salva(C_DB, x.k, r); });
      });
    }).then(function () {
      if (!conto) return false; /* niente rete: non si segna l'ora */
      var ora = Date.now();
      return cambiaMeta(function (mm) { mm.ultimo = ora; mm.versione = VERSIONE; }).then(function () {
        return self.clients.matchAll({ includeUncontrolled: true }).then(function (cl) {
          cl.forEach(function (c) { c.postMessage({ tipo: 'girrr-copia-pronta', ora: ora }); });
          return true;
        });
      });
    });
  }).then(function (x) { inCorso = null; return x; }, function () { inCorso = null; return false; });
  return inCorso;
}
function ripulisci(nomeCache, max) {
  return caches.open(nomeCache).then(function (c) {
    return c.keys().then(function (k) { return Promise.all(k.slice(0, Math.max(0, k.length - max)).map(function (x) { return c.delete(x); })); });
  }).catch(function () {});
}

/* ---------- Ciclo di vita ---------- */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (nomi) {
    /* Cancella solo copie di versioni vecchie con nomi diversi (oggi nessuna) */
    return Promise.all(nomi.filter(function (n) {
      return n.indexOf(PRE) === 0 && [C_SITO, C_DATI, C_DB, C_EXT, C_META].indexOf(n) < 0;
    }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
  /* La copia completa la chiede offline.js appena la pagina è aperta: qui non si aspetta, sennò le pagine restano ferme */
});

self.addEventListener('message', function (event) {
  var d = event.data || {}, src = event.source;
  if (d.tipo === 'girrr-aggiorna') {
    event.waitUntil(aggiornaCopia(!!d.forza).then(function () { return Promise.all([ripulisci(C_DB, 150), ripulisci(C_EXT, 120)]); }));
  } else if (d.tipo === 'girrr-stato' && src) {
    event.waitUntil(leggiMeta().then(function (m) {
      src.postMessage({ tipo: 'girrr-stato', copia: USATE[src.id] || 0, ultimo: m.ultimo || 0, versione: VERSIONE });
    }));
  }
});
self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'girrr-copia') event.waitUntil(aggiornaCopia(false));
});

self.addEventListener('fetch', function (event) {
  var req = event.request, u;
  try { u = new URL(req.url); } catch (e) { return; }

  /* Database: solo le letture */
  if (req.method === 'POST' && u.origin === SUPA) {
    var m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(u.pathname);
    if (m && LETTURE.test(m[1])) event.respondWith(letturaDb(event, req, m[1]));
    return;
  }
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return; /* audio della Radio: passa come prima */

  /* Caratteri di Google e immagini caricate su Supabase */
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' ||
      (u.origin === SUPA && u.pathname.indexOf('/storage/v1/object/public/') === 0)) {
    event.respondWith(primaLaCopia(event, req, C_EXT, req.url));
    return;
  }
  if (!nelSito(u)) return;

  var e = estensione(u), k = chiave(req.url);
  if (req.mode === 'navigate' || e === 'html') {
    var id = req.mode === 'navigate' ? (event.resultingClientId || event.clientId) : event.clientId;
    event.respondWith(primaLaRete(event, req, C_SITO, k, ATTESA_PAGINE, id).catch(function () {
      return req.mode === 'navigate' ? paginaSenzaCopia() : Response.error();
    }));
  } else if (e === 'json' || e === 'webmanifest') {
    event.respondWith(primaLaRete(event, req, C_DATI, k, ATTESA_DATI, event.clientId));
  } else if (e === 'mp3' || e === 'wav' || e === 'ogg' || e === 'mp4') {
    return;
  } else if (/^(png|jpe?g|webp|gif|svg|ico|woff2?)$/.test(e)) {
    event.respondWith(primaLaCopia(event, req, C_SITO, k));
  } else {
    /* script, stili, PDF del Giornale e il resto */
    event.respondWith(primaLaRete(event, req, C_SITO, k, ATTESA_FILE, event.clientId));
  }
});

/* ---------- Notifiche push (Claude, 9 novembre 2026) ----------
   Le manda la funzione «push-invia» di Supabase; qui si mostrano e, toccandole, si apre la pagina giusta
   (apri.html sceglie Lega o Stadio come l'ultima volta). */
self.addEventListener('push', function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { testo: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titolo || 'O Girrr', {
    body: d.testo || '',
    icon: BASE + 'assets/icon-192.png',
    tag: d.tag || undefined,
    lang: 'it',
    data: { url: d.url || 'apri.html?p=index' }
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var u = new URL((event.notification.data && event.notification.data.url) || 'apri.html?p=index', BASE).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) {
      var c = cl[i];
      if (c.url.indexOf(AMBITO) === 0 && 'navigate' in c && u.indexOf(AMBITO) === 0) {
        return c.focus().then(function (w) { return (w || c).navigate(u); }).catch(function () { return self.clients.openWindow(u); });
      }
    }
    return self.clients.openWindow(u);
  }));
});
