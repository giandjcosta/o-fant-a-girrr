/* O Girrr 6.6 · Icona dell'app a scelta: scudo o simbolo (Claude, 24 novembre 2026, decisione di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/icona66.js), incluso in ogni pagina subito dopo i link delle icone.
   - Imposta l'icona per «Aggiungi a Home» (apple-touch-icon su iPhone, manifest su Android e PC) secondo la scelta salvata.
   - Nella pagina Notifiche aggiunge il riquadro «Icona dell'app» con le due scelte.
   L'icona sulla schermata Home si fissa quando si aggiunge l'app: per cambiarla bisogna toglierla e aggiungerla di nuovo
   (su iPhone di sicuro). Lo dice il riquadro. Scelta solo in questo browser (memoria del browser, chiave «og_icona»). */
(function () {
  'use strict';
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var SCELTE = [['scudo', 'Scudo', 'Lo scudo della Lega, per sempre'], ['simbolo', 'Simbolo', 'Il simbolo con il pallone']];
  function scelta() { var v = 'scudo'; try { v = localStorage.getItem('og_icona') || 'scudo'; } catch (e) {} return v === 'simbolo' ? 'simbolo' : 'scudo'; }
  function applica() {
    var k = scelta();
    var a = document.querySelector('link[rel="apple-touch-icon"]'); if (a) a.href = ROOT + 'assets/icone/' + k + '-180.png';
    var m = document.querySelector('link[rel="manifest"]'); if (m) m.href = ROOT + (k === 'simbolo' ? 'manifest-simbolo.webmanifest' : 'manifest.webmanifest');
  }
  applica();
  if (!/\/notifiche\.html$/.test(location.pathname)) return;
  var stadio = /\/stadio\//.test(location.pathname), calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ios = /iP(hone|od|ad)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var app = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  function E(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stile() {
    var acc = stadio ? '#ffd166' : '#d62839', s = document.createElement('style');
    s.textContent = '.ic66-sc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}' +
      '.ic66-sc button{display:grid;justify-items:center;gap:6px;padding:12px 8px;border-radius:14px;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font:inherit;cursor:pointer;transition:border-color .25s ease,background-color .25s ease,transform .25s ease}' +
      '.ic66-sc button[aria-pressed=true]{border-color:' + acc + ';background:rgba(255,255,255,.12)}' +
      '.ic66-sc img{width:72px;height:72px;border-radius:17px;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
      '.ic66-sc b{font-weight:800}.ic66-sc small{opacity:.75;font-size:12px;line-height:1.3;text-align:center}' +
      '.ic66-nota{font-size:13px;line-height:1.45;opacity:.85;margin:10px 0 0}.ic66-ok{font-size:13px;font-weight:700;color:#7be495;margin-top:8px;min-height:1px;transition:opacity .3s}' +
      '@media(prefers-reduced-motion:reduce){.ic66-sc button{transition:none}}';
    document.head.appendChild(s);
  }
  function scheda(msg) {
    var k = scelta();
    return '<h3>Icona dell\'app</h3><p class="ic66-nota" style="margin-top:4px">Scegli l\'icona di O Girrr sulla schermata Home del telefono.</p>' +
      '<div class="ic66-sc" role="group" aria-label="Icona dell\'app">' + SCELTE.map(function (x) {
        return '<button type="button" data-ic66="' + x[0] + '" aria-pressed="' + (k === x[0]) + '"><img src="' + ROOT + 'assets/icone/' + x[0] + '-180.png" alt=""><b>' + x[1] + '</b><small>' + x[2] + '</small></button>';
      }).join('') + '</div>' +
      '<p class="ic66-nota">' + (app ? 'L\'icona sulla schermata Home resta quella di quando hai aggiunto l\'app. Per cambiarla: togli O Girrr dalla schermata Home, apri il sito ' + (ios ? 'in Safari e tocca Condividi › Aggiungi alla schermata Home.' : 'nel browser e aggiungilo di nuovo alla schermata Home.') :
        'Vale quando aggiungi O Girrr alla schermata Home' + (ios ? ' (Safari › Condividi › Aggiungi alla schermata Home).' : '.') + ' Se l\'app c\'è già, toglila e aggiungila di nuovo.') + '</p>' +
      '<div class="ic66-ok" role="status" aria-live="polite">' + E(msg || '') + '</div>';
  }
  function monta() {
    if (document.getElementById('ic66')) return true;
    var pan = [].filter.call(document.querySelectorAll('.v53-panel'), function (p) { var t = p.querySelector('h3'); return t && /Notifiche sul telefono/i.test(t.textContent); })[0];
    if (!pan) return false;
    var d = document.createElement('div'); d.className = 'v53-panel'; d.id = 'ic66'; d.innerHTML = scheda();
    pan.parentNode.insertBefore(d, pan.nextSibling);
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ic66]'); if (!b) return;
      try { localStorage.setItem('og_icona', b.dataset.ic66); } catch (x) {}
      applica(); d.innerHTML = scheda('Scelta salvata: ' + (b.dataset.ic66 === 'simbolo' ? 'Simbolo' : 'Scudo') + '.');
      var im = d.querySelector('[aria-pressed=true] img'); if (im && im.animate && !calmo) im.animate({ transform: ['scale(.85)', 'scale(1)'], opacity: [.6, 1] }, { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' });
    });
    return true;
  }
  function via() { stile(); if (monta()) return; var n = 0, t = setInterval(function () { if (monta() || ++n > 40) clearInterval(t); }, 150); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via); else via();
})();
