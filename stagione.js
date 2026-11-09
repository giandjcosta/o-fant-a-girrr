/* Carriera · La mia stagione (Claude, 9 novembre 2026, decisione di Gianluca: «La mia Stagione in Carriera»).
   Va nella radice del sito (/o-fant-a-girrr/stagione.js), incluso da girrr/app.html e stadio/girrr/app.html.
   La Carriera chiama window.GirrrStagione(squadra) per la scheda «Stagione» e mette quello che restituisce.
   Schede (telefono una sotto l'altra, tablet 2 colonne, PC 3): posizione, bilancio, strisce, miglior giornata, il titolare più prezioso,
   Borsino e Champions Cup. Solo dati veri (data.json, formazioni.json, borsino.json); dove mancano «Dato non conservato». */
(function () {
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var ACC = stadio ? '#ffd166' : '#d62839';
  var D = null, F = null, B = null, stato = 0;

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x, d) { return Number(x).toFixed(d == null ? 1 : d).replace('.', ','); }
  function art(n) { return n === 8 || n === 11 || String(n).charAt(0) === '8' ? "l'" : 'la '; }
  function j(u) { return fetch(ROOT + u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function carica() {
    if (stato) return; stato = 1;
    Promise.all([j('data.json'), j('formazioni.json'), j('girrr/dati/borsino.json')]).then(function (x) {
      D = x[0]; F = x[1]; B = x[2]; stato = 2;
      var b = document.querySelector('[data-ctab="stag"][aria-pressed="true"]'); if (b) b.click(); /* la Carriera ridisegna la scheda */
    });
  }
  function pubblicato(g) {
    var v = (D.votiTs || {})[g.sa], c = (D.calcTs || {})[g.sa];
    if (!v && !c) return true;
    return Date.now() >= Math.max(v ? Date.parse(v) : 0, c ? Date.parse(c) : 0) + 3600000;
  }
  function giocata(g, coppa) { return (g.m || []).length && g.m.every(function (m) { var s = m[coppa ? 5 : 4]; return /^\d+\s*-\s*\d+$/.test(s || ''); }) && pubblicato(g); }
  function classifica(fino) {
    var T = {};
    (D.teams || []).forEach(function (t) { T[t.name] = { n: t.name, pt: 0, fp: 0, gf: 0, gs: 0 }; });
    (D.cal.lega || []).forEach(function (g) {
      if (g.n > fino || !giocata(g)) return;
      g.m.forEach(function (m) {
        var a = T[m[0]], b = T[m[3]], r = /^(\d+)\s*-\s*(\d+)$/.exec(m[4]); if (!a || !b || !r) return;
        var x = +r[1], y = +r[2]; a.gf += x; a.gs += y; b.gf += y; b.gs += x; a.fp += +m[1] || 0; b.fp += +m[2] || 0;
        if (x > y) a.pt += 3; else if (x < y) b.pt += 3; else { a.pt++; b.pt++; }
      });
    });
    return Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.pt - a.pt || b.fp - a.fp; });
  }

  function schede(t) {
    var giocate = (D.cal.lega || []).filter(function (g) { return giocata(g); });
    if (!giocate.length) return [];
    var S = [], pos = [], ris = [];
    giocate.forEach(function (g) {
      var c = classifica(g.n), p = 0; c.forEach(function (x, i) { if (x.n === t) p = i + 1; }); pos.push({ n: g.n, p: p });
      g.m.forEach(function (m) {
        if (m[0] !== t && m[3] !== t) return;
        var casa = m[0] === t, r = /^(\d+)\s*-\s*(\d+)$/.exec(m[4]), mi = casa ? +r[1] : +r[2], lo = casa ? +r[2] : +r[1];
        ris.push({ n: g.n, avv: casa ? m[3] : m[0], gf: mi, gs: lo, fp: +(casa ? m[1] : m[2]) || 0, es: mi > lo ? 'V' : mi < lo ? 'P' : 'N', s: m[4], casa: casa });
      });
    });
    var ultima = giocate[giocate.length - 1].n, oggi = pos[pos.length - 1].p, c = classifica(ultima), me = c.filter(function (x) { return x.n === t; })[0] || { pt: 0 };
    var best = pos.reduce(function (a, b) { return b.p < a.p ? b : a; }), worst = pos.reduce(function (a, b) { return b.p > a.p ? b : a; });
    S.push({ k: 'In classifica', big: oggi + 'ª', sub: me.pt + ' punti dopo ' + art(ultima) + ultima + 'ª giornata',
      txt: 'Migliore posizione: ' + best.p + 'ª (dopo ' + art(best.n) + best.n + 'ª). Peggiore: ' + worst.p + 'ª (dopo ' + art(worst.n) + worst.n + 'ª).',
      graf: pos });
    var V = ris.filter(function (x) { return x.es === 'V'; }).length, N = ris.filter(function (x) { return x.es === 'N'; }).length, P = ris.length - V - N;
    var GF = ris.reduce(function (a, x) { return a + x.gf; }, 0), GS = ris.reduce(function (a, x) { return a + x.gs; }, 0);
    S.push({ k: 'Il bilancio', big: V + '-' + N + '-' + P, sub: 'Vittorie, pareggi e sconfitte', txt: 'Gol fatti ' + GF + ', gol subiti ' + GS + ' (differenza ' + (GF - GS >= 0 ? '+' : '') + (GF - GS) + ').', forma: ris.map(function (x) { return x.es; }) });
    function striscia(f) { var m = 0, c = 0, da = 0, mDa = 0; ris.forEach(function (x, i) { if (f(x)) { if (!c) da = i; c++; if (c > m) { m = c; mDa = da; } } else c = 0; }); return { m: m, da: ris[mDa], a: ris[mDa + m - 1] }; }
    var sv = striscia(function (x) { return x.es === 'V'; }), su = striscia(function (x) { return x.es !== 'P'; });
    S.push({ k: 'La striscia', big: String(su.m), sub: su.m === 1 ? 'Partita senza sconfitte' : 'Partite di fila senza sconfitte',
      txt: (su.m ? 'Dalla ' + su.da.n + 'ª alla ' + su.a.n + 'ª giornata. ' : '') + (sv.m ? 'Vittorie di fila: ' + sv.m + '.' : 'Nessuna vittoria finora.') });
    var top = ris.reduce(function (a, b) { return b.fp > a.fp ? b : a; });
    S.push({ k: 'La giornata migliore', big: num(top.fp, 1), sub: 'Fantapunti nella ' + top.n + 'ª giornata', txt: (top.casa ? t + '–' + top.avv : top.avv + '–' + t) + ' ' + top.s + '.' });
    /* Il titolare più prezioso: fantavoti dei titolari schierati (formazioni.json, per giornata di Serie A) */
    if (F && F.fv) {
      var tot = {}, pres = {}, cop = [], manca = [];
      giocate.forEach(function (g) {
        var fo = F[g.sa] && F[g.sa][t], fv = F.fv[g.sa];
        if (!fo || !fv) { manca.push(g.n); return; }
        cop.push(g.n);
        (fo.tit || []).forEach(function (id) { if (fv[id] != null) { tot[id] = (tot[id] || 0) + fv[id]; pres[id] = (pres[id] || 0) + 1; } });
      });
      var ids = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; });
      if (ids.length) {
        var pl = (D.P || {})[ids[0]] || { n: 'Giocatore ' + ids[0] };
        S.push({ k: 'Il titolare più prezioso', big: pl.n, sub: num(tot[ids[0]], 1) + ' fantapunti in ' + pres[ids[0]] + ' partite da titolare' + (pl.t ? ' · ' + pl.t : ''),
          txt: ids[1] ? 'Dietro di lui ' + ((D.P || {})[ids[1]] || {}).n + ' (' + num(tot[ids[1]], 1) + ').' : '', nota: manca.length ? 'Formazioni della ' + manca.join('ª, ') + 'ª giornata: Dato non conservato.' : '' });
      }
    }
    var bor = B && B.squadre && B.squadre[t];
    if (bor && bor.length) {
      var x = bor.slice().sort(function (a, b) { return b.variazione - a.variazione; })[0];
      S.push({ k: 'Il colpo di mercato', big: x.nome, sub: 'Borsino ' + (x.variazione >= 0 ? '+' : '') + num(x.variazione, 1) + ' nelle ultime giornate', txt: 'Valore ' + num(x.valore, 1) + ', pagato ' + x.pagato + ' fantacrediti. ' + (x.consiglio || '') });
    }
    var cc = [];
    (D.cal.cup || []).forEach(function (g) {
      if (!giocata(g, true)) return;
      g.m.forEach(function (m) { if (m[1] !== t && m[4] !== t) return; var r = /^(\d+)\s*-\s*(\d+)$/.exec(m[5]), casa = m[1] === t, a = casa ? +r[1] : +r[2], b = casa ? +r[2] : +r[1]; cc.push(a > b ? 'V' : a < b ? 'P' : 'N'); });
    });
    if (cc.length) {
      var cv = cc.filter(function (x) { return x === 'V'; }).length, cn = cc.filter(function (x) { return x === 'N'; }).length;
      S.push({ k: 'Champions Cup', big: cv + '-' + cn + '-' + (cc.length - cv - cn), sub: 'Vittorie, pareggi e sconfitte nel girone', forma: cc });
    }
    return S;
  }

  function stile() {
    if (document.getElementById('ms-css')) return;
    var s = document.createElement('style'); s.id = 'ms-css';
    s.textContent =
      '.ms-intro{color:var(--mute,#bfe3ff);font-size:13px;font-weight:600;margin:0 0 10px}' +
      /* Telefono: una sotto l'altra (si scorre in basso). Tablet: 2 colonne. PC e TV: 3 colonne (Gianluca) */
      '.ms-scorri{display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 10px}' +
      '@media (min-width:600px){.ms-scorri{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
      '@media (min-width:1000px){.ms-scorri{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
      '.ms-c{min-width:0;display:flex;flex-direction:column;padding:14px 16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);' +
      (stadio ? 'border-left:6px solid ' + ACC + ';border-radius:12px' : 'border-left:8px solid ' + ACC + ';border-radius:4px 14px 14px 4px') + '}' +
      '.ms-k{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:' + (stadio ? ACC : '#ffd166') + '}' +
      '.ms-big{font-weight:900;font-size:clamp(32px,9vw,44px);line-height:1.05;margin:10px 0 4px;color:#fbf6ec;overflow-wrap:anywhere' + (stadio ? ';font-family:Lobster,cursive;font-weight:400' : '') + '}' +
      '.ms-sub{font-weight:800;font-size:14px;color:#fbf6ec}.ms-txt{margin-top:auto;padding-top:10px;font-size:13px;line-height:1.45;color:var(--mute,#bfe3ff)}.ms-nota{font-size:11.5px;opacity:.75;margin-top:6px}' +
      '.ms-forma{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}.ms-forma i{font-style:normal;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;color:#fff;background:#6b7393}' +
      '.ms-forma i.V{background:#2fbf71}.ms-forma i.P{background:#e5484d}' +
      '.ms-graf{margin-top:10px}.ms-dot{display:flex;gap:6px;justify-content:center;margin-top:2px}.ms-dot i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3)}';
    document.head.appendChild(s);
  }
  function grafico(pos) {
    var w = 260, h = 70, n = pos.length, x = function (i) { return n < 2 ? w / 2 : 8 + i * (w - 16) / (n - 1); }, y = function (p) { return 8 + (p - 1) * (h - 16) / 9; };
    var pts = pos.map(function (q, i) { return x(i).toFixed(1) + ',' + y(q.p).toFixed(1); }).join(' ');
    return '<svg class="ms-graf" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" aria-label="Posizione giornata per giornata"><line x1="0" x2="' + w + '" y1="' + y(1) + '" y2="' + y(1) + '" stroke="rgba(255,255,255,.15)"/><line x1="0" x2="' + w + '" y1="' + y(10) + '" y2="' + y(10) + '" stroke="rgba(255,255,255,.15)"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="' + ACC + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      pos.map(function (q, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(q.p).toFixed(1) + '" r="3.5" fill="#fbf6ec"/>'; }).join('') + '</svg>';
  }

  window.GirrrStagione = function (t) {
    stile();
    if (stato < 2) { carica(); return '<p class="ms-intro">Carico la tua stagione…</p>'; }
    if (!D || !D.cal) return '<p class="ms-intro">La stagione non è raggiungibile in questo momento. Riprova tra poco.</p>';
    var S = schede(t);
    if (!S.length) return '<p class="ms-intro">La stagione comincia con la prima giornata giocata.</p>';
    return '<p class="ms-intro">La stagione di ' + E(t) + ' finora.</p><div class="ms-scorri">' + S.map(function (s) {
      return '<section class="ms-c"><div class="ms-k">' + E(s.k) + '</div><div class="ms-big">' + E(s.big) + '</div><div class="ms-sub">' + E(s.sub) + '</div>' +
        (s.graf ? grafico(s.graf) : '') + (s.forma ? '<div class="ms-forma">' + s.forma.map(function (f) { return '<i class="' + f + '">' + f + '</i>'; }).join('') + '</div>' : '') +
        (s.txt ? '<div class="ms-txt">' + E(s.txt) + (s.nota ? '<div class="ms-nota">' + E(s.nota) + '</div>' : '') + '</div>' : '') + '</section>';
    }).join('') + '</div>';
  };
  carica();
})();
