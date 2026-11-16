/* Curva · Uno stile per iPhone e uno per Android (Claude, 12 novembre 2026). Prototipo del Lab, il sito vero non cambia.
   La grafica e i movimenti sono in curva-os.css; questo script fa solo quello che il CSS da solo non può fare.
   1. Riconosce il telefono e scrive <html data-os="ios|android|altro">: iPhone e iPad → Liquid Glass, Android → Material 3,
      PC e il resto → la Curva di sempre. Per provare: ?os=ios, ?os=android, ?os=nessuno (la Curva di sempre anche sul telefono),
      la scelta resta ricordata; ?os=auto torna al riconoscimento.
   2. Quando cambi sezione (barra in basso) o scheda (in alto) segna il cambio per un attimo (data-cambio-nav, data-cambio-tabs),
      con la direzione (--os-dir: 1 avanti, -1 indietro) e da dove deve partire l'indicatore (--os-nav-dx, --os-tabs-dx, --os-tabs-s):
      così la pillola scivola dalla voce di prima alla nuova. La Curva ridisegna tutto anche dopo un applauso: senza questi segni
      le animazioni ripartirebbero ogni volta.
   ChatGPT · 6.1.1: controlli solo dopo il render, riuniti nel prossimo fotogramma; nessuna misura forzata della radice.
   Il contenuto usa una sola transizione di 160 ms, anche su PC/TV. «Riduci movimento» viene rispettato anche se cambia a pagina aperta.
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
  r.setAttribute('data-curva-fluida', '611');

  var preferenza = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var fermo = preferenza && preferenza.matches, movimento = null, quadro = 0;
  var timer = {};
  function segna(nome, ms) {
    if (fermo) return;
    r.setAttribute('data-' + nome, '');
    clearTimeout(timer[nome]);
    timer[nome] = setTimeout(function () { r.removeAttribute('data-' + nome); }, ms || 220);
  }
  segna('os-avvio', 220);

  /* 2. Cambi di sezione e di scheda */
  var GRUPPI = [['nav', '#nav'], ['tabs', '#top .tabs'], ['profilo', '#vista .ptabs']], prima = {};
  function foto(sel) {
    var riga = document.querySelector(sel);
    if (!riga) return null;
    var bb = riga.querySelectorAll('button'), on = riga.querySelector('button.on'), firma = [];
    function chi(b) { return b.getAttribute('data-v') || b.getAttribute('data-f') || b.getAttribute('data-nf') || b.getAttribute('data-pt') || b.textContent; }
    for (var i = 0; i < bb.length; i++) firma.push(chi(bb[i]));
    if (!on) return null;
    return { firma: firma.join('|'), chi: chi(on), i: [].indexOf.call(bb, on), x: on.offsetLeft, w: on.offsetWidth };
  }
  function controlla() {
    quadro = 0;
    /* Tutte le letture precedono le scritture. Un controllo per fotogramma, solo dopo un render. */
    var fotoOra = GRUPPI.map(function (g) { return foto(g[1]); }), cambio = null;
    GRUPPI.forEach(function (g, i) {
      var ora = fotoOra[i], pr = prima[g[0]], tipo = g[0] === 'nav' ? 'nav' : 'tabs';
      if (ora && pr && ora.firma === pr.firma && ora.chi !== pr.chi) {
        r.style.setProperty('--os-' + tipo + '-dx', ((pr.x + pr.w / 2) - (ora.x + ora.w / 2)) + 'px');
        r.style.setProperty('--os-' + tipo + '-s', (pr.w / Math.max(ora.w, 1)).toFixed(3));
        r.style.setProperty('--os-dir', ora.i > pr.i ? '1' : '-1');
        segna('cambio-' + tipo);
        cambio = tipo;
      }
      prima[g[0]] = ora;
    });
    if (cambio) {
      if (movimento) movimento.cancel();
      var el = document.querySelector(cambio === 'tabs' ? '#vista .cv-flusso' : '#vista') || document.getElementById('vista');
      if (!fermo && el && el.animate) {
        var dir = r.style.getPropertyValue('--os-dir') === '-1' ? -1 : 1;
        movimento = el.animate([{ opacity: .78, transform: 'translateX(' + (dir * 6) + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  }
  function programma() { if (!quadro) quadro = requestAnimationFrame(controlla); }

  /* 4. iPhone: barra che si rimpicciolisce scorrendo in giù */
  var y0 = 0;
  function scorri() {
    if (fermo) return;
    var y = window.scrollY || 0, d = y - y0;
    if (Math.abs(d) < 8) return;
    if (d > 0 && y > 120) r.setAttribute('data-giu', ''); else r.removeAttribute('data-giu');
    y0 = y;
  }

  /* 5. Android: onda dal punto toccato */
  var ONDA = '.tabs button,.acts button,.btn:not(.postbtn),.seg button,.chips button';
  function onda(e) {
    if (fermo) return;
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
    programma();
    document.addEventListener('og:curva-disegnata', programma);
    window.addEventListener('resize', programma, { passive: true });
    function riduci(e) {
      fermo = e.matches;
      if (fermo) {
        if (movimento) movimento.cancel();
        ['cambio-nav', 'cambio-tabs', 'os-avvio', 'giu'].forEach(function (k) { r.removeAttribute('data-' + k); });
        document.querySelectorAll('.os-onda').forEach(function (e) { e.remove(); });
      }
    }
    if (preferenza) { if (preferenza.addEventListener) preferenza.addEventListener('change', riduci); else preferenza.addListener(riduci); }
    if (os === 'ios') window.addEventListener('scroll', scorri, { passive: true });
    if (os === 'android') document.addEventListener('pointerdown', onda, { passive: true });
  }
  if (document.body) parti(); else document.addEventListener('DOMContentLoaded', parti);
})();
