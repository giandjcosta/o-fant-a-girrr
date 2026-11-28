/* O Girrr · Home: la partita da guardare, la classifica breve e i numeri della stagione (Claude, 28 novembre 2026).
   Portati dalla skin Notte Tropicale nella grafica normale (Gianluca, 24 e 28 novembre 2026).
   Va in girrr/home-cruscotto.js, incluso dalla Home della Lega e da quella dello Stadio. Si mette sotto «Oggi al Girrr».

   - La partita da guardare (prossima giornata di Campionato), regola di Gianluca del 17 novembre:
     1. un Derby (rivalità forte da 80 in su o votata dai tifosi, mai se bocciata; nome del Derby se c'è);
     2. un sorpasso possibile: chi sta dietro, vincendo, raggiunge o supera l'altra (3 punti o meno), la coppia più in alto;
     3. altrimenti la partita più equilibrata, a parità la coppia più in alto.
     Tocco: Campo su quella partita.
   - Classifica breve, sempre 4 righe (Gianluca, 28 novembre): sul podio o 4ª → prime quattro con la tua evidenziata;
     dalla 5ª in giù → prime tre, «⋯», la tua riga evidenziata; ospite o senza squadra → prime quattro, nessuna evidenziata.
     Stessi criteri della Home: punti, fantapunti, differenza reti, gol fatti, ordine della lega.
   - Numeri della stagione: giornate, gol, gol a partita, pareggi (Campionato, risultati pubblicati).
   Livello sportivo: niente fantapunti nel testo. Dati: data.json con i soli risultati pubblicati (CVPUB), come la Home. */
