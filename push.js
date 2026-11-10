/* O Girrr · Notifiche sul telefono (Claude, 9 novembre 2026, richiesta di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/push.js), incluso dalla pagina Notifiche di Lega e Stadio.
   Riempie il riquadro «Notifiche sul telefono»: interruttore generale e uno per tipo di avviso,
   con la forma del telefono (iPhone: interruttori iOS; Android e PC: interruttori Android) e il colore della grafica
   (Lega rosso, Stadio oro) su tutti e due.
   Prove: ?piattaforma=ios o ?piattaforma=android per vedere l'altra grafica, ?demo per gli interruttori senza iscriversi. */
(function () {
  var SUP = 'https://qmjqfgmvimsuxvghetgi.supabase.co', KEY = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
  var FN = SUP + '/functions/v1/push-invia';
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var Q = location.search, stadio = /\/stadio\//.test(location.pathname);
  var ua = navigator.userAgent || '';
  var ios = /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (/[?&]piattaforma=ios/.test(Q)) ios = true; else if (/[?&]piattaforma=android/.test(Q)) ios = false;
  var demo = /[?&]demo\b/.test(Q);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var TIPI = [
    ['formazione', 'Formazione', '3 ore e 1 ora prima dell\'inizio della giornata', true],
    ['risultati', 'Risultati', 'Quando escono i risultati della tua partita', true],
    ['giornale', 'Giornale', 'Quando esce il nuovo numero', true],
    ['curva', 'Curva', 'Quando qualcuno risponde ai tuoi cori', true],
    ['menzioni', 'Menzioni', 'Quando qualcuno ti tagga in Curva, anche Girrr Sport e il Giornale', true], /* 5.7: funziona dopo rilascio/menzioni/menzioni.sql */
    ['applausi', 'Applausi', 'Quando applaudono un tuo coro', false],
    ['derby', 'Derby', 'Sfide ricevute e risposte alle tue', true],
    ['totogirrr', 'Totogirrr', 'Prestiti da approvare e movimenti', true]
  ];
  var pref = {}, attivo = false, sub = null, box = null, occupato = false;
  TIPI.forEach(function (t) { pref[t[0]] = t[3]; });

  function chi() { try { var o = JSON.parse(localStorage.getItem('fg') || '{}'); return o && o.team && o.code ? o : null; } catch (e) { return null; } }
  function rpc(nome, corpo) {
    return fetch(SUP + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.text().then(function (x) { var j = null; try { j = x ? JSON.parse(x) : null; } catch (e) {} if (!r.ok) throw new Error(j && j.message ? j.message : 'Errore di rete'); return j; }); });
  }
  function funzione(corpo) {
    return fetch(FN, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.errore || 'Errore di rete'); return j; }); });
  }
  function chiaveBin(b64) {
    var p = '='.repeat((4 - b64.length % 4) % 4), s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function E(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function stile() {
    var acc = stadio ? '#ffd166' : '#d62839', suAcc = '#fff'; /* pallino sempre bianco, anche sull'oro (Gianluca) */
    var s = document.createElement('style');
    s.textContent =
      '.pt{margin-top:6px}.pt p.pt-nota{color:var(--v53-muted,#bfe3ff);font-size:13px;line-height:1.45;margin:8px 0 0}' +
      '.pt-msg{font-size:13px;font-weight:700;margin-top:10px;min-height:1px;transition:opacity .3s}.pt-msg.ko{color:#ff8a95}.pt-msg.ok{color:#7be495}' +
      '.pt-row{display:flex;align-items:center;gap:12px;width:100%}.pt-row .pt-t{flex:1;min-width:0}.pt-row b{display:block;font-weight:800}.pt-row small{display:block;opacity:.75;font-size:12.5px;line-height:1.35;margin-top:1px}' +
      '.pt-list{transition:opacity .35s ease}.pt-list.spento{opacity:.45;pointer-events:none}' +
      '.pt-btn{margin-top:12px;font:inherit;font-weight:800;font-size:13px;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:inherit;cursor:pointer}' +
      '.pt-passi{margin:8px 0 0 18px;font-size:13.5px;line-height:1.5}.pt-passi li{margin:3px 0}' +
      /* iPhone: elenco a gruppi e interruttori iOS */
      '.pt-ios .pt-group{background:rgba(255,255,255,.07);border-radius:12px;overflow:hidden;margin-top:12px}' +
      '.pt-ios .pt-row{padding:11px 14px;min-height:52px;box-sizing:border-box;position:relative}' +
      '.pt-ios .pt-row+.pt-row::before{content:"";position:absolute;top:0;left:14px;right:0;height:.5px;background:rgba(255,255,255,.18)}' +
      '.pt-ios .pt-row b{font-weight:600;font-size:16px}' +
      '.pt-ios .pt-sw{flex:none;position:relative;width:51px;height:31px;border-radius:16px;border:0;padding:0;cursor:pointer;background:rgba(120,120,128,.36);transition:background-color .25s ease}' +
      '.pt-ios .pt-sw::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 3px 1px rgba(0,0,0,.06);transition:transform .25s cubic-bezier(.3,.7,.4,1)}' +
      '.pt-ios .pt-sw[aria-checked=true]{background:' + acc + '}' + '.pt-ios .pt-sw[aria-checked=true]::after{transform:translateX(20px)}' +
      /* Android: righe Material e interruttori Material 3 */
      '.pt-and .pt-group{margin-top:8px}.pt-and .pt-row{padding:12px 2px;min-height:56px;box-sizing:border-box}' +
      '.pt-and .pt-row b{font-weight:600;font-size:16px;letter-spacing:.01em}' +
      '.pt-and .pt-sw{flex:none;position:relative;width:52px;height:32px;border-radius:16px;padding:0;cursor:pointer;box-sizing:border-box;border:2px solid #938f99;background:rgba(54,52,59,.6);transition:background-color .2s,border-color .2s}' +
      '.pt-and .pt-sw::after{content:"";position:absolute;top:50%;left:6px;width:16px;height:16px;border-radius:50%;background:#938f99;transform:translateY(-50%);transition:left .2s cubic-bezier(.2,0,0,1),width .2s,height .2s,background-color .2s}' +
      '.pt-and .pt-sw[aria-checked=true]{background:' + acc + ';border-color:' + acc + '}' +
      '.pt-and .pt-sw[aria-checked=true]::after{left:22px;width:24px;height:24px;background:' + suAcc + '}' +
      '.pt-and .pt-sw:active::after{width:28px;height:28px}.pt-and .pt-sw[aria-checked=true]:active::after{left:20px}' +
      '.pt-sw:focus-visible{outline:2px solid #ffd166;outline-offset:3px}' +
      '@media (prefers-reduced-motion: reduce){.pt-sw,.pt-sw::after,.pt-list{transition:none!important}}';
    document.head.appendChild(s);
  }

  function interruttore(id, acceso, etichetta) {
    return '<button type="button" class="pt-sw" role="switch" data-k="' + id + '" aria-checked="' + (acceso ? 'true' : 'false') + '" aria-label="' + E(etichetta) + '"></button>';
  }
  function messaggio(t, tipo) { var m = box && box.querySelector('.pt-msg'); if (m) { m.textContent = t || ''; m.className = 'pt-msg' + (tipo ? ' ' + tipo : ''); } }

  function disegna(stato) {
    var h = '';
    if (stato === 'nonsupportato') {
      h = '<p class="pt-nota">Questo browser non può ricevere notifiche. Su iPhone servono iOS 16.4 o successivo e O Girrr aggiunto alla schermata Home; su Android va bene Chrome.</p>';
    } else if (stato === 'iphone-home') {
      h = '<p class="pt-nota">Su iPhone le notifiche arrivano solo se apri O Girrr dalla schermata Home:</p><ol class="pt-passi">' +
        '<li>In Safari tocca <b>Condividi</b> (il quadrato con la freccia).</li><li>Scegli <b>Aggiungi alla schermata Home</b>.</li>' +
        '<li>Apri O Girrr dalla nuova icona e torna qui: comparirà l\'interruttore.</li></ol>';
    } else if (stato === 'ospite') {
      h = '<p class="pt-nota">Per ricevere gli avvisi entra con la tua squadra: nello <a href="' + ROOT + 'index.html" style="color:inherit;font-weight:800">Spogliatoio</a> scegli la squadra e scrivi il codice.</p>';
    } else if (stato === 'bloccate') {
      h = '<p class="pt-nota">Le notifiche di O Girrr sono bloccate su questo telefono. ' + (ios ? 'Riattivale da Impostazioni › Notifiche › O Girrr, poi torna qui.' : 'Riattivale dal lucchetto accanto all\'indirizzo (o da Impostazioni › App › O Girrr › Notifiche), poi torna qui.') + '</p>';
    } else {
      h = '<div class="pt-group"><div class="pt-row"><div class="pt-t"><b>Avvisi su questo telefono</b><small>' + (attivo ? 'Attivi: scegli quali ricevere' : 'Spenti') + '</small></div>' + interruttore('tutti', attivo, 'Avvisi su questo telefono') + '</div></div>' +
        '<div class="pt-list' + (attivo ? '' : ' spento') + '"><div class="pt-group">' +
        TIPI.map(function (t) { return '<div class="pt-row"><div class="pt-t"><b>' + t[1] + '</b><small>' + t[2] + '</small></div>' + interruttore(t[0], pref[t[0]], t[1]) + '</div>'; }).join('') +
        '</div></div>' + (attivo && !demo ? '<button type="button" class="pt-btn" id="pt-prova">Manda una notifica di prova</button>' : '') +
        (demo ? '<p class="pt-nota">Prova della grafica: gli interruttori non iscrivono il telefono.</p>' : '');
    }
    box.innerHTML = '<h3>Notifiche sul telefono</h3><div class="pt ' + (ios ? 'pt-ios' : 'pt-and') + '">' + h + '<div class="pt-msg" role="status" aria-live="polite"></div></div>';
    Array.prototype.forEach.call(box.querySelectorAll('.pt-sw'), function (b) { b.onclick = function () { cambia(b.dataset.k, b); }; });
    var pr = box.querySelector('#pt-prova'); if (pr) pr.onclick = prova;
  }

  function cambia(k, b) {
    if (occupato) return;
    var nuovo = b.getAttribute('aria-checked') !== 'true';
    if (demo) {
      if (k === 'tutti') { attivo = nuovo; disegna('ok'); } else { pref[k] = nuovo; b.setAttribute('aria-checked', String(nuovo)); }
      return;
    }
    if (k === 'tutti') return nuovo ? accendi() : spegni();
    var vecchio = pref[k]; pref[k] = nuovo; b.setAttribute('aria-checked', String(nuovo));
    var c = chi();
    rpc('push_preferenze', { p_team: c.team, p_code: c.code, p_endpoint: sub.endpoint, p_pref: pref }).then(function () { messaggio(''); })
      .catch(function (e) { pref[k] = vecchio; b.setAttribute('aria-checked', String(vecchio)); messaggio('Non salvato: ' + e.message, 'ko'); });
  }

  function registrazione() {
    return new Promise(function (ok, ko) {
      if (navigator.serviceWorker.controller) return navigator.serviceWorker.ready.then(ok, ko);
      navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT, updateViaCache: 'none' }).then(function () { return navigator.serviceWorker.ready; }).then(ok, ko);
    });
  }

  function accendi() {
    var c = chi(); if (!c) return disegna('ospite');
    occupato = true; messaggio('Attivo…');
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { occupato = false; return disegna(perm === 'denied' ? 'bloccate' : 'ok'); }
      return Promise.all([registrazione(), funzione({ chiave: true })]).then(function (x) {
        var reg = x[0], pub = x[1].pub;
        return reg.pushManager.getSubscription().then(function (s) {
          return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBin(pub) });
        });
      }).then(function (s) {
        sub = s;
        return rpc('push_iscrivi', { p_team: c.team, p_code: c.code, p_sub: s.toJSON(), p_pref: pref, p_piattaforma: ios ? 'ios' : (/Android/.test(ua) ? 'android' : 'pc') });
      }).then(function (r) {
        attivo = true; occupato = false; if (r && r.pref) Object.keys(r.pref).forEach(function (k) { pref[k] = r.pref[k]; });
        disegna('ok'); messaggio('Avvisi attivi su questo telefono.', 'ok');
      });
    }).catch(function (e) { occupato = false; disegna('ok'); messaggio('Non è stato possibile attivarli: ' + e.message, 'ko'); });
  }

  function spegni() {
    var c = chi(); occupato = true;
    var fine = function () { attivo = false; occupato = false; sub = null; disegna('ok'); messaggio('Avvisi spenti su questo telefono.'); };
    var p = sub ? rpc('push_cancella', { p_team: c.team, p_code: c.code, p_endpoint: sub.endpoint }).catch(function () {}) : Promise.resolve();
    p.then(function () { return sub ? sub.unsubscribe().catch(function () {}) : null; }).then(fine, fine);
  }

  function prova() {
    var c = chi(); if (!c || !sub) return;
    messaggio('Mando la prova…');
    funzione({ prova: true, team: c.team, code: c.code, endpoint: sub.endpoint })
      .then(function (r) { messaggio(r.esito === 'ok' ? 'Inviata: arriva tra pochi secondi.' : 'Non arrivata (' + r.esito + '). Prova a spegnere e riaccendere.', r.esito === 'ok' ? 'ok' : 'ko'); })
      .catch(function (e) { messaggio(e.message, 'ko'); });
  }

  function avvia() {
    var pannelli = document.querySelectorAll('.v53-panel'), i;
    for (i = 0; i < pannelli.length; i++) { var t = pannelli[i].querySelector('h3'); if (t && /Notifiche sul telefono/i.test(t.textContent)) { box = pannelli[i]; break; } }
    if (!box) { box = document.createElement('div'); box.className = 'v53-panel'; var m = document.querySelector('main') || document.body; m.appendChild(box); }
    stile();
    if (demo) return disegna('ok');
    var supporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (ios && !standalone) return disegna(supporta || /iP(hone|od|ad)/.test(ua) ? 'iphone-home' : 'nonsupportato');
    if (!supporta) return disegna('nonsupportato');
    var c = chi(); if (!c) return disegna('ospite');
    if (Notification.permission === 'denied') return disegna('bloccate');
    disegna('ok'); messaggio('Controllo…');
    registrazione().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (s) {
      if (!s || Notification.permission !== 'granted') { messaggio(''); return; }
      return rpc('push_stato', { p_team: c.team, p_code: c.code, p_endpoint: s.endpoint }).then(function (r) {
        if (r && r.iscritto) { sub = s; attivo = true; Object.keys(r.pref || {}).forEach(function (k) { pref[k] = r.pref[k]; }); }
        disegna('ok');
      });
    }).catch(function () { disegna('ok'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
