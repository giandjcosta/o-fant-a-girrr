/* O Girrr 6.5 · Studio della transizione B (Claude, 18 novembre 2026). SOLO anteprima, caricato da evento-loader.js
   quando l'indirizzo ha ?evento-intro=trasformazione&b=<variante>. Varianti: nuvola (E, Nuvola e polvere),
   nuvola-morbida (A), vento (D, Polvere nel vento), fumo (C, Fumo), nuvola-maskpos (solo per misurare).
   Facoltativo ?b-durata=3000 (1600–4500 ms) per provare durate diverse, ?b-leggero=1|0 per forzare la versione leggera.

   Sequenza: 1) le texture sono già decodificate (niente maschera che arriva a metà); 2) la vecchia Home viene fotografata;
   3) dentro il callback della View Transition si accende la skin e si aspetta che il tema abbia finito di riempire la Home
   (classe nt-cruscotto-pronto, al massimo 1,2 s), così la nuova Home non si ricompone durante l'effetto; 4) l'effetto parte;
   5) alla fine si tolgono strati, classi e nomi: nessun overlay resta sopra la pagina.
   Senza View Transitions: cortina di fumo con il cambio nascosto al centro. Con «riduci movimento»: cambio immediato. */
(function () {
  'use strict';
  var BASE = document.currentScript && document.currentScript.src ? document.currentScript.src : location.href;
  var VARIANTI = {
    nuvola: { durata: 3000, fx: 1, texture: ['nuvola.webp', 'polvere.webp'] },
    'nuvola-morbida': { durata: 3000, fx: 0, texture: ['nuvola-morbida.webp'] },
    'nuvola-maskpos': { durata: 3000, fx: 0, texture: ['nuvola.webp'] },
    vento: { durata: 3200, fx: 1, texture: ['vento.webp', 'polvere.webp'] },
    fumo: { durata: 3100, fx: 5, texture: ['fumo-a.webp', 'fumo-b.webp'] }
  };
  var RIPIEGO = { durata: 3100, fx: 5, texture: ['fumo-a.webp', 'fumo-b.webp'] };
  var h = document.documentElement;

  function precarica(lista) {
    return Promise.all(lista.map(function (f) {
      var im = new Image(); im.src = new URL(f, BASE).href;
      return (im.decode ? im.decode() : new Promise(function (ok) { im.onload = ok; })).catch(function () {});
    }));
  }
  /* I caratteri della skin (Barlow Condensed, Mr Dafoe, Yellowtail, Kaushan Script) vanno scaricati PRIMA della foto della nuova
     Home: altrimenti la transizione mostra i caratteri di riserva del browser (sull'iPhone il corsivo calligrafico di sistema). */
  var CARATTERI = ['italic 900 40px "Barlow Condensed"', 'italic 800 20px "Barlow Condensed"', '400 30px "Mr Dafoe"', '400 30px Yellowtail', '400 30px "Kaushan Script"'];
  function caratteri() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(CARATTERI.map(function (f) { return document.fonts.load(f, 'O GIRRR Notte Tropicale').catch(function () {}); }));
  }
  function entro(ms, p) { return Promise.race([p, new Promise(function (ok) { setTimeout(ok, ms); })]); }
  function strati(n) {
    var out = [];
    for (var i = 1; i <= n; i++) {
      var d = document.createElement('div');
      d.className = 'girrr-b-fx girrr-b-fx' + i; d.setAttribute('aria-hidden', 'true');
      document.documentElement.appendChild(d); out.push(d);
    }
    return out;
  }
  function cruscottoPronto() {
    if (!/\/girrr\/(?:index\.html)?$/.test(location.pathname)) return Promise.resolve();
    return new Promise(function (ok) {
      if (h.classList.contains('nt-cruscotto-pronto')) return ok();
      var mo = new MutationObserver(function () { if (h.classList.contains('nt-cruscotto-pronto')) { mo.disconnect(); ok(); } });
      mo.observe(h, { attributes: true, attributeFilter: ['class'] });
    });
  }
  function misura(nome) { try { performance.mark('girrr-b:' + nome); } catch (e) {} }

  /* accendi(cb): accende la skin e carica il suo script, cb quando lo script ha girato. fine(): lo stato finale. */
  function avvia(variante, accendi, fine) {
    var v = VARIANTI[variante];
    var ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vt = typeof document.startViewTransition === 'function';
    if (!v || ridotto) { h.classList.remove('girrr-b-senza-barra'); accendi(function () {}); fine(); return; }
    if (!vt) v = RIPIEGO;
    var q = new URLSearchParams(location.search), dur = Number(q.get('b-durata'));
    if (!(dur >= 1600 && dur <= 4500)) dur = v.durata;
    h.style.setProperty('--gb-durata', dur + 'ms');
    h.setAttribute('data-b', vt ? variante : 'ripiego');
    /* Schermi con molti pixel (TV, monitor 4K, iPad in alta densità): meno strati a tutto schermo, la parte che costa di più
       quando la GPU è debole. ?b-leggero=1 o 0 per forzarlo. */
    var px = innerWidth * innerHeight * Math.pow(window.devicePixelRatio || 1, 2), lg = q.get('b-leggero');
    var leggero = lg === '1' || (lg !== '0' && px > 3.5e6);
    if (leggero) h.setAttribute('data-b-leggero', '');
    if (leggero && v.fx === 1) v = { durata: v.durata, fx: 0, texture: v.texture.slice(0, 1) };
    h.classList.add('girrr-b');
    var fx = [];
    function pulisci() {
      fx.forEach(function (d) { d.remove(); });
      h.classList.remove('girrr-b', 'girrr-b-vecchia', 'girrr-b-nuova', 'girrr-b-ripiego');
      h.removeAttribute('data-b'); h.removeAttribute('data-b-leggero'); h.style.removeProperty('--gb-durata');
      misura('fine'); fine();
      if (h.classList.contains('girrr-b-senza-barra')) {
        var torna = function () { h.classList.remove('girrr-b-senza-barra'); ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach(function (e) { removeEventListener(e, torna, true); }); };
        ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach(function (e) { addEventListener(e, torna, { capture: true, passive: true }); });
      }
    }
    entro(2500, Promise.all([precarica(v.texture), caratteri()])).then(function () {
      if (!vt) {
        /* Ripiego: fumo e velo coprono il centro dell'effetto, il cambio avviene lì sotto. */
        h.classList.add('girrr-b-ripiego'); fx = strati(v.fx); misura('inizio');
        setTimeout(function () { accendi(function () {}); }, dur * 0.47);
        setTimeout(pulisci, dur + 60);
        return;
      }
      h.classList.add('girrr-b-vecchia');
      misura('foto');
      var t = document.startViewTransition(function () {
        h.classList.remove('girrr-b-vecchia'); h.classList.add('girrr-b-nuova');
        fx = strati(v.fx);
        return entro(1200, new Promise(function (ok) { accendi(ok); }).then(function () {
          return Promise.all([cruscottoPronto(), caratteri(), document.fonts ? document.fonts.ready : null]);
        }));
      });
      t.ready.then(function () { misura('inizio'); }, function () {});
      t.finished.then(pulisci, pulisci);
    });
  }
  window.OGirrrEntrataB = Object.freeze({ varianti: Object.keys(VARIANTI), avvia: avvia });
})();
