/* O Girrr · Condividi come immagine (Claude, 9 novembre 2026, richiesta di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/condividi.js), incluso da Tabellone e Giornale di Lega e Stadio.
   - Tabellone: pulsante «Condividi» → La mia partita, Risultati della giornata, Classifica (solo Campionato)
     e il bilancio della stagione, letto dal calcolo condiviso: squadra o Campionato, in un album di due foto.
     L'immagine (1080×1350, adatta a WhatsApp) si disegna nel telefono con la grafica della pagina: Lega rossa, Stadio oro.
   - Giornale: «Condividi l'ultimo numero» → la copertina con il titolo.
   - «Condividi la giornata» (Claude, 12 novembre 2026, versione 6.0): in Home (riquadro del Giornale) e nel Giornale. Un pacchetto
     con il video della giornata, l'ultima puntata della Radio, i Tabelloni ufficiali di Campionato e Champions Cup
     (le stesse immagini dei post della Curva) e la copertina del Giornale; caselle per togliere quello che non si vuole mandare. Un pezzo che non c'è
     ancora (Radio non uscita, Coppa che non ha giocato) non compare. Si manda tutto insieme con il menu del telefono.
   Livello sportivo per le immagini della giornata. Nel Giro di boa i Fantapunti stanno nella sezione separata «I numeri».
   Si condivide con il menu del telefono (iPhone e Android); dove non c'è (PC) si scarica l'immagine. */
