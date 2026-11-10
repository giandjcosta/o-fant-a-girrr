/* O Girrr · Condividi come immagine (Claude, 9 novembre 2026, richiesta di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/condividi.js), incluso da Tabellone e Giornale di Lega e Stadio.
   - Tabellone: pulsante «Condividi» → La mia partita, Risultati della giornata, Classifica (solo Campionato)
     e, dalla 17ª giornata, «Il mio girone d'andata» (Giro di boa: pagella di metà stagione; nel Lab sempre, con le giornate giocate).
     L'immagine (1080×1350, adatta a WhatsApp) si disegna nel telefono con la grafica della pagina: Lega rossa, Stadio oro.
   - Giornale: «Condividi l'ultimo numero» → la copertina con il titolo.
   Livello sportivo: squadre, risultati, punti in classifica, vittorie/pareggi/sconfitte. Niente fantapunti.
   Si condivide con il menu del telefono (iPhone e Android); dove non c'è (PC) si scarica l'immagine. */
(function () {
  if (window.__girrrCondividi) return; window.__girrrCondividi = 1;
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var ACC = stadio ? '#ffd166' : '#d62839', ACC_INK = stadio ? '#1d2a52' : '#ffffff';
  var TIT = stadio ? 'Lobster, "Brush Script MT", cursive' : 'Inter, system-ui, sans-serif';
  var pagina = /giornale\.html$/.test(location.pathname) ? 'giornale' : 'tabellone';
  var ridotto = false; try { ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var W = 1080, H = 1350;

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chi() { try { var o = JSON.parse(localStorage.getItem('fg') || '{}'); return o && o.team ? o.team : null; } catch (e) { return null; } }
  function json(u) { return fetch(ROOT + u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function img(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function art(n) { return n === 8 || n === 11 || String(n).charAt(0) === '8' ? "l'" : 'la '; }

  /* ---------- Dati (come pub.js: la giornata si vede un'ora dopo voti e calcolo) ---------- */
  function pubblicato(d, g) {
    var v = (d.votiTs || {})[g.sa], c = (d.calcTs || {})[g.sa];
    if (!v && !c) return true;
    return Date.now() >= Math.max(v ? Date.parse(v) : 0, c ? Date.parse(c) : 0) + 3600000;
  }
  function giocata(g, coppa) { return (g.m || []).length && g.m.every(function (m) { var s = m[coppa ? 5 : 4]; return s && s !== '-'; }); }
  function partite(g, coppa) {
    return (g.m || []).map(function (m) { return coppa ? { a: m[1], b: m[4], s: m[5], gir: m[0] } : { a: m[0], b: m[3], s: m[4] }; });
  }
  function classifica(d, fino) {
    var T = {};
    (d.teams || []).forEach(function (t) { T[t.name] = { n: t.name, pt: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0, fp: 0 }; });
    (d.cal.lega || []).forEach(function (g) {
      if (g.n > fino || !giocata(g) || !pubblicato(d, g)) return;
      g.m.forEach(function (m) {
        var a = T[m[0]], b = T[m[3]], r = /^(\d+)\s*-\s*(\d+)$/.exec(m[4]); if (!a || !b || !r) return;
        var x = +r[1], y = +r[2];
        a.gf += x; a.gs += y; b.gf += y; b.gs += x; a.fp += +m[1] || 0; b.fp += +m[2] || 0;
        if (x > y) { a.pt += 3; a.v++; b.s++; } else if (x < y) { b.pt += 3; b.v++; a.s++; } else { a.pt++; b.pt++; a.p++; b.p++; }
      });
    });
    /* A pari punti contano i fantapunti, come su Leghe */
    return Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.pt - a.pt || b.fp - a.fp || (b.gf - b.gs) - (a.gf - a.gs); });
  }
  function giornataVista(d) {
    var t = (document.getElementById('tit') || {}).textContent || '';
    var coppa = /champions/i.test(t), m = /(\d+)\s*ª/.exec(t);
    var L = coppa ? d.cal.cup : d.cal.lega, g = null;
    if (m) g = (L || []).filter(function (x) { return x.n === +m[1]; })[0];
    if (!g || !giocata(g, coppa) || !pubblicato(d, g)) {
      g = (L || []).filter(function (x) { return giocata(x, coppa) && pubblicato(d, x); }).pop() || null;
    }
    return { g: g, coppa: coppa };
  }

  /* ---------- Disegno ---------- */
  function caratteri() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['900 80px Inter', '700 40px Inter', '400 80px Lobster'].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }
  function base(ctx, logo, kick, titolo, piede) {
    var g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, stadio ? '#25356b' : '#2c3f7c'); g.addColorStop(0.55, '#1d2a52'); g.addColorStop(1, '#141d3d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 46;
    for (var x = -H; x < W + H; x += 150) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H * 0.6, 0); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = ACC; if (stadio) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, 16, H, [0, 16, 16, 0]) : ctx.rect(0, 0, 16, H); ctx.fill(); } else ctx.fillRect(0, 0, 16, H);
    if (logo) ctx.drawImage(logo, 70, 60, 150, 150 * logo.height / logo.width);
    ctx.fillStyle = '#ffd166'; ctx.font = '800 30px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '6px';
    ctx.fillText(kick.toUpperCase(), 250, 112);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#fbf6ec'; ctx.font = (stadio ? '400 76px ' : '900 70px ') + TIT;
    adatta(ctx, titolo, 250, 192, W - 300, stadio ? 76 : 70, stadio ? '400' : '900', TIT);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '800 28px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(piede, W / 2, H - 52); ctx.textAlign = 'left';
  }
  function adatta(ctx, testo, x, y, max, size, peso, fam) {
    var s = size; ctx.font = peso + ' ' + s + 'px ' + fam;
    while (ctx.measureText(testo).width > max && s > 24) { s -= 2; ctx.font = peso + ' ' + s + 'px ' + fam; }
    ctx.fillText(testo, x, y); return s;
  }
  function riquadro(ctx, x, y, w, h, evid) {
    ctx.fillStyle = evid ? 'rgba(255,209,102,.16)' : 'rgba(255,255,255,.08)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, stadio ? 22 : [6, 22, 22, 6]); else ctx.rect(x, y, w, h); ctx.fill();
    ctx.fillStyle = evid ? '#ffd166' : ACC; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, 12, h, stadio ? [22, 0, 0, 22] : [6, 0, 0, 6]); else ctx.rect(x, y, 12, h); ctx.fill();
  }

  function laMiaPartita(ctx, d, v, mio) {
    var p = partite(v.g, v.coppa).filter(function (x) { return x.a === mio || x.b === mio; })[0];
    if (!p) return null;
    var r = /^(\d+)\s*-\s*(\d+)$/.exec(p.s) || [0, '–', '–'];
    var comp = v.coppa ? 'Champions Cup' : 'Campionato';
    ctx.fillStyle = '#bfe3ff'; ctx.font = '800 40px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(comp + ' · ' + v.g.n + 'ª giornata', W / 2, 360);
    riquadro(ctx, 80, 420, W - 160, 560, false);
    ctx.fillStyle = '#fbf6ec';
    adatta(ctx, p.a, W / 2, 540, W - 260, stadio ? 72 : 64, stadio ? '400' : '900', TIT);
    ctx.fillStyle = ACC; ctx.font = '900 190px Inter, system-ui, sans-serif';
    ctx.fillText(r[1] + ' – ' + r[2], W / 2, 770);
    ctx.fillStyle = '#fbf6ec';
    adatta(ctx, p.b, W / 2, 900, W - 260, stadio ? 72 : 64, stadio ? '400' : '900', TIT);
    var x = +r[1], y = +r[2], esito = x === y ? 'Pareggio' : 'Vince ' + (x > y ? p.a : p.b);
    ctx.fillStyle = '#ffd166'; ctx.font = '800 44px Inter, system-ui, sans-serif'; ctx.fillText(esito, W / 2, 1080);
    if (!v.coppa) {
      var c = classifica(d, v.g.n), pos = function (n) { for (var i = 0; i < c.length; i++) if (c[i].n === n) return (i + 1) + 'ª ' + n + ' (' + c[i].pt + ' punti)'; return n; };
      ctx.fillStyle = '#bfe3ff'; ctx.font = '700 32px Inter, system-ui, sans-serif';
      ctx.fillText('In classifica: ' + pos(p.a), W / 2, 1160); ctx.fillText(pos(p.b), W / 2, 1210);
    } else if (p.gir) { ctx.fillStyle = '#bfe3ff'; ctx.font = '700 32px Inter, system-ui, sans-serif'; ctx.fillText('Girone ' + p.gir, W / 2, 1160); }
    ctx.textAlign = 'left';
    return comp + ' · ' + v.g.n + 'ª giornata: ' + p.a + '–' + p.b + ' ' + p.s;
  }
  function risultati(ctx, d, v, mio) {
    var L = partite(v.g, v.coppa), comp = v.coppa ? 'Champions Cup' : 'Campionato';
    ctx.fillStyle = '#bfe3ff'; ctx.font = '800 40px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Risultati · ' + comp, W / 2, 330); ctx.textAlign = 'left';
    var y0 = 380, h = Math.min(170, (H - 520) / Math.max(1, L.length) - 18);
    L.forEach(function (p, i) {
      var y = y0 + i * (h + 18), ev = mio && (p.a === mio || p.b === mio);
      riquadro(ctx, 70, y, W - 140, h, ev);
      ctx.fillStyle = '#fbf6ec'; ctx.textAlign = 'right'; adatta(ctx, p.a, W / 2 - 130, y + h / 2 + 16, W / 2 - 230, 44, '800', 'Inter, system-ui, sans-serif');
      ctx.textAlign = 'left'; adatta(ctx, p.b, W / 2 + 130, y + h / 2 + 16, W / 2 - 230, 44, '800', 'Inter, system-ui, sans-serif');
      ctx.textAlign = 'center'; ctx.fillStyle = ev ? '#ffd166' : ACC; ctx.font = '900 60px Inter, system-ui, sans-serif';
      ctx.fillText((p.s || '').replace('-', ' – '), W / 2, y + h / 2 + 22);
      if (p.gir) { ctx.fillStyle = '#bfe3ff'; ctx.font = '700 22px Inter, system-ui, sans-serif'; ctx.fillText('Girone ' + p.gir, W / 2, y + 30); }
      ctx.textAlign = 'left';
    });
    return comp + ' · Risultati della ' + v.g.n + 'ª giornata';
  }
  function tabella(ctx, d, v, mio) {
    var c = classifica(d, v.g.n);
    ctx.fillStyle = '#bfe3ff'; ctx.font = '800 40px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Classifica dopo ' + art(v.g.n) + v.g.n + 'ª giornata', W / 2, 320); ctx.textAlign = 'left';
    var y0 = 360, h = 78, gap = 12;
    ctx.fillStyle = '#bfe3ff'; ctx.font = '800 24px Inter, system-ui, sans-serif';
    ctx.fillText('V', 760, y0 - 4); ctx.fillText('N', 830, y0 - 4); ctx.fillText('P', 900, y0 - 4); ctx.fillText('PT', 960, y0 - 4);
    c.forEach(function (t, i) {
      var y = y0 + 10 + i * (h + gap), ev = t.n === mio;
      riquadro(ctx, 60, y, W - 120, h, ev);
      ctx.fillStyle = i < 3 ? '#ffd166' : '#fbf6ec'; ctx.font = '900 40px Inter, system-ui, sans-serif'; ctx.fillText(String(i + 1), 100, y + 54);
      ctx.fillStyle = '#fbf6ec'; adatta(ctx, t.n, 170, y + 52, 560, 38, ev ? '900' : '800', 'Inter, system-ui, sans-serif');
      ctx.font = '700 32px Inter, system-ui, sans-serif'; ctx.fillStyle = '#bfe3ff';
      ctx.fillText(String(t.v), 760, y + 52); ctx.fillText(String(t.p), 830, y + 52); ctx.fillText(String(t.s), 900, y + 52);
      ctx.fillStyle = ev ? '#ffd166' : '#fbf6ec'; ctx.font = '900 40px Inter, system-ui, sans-serif'; ctx.fillText(String(t.pt), 960, y + 54);
    });
    return 'Classifica del Campionato dopo ' + art(v.g.n) + v.g.n + 'ª giornata';
  }

  /* ---------- Giro di boa (Claude, 10 novembre 2026, Gianluca: «Sì, prova») ----------
     Il girone d'andata della tua squadra (prime 17 giornate) come pagella: posizione, punti e gol, il voto della dirigenza
     (posizione rispetto all'attesa del presidente), la Champions Cup nello stesso periodo, i Derby e le promesse in conferenza.
     Campione d'inverno: la prima dopo la 17ª. Livello sportivo: niente fantapunti. */
  var ANDATA = 17;
  function laboratorio() { return /\/o-girrr-registro\//.test(location.pathname) || /[?&]girone\b/.test(location.search); }
  function ultimaAndata(d) { var L = (d.cal.lega || []).filter(function (g) { return g.n <= ANDATA && giocata(g) && pubblicato(d, g); }); return L.length ? L[L.length - 1].n : 0; }
  function datiGirone() {
    var db = 'https://qmjqfgmvimsuxvghetgi.supabase.co', k = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
    return Promise.all([
      json('girrr/dati/fiducia.json').catch(function () { return null; }),
      fetch(db + '/rest/v1/rpc/derby_stato', { method: 'POST', headers: { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (x) { return { fid: x[0], derby: x[1] }; });
  }
  function isDerby(a, b, ex) {
    var riv = (window.NOV && window.NOV.riv) || [], k = function (x, y) { return [x, y].map(function (z) { return z.toLowerCase(); }).sort().join('|'); };
    var nome = '', ok = false;
    riv.forEach(function (o) { if (k(o.a, o.b) === k(a, b) && o.r >= 80) { ok = true; nome = o.n || ''; } });
    ((ex.derby && ex.derby.sfide) || []).forEach(function (s) { if (s.stato === 'accettata' && s.nome_ok && k(s.da, s.a) === k(a, b)) { ok = true; nome = s.nome || nome; } });
    return ok ? (nome || 'Derby') : '';
  }
  function giroDiBoa(ctx, d, mio, ex) {
    var n = ultimaAndata(d); if (!n || !mio) return null;
    var C = classifica(d, n), pos = 0, s = null;
    C.forEach(function (t, i) { if (t.n === mio) { pos = i + 1; s = t; } });
    if (!s) return null;
    var fin = n >= ANDATA, cx = W / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = '#fbf6ec';
    adatta(ctx, mio, cx, 330, W - 200, stadio ? 78 : 70, stadio ? '400' : '900', TIT);
    ctx.fillStyle = '#bfe3ff'; ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.fillText(fin ? 'Girone d\'andata concluso · 17 giornate' : 'Prova con le prime ' + n + ' giornate · Si chiude alla 17ª', cx, 380);
    var y = 410;
    if (pos === 1) {
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 230, y, 460, 58, 29); else ctx.rect(cx - 230, y, 460, 58); ctx.fill();
      ctx.fillStyle = '#1d2a52'; ctx.font = '900 30px Inter, system-ui, sans-serif'; ctx.fillText(fin ? 'CAMPIONE D\'INVERNO' : 'IN TESTA A METÀ STRADA', cx, y + 40);
      y += 78;
    } else y += 20;
    /* tre riquadri grandi */
    var box = [['Posizione', pos + 'ª', 'su ' + C.length], ['Punti', String(s.pt), s.v + ' V · ' + s.p + ' N · ' + s.s + ' P'], ['Gol', String(s.gf), 'Subiti ' + s.gs]], bw = (W - 160 - 40) / 3;
    box.forEach(function (b, i) {
      var x = 80 + i * (bw + 20); riquadro(ctx, x, y, bw, 190, false);
      ctx.textAlign = 'left'; ctx.fillStyle = '#bfe3ff'; ctx.font = '800 24px Inter, system-ui, sans-serif'; ctx.fillText(b[0].toUpperCase(), x + 34, y + 46);
      ctx.fillStyle = '#fbf6ec'; ctx.font = '900 76px Inter, system-ui, sans-serif'; ctx.fillText(b[1], x + 34, y + 126);
      ctx.fillStyle = '#bfe3ff'; ctx.font = '700 24px Inter, system-ui, sans-serif'; ctx.fillText(b[2], x + 34, y + 164);
    });
    y += 230;
    function riga(tit, val, sotto) {
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(80, y, W - 160, 2);
      ctx.fillStyle = '#ffd166'; ctx.font = '800 24px Inter, system-ui, sans-serif'; ctx.fillText(tit.toUpperCase(), 80, y + 44);
      ctx.fillStyle = '#fbf6ec'; adatta(ctx, val, 80, y + 92, W - 160, 38, '800', 'Inter, system-ui, sans-serif');
      if (sotto) { ctx.fillStyle = '#bfe3ff'; adatta(ctx, sotto, 80, y + 132, W - 160, 26, '600', 'Inter, system-ui, sans-serif'); }
      y += sotto ? 160 : 120;
    }
    /* voto della dirigenza */
    var f = ex.fid && ex.fid.squadre && ex.fid.squadre[mio];
    if (f && f.aspettativa) {
      var dlt = f.aspettativa - pos, voto = dlt >= 2 ? 'Sopra le attese' : dlt <= -2 ? 'Sotto le attese' : 'In linea con le attese';
      riga('Il voto della dirigenza', voto + ' · Attesa ' + f.aspettativa + 'ª, oggi ' + pos + 'ª', 'Obiettivo: ' + (f.obiettivo || 'Dato non conservato') + (f.fiducia != null ? ' · Fiducia ' + f.fiducia + ' su 100' : ''));
    } else riga('Il voto della dirigenza', 'Dato non conservato');
    /* Champions Cup nello stesso periodo */
    var sa = ((d.cal.lega || []).filter(function (g) { return g.n === n; })[0] || {}).sa || 0, cv = 0, cn = 0, cp = 0, gir = '';
    (d.cal.cup || []).forEach(function (g) {
      if (g.sa > sa || !giocata(g, true) || !pubblicato(d, g)) return;
      g.m.forEach(function (m) { var r = /^(\d+)\s*-\s*(\d+)$/.exec(m[5]); if (!r || (m[1] !== mio && m[4] !== mio)) return; gir = m[0];
        var a = m[1] === mio ? +r[1] : +r[2], b = m[1] === mio ? +r[2] : +r[1]; if (a > b) cv++; else if (a < b) cp++; else cn++; });
    });
    riga('Champions Cup', cv + cn + cp ? (gir ? 'Girone ' + gir + ' · ' : '') + cv + ' V · ' + cn + ' N · ' + cp + ' P' : 'Nessuna partita di Coppa nel girone d\'andata');
    /* Derby del girone */
    var dv = 0, dn = 0, dp = 0, nomi = [];
    (d.cal.lega || []).forEach(function (g) {
      if (g.n > n || !giocata(g) || !pubblicato(d, g)) return;
      g.m.forEach(function (m) {
        if (m[0] !== mio && m[3] !== mio) return;
        var o = m[0] === mio ? m[3] : m[0], nm = isDerby(mio, o, ex); if (!nm) return;
        var r = /^(\d+)\s*-\s*(\d+)$/.exec(m[4]), a = m[0] === mio ? +r[1] : +r[2], b = m[0] === mio ? +r[2] : +r[1];
        if (a > b) dv++; else if (a < b) dp++; else dn++;
        if (nomi.indexOf(nm) < 0) nomi.push(nm);
      });
    });
    function pl(x, s, m) { return x + ' ' + (x === 1 ? s : m); }
    riga('I Derby del girone', dv + dn + dp ? pl(dv, 'vinto', 'vinti') + ' · ' + pl(dn, 'pareggiato', 'pareggiati') + ' · ' + pl(dp, 'perso', 'persi') : 'Nessun Derby giocato', nomi.length ? nomi.join(' · ') : '');
    /* Promesse in conferenza stampa (fiducia.json: v vinta, s pari, p persa) */
    var pr = (f && f.promesse || []).filter(function (x) { return x.giornata <= n && x.esito; }), pv = 0, pn = 0, pt = 0;
    pr.forEach(function (x) { if (x.esito === 'v') pv++; else if (x.esito === 'p') pt++; else pn++; });
    riga('Le promesse in conferenza stampa', pr.length ? pl(pv, 'mantenuta', 'mantenute') + ' · ' + pl(pn, 'finita in pareggio', 'finite in pareggio') + ' · ' + pl(pt, 'tradita', 'tradite') : 'Nessuna promessa: nessuno può contestarti niente');
    ctx.textAlign = 'left';
    return 'Giro di boa · ' + mio + ': ' + pos + 'ª con ' + s.pt + ' punti ' + (fin ? 'dopo il girone d\'andata' : 'dopo ' + art(n) + n + 'ª giornata');
  }

  function disegna(tipo, d, ex) {
    var v = giornataVista(d); if (!v.g) return Promise.reject(new Error('Nessuna giornata da condividere'));
    var mio = chi();
    return Promise.all([caratteri(), img(ROOT + 'assets/loghi/logo-lega-o-fant-a-girrr.png')]).then(function (x) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var piede = 'O Fant A Girrr · ' + (v.coppa && tipo !== 'classifica' ? 'Champions Cup' : 'Campionato') + ' 2026/27';
      if (tipo === 'girone') piede = 'O Fant A Girrr · Campionato 2026/27';
      base(ctx, x[1], 'O Fant A Girrr · 2026/27', tipo === 'girone' ? 'Giro di boa' : tipo === 'classifica' ? 'Classifica' : tipo === 'mia' ? 'La mia partita' : (art(v.g.n).replace(/^./, function (z) { return z.toUpperCase(); }) + v.g.n + 'ª giornata'), piede);
      var testo = tipo === 'girone' ? giroDiBoa(ctx, d, mio, ex || {}) : tipo === 'mia' ? laMiaPartita(ctx, d, v, mio) : tipo === 'classifica' ? tabella(ctx, d, v, mio) : risultati(ctx, d, v, mio);
      if (!testo) throw new Error('La tua squadra non gioca in questa giornata');
      return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, testo: testo, nome: 'o-girrr-' + tipo + '-' + (tipo === 'girone' ? 'andata' : v.g.n) + '.png', url: c.toDataURL('image/png') }); }, 'image/png'); });
    });
  }

  /* ---------- Finestra ---------- */
  function stile() {
    var s = document.createElement('style');
    s.textContent =
      '.cd-btn{display:inline-flex;align-items:center;gap:8px;margin:10px 0 4px;font:800 14px Inter,system-ui,sans-serif;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fbf6ec;cursor:pointer;transition:background-color .3s,transform .2s}' +
      '.cd-btn:active{transform:scale(.97)}@media (hover:hover){.cd-btn:hover{background:rgba(255,255,255,.15)}}.cd-btn svg{flex:none}' +
      '.cd-velo{position:fixed;inset:0;z-index:2147482000;background:rgba(8,12,30,.6);opacity:0;transition:opacity .3s;display:flex;align-items:flex-end;justify-content:center}' +
      '.cd-velo.su{opacity:1}.cd-box{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#1d2a52;color:#fbf6ec;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));transform:translateY(30px);transition:transform .3s ease;font-family:Inter,system-ui,sans-serif;box-shadow:0 -10px 40px rgba(0,0,0,.4)}' +
      '.cd-velo.su .cd-box{transform:none}@media (min-width:700px){.cd-velo{align-items:center}.cd-box{border-radius:22px}}' +
      '.cd-box h3{margin:0 0 4px;font-size:18px;font-weight:900' + (stadio ? ';font-family:Lobster,cursive;font-weight:400;font-size:24px' : '') + '}.cd-box p{margin:0 0 12px;color:#bfe3ff;font-size:13px;font-weight:600}' +
      '.cd-sc{display:grid;gap:8px}.cd-sc button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;font:inherit;color:inherit;cursor:pointer;padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);' + (stadio ? 'border-left:6px solid ' + ACC + ';border-radius:12px' : 'border-left:8px solid ' + ACC + ';border-radius:4px 14px 14px 4px') + '}' +
      '.cd-sc b{font-weight:900;font-size:15px}.cd-sc small{color:#bfe3ff;font-weight:600;font-size:12.5px}' +
      '.cd-ant img{display:block;width:100%;max-width:360px;margin:0 auto;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.35)}' +
      '.cd-az{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}.cd-az a,.cd-az button{font:inherit;font-weight:900;font-size:14px;padding:11px 18px;border-radius:999px;border:0;cursor:pointer;text-decoration:none}' +
      '.cd-az .pr{background:' + ACC + ';color:' + ACC_INK + '}.cd-az .se{background:rgba(255,255,255,.1);color:#fbf6ec;border:1px solid rgba(255,255,255,.2)}' +
      '.cd-err{color:#ff8a95;font-weight:700;font-size:13px;margin-top:10px}' +
      '@media (prefers-reduced-motion: reduce){.cd-velo,.cd-box{transition:opacity .15s linear!important;transform:none!important}}';
    document.head.appendChild(s);
  }
  function finestra() {
    var v = document.createElement('div'); v.className = 'cd-velo';
    v.innerHTML = '<div class="cd-box" role="dialog" aria-modal="true" aria-label="Condividi"></div>';
    document.body.appendChild(v);
    var chiudi = function () { v.classList.remove('su'); setTimeout(function () { v.remove(); }, ridotto ? 150 : 320); document.removeEventListener('keydown', esc); };
    var esc = function (e) { if (e.key === 'Escape') chiudi(); };
    v.addEventListener('click', function (e) { if (e.target === v) chiudi(); });
    document.addEventListener('keydown', esc);
    requestAnimationFrame(function () { requestAnimationFrame(function () { v.classList.add('su'); }); });
    return { box: v.querySelector('.cd-box'), chiudi: chiudi };
  }
  function anteprima(f, r, titolo) {
    var file = null; try { file = new File([r.blob], r.nome, { type: r.blob.type || 'image/png' }); } catch (e) {}
    var puo = file && navigator.canShare && navigator.canShare({ files: [file] });
    var link = new URL('apri.html?p=' + (pagina === 'giornale' ? 'giornale' : 'tabellone'), ROOT).href;
    f.box.innerHTML = '<h3>' + E(titolo) + '</h3><p>' + E(r.testo) + '</p><div class="cd-ant"><img alt="Anteprima dell\'immagine da condividere" src="' + r.url + '"></div>' +
      '<div class="cd-az">' + (puo ? '<button type="button" class="pr" data-a="sh">Condividi</button>' : '') +
      '<a class="' + (puo ? 'se' : 'pr') + '" download="' + E(r.nome) + '" href="' + r.url + '">Scarica</a><button type="button" class="se" data-a="x">Chiudi</button></div><div class="cd-err" role="status"></div>';
    var sh = f.box.querySelector('[data-a=sh]');
    if (sh) sh.onclick = function () {
      navigator.share({ files: [file], title: 'O Girrr', text: r.testo + '\n' + link }).catch(function (e) {
        if (e && e.name !== 'AbortError') f.box.querySelector('.cd-err').textContent = 'Condivisione non riuscita: usa «Scarica».';
      });
    };
    f.box.querySelector('[data-a=x]').onclick = f.chiudi;
  }

  function apriTabellone() {
    var f = finestra(), mio = chi();
    f.box.innerHTML = '<h3>Condividi</h3><p>Un\'immagine pronta per il gruppo, con la giornata che stai guardando.</p><div class="cd-sc">' +
      (mio ? '<button type="button" data-t="mia"><b>La mia partita</b><small>' + E(mio) + ': risultato e posizione in classifica</small></button>' : '') +
      '<button type="button" data-t="risultati"><b>Risultati della giornata</b><small>Tutte le partite, la tua in evidenza</small></button>' +
      '<button type="button" data-t="classifica"><b>Classifica</b><small>Campionato, con vittorie, pareggi, sconfitte e punti</small></button>' +
      (mio ? '<button type="button" data-t="girone" hidden><b>Il mio girone d\'andata</b><small>Giro di boa: la pagella di metà stagione di ' + E(mio) + '</small></button>' : '') +
      '</div><div class="cd-err" role="status"></div>';
    /* il Giro di boa compare dalla 17ª giornata pubblicata (nel Lab sempre, per provarlo) */
    var bg = f.box.querySelector('[data-t=girone]');
    if (bg) json('data.json').then(function (d) { if (window.CVPUB) d = window.CVPUB(d); if (laboratorio() || ultimaAndata(d) >= ANDATA) bg.hidden = false; }).catch(function () {});
    Array.prototype.forEach.call(f.box.querySelectorAll('.cd-sc button'), function (b) {
      b.onclick = function () {
        f.box.querySelector('.cd-err').textContent = 'Preparo l\'immagine…';
        Promise.all([json('data.json'), b.dataset.t === 'girone' ? datiGirone() : null]).then(function (x) {
          var d = x[0]; if (window.CVPUB) d = window.CVPUB(d);
          return disegna(b.dataset.t, d, x[1]);
        }).then(function (r) { anteprima(f, r, b.querySelector('b').textContent); })
          .catch(function (e) { f.box.querySelector('.cd-err').textContent = e.message; });
      };
    });
  }
  function apriGiornale() {
    var f = finestra();
    f.box.innerHTML = '<h3>Condividi il Giornale</h3><div class="cd-err" role="status">Preparo la copertina…</div>';
    json('riepiloghi/indice.json').then(function (ind) {
      var x = (ind || []).filter(function (z) { return !z.pub || Date.parse(z.pub) <= Date.now(); }).sort(function (a, b) { return b.n - a.n; })[0];
      if (!x || !x.copertina) throw new Error('Nessun numero da condividere');
      return fetch(ROOT + x.copertina).then(function (r) { if (!r.ok) throw new Error('Copertina non raggiungibile'); return r.blob(); }).then(function (b) {
        var u = URL.createObjectURL(b);
        anteprima(f, { blob: b, url: u, nome: 'o-giornale-del-girrr-' + x.n + '.png', testo: 'O Giornale del Girrr n° ' + x.n + ': ' + (x.titolone || '') }, 'O Giornale del Girrr n° ' + x.n);
      });
    }).catch(function (e) { f.box.innerHTML = '<h3>Condividi il Giornale</h3><div class="cd-err">' + E(e.message) + '</div>'; });
  }

  function avvia() {
    stile();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cd-btn';
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>' +
      (pagina === 'giornale' ? 'Condividi l\'ultimo numero' : 'Condividi');
    b.onclick = pagina === 'giornale' ? apriGiornale : apriTabellone;
    var dopo = pagina === 'giornale' ? document.querySelector('header.top') : document.querySelector('.sqb') || document.querySelector('header.top');
    if (!dopo) return;
    dopo.parentNode.insertBefore(b, dopo.nextSibling);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
