/* O Girrr · Condividi come immagine (Claude, 9 novembre 2026, richiesta di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/condividi.js), incluso da Tabellone e Giornale di Lega e Stadio.
   - Tabellone: pulsante «Condividi» → La mia partita, Risultati della giornata, Classifica (solo Campionato)
     e, dalla 17ª giornata, «Il mio girone d'andata» (Giro di boa: pagella di metà stagione; nel Lab sempre, con le giornate giocate).
     L'immagine (1080×1350, adatta a WhatsApp) si disegna nel telefono con la grafica della pagina: Lega rossa, Stadio oro.
   - Giornale: «Condividi l'ultimo numero» → la copertina con il titolo.
   - «Condividi la giornata» (Claude, 12 novembre 2026, versione 6.0): in Home (riquadro del Giornale) e nel Giornale. Un pacchetto
     con il video della giornata, l'ultima puntata della Radio, i Tabelloni ufficiali di Campionato e Champions Cup
     (le stesse immagini dei post della Curva) e la copertina del Giornale; caselle per togliere quello che non si vuole mandare. Un pezzo che non c'è
     ancora (Radio non uscita, Coppa che non ha giocato) non compare. Si manda tutto insieme con il menu del telefono.
   Livello sportivo: squadre, risultati, punti in classifica, vittorie/pareggi/sconfitte. Niente fantapunti.
   Si condivide con il menu del telefono (iPhone e Android); dove non c'è (PC) si scarica l'immagine. */
