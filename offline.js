/* O Girrr · copia offline, lato pagina (Claude, 9 novembre 2026).
   Va nella radice del sito (/o-fant-a-girrr/offline.js), incluso da ogni pagina con <script src="…/offline.js" defer>.
   - Registra sw.js (che sta accanto a questo file).
   - Mostra un avviso in basso quando si sta guardando la copia salvata: «Offline · Copia di oggi alle 14:32».
   - Quando torna la rete: «Di nuovo online» con il pulsante Aggiorna.
   - Con la rete e la pagina aperta chiede al service worker di rinfrescare la copia (lui la rifà al massimo ogni 30 minuti).
*/
(function () {
  if (!('serviceWorker' in navigator) || window.__girrrOffline) return;
  window.__girrrOffline = 1;
  var io = document.currentScript, dir = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var copia = 0, ultimo = 0, stato = '', box = null, ridotto = false;
  try { ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function quando(t) {
    var d = new Date(t), ieri = new Date(Date.now() - 864e5);
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === new Date().toDateString()) return 'delle ' + hm;
    if (d.toDateString() === ieri.toDateString()) return 'di ieri, ' + hm;
    return 'del ' + d.getDate() + ' ' + MESI[d.getMonth()] + ', ' + hm;
  }
  /* Se in basso c'è una barra fissa (Curva, menu 5.5) l'avviso si mette sopra */
  function sopraLaBarra() {
    try {
      var el = document.elementFromPoint(innerWidth / 2, innerHeight - 4);
      while (el && el !== document.body && el !== document.documentElement) {
        if (el !== box && !(box && box.contains(el))) {
          var p = getComputedStyle(el).position;
          if (p === 'fixed' || p === 'sticky') { var r = el.getBoundingClientRect(); if (r.top > innerHeight / 2) return Math.round(innerHeight - r.top) + 10; }
        }
        el = el.parentElement;
      }
    } catch (e) {}
    return 0;
  }
  function stile() {
    if (document.getElementById('girrr-off-css')) return;
    var acc = stadio ? '#ffd166' : '#d62839';
    var s = document.createElement('style'); s.id = 'girrr-off-css';
    s.textContent =
      '.girrr-off{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
      'transform:translate(-50%,12px);opacity:0;transition:opacity .35s ease,transform .35s ease,bottom .3s ease;max-width:calc(100vw - 24px);' +
      'display:flex;align-items:center;gap:10px;padding:9px 10px 9px 14px;border-radius:999px;background:rgba(20,29,61,.94);' +
      'color:#fbf6ec;border:1px solid rgba(255,255,255,.2);box-shadow:0 10px 26px rgba(0,0,0,.4);' +
      'font:700 12.5px/1.3 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}' +
      '.girrr-off.su{opacity:1;transform:translate(-50%,0)}' +
      '.girrr-off i{flex:none;width:9px;height:9px;border-radius:50%;background:' + acc + ';box-shadow:0 0 8px ' + acc + '}' +
      '.girrr-off.on i{background:#7be495;box-shadow:0 0 8px #7be495}' +
      '.girrr-off span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.girrr-off b{font-weight:900}' +
      '@media (max-width:359px){.girrr-off{font-size:12px;gap:8px;padding-left:12px}}' +
      '.girrr-off button{flex:none;font:inherit;font-weight:900;cursor:pointer;border:0;border-radius:999px;padding:6px 11px;' +
      'background:' + acc + ';color:' + (stadio ? '#1d2a52' : '#fff') + '}' +
      '.girrr-off button.x{background:rgba(255,255,255,.12);color:#fbf6ec;padding:6px 9px}' +
      '@media (prefers-reduced-motion: reduce){.girrr-off{transition:opacity .2s linear;transform:translate(-50%,0)}}';
    document.head.appendChild(s);
  }

  /* Chiuso con la ✕: gli avvisi offline/online non tornano più finché l'app resta aperta (scheda o app chiusa = si riparte) */
  function zitto() { try { return sessionStorage.getItem('girrr_off_zitto') === '1'; } catch (e) { return false; } }
  function chiudi() { try { sessionStorage.setItem('girrr_off_zitto', '1'); } catch (e) {} nascondi(); }
  function mostra(tipo, testo, bottone) {
    if (zitto()) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { mostra(tipo, testo, bottone); }); return; }
    stile();
    if (!box) {
      box = document.createElement('div'); box.className = 'girrr-off'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    posiziona(); setTimeout(posiziona, 700); setTimeout(posiziona, 2500);
    stato = tipo;
    box.classList.toggle('on', tipo === 'online' || tipo === 'pronta');
    box.innerHTML = '<i></i><span>' + testo + '</span>' + (bottone ? '<button type="button">' + bottone + '</button>' : '') +
      '<button type="button" class="x" aria-label="Chiudi">✕</button>';
    var b = box.querySelectorAll('button');
    if (bottone) b[0].onclick = function () { location.reload(); };
    b[b.length - 1].onclick = tipo === 'pronta' ? nascondi : chiudi;
    requestAnimationFrame(function () { requestAnimationFrame(function () { box && box.classList.add('su'); }); });
    clearTimeout(mostra.t);
    if (tipo === 'pronta') mostra.t = setTimeout(nascondi, 6000);
    if (tipo === 'online') mostra.t = setTimeout(nascondi, 8000);
  }
  function posiziona() { if (!box) return; var su = sopraLaBarra(); box.style.bottom = su ? su + 'px' : ''; }
  window.addEventListener('resize', posiziona);
  function nascondi() {
    if (!box) return;
    var b = box; box = null; stato = '';
    b.classList.remove('su');
    setTimeout(function () { b.remove(); }, ridotto ? 220 : 380);
  }

  function aggiornaAvviso() {
    if (!navigator.onLine) {
      var t = copia || ultimo;
      mostra('offline', t ? '<b>Offline</b> · Copia ' + quando(t) : '<b>Offline</b> · Stai guardando la copia salvata');
    } else if (copia) {
      mostra('copia', '<b>Rete lenta</b> · Copia ' + quando(copia), 'Aggiorna');
    }
  }

  function chiediCopia(forza) {
    var c = navigator.serviceWorker.controller;
    if (!c || !navigator.onLine || document.hidden) return;
    c.postMessage({ tipo: 'girrr-aggiorna', forza: !!forza });
  }

  navigator.serviceWorker.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.tipo === 'girrr-stato' || d.tipo === 'girrr-copia') {
      var t = d.tipo === 'girrr-stato' ? d.copia : d.ora;
      if (d.ultimo) ultimo = d.ultimo;
      if (t && (!copia || t < copia)) copia = t;
      if (t || (d.ultimo && !navigator.onLine)) aggiornaAvviso();
    } else if (d.tipo === 'girrr-copia-pronta') {
      ultimo = d.ora;
      var primo = false;
      try { primo = !localStorage.getItem('girrr_offline_pronta'); localStorage.setItem('girrr_offline_pronta', String(d.ora)); } catch (x) {}
      if (primo && !stato) mostra('pronta', '<b>Copia offline pronta</b> · O Girrr si apre anche senza rete');
    }
  });

  window.addEventListener('offline', aggiornaAvviso);
  window.addEventListener('online', function () {
    if (stato === 'offline' || stato === 'copia') mostra('online', '<b>Di nuovo online</b>', 'Aggiorna');
    setTimeout(function () { chiediCopia(false); }, 3000);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) chiediCopia(false); });
  setInterval(function () { chiediCopia(false); }, 10 * 60 * 1000);

  function avvia(reg) {
    var c = navigator.serviceWorker.controller;
    if (c) c.postMessage({ tipo: 'girrr-stato' });
    aggiornaAvviso();
    /* Si aspetta che la pagina abbia finito di caricare, così la copia non le ruba la rete */
    setTimeout(function () { chiediCopia(false); }, 4000);
    /* Android (app installata): aggiornamento anche a app chiusa, quando il telefono lo concede */
    try {
      if (reg && reg.periodicSync && navigator.permissions) {
        navigator.permissions.query({ name: 'periodic-background-sync' }).then(function (p) {
          if (p.state === 'granted') reg.periodicSync.register('girrr-copia', { minInterval: 30 * 60 * 1000 }).catch(function () {});
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function registra() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(avvia, function () { avvia(null); });
      return;
    }
    navigator.serviceWorker.register(dir + 'sw.js', { scope: dir, updateViaCache: 'none' }).then(function (reg) {
      /* Primo arrivo: appena il service worker prende la pagina, si fa la prima copia */
      navigator.serviceWorker.addEventListener('controllerchange', function () { avvia(reg); }, { once: true });
      if (navigator.serviceWorker.controller) avvia(reg);
    }).catch(function () {});
  }
  if (document.readyState === 'complete') registra(); else window.addEventListener('load', registra);
})();
