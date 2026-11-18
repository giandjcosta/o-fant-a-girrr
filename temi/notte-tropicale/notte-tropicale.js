/* O Girrr · Notte Tropicale, barra in basso (Claude, 17 novembre 2026; idea dal bozzetto di ChatGPT mostrato da Gianluca).
   Solo durante l'evento e solo sul telefono (il CSS la nasconde sopra i 760 px): Home, Tabellone, il pallone al centro per il
   Totogirrr, Curva e Giornale, nella cartella della grafica in cui sei (Lega o Stadio). Non cambia link, dati né pagine:
   aggiunge solo una scorciatoia. Non compare nella Curva (ha già la sua barra) e si nasconde quando c'è la schedina. */
(function () {
  'use strict';
  try {
    var p = location.pathname;
    /* ChatGPT 17/11/2026: forme visive anche nello Spogliatoio radice del Lab. Nessuna funzione o navigazione aggiuntiva. */
    if (!/\/girrr\//.test(p)) { forme(); return; }   /* Spogliatoio (index.html della radice, nel Lab e sul sito): solo le forme */
    if (!/\/girrr\/([a-z0-9-]+\.html)?$/.test(p)) return;          /* solo le pagine di Lega e Stadio, non lo Spogliatoio */
    var pag = (p.match(/\/([a-z0-9-]+\.html)$/) || [])[1] || 'index.html';
    if (pag === 'curva.html') return;
    /* grafica unica: il Campo ha la sua scelta Lega/Stadio nella pagina; durante l'evento resta Lega, senza salvare niente */
    if (/^campo/.test(pag)) {
      var lega = function () { if (document.body && document.body.dataset.skin && document.body.dataset.skin !== 'lega') document.body.dataset.skin = 'lega'; };
      if (document.body) lega(); else document.addEventListener('DOMContentLoaded', lega);
    }
    /* Home dal bozzetto (Gianluca, 17 novembre: «qualcosa del genere era carino, ma senza la barra in fondo»): sotto la foto le
       schede principali con l'icona, la partita in evidenza del prossimo turno, la classifica (prime quattro) e i numeri della
       stagione. Dati veri: data.json come la Home, stessi risultati pubblicati (CVPUB) e stessa classifica (stessi criteri). */
    if (pag === 'index.html') homeEvento();
    forme();
    /* la barra è messa da parte (Gianluca, 17 novembre): compare solo con ?evento-extra=barra */
    if (!/(^| )barra( |$)/.test(document.documentElement.getAttribute('data-event-extra') || '')) return;
    var I = {
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
      tab: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
      curva: '<path d="M4 5h16v10H9l-5 4z"/>',
      gio: '<path d="M5 4h11v16H6a2 2 0 0 1-2-2V6"/><path d="M16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3"/>',
      palla: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 15l2.5 4M9.5 15 7 19M8 10 3.5 8.5"/>'
    };
    var V = [['index.html', 'Home', 'home'], ['tabellone.html', 'Tabellone', 'tab'], ['totogirrr.html', 'Totogirrr', 'palla'],
             ['curva.html', 'Curva', 'curva'], ['giornale.html', 'Giornale', 'gio']];
    var nav = document.createElement('nav');
    nav.className = 'nt-barra'; nav.setAttribute('aria-label', 'Notte Tropicale · Scorciatoie');
    nav.innerHTML = V.map(function (v) {
      var qui = v[0] === pag;
      return '<a href="' + v[0] + '"' + (v[2] === 'palla' ? ' class="nt-palla"' : '') + (qui ? ' aria-current="page"' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[v[2]] + '</svg>' +
        '<span>' + v[1] + '</span></a>';
    }).join('');
    function metti() {
      if (document.querySelector('.nt-barra')) return;
      document.body.appendChild(nav);
      document.documentElement.classList.add('nt-con-barra');
      requestAnimationFrame(function () { requestAnimationFrame(function () { nav.classList.add('su'); }); });
    }
    if (document.body) metti(); else document.addEventListener('DOMContentLoaded', metti);
  } catch (e) {}
  function homeEvento() {
    var ESC = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var CAP = function (s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); };
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
      home: SV('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>'),
      tab: SV('<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>'),
      car: SV('<path d="M5 20V12M10 20V8M15 20v-6M20 20V4"/>'),
      toto: SV('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/>'),
      spo: SV('<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
      tv: SV('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="m8 3 4 4 4-4"/>'),
      gio: SV('<path d="M5 4h11v16H6a2 2 0 0 1-2-2V6"/><path d="M16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3"/>'),
      albo: SV('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M12 13v3M8 20h8M10 16h4v4h-4z"/><path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3"/>'),
      curva: SV('<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
      noti: SV('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>')
    };
    /* stessa classifica della Home (index.html): punti, poi fantapunti, differenza reti, gol fatti, ordine della lega */
    var ORD = ["The Blue brothers", "Apo team", "Mariana Coneja", "stif dc", "Real Madrink", "Atletico ma non troppo", "Oranje VC", "AFA SELECCION", "Grodah", "WOA"];
    function classifica(rounds) {
      var sq = {}; function r(n) { return sq[n] || (sq[n] = { n: n, g: 0, pt: 0, fp: 0, gf: 0, gs: 0 }); }
      rounds.forEach(function (g) { g.m.forEach(function (m) {
        var a = r(m[0]), b = r(m[3]); if (m[4] === '-') return; var s = m[4].split('-').map(Number);
        [[a, s[0], s[1], m[1]], [b, s[1], s[0], m[2]]].forEach(function (x) { x[0].g++; x[0].gf += x[1]; x[0].gs += x[2]; x[0].fp += x[3]; x[0].pt += x[1] > x[2] ? 3 : (x[1] === x[2] ? 1 : 0); });
      }); });
      return Object.keys(sq).map(function (k) { return sq[k]; }).sort(function (x, y) { return y.pt - x.pt || y.fp - x.fp || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || ((ORD.indexOf(x.n) < 0 ? 99 : ORD.indexOf(x.n)) - (ORD.indexOf(y.n) < 0 ? 99 : ORD.indexOf(y.n))); });
    }
    function metti() {
      var hero = document.querySelector('.wrap > header.hero');
      if (!hero || document.querySelector('.nt-schede')) return;
      var nav = document.createElement('nav'); nav.className = 'nt-schede'; nav.setAttribute('aria-label', 'Sezioni principali');
      /* tutte le sezioni della Home, con gli stessi collegamenti dei riquadri (l'ospite non vede il Totogirrr, come oggi) */
      nav.innerHTML = [['index.html', 'Home', 'home'], ['../index.html', 'Spogliatoio', 'spo'], ['tabellone.html', 'Tabellone', 'tab'], ['totogirrr.html', 'Totogirrr', 'toto'],
        ['app.html#sport', 'Girrr Sport', 'tv'], ['giornale.html', 'Giornale', 'gio'], ['curva.html', 'Curva', 'curva'], ['albo.html', 'Albo d\u2019oro', 'albo'],
        ['app.html#carriera', 'Carriera', 'car'], ['notifiche.html', 'Notifiche', 'noti']].map(function (v, i) {
        return '<a href="' + v[0] + '"' + (i === 0 ? ' aria-current="page"' : '') + '>' + IC[v[2]] + '<span>' + v[1] + '</span></a>';
      }).join('');
      var box = document.createElement('div'); box.className = 'nt-cruscotto';
      /* la fila di icone non si mostra più (Gianluca: «se sotto ci sono le schede con le foto, le piccole tab in alto sono un
         doppione»); il codice resta per un eventuale ripensamento */
      hero.parentNode.insertBefore(box, hero.nextSibling);
      /* ChatGPT 17/11/2026: una sola fila «Tutto il Girrr». Riusiamo i nodi reali
         (Curva, Notifiche, Statistiche, sponsor) senza clonarli o modificare contenuti,
         eventi e collegamenti. Il titolo è un fratello della fila, non scorre con essa. */
      var rail = document.querySelector('body[data-v53="home"] .wrap > .cards');
      /* Claude, 17 novembre sera: lo spostamento di Curva, Notifiche, Statistiche e sponsor dentro la fila è spento. Gianluca aveva
         chiesto la Curva SOTTO le sei schede e Notifiche/Statistiche più giù; dentro la fila finivano anche «Esci» e la versione
         (versioni.js li mette subito prima degli sponsor) e i marchi diventavano minuscoli. Il codice resta per un eventuale ripensamento. */
      if (false && rail && !document.getElementById('nt-tutto-titolo')) {
        var titolo = document.createElement('h2');
        titolo.id = 'nt-tutto-titolo';
        titolo.className = 'nt-tutto-titolo';
        titolo.textContent = 'Tutto il Girrr';
        rail.setAttribute('aria-labelledby', titolo.id);
        rail.parentNode.insertBefore(titolo, rail);
        var curva = document.getElementById('cvw');
        if (curva) {
          curva.classList.add('nt-slide', 'nt-slide-curva');
          rail.appendChild(curva);
        }
        [].forEach.call(document.querySelectorAll('body[data-v53="home"] .wrap > .mini'), function (mini) {
          mini.classList.add('nt-slide', 'nt-slide-mini');
          rail.appendChild(mini);
        });
        var sponsor = document.querySelector('body[data-v53="home"] .wrap > .sp');
        if (sponsor) {
          sponsor.classList.add('nt-slide', 'nt-slide-sponsor');
          rail.appendChild(sponsor);
        }
        document.documentElement.classList.add('nt-rail-integrata');
      }
      /* Derby votati o bocciati dai tifosi: la stessa lettura della pagina Derby (solo lettura); se non risponde in 2,5 secondi
         si va avanti con le sole rivalità storiche */
      var DBU = 'https://qmjqfgmvimsuxvghetgi.supabase.co', DBK = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
      var kk = function (a, b) { return [a, b].map(function (x) { return String(x).toLowerCase(); }).sort().join('|'); };
      var derbyVoti = Promise.race([
        fetch(DBU + '/rest/v1/rpc/derby_stato', { method: 'POST', headers: { apikey: DBK, Authorization: 'Bearer ' + DBK, 'Content-Type': 'application/json' }, body: '{}' })
          .then(function (r) { return r.json(); }).then(function (r) {
            var o = { voti: {}, veto: {}, nomi: {} };
            (r.voti || []).forEach(function (v) { var k = kk(v.a, v.b); if (v.si > v.no) o.voti[k] = 1; else if (v.no > v.si) o.veto[k] = 1; });
            (r.sfide || []).slice().reverse().forEach(function (x) { if (x.stato === 'accettata' && x.nome_ok) { var k = kk(x.da, x.a); o.voti[k] = 1; delete o.veto[k]; o.nomi[k] = x.nome; } });
            window.__ntDerby = o;
          }),
        new Promise(function (ok) { setTimeout(ok, 2500); })
      ]).catch(function () {});
      Promise.all([fetch('../data.json', { cache: 'no-store' }).then(function (r) { return r.json(); }), derbyVoti]).then(function (x) { var d = x[0];
        d = window.CVPUB ? window.CVPUB(d) : d;
        var L = (d.cal && d.cal.lega) || [], pl = L.filter(function (g) { return g.m.some(function (m) { return m[4] !== '-'; }); });
        if (!pl.length) return;
        var cl = classifica(pl), last = pl[pl.length - 1], pos = {};
        cl.forEach(function (x, i) { pos[x.n] = i + 1; });
        var nx = L.filter(function (g) { return g.m.every(function (m) { return m[4] === '-'; }); })[0], h = '';
        if (nx) {
          /* la partita in evidenza (Gianluca, 17 novembre: «un Derby, o chi può superare chi, o tra la seconda e la terza se hanno
             pochi punti; con 1 o 0 punti la coppia più alta in classifica»). In ordine:
             1. un Derby (stessa regola della pagina Derby: rivalità forte da 80 in su o votata dai tifosi, mai se bocciata);
             2. un sorpasso possibile: chi sta dietro, vincendo, raggiunge o supera l'altra (3 punti o meno); la coppia più in alto;
             3. altrimenti la partita più equilibrata, a parità la coppia più in alto. */
          var ptn = {}; cl.forEach(function (x) { ptn[x.n] = x.pt; });
          var gap = function (m) { return Math.abs(ptn[m[0]] - ptn[m[3]]); };
          var alto = function (a, b) { return (pos[a[0]] + pos[a[3]]) - (pos[b[0]] + pos[b[3]]); };
          var key = function (a, b) { return [a, b].map(function (x) { return String(x).toLowerCase(); }).sort().join('|'); };
          var RIV = {}; try { (window.NOV && window.NOV.riv || []).forEach(function (o) { RIV[key(o.a, o.b)] = o; }); } catch (e) {}
          var DV = window.__ntDerby || { voti: {}, veto: {}, nomi: {} };
          var derby = function (m) { var k = key(m[0], m[3]), o = RIV[k]; return DV.veto[k] ? null : (DV.voti[k] || (o && o.r >= 80)) ? (DV.nomi[k] || (o && o.n) || ('Derby ' + CAP(m[0]) + ' – ' + CAP(m[3]))) : null; };
          var der = nx.m.filter(derby).sort(alto), sorp = nx.m.filter(function (m) { return gap(m) <= 3; }).sort(alto);
          var bm = der[0] || sorp[0] || nx.m.slice().sort(function (a, b) { return gap(a) - gap(b) || alto(a, b); })[0];
          var dist = gap(bm), dietro = ptn[bm[0]] < ptn[bm[3]] ? bm[0] : bm[3], nomeDerby = derby(bm);
          var perche = nomeDerby ? 'Derby · ' + ESC(nomeDerby)
            : dist === 0 ? 'A pari punti: chi vince passa davanti'
            : dist <= 2 ? ESC(CAP(dietro)) + ' a ' + (dist === 1 ? 'un punto' : '2 punti') + ': vincendo fa il sorpasso'
            : dist === 3 ? ESC(CAP(dietro)) + ' a 3 punti: vincendo aggancia'
            : dist + ' punti di distacco';
          var quando = '';
          try { if (window.NEXT && window.NEXT.n === nx.n) quando = new Date(window.NEXT.t).toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
          /* il big match porta al Campo, su quella partita (Gianluca) */
          h += '<a class="nt-match' + (nomeDerby ? ' derby' : '') + '" href="campo.html?giornata=' + nx.n + '&partita=' + nx.m.indexOf(bm) + '"><small>' + (nomeDerby ? 'Derby' : 'Big match') + ' · ' + nx.n + 'ª giornata</small>' +
            '<b>' + ESC(CAP(bm[0])) + '<i>' + pos[bm[0]] + 'ª</i></b><b>' + ESC(CAP(bm[3])) + '<i>' + pos[bm[3]] + 'ª</i></b>' +
            '<strong>' + perche + '</strong><span>Campionato · Serie A, giornata ' + ESC(nx.sa) + (quando ? ' · Si comincia ' + ESC(quando) : '') + '</span><em>Vai al Campo ›</em></a>';
        }
        var gol = 0, par = 0, pp = 0;
        pl.forEach(function (g) { g.m.forEach(function (m) { if (m[4] === '-') return; var s = m[4].split('-').map(Number); gol += s[0] + s[1]; pp++; if (s[0] === s[1]) par++; }); });
        h += '<section class="nt-pannelli"><a class="nt-classifica" href="tabellone.html#lega-' + last.n + '"><header><b>Classifica</b><small>Dopo la ' + last.n + 'ª ›</small></header><ol>' +
          cl.slice(0, 4).map(function (x, i) { return '<li' + (i === 0 ? ' class="primo"' : '') + '><em>' + (i + 1) + '</em><span>' + ESC(CAP(x.n)) + '</span><b>' + x.pt + '<small>pt</small></b></li>'; }).join('') + '</ol></a>' +
          '<a class="nt-stagione" href="tabellone.html#lega-' + last.n + '"><header><b>Stagione</b><small>Campionato ›</small></header><div>' +
          '<p><b>' + pl.length + '</b><small>Giornate</small></p><p><b>' + gol + '</b><small>Gol</small></p>' +
          '<p><b>' + String(Math.round(gol / Math.max(pp, 1) * 10) / 10).replace('.', ',') + '</b><small>Gol a partita</small></p><p><b>' + par + '</b><small>Pareggi</small></p></div></a></section>';
        box.innerHTML = h;
        document.documentElement.classList.add('nt-cruscotto-pronto');
      }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', metti); else metti();
  }
  /* Forme dell'evento su TUTTE le sezioni, non solo Home, Tabellone e Campo (ChatGPT, 17 novembre 2026).
     La Curva resta esclusa dal caricatore di Claude. MutationObserver già in uso: copre i riquadri
     e le schede ricostruiti da Totogirrr, Carriera, Albo, Derby, Spogliatoio e notifiche. */
  function forme() {
    var BOX = ['.wrap > .vv-avviso', '.wrap > .v53-home', '.wrap > .lg-leghe', '.wrap > #big', '.wrap > #cvw', '.wrap > .sp', '.wrap .mini .mn',
      '.grid .panel', '.swap > .m', '#v53board', '.gs', 'section.card', 'aside.card', '.toolbar',
      /* Totogirrr (dati e schede generate da JS) */
      '#app .card', '#app .feat > .fc', '#app .prize-corner', '#app .gate', '#app .bal',
      /* Carriera, Girrr Sport, Albo dell'app e Derby */
      '#view .card', '#view .ms-c', '#view .gb-riquadro', '#view .pt-box', '#view .derby', '#view .rac', '#view .cov', '#view .ann-cell', '#view .ob', '#view .fidg', '#view .garch',
      /* Albo, Squadre, Derby, Giornale */
      '.swap .card', '.swap .sto', '.swap .sheet', '.swap .top5', '#ultimo .last', '#lista .it',
      /* Spogliatoio */
      '#app .tw', '#app .bench', '#app .sec', '#app .stats', 'body:has(> .wrap > #tabs) > .wrap > header',
      /* Versioni e Notifiche */
      '#versioni .vv-v', '#versioni .vv-msg', '#versioni .vv-area',
      '.v53-notifications .v53-panel', '.v53-notifications .v53-notifcard'];
    var TAB = ['.chips button', '.gs .ar', '.sqb', '.cd-btn', '.round button', '.partite-nav button', '.matches .gamebtn', '.sidebar nav a',
      '.v53-pill', '#big .tx a', '.lg-leghe .go', '.vv-esci', '.vv-fondo', '.v53-pills button', '.giornata-nav > button', '.giornata-nav > a',
      /* Totogirrr: tab di pagina, schede dei pronostici e pulsanti 1/X/2 */
      '#app nav .nvi button', '#app .q', '#app .seg2 button', '#app .go', '#app .chips button',
      /* Carriera, Girrr Sport, Albo, Derby */
      '#tabs button', '#view .seg button', '#view .frs button', '#view .btn', '#view .fidg-tab button',
      '#view .opts button', '#view .cards button', '#view .ch',
      /* Spogliatoio e pagine indipendenti */
      '#app .seg button', '#app .btn', '#app .chip', '#app .tpt', '#app .mkchip',
      '#app .calnav button', '.tools button', '#tabs button', '#ultimo .btn', '#lista .btn',
      '#versioni .vv-seg button', '#versioni .vv-h', '.v53-notifications .v53-btn'];
    var FORTI = '#big .tx a:not(.s), .lg-leghe .go';
    var ON = '.sel,.active,.on,[aria-current],[aria-pressed="true"],[aria-selected="true"]';
    var trasp = function (c) { var m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return true; var p = m[1].split(','); return p.length > 3 && parseFloat(p[3]) < .5; };
    var giro = false, oss = null;
    function passa() {
      giro = false;
      [].forEach.call(document.querySelectorAll(BOX.join(',')), function (el) {
        if (!el.offsetHeight) return;
        if (!el.classList.contains('nt-obl')) {
          var cs = getComputedStyle(el), bl = parseFloat(cs.borderLeftWidth) || 0;
          if (bl >= 3 && !trasp(cs.borderLeftColor)) el.style.setProperty('--nt-banda', cs.borderLeftColor);
          /* senza il bordo di sempre il testo toccava il lato: almeno 18 px a sinistra */
          if (parseFloat(cs.paddingLeft) < 16) el.style.setProperty('padding-left', '18px', 'important');
          el.classList.add('nt-obl');
        }
        var h = el.offsetHeight || 1; el.style.setProperty('--nt-sk', Math.min(4, Math.atan(14 / h) * 180 / Math.PI).toFixed(2) + 'deg');
      });
      [].forEach.call(document.querySelectorAll(TAB.join(',')), function (el) {
        if (!el.offsetWidth) return;
        var on = el.matches(ON);
        if (el.matches(FORTI)) { el.classList.add('nt-tab', 'nt-forte'); return; }
        el.classList.remove('nt-tab');
        var bg = getComputedStyle(el).backgroundColor;
        el.classList.add('nt-tab');
        el.classList.toggle('nt-on', on);
        if (!trasp(bg)) el.style.setProperty('--nt-tab-bg', bg); else el.style.removeProperty('--nt-tab-bg');
      });
      if (oss) oss.takeRecords();   /* i cambi fatti qui non fanno ripartire il giro */
    }
    function presto() { if (giro) return; giro = true; requestAnimationFrame(passa); }
    function via() {
      passa();
      try { oss = new MutationObserver(presto); oss.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current', 'aria-pressed', 'aria-selected', 'open'] }); } catch (e) {}
      /* riquadri che cambiano altezza (riepilogo e notifiche aperti, dati in arrivo): l'inclinazione si ricalcola */
      try { var ro = new ResizeObserver(presto); [].forEach.call(document.querySelectorAll('.wrap > *, .board > *, .grid > *'), function (el) { ro.observe(el); }); } catch (e) {}
      addEventListener('resize', presto);
      setTimeout(presto, 1500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via); else via();
  }
})();

/* 6.5 · Easter egg del neon (Gianluca, 18 novembre 2026): tornando alla Home da un'altra pagina del Girrr, 4 volte su 10
   «O GIRRR» sfarfalla come un neon mezzo rotto oppure si accende da sinistra a destra. Per provarlo: ?evento-neon=guasto|scia */
(function () {
  function via() {
    try {
      if (!document.body || document.body.getAttribute('data-v53') !== 'home') return;
      var t = document.querySelector('.hero h1 span'); if (!t) return;
      var forza = new URLSearchParams(location.search).get('evento-neon'), tipo = null;
      if (forza === 'guasto' || forza === 'scia') tipo = forza;
      else {
        if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var r = document.referrer; if (!r) return;
        var u = new URL(r); if (u.origin !== location.origin) return;
        var casa = location.pathname.replace(/index\.html$/, '');
        if (u.pathname.replace(/index\.html$/, '') === casa) return;   /* ricarica della Home: niente */
        if (Math.random() >= 0.4) return;
        tipo = Math.random() < 0.5 ? 'guasto' : 'scia';
      }
      setTimeout(function () {   /* dopo l'accensione normale del titolo */
        var h1 = t.parentNode, prima = h1.innerHTML, n = 0;
        function spezza(nodo, dentro) {   /* ogni lettera in un <i class="nt-l">, con il suo ritardo */
          var f = document.createDocumentFragment();
          nodo.textContent.split('').forEach(function (ch) {
            if (!ch.trim()) { f.appendChild(document.createTextNode(ch)); return; }
            var l = document.createElement('i'); l.className = 'nt-l'; l.textContent = ch;
            l.style.animationDelay = tipo === 'scia' ? (n * 0.16) + 's' : (Math.random() * 0.35).toFixed(2) + 's';
            n++; f.appendChild(l);
          });
          return f;
        }
        Array.prototype.slice.call(h1.childNodes).forEach(function (x) {
          if (x === t) { var g = spezza(t, true); t.textContent = ''; t.appendChild(g); }
          else if (x.nodeType === 3 && x.textContent.trim()) h1.replaceChild(spezza(x, false), x);
        });
        t.classList.add('nt-neon-on'); h1.classList.add('nt-neon-' + tipo);
        setTimeout(function () { h1.classList.remove('nt-neon-' + tipo); h1.innerHTML = prima; }, tipo === 'scia' ? n * 160 + 1100 : 3000);
      }, 1500);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via); else via();
})();
;(function(){var source=document.currentScript&&document.currentScript.src;function load(){if(document.documentElement.getAttribute('data-event-theme')!=='notte-tropicale'||!document.body||document.body.getAttribute('data-v53')!=='home'||document.querySelector('script[data-nt-entrata]'))return;var ref=source||(document.querySelector('script[data-evento="notte-tropicale"]')||{}).src;if(!ref)return;var s=document.createElement('script');s.src=new URL('entrata.js',ref).href;s.async=true;s.setAttribute('data-nt-entrata','');document.head.appendChild(s)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()})();