(function () {
  'use strict';
  if (window.__homeCruscotto) return; window.__homeCruscotto = 1;
  var io = document.currentScript, ROOT = new URL('../', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DBU = 'https://qmjqfgmvimsuxvghetgi.supabase.co', DBK = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
  var ORD = ['The Blue brothers', 'Apo team', 'Mariana Coneja', 'stif dc', 'Real Madrink', 'Atletico ma non troppo', 'Oranje VC', 'AFA SELECCION', 'Grodah', 'WOA'];
  function E(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function CAP(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function kk(a, b) { return [a, b].map(function (x) { return String(x).toLowerCase(); }).sort().join('|'); }
  function mia() {
    try { if (sessionStorage.getItem('ospite')) return ''; } catch (e) {}
    try { var o = JSON.parse(localStorage.getItem('fg') || '{}'); return o && o.team && o.code ? o.team : ''; } catch (e) { return ''; }
  }
  function classifica(rounds) {
    var sq = {}; function r(n) { return sq[n] || (sq[n] = { n: n, pt: 0, fp: 0, gf: 0, gs: 0 }); }
    rounds.forEach(function (g) { g.m.forEach(function (m) {
      var a = r(m[0]), b = r(m[3]); if (m[4] === '-') return; var s = m[4].split('-').map(Number);
      [[a, s[0], s[1], m[1]], [b, s[1], s[0], m[2]]].forEach(function (x) { x[0].gf += x[1]; x[0].gs += x[2]; x[0].fp += +x[3] || 0; x[0].pt += x[1] > x[2] ? 3 : (x[1] === x[2] ? 1 : 0); });
    }); });
    var o = function (n) { var i = ORD.indexOf(n); return i < 0 ? 99 : i; };
    return Object.keys(sq).map(function (k) { return sq[k]; }).sort(function (x, y) {
      return y.pt - x.pt || y.fp - x.fp || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || o(x.n) - o(y.n);
    });
  }
  function derbyTifosi() {
    return Promise.race([
      fetch(DBU + '/rest/v1/rpc/derby_stato', { method: 'POST', headers: { apikey: DBK, Authorization: 'Bearer ' + DBK, 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (r) { return r.json(); }).then(function (r) {
          var o = { voti: {}, veto: {}, nomi: {} };
          (r.voti || []).forEach(function (v) { var k = kk(v.a, v.b); if (v.si > v.no) o.voti[k] = 1; else if (v.no > v.si) o.veto[k] = 1; });
          (r.sfide || []).slice().reverse().forEach(function (x) { if (x.stato === 'accettata' && x.nome_ok) { var k = kk(x.da, x.a); o.voti[k] = 1; delete o.veto[k]; o.nomi[k] = x.nome; } });
          return o;
        }),
      new Promise(function (ok) { setTimeout(function () { ok(null); }, 2500); })
    ]).catch(function () { return null; });
  }
  function partita(nx, cl, pos, DV) {
    var ptn = {}; cl.forEach(function (x) { ptn[x.n] = x.pt; });
    var gap = function (m) { return Math.abs((ptn[m[0]] || 0) - (ptn[m[3]] || 0)); };
    var alto = function (a, b) { return ((pos[a[0]] || 99) + (pos[a[3]] || 99)) - ((pos[b[0]] || 99) + (pos[b[3]] || 99)); };
    var RIV = {}; try { (window.NOV && window.NOV.riv || []).forEach(function (o) { RIV[kk(o.a, o.b)] = o; }); } catch (e) {}
    DV = DV || { voti: {}, veto: {}, nomi: {} };
    var derby = function (m) { var k = kk(m[0], m[3]), o = RIV[k]; return DV.veto[k] ? null : (DV.voti[k] || (o && o.r >= 80)) ? (DV.nomi[k] || (o && o.n) || '') || 'Derby' : null; };
    var der = nx.m.filter(derby).sort(alto), sorp = nx.m.filter(function (m) { return gap(m) <= 3; }).sort(alto);
    var bm = der[0] || sorp[0] || nx.m.slice().sort(function (a, b) { return gap(a) - gap(b) || alto(a, b); })[0];
    var dist = gap(bm), dietro = (ptn[bm[0]] || 0) < (ptn[bm[3]] || 0) ? bm[0] : bm[3], nome = derby(bm);
    var perche = nome ? (nome === 'Derby' ? 'Il Derby della giornata' : E(nome))
      : dist === 0 ? 'A pari punti: chi vince passa davanti'
      : dist <= 2 ? E(CAP(dietro)) + ' a ' + (dist === 1 ? 'un punto' : '2 punti') + ': vincendo fa il sorpasso'
      : dist === 3 ? E(CAP(dietro)) + ' a 3 punti: vincendo aggancia'
      : 'La sfida più equilibrata del turno';
    var quando = '';
    /* prima dell'inizio: quando si comincia; durante la giornata: «In campo adesso»; dopo, in attesa dei risultati: niente */
    try { if (window.NEXT && window.NEXT.n === nx.n) { var ora = Date.now();
      quando = ora < window.NEXT.t ? 'Si comincia ' + new Date(window.NEXT.t).toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : ora < window.NEXT.e ? 'In campo adesso' : ''; } } catch (e) {}
    var sq = function (t) { return '<div class="c67-sq"><b>' + E(CAP(t)) + '</b>' + (pos[t] ? '<i>' + pos[t] + 'ª</i>' : '') + '</div>'; };
    return '<a class="c67-card c67-match" href="campo.html?giornata=' + nx.n + '&amp;partita=' + nx.m.indexOf(bm) + '">' +
      '<small>La partita da guardare · ' + (nome ? 'Derby · ' : '') + nx.n + 'ª giornata</small>' + sq(bm[0]) + '<div class="c67-vs">contro</div>' + sq(bm[3]) +
      '<strong>' + perche + '</strong><span>Campionato · Serie A, giornata ' + E(nx.sa) + (quando ? ' · ' + E(quando) : '') + '</span>' +
      '<span class="c67-vai">Vai al Campo ›</span></a>';
  }
  function tabella(cl, last, me) {
    var mi = -1; cl.forEach(function (x, i) { if (x.n === me) mi = i; });
    var righe = mi >= 4 ? [0, 1, 2, -1, mi] : [0, 1, 2, 3];
    return '<a class="c67-card c67-cl" href="tabellone.html#lega-' + last.n + '"><small>Classifica · Dopo la ' + last.n + 'ª</small><ol>' +
      righe.filter(function (k) { return k < 0 || cl[k]; }).map(function (k) {
        if (k < 0) return '<li class="c67-gap" aria-hidden="true">⋯</li>';
        var x = cl[k], tu = k === mi;
        return '<li' + (tu ? ' class="tu"' : '') + '><em>' + (k + 1) + '</em><span>' + E(CAP(x.n)) + (tu ? ' <i class="c67-tu">Tu</i>' : '') + '</span><b>' + x.pt + '<small>pt</small></b></li>';
      }).join('') + '</ol><span class="c67-vai">Vedi tutta la classifica ›</span></a>';
  }
  function numeri(pl, last) {
    var gol = 0, par = 0, pp = 0;
    pl.forEach(function (g) { g.m.forEach(function (m) { if (m[4] === '-') return; var s = m[4].split('-').map(Number); gol += s[0] + s[1]; pp++; if (s[0] === s[1]) par++; }); });
    var media = String(Math.round(gol / Math.max(pp, 1) * 10) / 10).replace('.', ',');
    var t = function (v, l) { return '<p><b>' + v + '</b><em>' + l + '</em></p>'; };
    return '<a class="c67-card c67-num" href="tabellone.html?sezione=numeri"><small>Numeri della stagione · Dopo la ' + last.n + 'ª</small><div class="c67-grid">' +
      t(pl.length, pl.length === 1 ? 'Giornata' : 'Giornate') + t(gol, 'Gol') + t(media, 'Gol a partita') + t(par, par === 1 ? 'Pareggio' : 'Pareggi') +
      '</div><span class="c67-vai">Vedi tutti i numeri ›</span></a>';
  }
  function stile() {
    var acc = stadio ? '#ffd166' : '#d62839', s = document.createElement('style');
    s.textContent = '.c67{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0}.c67-match{grid-column:1/-1}' +
      '@media(max-width:700px){.c67{grid-template-columns:1fr}}' +
      '.c67-card{display:flex;flex-direction:column;gap:6px;padding:16px 18px;color:inherit;text-decoration:none;min-width:0;transition:transform .25s ease,background-color .25s ease;' +
      (stadio ? 'background:linear-gradient(150deg,rgba(255,209,102,.16),rgba(255,255,255,.05) 55%);border-left:6px solid #ffd166;border-radius:18px}'
              : 'background:rgba(255,255,255,.08);border-left:8px solid #d62839;border-radius:4px 14px 14px 4px}') +
      '.c67-card:hover{transform:translateY(-2px)}.c67-card:focus-visible{outline:3px solid #89d9ff;outline-offset:3px}' +
      '.c67-card>small{font:800 11px/1.25 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#ffd166}' +
      '.c67-sq{display:flex;align-items:baseline;justify-content:space-between;gap:10px;min-width:0}.c67-sq b{font:900 22px/1.15 Inter,system-ui,sans-serif;overflow-wrap:anywhere}' +
      '.c67-sq i,.c67-tu{font-style:normal;font-weight:800;border-radius:99px;background:' + acc + ';color:' + (stadio ? '#1d2a52' : '#fff') + '}' +
      '.c67-sq i{font-size:13px;padding:2px 9px;flex:none}.c67-vs{font-size:12px;opacity:.6;text-transform:uppercase;letter-spacing:.1em}' +
      '.c67-card strong{font-size:14.5px;line-height:1.35;margin-top:4px}.c67-card>span{font-size:13px;opacity:.78}' +
      '.c67-card .c67-vai{margin-top:auto;padding-top:6px;font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:1;color:' + (stadio ? '#ffd166' : '#fbf6ec') + '}' +
      '.c67-cl ol{list-style:none;margin:4px 0;padding:0;display:grid;gap:6px}' +
      '.c67-cl li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.07);border-radius:' + (stadio ? '12px' : '4px 10px 10px 4px') + '}' +
      '.c67-cl li em{font-style:normal;font-weight:900;font-size:15px;opacity:.7}.c67-cl li span{font-weight:800;font-size:15.5px;overflow-wrap:anywhere}' +
      '.c67-cl li b{font:900 18px Inter,system-ui,sans-serif;white-space:nowrap}.c67-cl li b small{font-size:11px;margin-left:3px;opacity:.7;text-transform:uppercase}' +
      '.c67-cl li.tu{background:' + (stadio ? 'rgba(255,209,102,.22)' : 'rgba(214,40,57,.35)') + '}.c67-cl li.tu em{opacity:1}' +
      '.c67-tu{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;margin-left:8px;padding:2px 7px;vertical-align:2px}' +
      '.c67-cl li.c67-gap{display:block;text-align:center;background:none;padding:0;font-size:20px;line-height:.8;opacity:.6;letter-spacing:.2em}' +
      '.c67-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:4px 0}' +
      '.c67-grid p{margin:0;padding:10px 12px;border-radius:' + (stadio ? '12px' : '4px 10px 10px 4px') + ';background:rgba(255,255,255,.07)}' +
      '.c67-grid b{display:block;font:900 28px/1 Inter,system-ui,sans-serif}.c67-grid em{font-style:normal;font-size:12.5px;opacity:.78}' +
      '.c67.entra>*{animation:c67in .45s cubic-bezier(.22,.61,.36,1) both}.c67.entra>*:nth-child(2){animation-delay:.06s}.c67.entra>*:nth-child(3){animation-delay:.12s}' +
      '@keyframes c67in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      'html.nt-cruscotto-pronto .c67{display:none}' +   /* con una skin che ha già il suo cruscotto non si doppia */
      '@media(prefers-reduced-motion:reduce){.c67.entra>*{animation:none}.c67-card{transition:none}.c67-card:hover{transform:none}}';
    document.head.appendChild(s);
  }
  function metti(html) {
    var dopo = document.querySelector('.wrap > section.v53-home'), prima = document.querySelector('.wrap > .lg-leghe');
    if (!dopo && !prima) return;
    var box = document.createElement('section'); box.className = 'c67' + (calmo ? '' : ' entra'); box.setAttribute('aria-label', 'Partita da guardare, classifica e numeri della stagione');
    box.innerHTML = html;
    if (dopo) dopo.parentNode.insertBefore(box, dopo.nextSibling); else prima.parentNode.insertBefore(box, prima);
  }
  function via() {
    if (document.querySelector('.c67')) return;
    Promise.all([fetch(ROOT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json(); }), derbyTifosi()]).then(function (x) {
      var d = window.CVPUB ? window.CVPUB(x[0]) : x[0];
      var L = (d.cal && d.cal.lega) || [], pl = L.filter(function (g) { return g.m.length && g.m.every(function (m) { return m[4] !== '-'; }); });
      if (!pl.length) return;
      var cl = classifica(pl), last = pl[pl.length - 1], pos = {};
      cl.forEach(function (c, i) { pos[c.n] = i + 1; });
      var nx = L.filter(function (g) { return g.m.length && g.m.every(function (m) { return m[4] === '-'; }); })[0];
      stile();
      metti((nx ? partita(nx, cl, pos, x[1]) : '') + tabella(cl, last, mia()) + numeri(pl, last));
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via); else via();
})();