(function () {
  if (window.__girrrCondividi) return; window.__girrrCondividi = 1;
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var ACC = stadio ? '#ffd166' : '#d62839', ACC_INK = stadio ? '#1d2a52' : '#ffffff';
  var TIT = stadio ? 'Lobster, "Brush Script MT", cursive' : 'Inter, system-ui, sans-serif';
  var pagina = /giornale\.html$/.test(location.pathname) ? 'giornale' : /tabellone\.html$/.test(location.pathname) ? 'tabellone' : 'home';
  var ridotto = false; try { ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var W = 1080, H = 1350, COPPA = '#3d93d6', banda = ACC;   /* banda: rossa (oro nello Stadio) in Campionato, azzurra in Champions Cup */

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
    ctx.fillStyle = banda; if (stadio) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, 16, H, [0, 16, 16, 0]) : ctx.rect(0, 0, 16, H); ctx.fill(); } else ctx.fillRect(0, 0, 16, H);
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
    ctx.fillStyle = evid ? '#ffd166' : banda; ctx.beginPath();
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

  function disegna(tipo, d, ex, scelta) {
    var v = scelta || giornataVista(d); if (!v.g) return Promise.reject(new Error('Nessuna giornata da condividere'));
    var mio = chi();
    return Promise.all([caratteri(), img(ROOT + 'assets/loghi/logo-lega-o-fant-a-girrr.png')]).then(function (x) {
      banda = v.coppa ? COPPA : ACC;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var piede = 'O Fant A Girrr · ' + (v.coppa && tipo !== 'classifica' ? 'Champions Cup' : 'Campionato') + ' 2026/27';
      if (tipo === 'girone') piede = 'O Fant A Girrr · Campionato 2026/27';
      base(ctx, x[1], 'O Fant A Girrr · 2026/27', tipo === 'girone' ? 'Giro di boa' : tipo === 'classifica' ? 'Classifica' : tipo === 'mia' ? 'La mia partita' : (art(v.g.n).replace(/^./, function (z) { return z.toUpperCase(); }) + v.g.n + 'ª giornata'), piede);
      var testo = tipo === 'girone' ? giroDiBoa(ctx, d, mio, ex || {}) : tipo === 'mia' ? laMiaPartita(ctx, d, v, mio) : tipo === 'classifica' ? tabella(ctx, d, v, mio) : risultati(ctx, d, v, mio);
      if (!testo) throw new Error('La tua squadra non gioca in questa giornata');
      return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, testo: testo, nome: 'o-girrr-' + (v.coppa ? 'coppa-' : '') + tipo + '-' + (tipo === 'girone' ? 'andata' : v.g.n) + '.png', url: c.toDataURL('image/png') }); }, 'image/png'); });
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
      '.cd-box h3{margin:0 0 4px;font-size:18px;font-weight:900;letter-spacing:0;text-transform:none' + (stadio ? ';font-family:Lobster,cursive;font-weight:400;font-size:24px' : '') + '}.cd-box p{margin:0 0 12px;color:#bfe3ff;font-size:13px;font-weight:600}' +
      '.cd-sc{display:grid;gap:8px}.cd-sc button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;font:inherit;color:inherit;cursor:pointer;padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);' + (stadio ? 'border-left:6px solid ' + ACC + ';border-radius:12px' : 'border-left:8px solid ' + ACC + ';border-radius:4px 14px 14px 4px') + '}' +
      '.cd-sc b{font-weight:900;font-size:15px}.cd-sc small{color:#bfe3ff;font-weight:600;font-size:12.5px}' +
      '.cd-ant img{display:block;width:100%;max-width:360px;margin:0 auto;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.35)}' +
      '.cd-az{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}.cd-az a,.cd-az button{font:inherit;font-weight:900;font-size:14px;padding:11px 18px;border-radius:999px;border:0;cursor:pointer;text-decoration:none}' +
      '.cd-box .cd-az.fis{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom,0px));margin:12px -16px calc(-18px - env(safe-area-inset-bottom,0px));padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));background:linear-gradient(rgba(29,42,82,0),#1d2a52 14px)}' +
      '.cd-az .pr{background:' + ACC + ';color:' + ACC_INK + '}.cd-az .se{background:rgba(255,255,255,.1);color:#fbf6ec;border:1px solid rgba(255,255,255,.2)}' +
      '.cd-err{color:#ff8a95;font-weight:700;font-size:13px;margin-top:10px}' +
      '.cd-pk{display:grid;gap:8px}.cd-pz{display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);transition:opacity .25s,background-color .25s;' + (stadio ? 'border-radius:12px' : 'border-radius:4px 14px 14px 4px') + '}' +
      '.cd-pz input{position:absolute;opacity:0;pointer-events:none}.cd-pz .an{flex:none;width:52px;height:64px;display:grid;place-items:center;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.1);color:' + ACC + '}' +
      '.cd-pz .an img{width:100%;height:100%;object-fit:cover;display:block}.cd-pz .vv{position:relative;display:block;width:100%;height:100%}.cd-pz .vv i{position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(0,0,0,.25)}' +
      '.cd-pz .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.cd-pz b{font-weight:900;font-size:14.5px}.cd-pz small{color:#bfe3ff;font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.cd-pz .an.lar{width:86px;height:48px;border-radius:6px}' +
      '.cd-pz .cd-sp{flex:none;width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);transition:background-color .2s,border-color .2s,transform .2s;background-position:center;background-repeat:no-repeat;background-size:12px 12px}' +
      '.cd-pz input:checked~.cd-sp{background-color:' + ACC + ';border-color:' + ACC + ';background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M6 12.5l4 4 8-9%27 fill=%27none%27 stroke=%27' + encodeURIComponent(ACC_INK) + '%27 stroke-width=%272.4%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")}' +
      '.cd-pz:has(input:not(:checked)){opacity:.55}.cd-pz input:focus-visible~.cd-sp{outline:2px solid #fbf6ec;outline-offset:2px}.cd-az button[disabled]{opacity:.5;cursor:default}' +
      '.big .bt a.cd-gio{display:inline-flex;align-items:center;gap:6px}.cd-gio svg{flex:none}' +
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

  /* ---------- Condividi la giornata (Claude, 12 novembre 2026, versione 6.0) ---------- */
  function nelLab() { return /\/o-girrr-registro\//.test(location.pathname); }
  function cartellaVideo() {   /* nel Lab i video stanno nell'archivio di prova */
    return nelLab() ? new URL('/o-girrr-registro/lab/video-giornata/archivio/', location.href).href : ROOT + 'girrr/video/';
  }
  function blob(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }); }
  function pacchetto(d) {
    var L = (d.cal.lega || []).filter(function (g) { return giocata(g) && pubblicato(d, g); }), g = L[L.length - 1];
    if (!g) return Promise.reject(new Error('Nessuna giornata da condividere'));
    var n = g.n, C = (d.cal.cup || []).filter(function (x) { return x.sa === g.sa && giocata(x, true) && pubblicato(d, x); })[0] || null;
    var cv = cartellaVideo(), pz = [];
    function due(x) { return (x < 10 ? '0' : '') + x; }
    /* 1. video */
    pz.push(fetch(cv + 'archivio.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (A) {
      var v = (A || []).filter(function (x) { return x.n === n; })[0]; if (!v) return null;
      return blob(cv + v.file).then(function (b) {
        return { k: 'video', tit: 'Il video della giornata', sotto: v.titolo, ant: v.img ? cv + v.img : '', nome: 'o-girrr-video-' + due(n) + '.mp4', blob: b, tipo: 'video/mp4' };
      });
    }).catch(function () { return null; }));
    /* 2. Radio */
    pz.push(json('girrr/voci/archivio.json').then(function (A) {
      var r = (A || []).filter(function (x) { return x.file === 'puntata-g' + due(n) + '.mp3'; })[0]; if (!r) return null;
      /* nel Lab gli audio non passano dallo specchio: si prendono dal sito */
      return blob((nelLab() ? new URL('/o-fant-a-girrr/', location.href).href : ROOT) + 'girrr/voci/' + r.file).then(function (b) {
        return { k: 'radio', tit: 'Radio Girrr', sotto: 'La puntata della ' + n + 'ª giornata', ant: '', nome: 'radio-girrr-' + due(n) + '.mp3', blob: b, tipo: 'audio/mpeg' };
      });
    }).catch(function () { return null; }));
    /* 3. grafiche ufficiali del Tabellone, le stesse dei post della Curva (riepiloghi/tabellone-lega-NN.png e tabellone-coppa-NN.png):
       risultati e classifica (o gironi) in un'immagine sola. Se non c'è ancora, non compare. */
    function ufficiale(t, gg, tit) {
      var f = 'riepiloghi/tabellone-' + t + '-' + due(gg.n) + '.png';
      return blob(ROOT + f).then(function (b) {
        if (!/^image\//.test(b.type || 'image/png')) return null;
        return { k: t, tit: tit, sotto: (t === 'coppa' ? 'Champions Cup' : 'Campionato') + ' · Risultati e ' + (t === 'coppa' ? 'gironi' : 'classifica') + ' della ' + gg.n + 'ª giornata',
          ant: URL.createObjectURL(b), largo: true, nome: 'o-girrr-tabellone-' + t + '-' + due(gg.n) + '.png', blob: b, tipo: 'image/png' };
      }).catch(function () { return null; });
    }
    pz.push(ufficiale('lega', g, 'Tabellone del Campionato'));
    if (C) pz.push(ufficiale('coppa', C, 'Tabellone della Champions Cup'));
    /* 4. Giornale */
    pz.push(json('riepiloghi/indice.json').then(function (ind) {
      var x = (ind || []).filter(function (z) { return z.n === n && (!z.pub || Date.parse(z.pub) <= Date.now()) && z.copertina; })[0]; if (!x) return null;
      return blob(ROOT + x.copertina).then(function (b) {
        return { k: 'giornale', tit: 'O Giornale del Girrr', sotto: 'N° ' + x.n + ': ' + (x.titolone || ''), ant: URL.createObjectURL(b), nome: 'o-giornale-del-girrr-' + x.n + '.png', blob: b, tipo: 'image/png' };
      });
    }).catch(function () { return null; }));
    return Promise.all(pz).then(function (P) {
      return { n: n, coppa: C ? C.n : 0, pezzi: P.filter(Boolean) };
    });
  }
  var ICONA = {
    video: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    radio: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'
  };
  function apriGiornata() {
    var f = finestra();
    f.box.innerHTML = '<h3>Condividi la giornata</h3><div class="cd-err" role="status">Preparo il pacchetto…</div>';
    json('data.json').then(function (d) { if (window.CVPUB) d = window.CVPUB(d); return pacchetto(d); }).then(function (P) {
      if (!P.pezzi.length) throw new Error('Niente da condividere per ora');
      var comp = 'Campionato · ' + P.n + 'ª giornata' + (P.coppa ? ' · Champions Cup · ' + P.coppa + 'ª giornata' : '');
      f.box.innerHTML = '<h3>Condividi la giornata</h3><p>' + E(comp) + '. Togli quello che non vuoi mandare.</p><div class="cd-pk">' +
        P.pezzi.map(function (x, i) {
          var a = x.ant ? '<img alt="" src="' + E(x.ant) + '"' + (x.k === 'video' ? ' class="v"' : '') + '>' : '<span class="ic">' + (ICONA[x.k] || '') + '</span>';
          if (x.k === 'video' && x.ant) a = '<span class="vv">' + a + '<i>' + ICONA.video + '</i></span>';
          return '<label class="cd-pz"><input type="checkbox" checked data-i="' + i + '"><span class="an' + (x.largo ? ' lar' : '') + '">' + a + '</span><span class="tx"><b>' + E(x.tit) + '</b><small>' + E(x.sotto) + '</small></span><span class="cd-sp" aria-hidden="true"></span></label>';
        }).join('') + '</div><div class="cd-err" role="status"></div><div class="cd-az fis"><button type="button" class="pr" data-a="sh">Condividi</button><button type="button" class="se" data-a="dl">Scarica</button><button type="button" class="se" data-a="x">Chiudi</button></div>';
      var err = f.box.querySelector('.cd-err'), sh = f.box.querySelector('[data-a=sh]');
      var testo = 'O Fant A Girrr · ' + comp + '\n' + new URL(stadio ? 'stadio/girrr/' : 'girrr/', ROOT).href;
      function scelti() { return Array.prototype.filter.call(f.box.querySelectorAll('.cd-pk input'), function (c) { return c.checked; }).map(function (c) { return P.pezzi[+c.dataset.i]; }); }
      function file(x) { try { return new File([x.blob], x.nome, { type: x.tipo }); } catch (e) { return null; } }
      function aggiorna() {
        var S = scelti(), F = S.map(file).filter(Boolean), puo = F.length && navigator.canShare && navigator.canShare({ files: F });
        sh.textContent = S.length ? 'Condividi (' + S.length + ')' : 'Condividi'; sh.disabled = !S.length;
        sh.hidden = !puo; f.box.querySelector('[data-a=dl]').className = puo ? 'se' : 'pr'; err.textContent = '';
        return F;
      }
      Array.prototype.forEach.call(f.box.querySelectorAll('.cd-pk input'), function (c) { c.onchange = aggiorna; });
      aggiorna();
      sh.onclick = function () {   /* tutto è già pronto: la condivisione parte subito dal tocco (serve a iPhone) */
        var F = aggiorna(); if (!F.length) return;
        navigator.share({ files: F, title: 'O Girrr', text: testo }).catch(function (e) {
          if (e && e.name !== 'AbortError') err.textContent = 'Condivisione non riuscita: usa «Scarica».';
        });
      };
      f.box.querySelector('[data-a=dl]').onclick = function () {
        var S = scelti(); if (!S.length) return;
        S.forEach(function (x, i) { setTimeout(function () {
          var a = document.createElement('a'); a.href = URL.createObjectURL(x.blob); a.download = x.nome; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        }, i * 350); });
        err.textContent = S.length === 1 ? 'Scarico 1 file.' : 'Scarico ' + S.length + ' file.';
      };
      f.box.querySelector('[data-a=x]').onclick = f.chiudi;
    }).catch(function (e) { f.box.innerHTML = '<h3>Condividi la giornata</h3><div class="cd-err">' + E(e.message) + '</div><div class="cd-az"><button type="button" class="se" data-a="x">Chiudi</button></div>'; f.box.querySelector('[data-a=x]').onclick = f.chiudi; });
  }
  window.girrrCondividiGiornata = apriGiornata;

  var SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
  function avvia() {
    stile();
    if (pagina === 'home') {   /* Home: nel riquadro del Giornale, accanto a «Leggi il giornale» */
      var bt = document.querySelector('#big .bt'); if (!bt) return;
      var a = document.createElement('a'); a.href = '#'; a.className = 's cd-gio'; a.setAttribute('role', 'button');
      a.innerHTML = SVG.replace(/18/g, '15') + 'Condividi la giornata';
      a.onclick = function (e) { e.preventDefault(); apriGiornata(); };
      bt.insertBefore(a, bt.children[1] || null);
      return;
    }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cd-btn';
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>' +
      (pagina === 'giornale' ? 'Condividi l\'ultimo numero' : 'Condividi');
    b.onclick = pagina === 'giornale' ? apriGiornale : apriTabellone;
    var dopo = pagina === 'giornale' ? document.querySelector('header.top') : document.querySelector('.sqb') || document.querySelector('header.top');
    if (!dopo) return;
    dopo.parentNode.insertBefore(b, dopo.nextSibling);
    if (pagina === 'giornale') {   /* Giornale: «Condividi la giornata» accanto a «Condividi l'ultimo numero» */
      var g = document.createElement('button'); g.type = 'button'; g.className = 'cd-btn'; g.style.marginLeft = '8px';
      g.innerHTML = SVG + 'Condividi la giornata'; g.onclick = apriGiornata;
      b.parentNode.insertBefore(g, b.nextSibling);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