(function () {
  if (window.__girrrCondividi) return; window.__girrrCondividi = 1;
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var stadio = /\/stadio\//.test(location.pathname);
  var ACC = stadio ? '#ffd166' : '#d62839', ACC_INK = stadio ? '#1d2a52' : '#ffffff';
  var TIT = stadio ? 'Lobster, "Brush Script MT", cursive' : 'Inter, system-ui, sans-serif';
  var pagina = /giornale\.html$/.test(location.pathname) ? 'giornale' : /tabellone\.html$/.test(location.pathname) ? 'tabellone' : /app\.html$/.test(location.pathname) ? 'app' : 'home';
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

  /* ---------- Le ultime 5 (Claude, 13 novembre 2026, versione 6.0.2): le ultime cinque partite di Campionato di una squadra ---------- */
  function ultime5(ctx, d, v, mio) {
    var fino = v.coppa ? 99 : v.g.n, R = [];
    (d.cal.lega || []).forEach(function (g) {
      if (g.n > fino || !giocata(g) || !pubblicato(d, g)) return;
      partite(g, false).forEach(function (p) { if (p.a === mio || p.b === mio) R.push({ n: g.n, p: p }); });
    });
    R = R.slice(-5); if (!R.length) return null;
    var COL = { V: '#3ecf8e', N: '#ffd166', P: '#ff6b7a' }, forma = [];
    ctx.textAlign = 'center'; ctx.fillStyle = '#fbf6ec';
    adatta(ctx, mio, W / 2, 330, W - 200, stadio ? 66 : 58, stadio ? '400' : '900', TIT);
    ctx.fillStyle = '#bfe3ff'; ctx.font = '800 34px Inter, system-ui, sans-serif';
    ctx.fillText('Le ultime ' + R.length + ' in Campionato', W / 2, 390); ctx.textAlign = 'left';
    var y0 = 430, h = 120, gap = 16;
    R.forEach(function (x, i) {
      var y = y0 + i * (h + gap), casa = x.p.a === mio, avv = casa ? x.p.b : x.p.a;
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(x.p.s) || [0, 0, 0], noi = +(casa ? m[1] : m[2]), loro = +(casa ? m[2] : m[1]);
      var es = noi > loro ? 'V' : noi === loro ? 'N' : 'P'; forma.push(es);   /* V vittoria, N pareggio, P sconfitta: il pallino a destra */
      riquadro(ctx, 70, y, W - 140, h, false);
      ctx.fillStyle = '#bfe3ff'; ctx.font = '800 24px Inter, system-ui, sans-serif';
      ctx.fillText(x.n + 'ª giornata · ' + (casa ? 'In casa' : 'In trasferta'), 112, y + 42);
      ctx.fillStyle = '#fbf6ec'; adatta(ctx, 'Contro ' + avv, 112, y + 90, 560, 40, '800', 'Inter, system-ui, sans-serif');
      ctx.textAlign = 'right'; ctx.fillStyle = '#fbf6ec'; ctx.font = '900 56px Inter, system-ui, sans-serif';
      ctx.fillText(noi + ' – ' + loro, W - 200, y + h / 2 + 20);
      ctx.textAlign = 'center'; ctx.fillStyle = COL[es]; ctx.beginPath(); ctx.arc(W - 135, y + h / 2, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141d3d'; ctx.font = '900 38px Inter, system-ui, sans-serif'; ctx.fillText(es, W - 135, y + h / 2 + 14);
      ctx.textAlign = 'left';
    });
    var c = classifica(d, fino === 99 ? R[R.length - 1].n : fino), pos = 0, pt = 0;
    c.forEach(function (t, i) { if (t.n === mio) { pos = i + 1; pt = t.pt; } });
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; ctx.font = '800 38px Inter, system-ui, sans-serif';
    var y1 = y0 + R.length * (h + gap) + 40;
    /* niente sigle tipo «PVVVP» (Gianluca): il riepilogo a parole, dalla più vecchia alla più recente come le righe sopra */
    var nv = forma.filter(function (x) { return x === 'V'; }).length, nn = forma.filter(function (x) { return x === 'N'; }).length, np = forma.length - nv - nn;
    var pl = function (x, s, m) { return x + ' ' + (x === 1 ? s : m); }, riep = pl(nv, 'vittoria', 'vittorie') + ' · ' + pl(nn, 'pareggio', 'pareggi') + ' · ' + pl(np, 'sconfitta', 'sconfitte');
    ctx.fillText(riep, W / 2, y1);
    if (pos) { ctx.fillStyle = '#bfe3ff'; ctx.font = '700 32px Inter, system-ui, sans-serif'; ctx.fillText('In classifica: ' + pos + 'ª con ' + pt + ' punti', W / 2, y1 + 54); }
    ctx.textAlign = 'left';
    return 'Le ultime ' + R.length + ' di ' + mio + ' in Campionato: ' + riep;
  }

  /* Bilanci della stagione 6.1: un solo calcolo del workflow per scheda, album e Radio. */
  function moduloBoa() {
    if (window.GirrrBoa) return Promise.resolve(window.GirrrBoa);
    return new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = ROOT + 'giro-di-boa.js?v=61-periodi1';
      s.onload = function () { ok(window.GirrrBoa); }; s.onerror = function () { ko(new Error('Bilancio non disponibile. Riprova più tardi.')); }; document.head.appendChild(s);
    });
  }

  function disegna(tipo, d, ex, scelta, squadra) {
    var v = scelta || giornataVista(d); if (!v.g) return Promise.reject(new Error('Nessuna giornata da condividere'));
    var mio = squadra || chi(), mia = mio && mio === chi();   /* 6.0.2: si sceglie la squadra (anche l'ospite) */
    return Promise.all([caratteri(), img(ROOT + 'assets/loghi/logo-lega-o-fant-a-girrr.png')]).then(function (x) {
      banda = v.coppa ? COPPA : ACC;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var piede = 'O Fant A Girrr · ' + (v.coppa && tipo !== 'classifica' ? 'Champions Cup' : 'Campionato') + ' 2026/27';
      if (tipo === 'girone' || tipo === 'ultime5') piede = 'O Fant A Girrr · Campionato 2026/27';
      base(ctx, x[1], 'O Fant A Girrr · 2026/27', tipo === 'girone' ? 'Giro di boa' : tipo === 'classifica' ? 'Classifica' : tipo === 'ultime5' ? 'Le ultime 5' : tipo === 'mia' ? (mia ? 'La mia partita' : 'La partita') : (art(v.g.n).replace(/^./, function (z) { return z.toUpperCase(); }) + v.g.n + 'ª giornata'), piede);
      var testo = tipo === 'ultime5' ? ultime5(ctx, d, v, mio) : tipo === 'mia' ? laMiaPartita(ctx, d, v, mio) : tipo === 'classifica' ? tabella(ctx, d, v, mio) : risultati(ctx, d, v, mio);
      if (!testo) throw new Error((mia ? 'La tua squadra' : mio) + ' non gioca in questa giornata');
      return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, testo: testo, nome: 'o-girrr-' + (v.coppa && tipo !== 'ultime5' ? 'coppa-' : '') + tipo + '-' + (tipo === 'girone' ? 'andata' : tipo === 'ultime5' ? String(mio || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') : v.g.n) + '.png', url: c.toDataURL('image/png') }); }, 'image/png'); });
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
      '.cd-sq{display:flex;align-items:center;gap:10px;margin:14px 0 8px;font-weight:800;font-size:13px;color:#bfe3ff}.cd-sq select{flex:1;min-width:0;font:inherit;font-weight:800;color:#fbf6ec;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px 12px}.cd-sq option{color:#141d3d}' +
      '.cd-ic{display:grid;place-items:center;height:120px;color:' + ACC + '}.cd-ic svg{width:56px;height:56px}' +
      '.cd-sf{margin:8px 0 0}' +
      '.cd-btn.cd-sf[data-cd-nome^="radio-"]{display:flex;justify-content:center;width:fit-content;max-width:100%;min-height:44px;margin:8px auto 0;text-align:center;white-space:normal;line-height:1.35}' +
      '.cd-sc button[hidden]{display:none}' +
      '.cd-velo .cd-box h3{color:#fbf6ec}' +
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
      '<a class="' + (puo ? 'se' : 'pr') + '" download="' + E(r.nome) + '" href="' + (r.scarica || r.url) + '">Scarica</a><button type="button" class="se" data-a="x">Chiudi</button></div><div class="cd-err" role="status"></div>';
    var sh = f.box.querySelector('[data-a=sh]');
    if (sh) sh.onclick = function () {
      /* con un'immagine il testo resta fuori: insieme, WhatsApp la manderebbe come file e non come foto (6.0.1) */
      navigator.share(/^image\//.test(file.type) ? { files: [file], title: 'O Girrr' } : { files: [file], title: 'O Girrr', text: r.testo + '\n' + link }).catch(function (e) {
        if (e && e.name !== 'AbortError') f.box.querySelector('.cd-err').textContent = 'Condivisione non riuscita: usa «Scarica».';
      });
    };
    f.box.querySelector('[data-a=x]').onclick = f.chiudi;
  }

  function apriTabellone() {
    /* 6.0.2 (Gianluca, 13 novembre 2026): ogni pezzo si condivide anche da solo, nella sua pagina. Qui il Tabellone ufficiale della
       giornata che stai guardando (Campionato o Champions Cup), e per la squadra scelta (anche dall'ospite) la partita, le ultime 5
       e il Giro di boa. */
    var f = finestra(), mio = chi();
    f.box.innerHTML = '<h3>Condividi</h3><div class="cd-err" role="status">Preparo…</div>';
    json('data.json').then(function (d) {
      if (window.CVPUB) d = window.CVPUB(d);
      var v = giornataVista(d); if (!v.g) throw new Error('Nessuna giornata da condividere');
      var comp = v.coppa ? 'Champions Cup' : 'Campionato', due = function (x) { return (x < 10 ? '0' : '') + x; };
      var squadre = classifica(d, 99).map(function (x) { return x.n; }), sq = mio && squadre.indexOf(mio) >= 0 ? mio : squadre[0];
      var uff = 'riepiloghi/tabellone-' + (v.coppa ? 'coppa' : 'lega') + '-' + due(v.g.n) + '.png';
      f.box.innerHTML = '<h3>Condividi</h3><p>' + E(comp + ' · ' + v.g.n + 'ª giornata') + '. Un\'immagine pronta per il gruppo.</p><div class="cd-sc">' +
        '<button type="button" data-t="ufficiale" hidden><b>Tabellone ufficiale</b><small>' + E(comp) + ' · Risultati e ' + (v.coppa ? 'gironi' : 'classifica') + ' della ' + v.g.n + 'ª giornata, la grafica della Curva</small></button>' +
        '<button type="button" data-t="risultati"><b>Risultati della giornata</b><small>Tutte le partite' + (mio ? ', la tua in evidenza' : '') + '</small></button>' +
        '<button type="button" data-t="classifica"><b>Classifica</b><small>Campionato, con vittorie, pareggi, sconfitte e punti</small></button>' +
        '</div><label class="cd-sq"><span>Squadra</span><select aria-label="Squadra">' + squadre.map(function (x) { return '<option' + (x === sq ? ' selected' : '') + '>' + E(x) + '</option>'; }).join('') + '</select></label>' +
        '<div class="cd-sc">' +
        '<button type="button" data-t="mia" data-sq="1"><b data-tit="partita"></b><small>Risultato della ' + v.g.n + 'ª giornata e posizione in classifica</small></button>' +
        '<button type="button" data-t="ultime5" data-sq="1"><b>Le ultime 5</b><small>Le ultime cinque partite di Campionato, con vittorie, pareggi e sconfitte</small></button>' +
        '<button type="button" data-t="girone" data-sq="1"><b>Il punto sulla stagione</b><small>Due o tre foto: scegli periodo, competizione e squadra o lega</small></button>' +
        '</div><div class="cd-err" role="status"></div><div class="cd-az"><button type="button" class="se" data-a="x">Chiudi</button></div>';
      var sel = f.box.querySelector('.cd-sq select'), bp = f.box.querySelector('[data-tit=partita]');
      function nomi() { var s = sel.value; bp.textContent = s === mio ? 'La mia partita' : 'La partita di ' + s; }
      sel.onchange = nomi; nomi();
      f.box.querySelector('[data-a=x]').onclick = f.chiudi;
      /* il Tabellone ufficiale compare se c'è; il Giro di boa dalla 17ª giornata pubblicata (nel Lab sempre, per provarlo) */
      blob(ROOT + uff).then(function (b) { if (/^image\//.test(b.type || 'image/png')) { var u = f.box.querySelector('[data-t=ufficiale]'); u.hidden = false; u._blob = b; } }).catch(function () {});
      moduloBoa().then(function (m) { return m.carica(ROOT).then(function (j) { f.box.querySelector('[data-t=girone] b').textContent = m.titolo(j, 'finora'); }); }).catch(function () {});
      Array.prototype.forEach.call(f.box.querySelectorAll('.cd-sc button'), function (b) {
        b.onclick = function () {
          var err = f.box.querySelector('.cd-err'), tit = b.querySelector('b').textContent; err.textContent = 'Preparo l\'immagine…';
          if (b.dataset.t === 'ufficiale') {
            var nome = 'o-girrr-tabellone-' + (v.coppa ? 'coppa' : 'lega') + '-' + due(v.g.n) + '.png';
            return anteprima(f, { blob: b._blob, url: URL.createObjectURL(b._blob), nome: nome, testo: 'O Fant A Girrr · ' + comp + ' · ' + v.g.n + 'ª giornata' }, tit);
          }
          var s = b.dataset.sq ? sel.value : null;
          if (b.dataset.t === 'girone') {
            moduloBoa().then(function (m) { f.chiudi(); return m.apri({ root: ROOT, squadra: s, competizione: v.coppa ? 'coppa' : 'campionato' }); }).catch(function (e) { err.textContent = e.message; });
            return;
          }
          disegna(b.dataset.t, d, null, v, s).then(function (r) { anteprima(f, r, tit); })
            .catch(function (e) { err.textContent = e.message; });
        };
      });
    }).catch(function (e) { f.box.innerHTML = '<h3>Condividi</h3><div class="cd-err">' + E(e.message) + '</div><div class="cd-az"><button type="button" class="se" data-a="x">Chiudi</button></div>'; f.box.querySelector('[data-a=x]').onclick = f.chiudi; });
  }

  /* ---------- Un file da solo: una puntata della Radio, un video (6.0.2) ----------
     Nelle pagine: <button data-cd-file="voci/puntata-g07.mp3" data-cd-nome="radio-girrr-07.mp3" data-cd-tit="Radio Girrr · 7ª giornata">.
     Prima si prepara il file, poi si tocca «Condividi»: su iPhone la condivisione deve partire subito dal tocco. */
  function apriFile(b) {
    var f = finestra(), tit = b.getAttribute('data-cd-tit') || 'Condividi', u = new URL(b.getAttribute('data-cd-file'), location.href).href;
    var nome = b.getAttribute('data-cd-nome') || u.split('/').pop().split('?')[0], img = b.getAttribute('data-cd-img');
    f.box.innerHTML = '<h3>' + E(tit) + '</h3><div class="cd-err" role="status">Preparo il file…</div>';
    blob(u).then(function (x) {
      var tipo = x.type || (/\.mp4$/i.test(nome) ? 'video/mp4' : /\.mp3$/i.test(nome) ? 'audio/mpeg' : 'application/octet-stream');
      var file = null; try { file = new File([x], nome, { type: tipo }); } catch (e) {}
      var puo = file && navigator.canShare && navigator.canShare({ files: [file] }), su = URL.createObjectURL(x);
      var ant = img ? '<div class="cd-ant"><img alt="" src="' + E(new URL(img, location.href).href) + '"></div>' : '<div class="cd-ant cd-ic">' + (ICONA[/^audio/.test(tipo) ? 'radio' : 'video'] || '') + '</div>';
      f.box.innerHTML = '<h3>' + E(tit) + '</h3>' + ant + '<div class="cd-az">' + (puo ? '<button type="button" class="pr" data-a="sh">Condividi</button>' : '') +
        '<a class="' + (puo ? 'se' : 'pr') + '" download="' + E(nome) + '" href="' + su + '">Scarica</a><button type="button" class="se" data-a="x">Chiudi</button></div><div class="cd-err" role="status"></div>';
      var sh = f.box.querySelector('[data-a=sh]');
      if (sh) sh.onclick = function () {   /* solo il file, senza testo né collegamento: WhatsApp lo mostra con l'anteprima */
        navigator.share({ files: [file], title: 'O Girrr' }).catch(function (e) { if (e && e.name !== 'AbortError') f.box.querySelector('.cd-err').textContent = 'Condivisione non riuscita: usa «Scarica».'; });
      };
      f.box.querySelector('[data-a=x]').onclick = f.chiudi;
    }).catch(function () { f.box.innerHTML = '<h3>' + E(tit) + '</h3><div class="cd-err">Il file non si è caricato. Riprova tra poco.</div><div class="cd-az"><button type="button" class="se" data-a="x">Chiudi</button></div>'; f.box.querySelector('[data-a=x]').onclick = f.chiudi; });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-cd-file]'); if (!b) return; e.preventDefault(); apriFile(b); });
  window.girrrCondividiFile = apriFile;

  function apriGiornale() {
    var f = finestra();
    f.box.innerHTML = '<h3>Condividi il Giornale</h3><div class="cd-err" role="status">Preparo la copertina…</div>';
    json('riepiloghi/indice.json').then(function (ind) {
      var x = (ind || []).filter(function (z) { return !z.pub || Date.parse(z.pub) <= Date.now(); }).sort(function (a, b) { return b.n - a.n; })[0];
      if (!x || !x.copertina) throw new Error('Nessun numero da condividere');
      /* 6.0.1: il numero intero in PDF (nitido, tutte le pagine), la copertina come anteprima */
      return fetch(ROOT + (x.pdf || x.copertina)).then(function (r) { if (!r.ok) throw new Error('Giornale non raggiungibile'); return r.blob(); }).then(function (b) {
        anteprima(f, { blob: b, url: ROOT + x.copertina, scarica: URL.createObjectURL(b), nome: 'o-giornale-del-girrr-' + x.n + (x.pdf ? '.pdf' : '.png'), testo: 'O Giornale del Girrr n° ' + x.n + ': ' + (x.titolone || '') }, 'O Giornale del Girrr n° ' + x.n);
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
      var x = (ind || []).filter(function (z) { return z.n === n && (!z.pub || Date.parse(z.pub) <= Date.now()) && z.copertina && z.pdf; })[0]; if (!x) return null;
      /* 6.0.1: il numero intero in PDF (tutte le pagine, nitide); la copertina resta solo come anteprima (Gianluca, 13 novembre 2026) */
      if (!x.pdf) return null;
      return blob(ROOT + x.pdf).then(function (b) {
        return { k: 'giornale', tit: 'O Giornale del Girrr', sotto: 'N° ' + x.n + ' · Il numero intero in PDF: ' + (x.titolone || ''), ant: ROOT + x.copertina, nome: 'o-giornale-del-girrr-' + x.n + '.pdf', blob: b, tipo: 'application/pdf' };
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
        }).join('') + '</div><div class="cd-err" role="status"></div><div class="cd-az fis"><button type="button" class="pr" data-a="sh">Condividi</button><button type="button" class="pr" data-a="sh2" hidden>Radio e Giornale</button><button type="button" class="se" data-a="dl">Scarica</button><button type="button" class="se" data-a="x">Chiudi</button></div>';
      var err = f.box.querySelector('.cd-err'), sh = f.box.querySelector('[data-a=sh]'), sh2 = f.box.querySelector('[data-a=sh2]');
      var testo = 'O Fant A Girrr · ' + comp;   /* senza il collegamento alla pagina: bastano lega, coppa e giornate (Gianluca, 13 novembre 2026) */
      function scelti() { return Array.prototype.filter.call(f.box.querySelectorAll('.cd-pk input'), function (c) { return c.checked; }).map(function (c) { return P.pezzi[+c.dataset.i]; }); }
      function file(x) { try { return new File([x.blob], x.nome, { type: x.tipo }); } catch (e) { return null; } }
      /* 6.0.1: WhatsApp mostra foto e video con l'anteprima solo se arrivano da soli, senza audio, PDF o testo: se li mescoli
         diventano tutti «file» staccati. Quindi due gruppi: foto e video insieme (un album), poi Radio e Giornale (Gianluca, 13 novembre 2026). */
      function media(x) { return /^(image|video)\//.test(x.tipo); }
      function gruppi() {
        var S = scelti(), M = S.filter(media), A = S.filter(function (x) { return !media(x); });
        return [M, A].filter(function (g) { return g.length; }).map(function (g) { return g.map(file).filter(Boolean); });
      }
      function nomeGruppo(F) {
        if (!F.length) return 'Condividi';
        var m = /^(image|video)\//.test(F[0].type), v = F.some(function (x) { return /^video\//.test(x.type); }), im = F.some(function (x) { return /^image\//.test(x.type); });
        if (m) return (v && im ? 'Foto e video' : v ? 'Video' : F.length > 1 ? 'Foto' : 'Foto') + ' (' + F.length + ')';
        var ra = F.some(function (x) { return /^audio\//.test(x.type); }), gi = F.some(function (x) { return /pdf$/.test(x.type); });
        return ra && gi ? 'Radio e Giornale' : ra ? 'Radio' : 'Giornale';
      }
      function aggiorna() {
        var G = gruppi(), puo = G.length && navigator.canShare && G.every(function (F) { return navigator.canShare({ files: F }); });
        sh.textContent = G.length > 1 ? nomeGruppo(G[0]) : G.length ? 'Condividi (' + G[0].length + ')' : 'Condividi'; sh.disabled = !G.length;
        sh.hidden = !puo; sh2.hidden = !puo || G.length < 2; if (G.length > 1) sh2.textContent = nomeGruppo(G[1]);
        sh.className = 'pr'; sh2.className = 'se'; f.box.querySelector('[data-a=dl]').className = puo ? 'se' : 'pr'; err.textContent = G.length > 1 && puo ? 'Due invii, perché WhatsApp mostri foto e video con l\'anteprima: prima «' + nomeGruppo(G[0]).replace(/ \(\d+\)$/, '') + '», poi «' + nomeGruppo(G[1]) + '».' : '';
        return G;
      }
      function invia(F, ultimo) {
        /* il testo con il collegamento solo con l'ultimo invio, e mai insieme a foto e video (li trasformerebbe in file) */
        var dati = { files: F, title: 'O Girrr' }; if (ultimo && !/^(image|video)\//.test(F[0].type)) dati.text = testo;
        return navigator.share(dati);
      }
      Array.prototype.forEach.call(f.box.querySelectorAll('.cd-pk input'), function (c) { c.onchange = aggiorna; });
      aggiorna();
      function fallito(e) { if (e && e.name !== 'AbortError') err.textContent = 'Condivisione non riuscita: usa «Scarica».'; }
      sh.onclick = function () {   /* tutto è già pronto: la condivisione parte subito dal tocco (serve a iPhone) */
        var G = aggiorna(); if (!G.length) return;
        invia(G[0], G.length === 1).then(function () {
          if (G.length > 1) { sh.className = 'se'; sh2.className = 'pr'; err.textContent = 'Fatto. Ora tocca «' + sh2.textContent + '».'; try { sh2.focus({ preventScroll: true }); } catch (e) {} }
        }).catch(fallito);
      };
      sh2.onclick = function () { var G = gruppi(); if (G.length > 1) invia(G[1], true).then(function () { err.textContent = 'Fatto.'; }).catch(fallito); };
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
    if (pagina === 'app') return;   /* Girrr Sport: i pulsanti «Condividi» di Radio e Video li disegna app.html (data-cd-file) */
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
