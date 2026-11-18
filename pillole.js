/* Pillole fluide (Claude, 13 novembre 2026, versione 6.0.1). Richiesta di Gianluca: tutte le schede a pillola fluide come
   l'interruttore Campionato/Champions Cup del Tabellone.
   Va nella radice del sito (/o-fant-a-girrr/pillole.js), incluso da Girrr Sport e dalle altre schede dell'app (app.html),
   dall'Albo d'oro e da Totogirrr, in Lega e Stadio.
   Quando tocchi una pillola:
   - il colore scivola dalla pillola di prima a quella nuova (una pillola «fantasma» dentro la fila, che scorre con lei);
   - la fila resta dov'era (se la pagina l'ha ridisegnata e riportata all'inizio, torna al suo posto) e poi porta al centro,
     con calma, la pillola scelta;
   - il contenuto sotto la fila entra con una dissolvenza breve, invece di cambiare di colpo.
   Funziona con le pagine che ridisegnano tutto a ogni tocco: la fila si ritrova dopo il ridisegno per posizione.
   Con «riduci movimento» non c'è nessuna animazione: cambia solo il colore. */
(function () {
  if (window.__pillole) return; window.__pillole = 1;
  var FILE = '.seg,.at,.dtab,nav .nvi,.chips,.ptabs,#tabs,.pt-competition';
  /* 6.2.1 (Gianluca): menu dell'Albo e della Carriera (.oro-scroll), sottomenu dei Derby e pulsanti Campionato / Champions Cup dei Derby: il colore passa
     dalla pillola di prima alla nuova senza scivolare; le pillole restano ferme (sul telefono la scelta resta in vista). */
  /* 6.2.4 (Gianluca): anche le schede del Totogirrr (nav .nvi) sono pulsanti separati: il colore non scivola, passa con una
     dissolvenza; lo scorrimento della fila resta quello della 6.2.3 (mostra). */
  var FERME = '.at,.dtab,.pt-competition,.oro-scroll,nav .nvi';
  /* 6.5 (Gianluca): nella Carriera e nell'Albo (.oro-scroll) il colore torna a scivolare come nelle altre file; la fila resta
     ferma come dalla 6.2.1 (la sposta solo l'app). Nelle altre file ferme il colore passa con una dissolvenza. */
  var NOSCIVOLO = '.at,.dtab,.pt-competition,nav .nvi';
  /* 6.5: un tocco su una pillola nuova lo segna subito (in cattura, prima che la pagina ridisegni): le altre animazioni
     d'entrata (app.html, transizioni.js) per un attimo lasciano fare a pillole.js, così il contenuto non sparisce */
  window.addEventListener('click', function (ev) { var b = ev.target && ev.target.closest && ev.target.closest('button'), c = b && b.parentElement;
    if (c && c.matches && c.matches(FILE) && b.getAttribute('aria-pressed') !== 'true' && b.getAttribute('aria-selected') !== 'true' && !b.classList.contains('on')) window.__pilloleT = Date.now(); }, true);
  try { var _fs = document.createElement('style'); _fs.textContent = FERME + '{scroll-snap-type:none!important}'; (document.head || document.documentElement).appendChild(_fs); } catch (e) {}   /* l'aggancio riportava indietro la fila e l'ultima voce restava tagliata */
  var ridotto = function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  var EASE = 'cubic-bezier(.22,.61,.36,1)';
  function attiva(c) {
    for (var i = 0; i < c.children.length; i++) {
      var b = c.children[i];
      if (b.tagName === 'BUTTON' && !b.hidden && (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('on'))) return b;
    }
    return null;
  }
  function file() { return [].slice.call(document.querySelectorAll(FILE)); }
  function scorri(c) { return c.scrollWidth > c.clientWidth + 1; }
  function centra(c, b) {
    if (!scorri(c)) return;
    var r = b.getBoundingClientRect(), e = c.getBoundingClientRect();
    var to = Math.max(0, Math.min(c.scrollWidth - c.clientWidth, c.scrollLeft + (r.left - e.left) - (e.width - r.width) / 2));
    if (Math.abs(to - c.scrollLeft) > 1) c.scrollTo({ left: to, behavior: ridotto() ? 'auto' : 'smooth' });
  }
  /* 6.2.3 (Gianluca): nel Totogirrr la fila che scorre è il <nav>, non .nvi (largo quanto le schede, non scorre mai). La scheda
     toccata si sposta quanto basta per vedersi tutta, con un margine, senza andare al centro. */
  function fila(c) { return c.matches && c.matches('nav .nvi') ? c.parentElement : null; }
  function mostra(s, b, subito) {
    if (!scorri(s)) return;
    var r = b.getBoundingClientRect(), e = s.getBoundingClientRect(), m = 14, d = 0;
    if (r.left < e.left + m) d = r.left - e.left - m; else if (r.right > e.right - m) d = r.right - e.right + m;
    if (Math.abs(d) < 1) return;
    var to = Math.max(0, Math.min(s.scrollWidth - s.clientWidth, s.scrollLeft + d));
    if (subito || ridotto()) s.scrollLeft = to; else s.scrollTo({ left: to, behavior: 'smooth' });
  }
  function contenuto(c) {   /* quello che sta sotto la fila: i fratelli che seguono (senza il ticker e la schedina di Totogirrr) */
    var out = [], el = c.closest('nav') || c;
    for (var x = el.nextElementSibling; x; x = x.nextElementSibling) {
      if (x.hidden || /(^| )(tick|slip|cd-velo)( |$)/.test(x.className || '') || x.tagName === 'SCRIPT' || x.tagName === 'STYLE') continue;
      out.push(x);
    }
    return out.slice(0, 12);
  }
  window.addEventListener('click', function (ev) {   /* sulla finestra: prima anche degli script che fermano il tocco */
    var b = ev.target && ev.target.closest && ev.target.closest('button');
    if (!b || b.disabled) return;
    var c = b.parentElement;
    if (!c || !c.matches || !c.matches(FILE)) return;
    var a = attiva(c);
    if (!a || a === b) return;
    var tutte = file(), idx = tutte.indexOf(c), bi = [].indexOf.call(c.children, b), ai = [].indexOf.call(c.children, a);
    var cr = c.getBoundingClientRect(), r0 = a.getBoundingClientRect(), sl = c.scrollLeft;
    var cs = getComputedStyle(a), bg = cs.backgroundColor, rad = cs.borderRadius;
    var x0 = r0.left - cr.left + sl - c.clientLeft, y0 = r0.top - cr.top - c.clientTop;
    /* dopo il ridisegno della pagina (che avviene nello stesso tocco) */
    requestAnimationFrame(function () {
      var c2 = file()[idx];
      if (!c2) return;
      var n = attiva(c2);
      if (!n) return;
      /* 6.2.1: nelle file ferme (Albo, Carriera, Derby) la fila non viene riportata indietro e si sposta solo se la voce scelta
         è fuori vista: prima tre scorrimenti insieme (questo, l'app e il ritorno indietro) la fermavano a metà, con l'ultima voce tagliata */
      var ferma = c2.matches && c2.matches(FERME), _nv = fila(c2);
      if (_nv) mostra(_nv, n);   /* 6.2.3: Totogirrr, un solo codice muove la fila */
      else if (ferma) { var _r = n.getBoundingClientRect(), _e = c2.getBoundingClientRect(); if (!c2.matches('.oro-scroll') && (_r.left < _e.left - 1 || _r.right > _e.right + 1)) centra(c2, n); }   /* 6.2.2: Albo e Carriera le sposta solo l'app */
      else {
      /* la fila non torna all'inizio */
      if (scorri(c2) && c2.scrollLeft < sl - 2) { var sb = c2.style.scrollBehavior; c2.style.scrollBehavior = 'auto'; c2.scrollLeft = sl; c2.style.scrollBehavior = sb; }
      centra(c2, n);
      }
      if (ridotto()) return;
      /* il contenuto sotto entra con una dissolvenza */
      contenuto(c2).forEach(function (el) {
        /* 6.5 (Gianluca): fuori dal Totogirrr il contenuto entra con un rimbalzo morbido e più lungo, senza sparire */
        try { if (_nv) el.animate([{ opacity: 0.25, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
          else el.animate([{ opacity: 0.6, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(-3px)', offset: 0.62 }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.25,.8,.3,1)' }); } catch (e) {}
      });
      if (c2.matches && c2.matches(NOSCIVOLO)) return;
      /* il colore scivola dalla pillola di prima a quella nuova */
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return;
      var vecchia = c2.children[ai];
      if (vecchia && vecchia !== n) { vecchia.style.transition = 'none'; void vecchia.offsetWidth; vecchia.style.transition = ''; }
      if (getComputedStyle(c2).position === 'static') c2.style.position = 'relative';
      var c2r = c2.getBoundingClientRect(), r1 = n.getBoundingClientRect();
      var x1 = r1.left - c2r.left + c2.scrollLeft - c2.clientLeft, y1 = r1.top - c2r.top - c2.clientTop;
      var g = document.createElement('i');
      g.setAttribute('aria-hidden', 'true');
      g.style.cssText = 'position:absolute;left:0;top:0;margin:0;padding:0;pointer-events:none;z-index:0;will-change:transform,width;background:' + bg + ';border-radius:' + rad + ';width:' + r1.width + 'px;height:' + r1.height + 'px';
      c2.appendChild(g);   /* in fondo: se la pagina ridisegna la fila (dati appena arrivati) toglie solo lei, senza spostare le pillole */
      var kids = [].slice.call(c2.children).filter(function (k) { return k !== g; });
      kids.forEach(function (k) { if (getComputedStyle(k).position === 'static') { k.style.position = 'relative'; k.dataset.pillPos = '1'; } k.style.zIndex = '1'; });
      n.style.setProperty('background', 'transparent', 'important');
      n.style.setProperty('border-color', 'transparent', 'important');
      var finito = false, mo = null;
      var fine = function () {
        if (finito) return; finito = true; if (mo) mo.disconnect();
        n.style.transition = 'none';
        n.style.removeProperty('background'); n.style.removeProperty('border-color');
        void n.offsetWidth; n.style.transition = '';
        kids.forEach(function (k) { k.style.zIndex = ''; if (k.dataset.pillPos) { k.style.position = ''; delete k.dataset.pillPos; } });
        if (g.parentNode) g.parentNode.removeChild(g);
      };
      try {
        var an = g.animate([
          { transform: 'translate(' + x0 + 'px,' + y0 + 'px)', width: r0.width + 'px', height: r0.height + 'px' },
          { transform: 'translate(' + x1 + 'px,' + y1 + 'px)', width: r1.width + 'px', height: r1.height + 'px' }
        ], { duration: _nv ? 220 : 380, easing: EASE });   /* 6.2.3: nel Totogirrr più corto (Gianluca) */
        an.onfinish = fine; an.oncancel = fine;
        setTimeout(fine, 900);
        /* se la pagina ridisegna di nuovo durante l'animazione e toglie la pillola fantasma, si chiude subito */
        if (window.MutationObserver) { mo = new MutationObserver(function () { if (!g.isConnected || !n.isConnected) fine(); }); mo.observe(c2.parentNode || c2, { childList: true, subtree: true }); }
      } catch (e) { fine(); }
    });
  }, true);   /* in cattura: si legge la pillola di prima prima che la pagina ridisegni */
  /* all'apertura (anche da un collegamento che porta su una scheda in fondo alla fila) la pillola scelta è in vista */
  function inVista() {
    file().forEach(function (c) {
      var a = attiva(c), _s = fila(c); if (_s) { if (a) mostra(_s, a, true); return; }   /* 6.2.3: Totogirrr */
      if (!a || !scorri(c)) return;
      var r = a.getBoundingClientRect(), e = c.getBoundingClientRect();
      if (r.left >= e.left - 1 && r.right <= e.right + 1) return;
      var sb = c.style.scrollBehavior; c.style.scrollBehavior = 'auto';
      c.scrollLeft = Math.max(0, c.scrollLeft + (r.left - e.left) - (e.width - r.width) / 2); c.style.scrollBehavior = sb;
    });
  }
  window.addEventListener('load', function () { inVista(); setTimeout(inVista, 900); setTimeout(inVista, 2200); });
})();
