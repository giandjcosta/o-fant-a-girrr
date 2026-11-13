/* Curva · Uno stile per iPhone e uno per Android (Claude, 12 novembre 2026). Prototipo del Lab, il sito vero non cambia.
   La grafica e i movimenti sono in curva-os.css; questo script fa solo quello che il CSS da solo non può fare.
   1. Riconosce il telefono e scrive <html data-os="ios|android|altro">: iPhone e iPad → Liquid Glass, Android → Material 3,
      PC e il resto → la Curva di sempre. Per provare: ?os=ios, ?os=android, ?os=nessuno (la Curva di sempre anche sul telefono),
      la scelta resta ricordata; ?os=auto torna al riconoscimento.
   2. Quando cambi sezione (barra in basso) o scheda (in alto) segna il cambio per un attimo (data-cambio-nav, data-cambio-tabs),
      con la direzione (--os-dir: 1 avanti, -1 indietro) e da dove deve partire l'indicatore (--os-nav-dx, --os-tabs-dx, --os-tabs-s):
      così la pillola scivola dalla voce di prima alla nuova. La Curva ridisegna tutto anche dopo un applauso: senza questi segni
      le animazioni ripartirebbero ogni volta.
   3. All'apertura della pagina segna data-os-avvio per un attimo (entrata della barra e del contenuto).
   4. Solo iPhone: la barra in basso si rimpicciolisce quando scorri in giù e torna grande quando risali (data-giu), come in iOS 26.
   5. Solo Android: l'«onda» che parte dal punto toccato sui pulsanti (ripple di Material).
   Con «Riduci movimento» i punti 4 e 5 non partono, e il CSS spegne le animazioni nuove. */
(function () {
  var r = document.documentElement, os = null;
  try {
    var m = location.search.match(/[?&]os=(ios|android|nessuno|auto)\b/);
    if (m) { if (m[1] === 'auto') localStorage.removeItem('girrrOS'); else localStorage.setItem('girrrOS', m[1]); }
    os = localStorage.getItem('girrrOS');
  } catch (e) {}
  if (os === 'nessuno') os = 'altro';
  else if (os !== 'ios' && os !== 'android') {
    var u = navigator.userAgent || '';
    os = /Android/i.test(u) ? 'android'
      : (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) ? 'ios' : 'altro'; /* l'iPad si presenta come un Mac */
  }
  r.setAttribute('data-os', os);
  if (os === 'altro') return;

  var fermo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = {};
  function segna(nome, ms) {
    r.removeAttribute('data-' + nome);
    void r.offsetWidth; /* se arriva un secondo cambio subito dopo, l'animazione riparte da capo */
    r.setAttribute('data-' + nome, '');
    clearTimeout(timer[nome]);
    timer[nome] = setTimeout(function () { r.removeAttribute('data-' + nome); }, ms || 800);
  }
  segna('os-avvio', 1100);

  /* 2. Cambi di sezione e di scheda */
  var GRUPPI = [['nav', '#nav'], ['tabs', '.tabs']], prima = {};
  function foto(sel) {
    var riga = document.querySelector(sel);
    if (!riga) return null;
    var bb = riga.querySelectorAll('button'), on = riga.querySelector('button.on'), firma = [];
    for (var i = 0; i < bb.length; i++) firma.push(bb[i].getAttribute('data-v') || bb[i].textContent);
    if (!on) return null;
    return { firma: firma.join('|'), chi: on.getAttribute('data-v') || on.textContent, i: [].indexOf.call(bb, on), x: on.offsetLeft, w: on.offsetWidth };
  }
  function controlla() {
    GRUPPI.forEach(function (g) {
      var ora = foto(g[1]), pr = prima[g[0]];
      if (ora && pr && ora.firma === pr.firma && ora.chi !== pr.chi) {
        r.style.setProperty('--os-' + g[0] + '-dx', ((pr.x + pr.w / 2) - (ora.x + ora.w / 2)) + 'px');
        r.style.setProperty('--os-' + g[0] + '-s', (pr.w / Math.max(ora.w, 1)).toFixed(3));
        r.style.setProperty('--os-dir', ora.i > pr.i ? '1' : '-1');
        segna('cambio-' + g[0]);
      }
      if (ora) prima[g[0]] = ora;
    });
  }

  /* 4. iPhone: barra che si rimpicciolisce scorrendo in giù */
  var y0 = 0;
  function scorri() {
    var y = window.scrollY || 0, d = y - y0;
    if (Math.abs(d) < 8) return;
    if (d > 0 && y > 120) r.setAttribute('data-giu', ''); else r.removeAttribute('data-giu');
    y0 = y;
  }

  /* 5. Android: onda dal punto toccato */
  var ONDA = '.tabs button,.acts button,.btn:not(.postbtn),.seg button,.chips button';
  function onda(e) {
    var el = e.target.closest && e.target.closest(ONDA);
    if (!el) return;
    var cs = getComputedStyle(el), b = el.getBoundingClientRect(), s = Math.max(b.width, b.height) * 2.2, o = document.createElement('span');
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';
    o.className = 'os-onda';
    o.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - b.left - s / 2) + 'px;top:' + (e.clientY - b.top - s / 2) + 'px';
    el.appendChild(o);
    setTimeout(function () { o.remove(); }, 650);
  }

  function parti() {
    controlla();
    new MutationObserver(controlla).observe(document.body, { childList: true, subtree: true });
    if (fermo) return;
    if (os === 'ios') window.addEventListener('scroll', scorri, { passive: true });
    if (os === 'android') document.addEventListener('pointerdown', onda, { passive: true });
  }
  if (document.body) parti(); else document.addEventListener('DOMContentLoaded', parti);
})();
