/* O Girrr · Versioni (Claude, 9 novembre 2026, richiesta di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/versioni.js). Legge versioni.json (stessa cartella), quindi la pagina
   si aggiorna da sola quando un rilascio aggiunge una versione.
   - In versioni.html (Lega e Stadio) disegna la pagina: interruttore «Messaggio / Changelog» e una scheda per versione.
   - Nella Home mostra «È uscita la 5.6 · Scopri le novità» per 3 visite o finché non lo tocchi.
   - Nella Home, in fondo a destra sopra gli sponsor: una piccola pillola «V5.6 ›» cliccabile, sempre. */
(function () {
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var TIPO = { grande: 'Aggiornamento grande', medio: 'Aggiornamento', minore: 'Aggiornamento minore', storia: 'Le origini' };
  var ridotto = false; try { ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* Le emoji a inizio e fine riga restano attaccate alla parola vicina (spazio che non va a capo):
     così non resta mai una coppa da sola su una riga (Gianluca) */
  var EMO = '(?:\\p{Extended_Pictographic}|\\uFE0F|\\u200D)+';
  function legaEmoji(s) {
    try {
      return String(s == null ? '' : s)
        .replace(new RegExp('[ \\t]+(' + EMO + ')', 'gu'), '\u00a0$1')
        .replace(new RegExp('(^|\\n)(' + EMO + ')[ \\t]+', 'gu'), '$1$2\u00a0');
    } catch (e) { return s; }
  }
  function grassetto(s) { s = legaEmoji(s); return E(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?]|$)/g, '$1<i>$2</i>'); }
  function data(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? (+p[2]) + ' ' + MESI[+p[1] - 1] + ' ' + p[0] : ''; }
  function periodo(x) {
    if (!x.fino) return (x.circa ? 'circa ' : '') + data(x.data);
    var a = x.data.split('-'), b = x.fino.split('-');
    return (x.circa ? 'Tra il ' + (+a[2]) + ' e il ' : (+a[2]) + '-') + (+b[2]) + ' ' + MESI[+b[1] - 1] + ' ' + b[0];
  }
  function carica() { return fetch(ROOT + 'versioni.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function stile() {
    var acc = stadio ? '#ffd166' : '#d62839', suAcc = stadio ? '#1d2a52' : '#fff';
    var s = document.createElement('style');
    s.textContent =
      '.vv-intro{color:var(--sub,#bfe3ff);font-weight:600;font-size:14px;line-height:1.5;margin:0 0 14px}' +
      '.vv-seg{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);margin-bottom:14px}' +
      '.vv-seg button{font:inherit;font-weight:800;font-size:13px;border:0;border-radius:999px;padding:8px 16px;cursor:pointer;color:inherit;background:transparent;transition:background-color .35s,color .35s}' +
      '.vv-seg button[aria-pressed=true]{background:' + acc + ';color:' + suAcc + '}' +
      '.vv-v{margin:0 0 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);' +
      (stadio ? 'border-left:6px solid ' + acc + ';border-radius:12px;' : 'border-left:8px solid ' + acc + ';border-radius:4px 14px 14px 4px;') + 'overflow:hidden}' +
      '.vv-v.storia{border-left-color:rgba(255,255,255,.35)}' +
      '.vv-h{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;padding:14px 16px;cursor:pointer}' +
      '.vv-n{flex:none;min-width:54px;text-align:center;font-weight:900;font-size:' + (stadio ? '24px;font-family:Lobster,cursive;font-weight:400' : '22px') + ';color:' + acc + ';line-height:1}' +
      '.vv-v.storia .vv-n{font-size:15px;color:inherit}' +
      '.vv-t{flex:1;min-width:0}.vv-t b{display:block;font-weight:900;font-size:16px;line-height:1.25' + (stadio ? ';font-family:Lobster,cursive;font-weight:400;font-size:19px' : '') + '}' +
      '.vv-t small{display:block;color:var(--sub,#bfe3ff);font-weight:700;font-size:12px;margin-top:3px}' +
      '.vv-f{flex:none;width:22px;height:22px;transition:transform .35s ease;opacity:.8}.vv-v.aperta .vv-f{transform:rotate(180deg)}' +
      '.vv-c{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s ease}.vv-v.aperta .vv-c{grid-template-rows:1fr}' +
      '.vv-c>div{overflow:hidden}.vv-in{padding:0 16px 16px;box-sizing:border-box;overflow:hidden;transition:opacity .2s ease,height .4s ease}' +
      '.vv-msg{white-space:pre-line;overflow-wrap:anywhere;font-size:15px;line-height:1.55;font-weight:500;background:rgba(0,0,0,.18);border-radius:14px;padding:12px 14px}' +
      '.vv-msg b{font-weight:900}' +
      '.vv-area{margin-top:12px}.vv-area:first-child{margin-top:0}.vv-area h4{margin:0 0 4px;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:' + (stadio ? acc : 'var(--hi,#ffd166)') + '}' +
      '.vv-area h4{font-family:Inter,system-ui,sans-serif!important}.vv-area ul{margin:0;padding-left:18px}.vv-area li{font-size:14px;line-height:1.5;margin:3px 0}' +
      '.vv-leg{margin-top:18px;font-size:12.5px;line-height:1.55;color:var(--sub,#bfe3ff);font-weight:600}.vv-leg b{color:var(--chiaro,#fbf6ec)}' +
      '.vv-fade{transition:opacity .25s ease}.vv-fade.via{opacity:0}' +
      '@media (prefers-reduced-motion: reduce){.vv-c,.vv-f,.vv-seg button,.vv-fade,.vv-in{transition:none!important}}';
    document.head.appendChild(s);
  }

  function pagina(box) {
    stile();
    var modo = 'messaggio';
    try { modo = localStorage.getItem('girrr_versioni_modo') || 'messaggio'; } catch (e) {}
    box.innerHTML = '<p class="vv-intro">Tutte le versioni di O Girrr, dalla più recente. «Messaggio» è l\'annuncio per il gruppo, «Changelog» l\'elenco dei cambiamenti.</p>' +
      '<div class="vv-seg" role="group" aria-label="Come leggere le versioni"><button type="button" data-m="messaggio">Messaggio</button><button type="button" data-m="changelog">Changelog</button></div>' +
      '<div class="vv-lista vv-fade"><p class="vv-intro">Carico le versioni…</p></div>' +
      '<p class="vv-leg"><b>Come si contano le versioni.</b> Aggiornamento grande: cambia il primo numero (6.0). Aggiornamento: cambia il secondo (5.7). Aggiornamento minore o correzione: cambia il terzo (5.6.1).</p>';
    var lista = box.querySelector('.vv-lista'), V = [], aperte = {};
    function corpo(x) {
      if (modo === 'messaggio') return '<div class="vv-msg">' + grassetto(x.messaggio || 'Dato non conservato') + '</div>';
      return (x.novita || []).map(function (a) {
        return '<div class="vv-area"><h4>' + E(a.area) + '</h4><ul>' + (a.voci || []).map(function (v) { return '<li>' + E(v) + '</li>'; }).join('') + '</ul></div>';
      }).join('');
    }
    function disegna() {
      Array.prototype.forEach.call(box.querySelectorAll('.vv-seg button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === modo)); });
      lista.innerHTML = V.map(function (x, i) {
        var ap = aperte[x.v] === undefined ? i === 0 : aperte[x.v];
        return '<section class="vv-v' + (x.tipo === 'storia' ? ' storia' : '') + (ap ? ' aperta' : '') + '" data-v="' + E(x.v) + '">' +
          '<button type="button" class="vv-h" aria-expanded="' + ap + '"><span class="vv-n">' + E(x.v) + '</span><span class="vv-t"><b>' + E(x.titolo || '') + '</b><small>' +
          E(TIPO[x.tipo] || 'Aggiornamento') + ' · ' + E(periodo(x)).replace(/^c/, 'C').replace(/^(\d)/, '$1') + (x.numero ? ' · Numero: ' + E(x.numero) : '') + '</small></span>' +
          '<svg class="vv-f" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<div class="vv-c"><div><div class="vv-in">' + corpo(x) + '</div></div></div></section>';
      }).join('');
      Array.prototype.forEach.call(lista.querySelectorAll('.vv-v'), function (s) {
        s.querySelector('.vv-h').onclick = function () {
          var ap = !s.classList.contains('aperta'); aperte[s.dataset.v] = ap;
          s.classList.toggle('aperta', ap); this.setAttribute('aria-expanded', String(ap));
        };
      });
    }
    /* Messaggio ⇄ Changelog fluido (Gianluca): le testate restano ferme; nelle schede aperte il testo
       sfuma, si cambia e la scheda si allunga o si accorcia piano fino alla nuova altezza */
    function cambia() {
      Array.prototype.forEach.call(box.querySelectorAll('.vv-seg button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === modo)); });
      Array.prototype.forEach.call(lista.querySelectorAll('.vv-v'), function (sez) {
        var x = V.filter(function (y) { return y.v === sez.dataset.v; })[0], el = sez.querySelector('.vv-in');
        if (!x || !el) return;
        if (ridotto || !sez.classList.contains('aperta')) { el.innerHTML = corpo(x); return; }
        var h1 = el.offsetHeight;
        el.style.height = h1 + 'px'; el.style.opacity = '0';
        setTimeout(function () {
          el.innerHTML = corpo(x);
          el.style.height = 'auto'; var h2 = el.offsetHeight; el.style.height = h1 + 'px';
          void el.offsetHeight;
          el.style.height = h2 + 'px'; el.style.opacity = '1';
          setTimeout(function () { el.style.height = ''; }, 420);
        }, 200);
      });
    }
    Array.prototype.forEach.call(box.querySelectorAll('.vv-seg button'), function (b) {
      b.onclick = function () {
        if (b.dataset.m === modo) return;
        modo = b.dataset.m; try { localStorage.setItem('girrr_versioni_modo', modo); } catch (e) {}
        cambia();
      };
    });
    carica().then(function (j) {
      V = j.versioni || []; disegna();
      try { if (V[0]) localStorage.setItem('girrr_versione_vista', V[0].v); } catch (e) {}
    }).catch(function () { lista.innerHTML = '<p class="vv-intro">Le versioni non sono raggiungibili in questo momento. Riprova tra poco.</p>'; });
  }

  /* Home: avviso una volta per versione */
  function avvisoHome() {
    carica().then(function (j) {
      var x = (j.versioni || [])[0]; if (!x) return;
      inFondoHome(x);
      var vista = null; try { vista = localStorage.getItem('girrr_versione_vista'); } catch (e) {}
      if (vista === x.v) return;
      /* Si mostra al massimo 3 volte, o finché non lo tocchi */
      var k = 'girrr_versione_avvisi_' + x.v, n = 0;
      try { n = +localStorage.getItem(k) || 0; if (n >= 3) return; localStorage.setItem(k, String(n + 1)); } catch (e) {}
      var acc = stadio ? '#ffd166' : '#d62839';
      var a = document.createElement('a');
      a.href = 'versioni.html'; a.className = 'vv-avviso';
      a.innerHTML = '<span><b>È uscita la ' + E(x.v) + '</b> · ' + E(x.titolo || '') + '</span><i>Scopri le novità ›</i>';
      var s = document.createElement('style');
      s.textContent = '.vv-avviso{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;margin:0 0 14px;padding:12px 16px;text-decoration:none;color:inherit;' +
        'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);' + (stadio ? 'border-left:6px solid ' + acc + ';border-radius:12px;' : 'border-left:8px solid ' + acc + ';border-radius:4px 14px 14px 4px;') +
        'font-weight:600;font-size:14px;opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s}.vv-avviso.su{opacity:1;transform:none}.vv-avviso b{font-weight:900}' +
        '.vv-avviso i{font-style:normal;font-weight:900;font-size:12px;letter-spacing:.08em;color:' + acc + ';white-space:nowrap}' +
        '@media (prefers-reduced-motion: reduce){.vv-avviso{transition:none;transform:none}}';
      document.head.appendChild(s);
      var dove = document.querySelector('.hero');
      if (!dove || !dove.parentNode) return;
      dove.parentNode.insertBefore(a, dove.nextSibling);
      a.onclick = function () { try { localStorage.setItem('girrr_versione_vista', x.v); } catch (e) {} };
      requestAnimationFrame(function () { requestAnimationFrame(function () { a.classList.add('su'); }); });
    }).catch(function () {});
  }

  /* Pillola «V5.6 ›»: nella Home, in fondo a destra, subito sopra gli sponsor (Gianluca): si vede scorrendo in basso
     che versione hai, e toccandola si apre la pagina Versioni */
  function pillola(x) {
    var a = document.createElement('a'); a.className = 'vv-fondo'; a.href = 'versioni.html';
    a.textContent = 'V' + x.v + ' ›'; a.setAttribute('aria-label', 'Versione ' + x.v + ': tutte le versioni');
    a.style.cssText = 'display:block;width:max-content;margin:18px 0 10px auto;padding:7px 13px;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:inherit;opacity:.8;text-decoration:none;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(255,255,255,.06);transition:opacity .25s,background-color .25s';
    a.onmouseenter = function () { a.style.opacity = '1'; a.style.background = 'rgba(255,255,255,.14)'; };
    a.onmouseleave = function () { a.style.opacity = '.8'; a.style.background = 'rgba(255,255,255,.06)'; };
    return a;
  }
  function inFondoHome(x) {
    if (document.querySelector('.vv-fondo')) return;
    var sp = document.querySelector('.wrap > .sp') || document.querySelector('.sp') || document.querySelector('.foot');
    if (sp && sp.parentNode) sp.parentNode.insertBefore(pillola(x), sp);
  }
  function avvia() {
    var box = document.getElementById('versioni');
    if (box) pagina(box);
    else if (/\/girrr\/(index\.html)?$/.test(location.pathname)) avvisoHome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
