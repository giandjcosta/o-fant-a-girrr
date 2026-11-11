/* Conferenze stampa e Testa a testa (Claude, 10 novembre 2026, richiesta di Gianluca: «Farei le prime 6»).
   Va nella radice del sito (/o-fant-a-girrr/conferenze.js), incluso da girrr/app.html e stadio/girrr/app.html.
   La pagina chiama:
     window.GirrrConfAvv(squadra, avversario, giornata)  nella Conferenza: «Cosa ha detto l'avversario», Sala stampa della vigilia,
                                                         conferenza del dopo partita e Sala stampa del dopo partita
     window.GirrrPromesse(squadra)                       scheda «Promesse» della Carriera
     window.GirrrTesta(a, b)                              riquadro «Testa a testa» in fondo alla pagina Derby
   Dati veri, solo in lettura: data.json, girrr/dati/fiducia.json e le funzioni pubbliche del database conf_pubbliche
   e conf_promesse (le stesse che legge il workflow della Curva). Scrive solo la conferenza del dopo partita (conf_dopo_salva).
   I risultati si contano solo quando la giornata è pubblicata sul sito (stessa regola di stagione.js). */
(function () {
  var io = document.currentScript, ROOT = new URL('./', io && io.src ? io.src : location.href).href;
  var URLDB = 'https://qmjqfgmvimsuxvghetgi.supabase.co', KEY = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
  var TONI = ['Sicuro', 'Umile', 'Provocatorio'];
  var NG = 34;   /* giornate del campionato (calcoli/aspettative.json, giornate_totali) */
  /* Le stesse cifre di calcoli/fiducia.py: esito per la pesa della promessa, più il tono, per il peso della giornata */
  var BASE = { v: 1.5, n: -1, p: -4 }, TONO = { 2: { v: 0.5, p: -1.5, n: -0.5 }, 1: { v: 0.5 } };
  var D = null, F = null, CONF = null, PROM = null, stato = 0, quando = 0, sel = { a: null, b: null };

  /* risposte della conferenza bloccate dopo la pubblicazione: quella scelta resta accesa, le altre si spengono */
  try {
    var st = document.createElement('style');
    st.textContent = '.opts button[disabled]{cursor:default}.opts button[disabled][aria-pressed="false"]{opacity:.4}.cfree[disabled]{opacity:.8}'
      + '.cf-tt-sel select{flex:1 1 140px;max-width:none}.cf-sum small{display:block;min-height:2.4em}.cf-avv a.btn,.cf-giudizio a.btn{text-decoration:none}'
      + '.cf-ss{padding:9px 0;border-top:1px solid var(--line)}.cf-sala h3+p+.cf-ss,.cf-sala h3+.cf-ss{border-top:0}.cf-silenzio{font-style:italic;margin-top:4px}.cdfree{width:100%}'
      + '@media (max-width:400px){.cf-sum{grid-template-columns:repeat(2,minmax(0,1fr))!important;row-gap:12px}.cf-sum small{min-height:0}}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x, d) { return Number(x).toFixed(d == null ? 1 : d).replace('.', ','); }
  function segno(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + num(Math.abs(x)); }
  function hnd(n) { return String(n).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  /* funzioni della pagina (app.html le passa in window.GirrrApp: il suo script è chiuso e non le rende globali) */
  function fa(n) { var a = window.GirrrApp || {}; return typeof a[n] === 'function' ? a[n] : null; }
  function mg(t) { return fa('mg') ? fa('mg')(t) : t; }
  function j(u) { return fetch(ROOT + u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function rpc(n) {
    return fetch(URLDB + '/rest/v1/rpc/' + n, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function ridisegna() { if (fa('render')) try { fa('render')(); } catch (e) {} }
  function carica() {
    if (stato === 1 || (stato === 2 && Date.now() - quando < 120000)) return;
    stato = 1;
    Promise.all([j('data.json'), j('girrr/dati/fiducia.json'), rpc('conf_pubbliche'), rpc('conf_promesse')]).then(function (x) {
      D = x[0]; F = x[1]; CONF = Array.isArray(x[2]) ? x[2] : CONF; PROM = Array.isArray(x[3]) ? x[3] : PROM;
      stato = 2; quando = Date.now(); ridisegna();
    });
  }
  function pronto() { carica(); return !!D; }
  function attesa(t) { return '<div class="card"><h3>' + E(t) + '</h3><p class="sm mut">Carico i dati…</p></div>'; }

  /* ---------- risultati (solo giornate già pubblicate sul sito) ---------- */
  function pubblicato(sa) {
    var v = (D.votiTs || {})[sa], c = (D.calcTs || {})[sa];
    if (!v && !c) return true;
    return Date.now() >= Math.max(v ? Date.parse(v) : 0, c ? Date.parse(c) : 0) + 3600000;
  }
  function gol(s) { var r = /^(\d+)\s*-\s*(\d+)$/.exec(s || ''); return r ? [+r[1], +r[2]] : null; }
  function giocata(g, coppa) { return (g.m || []).length && g.m.every(function (m) { return gol(m[coppa ? 5 : 4]); }) && pubblicato(g.sa); }
  /* esito della squadra t alla giornata n del campionato: v vinta, n pari, p persa; null se non ancora giocata o pubblicata */
  function esito(t, n) {
    var g = (D.cal.lega || []).filter(function (x) { return x.n === n; })[0];
    if (!g || !giocata(g)) return null;
    for (var i = 0; i < g.m.length; i++) {
      var m = g.m[i], r = gol(m[4]); if (!r) continue;
      if (m[0] === t) return r[0] > r[1] ? 'v' : r[0] < r[1] ? 'p' : 'n';
      if (m[3] === t) return r[1] > r[0] ? 'v' : r[1] < r[0] ? 'p' : 'n';
    }
    return null;
  }
  function avversario(t, n) {
    var g = (D.cal.lega || []).filter(function (x) { return x.n === n; })[0];
    if (!g) return '';
    for (var i = 0; i < g.m.length; i++) { if (g.m[i][0] === t) return g.m[i][3]; if (g.m[i][3] === t) return g.m[i][0]; }
    return '';
  }
  /* Chi parla e quale partita, come nei post di Girrr Sport (calcoli/post_curva.py): «DJ Cst Brazil, allenatore di Oranje VC»,
     «Mariana Coneja - Oranje VC» nell'ordine del calendario */
  function chiParla(x) { var a = mg(x); if (a === x) return x; a = a.charAt(0).toUpperCase() + a.slice(1); return a + ', ' + (/&| e /.test(a) ? 'allenatori' : 'allenatore') + ' di ' + x; }
  function partitaDi(x, n) {
    var g = (D.cal.lega || []).filter(function (z) { return z.n === n; })[0], m = g && g.m.filter(function (z) { return z[0] === x || z[3] === x; })[0];
    return m ? m[0] + ' - ' + m[3] : x;
  }
  function tono(c) {
    var r = (c && c.risposte || []).filter(function (x) { return x && x.t; });
    return r.length === 3 ? Math.min(2, Math.floor(r.reduce(function (a, x) { return a + (+x.k || 0); }, 0) / 3 + 0.5)) : null;
  }
  function peso(n) { return 0.2 + 0.8 * Math.min(1, n / NG); }
  function effetto(p, e) {
    var f = F && F.squadre && F.squadre[p.team], q = f && (f.promesse || []).filter(function (x) { return x.giornata === p.giornata; })[0];
    if (q && q.effetto != null) return q.effetto;   /* calcolato dal workflow (fiducia.py), quando c'è */
    var x = BASE[e] * (p.pesa || 1) + ((TONO[p.tono] || {})[e] || 0);
    return Math.round(x * peso(p.giornata) * 10) / 10;
  }

  /* ---------- 4. Cosa ha detto l'avversario (pagina Conferenza) ---------- */
  /* ---------- 5.8 · Redazione di Girrr Sport (redazione/ISTRUZIONI.md nel registro) ----------
     girrr/dati/redazione.json, scritto dietro le quinte da Claude e controllato da redazione/controlla.py: domande della conferenza
     su misura per ogni squadra e giudizi delle risposte scritte a mano. Se manca, la Conferenza usa le domande di sempre. */
  var RED = null, redScelta = {};
  fetch(ROOT + 'girrr/dati/redazione.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.controllato && j.domande) { RED = j; ridisegna(); } }).catch(function () {});
  /* domande della redazione per la squadra e la giornata; null = domande di sempre. Se la conferenza è già nel database con
     altre frasi, o se la persona aveva già scelto qualcosa prima che arrivassero, restano quelle di prima (niente cambi a metà). */
  window.GirrrRedazioneQs = function (t, G, salvate, giaScelto) {
    if (!RED || RED.giornata !== G || !RED.domande[t]) return null;
    var k = t + '|' + G;
    if (redScelta[k] === undefined) redScelta[k] = !giaScelto;
    if (!redScelta[k]) return null;
    var Q = RED.domande[t];
    if (salvate && salvate.length) {
      var tutte = salvate.every(function (s, i) { return s.a === 'free' || (Q[i] && Q[i].a.some(function (a) { return a.t === s.t; })); });
      if (!tutte) return null;
    }
    return Q.map(function (q) { return { q: q.q, a: q.a.map(function (a) { return { t: a.t, k: a.k, w: a.w }; }), red: 1 }; });
  };
  /* il giornalista ha letto le risposte scritte a mano: giudizio, nota e domanda successiva */
  function giudizio(t, G) {
    if (!RED || !RED.giudizi) return '';
    var h = '';
    [G, G - 1].forEach(function (g) {
      var x = RED.giudizi[t + '|' + g], y = RED.giudizi[t + '|' + g + '|dopo'];
      [[x, 'Vigilia della ' + g + 'ª giornata'], [y, 'Dopo la ' + g + 'ª giornata']].forEach(function (z) {
        var v = z[0]; if (!v) return;
        h += '<div class="cf-ss"><div class="mut sm">' + z[1] + '</div>' + (v.risposte || []).map(function (r) {
          return '<p class="sm" style="margin:6px 0 4px">' + E(r.nota) + '</p><div class="row" style="gap:6px;flex-wrap:wrap"><span class="tag">Tono: ' + TONI[r.k] + '</span>'
            + (r.w ? '<span class="tag g">Promessa</span>' : '') + (r.pubblicabile ? '' : '<span class="tag" style="color:var(--bad);border-color:var(--bad)">Non riportata</span>') + '</div>';
        }).join('') + (v.domanda_dopo ? '<p style="margin-top:8px;font-weight:700">«' + E(v.domanda_dopo) + '»</p><a class="btn o" href="curva.html?scrivi=' + encodeURIComponent('@girrr_sport ') + '" style="display:inline-block;margin-top:8px">Rispondi in Curva</a>' : '') + '</div>';
      });
    });
    return h ? '<div class="card cf-giudizio"><h3>Il giornalista ha letto</h3><p class="sm mut" style="margin:4px 0 6px">La redazione di Girrr Sport sulle tue risposte scritte a mano.</p>' + h + '</div>' : '';
  }

  window.GirrrConfAvv = function (t, o, G) {
    var tit = 'Cosa ha detto ' + o;
    if (!o || o === 'avversario') return '';
    carica();
    if (!CONF) return stato === 2 ? '' : attesa(tit);
    var c = CONF.filter(function (x) { return x.team === o && x.giornata === G; })[0];
    var scrivi = 'curva.html?scrivi=' + encodeURIComponent('@' + hnd(o) + ' ');
    var h = '<div class="card cf-avv"><h3>' + E(tit) + '</h3>';
    if (!c) {
      h += '<p class="sm mut">' + E(o) + ' non ha ancora parlato in conferenza stampa. Quando lo farà, le sue parole compaiono qui.</p>'
        + '<a class="btn o" href="' + scrivi + '" style="display:inline-block;margin-top:10px">Scrivigli in Curva</a></div>';
      return giudizio(t, G) + h + salaStampa(t, o, G) + window.GirrrConfDopo(t);
    }
    var r = (c.risposte || []).map(function (x) { return x && x.t; }).filter(Boolean), k = tono(c);
    var testo = '<b>CONFERENZA STAMPA</b> · ' + E(D ? partitaDi(o, G) : o + ' - ' + t) + '<br>' + E(chiParla(o)) + ': '
      + (r.length === 3 ? '«' + E(r[0]) + '» Su ' + E(t) + ': «' + E(r[1]) + '» Alla dirigenza: «' + E(r[2]) + '»' : r.map(function (x) { return '«' + E(x) + '»'; }).join(' '));
    h += (fa('gsPost') ? fa('gsPost')(testo, 'Giornata ' + G) : '<div class="post"><q>' + testo + '</q></div>');
    h += '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">' + (k != null ? '<span class="tag g">Tono: ' + TONI[k] + '</span>' : '')
      + (c.promessa ? '<span class="tag">Ha fatto una promessa</span>' : '<span class="tag">Nessuna promessa</span>') + '</div>';
    if (c.promessa) h += '<p class="sm" style="margin-top:8px">Se perde, la sua dirigenza se lo segna: «' + E(c.promessa) + '»</p>';
    h += '<a class="btn" href="' + scrivi + '" style="display:inline-block;margin-top:12px">Rispondi in Curva</a></div>';
    return giudizio(t, G) + h + salaStampa(t, o, G) + window.GirrrConfDopo(t);
  };

  /* ---------- Sala stampa: cosa hanno detto gli altri (o «Silenzio stampa») ---------- */
  function squadre() { return (D && D.teams || []).map(function (x) { return x.name; }); }
  function salaStampa(t, o, G) {
    if (!D || !CONF) return '';
    var altri = squadre().filter(function (x) { return x !== t && x !== o; });
    var h = '<div class="card cf-sala"><h3>Sala stampa · Giornata ' + G + '</h3><p class="sm mut" style="margin:4px 0 6px">Le conferenze delle altre squadre alla vigilia.</p>';
    altri.forEach(function (x) {
      var c = CONF.filter(function (z) { return z.team === x && z.giornata === G; })[0], k = tono(c), av = avversario(x, G);
      h += '<div class="cf-ss">' + '<div class="row" style="gap:6px;flex-wrap:wrap"><b>' + E(x) + '</b>' + (av ? '<span class="mut sm">Contro ' + E(av) + '</span>' : '') + '</div>';
      if (!c) h += '<p class="sm mut cf-silenzio">Silenzio stampa.</p></div>';
      else {
        h += '<p class="sm" style="margin:4px 0">' + (c.risposte || []).filter(function (z) { return z && z.t; }).map(function (z) { return '«' + E(z.t) + '»'; }).join(' ') + '</p>'
          + '<div class="row" style="gap:6px;flex-wrap:wrap">' + (k != null ? '<span class="tag">Tono: ' + TONI[k] + '</span>' : '') + (c.promessa ? '<span class="tag g">Promessa</span>' : '') + '</div></div>';
      }
    });
    return h + '</div>';
  }

  /* ---------- Conferenza del dopo partita (sotto la conferenza stampa) ----------
     Una domanda sul risultato vero dell'ultima giornata pubblicata, tre risposte (Sicuro, Umile, Provocatorio) o una scritta a mano.
     Si salva con conf_dopo_salva (rilascio/conferenze/dopo.sql: serve il «vai» di Gianluca sul database); finché la funzione non c'è
     si vede tutto ma non si salva niente. Sotto: la Sala stampa del dopo partita, con «Silenzio stampa» per chi non ha parlato. */
  var DOPO = null, dopoAttivo = null, ds = { g: 0, a: null, free: '' }, dsInvio = false;
  function rpcCorpo(n, corpo) {
    return fetch(URLDB + '/rest/v1/rpc/' + n, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) })
      .then(function (r) { return r.text().then(function (x) { var y = null; try { y = x ? JSON.parse(x) : null; } catch (e) {} return { ok: r.ok, status: r.status, j: y }; }); });
  }
  function caricaDopo(forza) {
    if (dopoAttivo !== null && !forza) return;
    dopoAttivo = dopoAttivo || false;
    rpcCorpo('conf_dopo_pubbliche').then(function (r) {
      if (r.ok && Array.isArray(r.j)) { DOPO = r.j; dopoAttivo = true; } else { DOPO = []; dopoAttivo = false; }
      ridisegna();
    }).catch(function () { DOPO = []; ridisegna(); });
  }
  function codice() { try { var o = JSON.parse(localStorage.getItem('fg') || '{}'); return o.code || ''; } catch (e) { return ''; } }
  function ultimaGiocata(t) {
    var L = (D.cal.lega || []).filter(function (g) { return giocata(g) && g.m.some(function (m) { return m[0] === t || m[3] === t; }); });
    return L.length ? L[L.length - 1] : null;
  }
  function domandeDopo(t, g) {
    var o = avversario(t, g.n), e = esito(t, g.n), m = g.m.filter(function (x) { return x[0] === t || x[3] === t; })[0], r = gol(m[4]);
    var ris = m[0] === t ? r[0] + '-' + r[1] : r[1] + '-' + r[0];
    var pr = (PROM || []).filter(function (p) { return p.team === t && p.giornata === g.n && p.promessa; })[0];
    var q = e === 'v' ? 'Avete battuto ' + o + ' ' + ris + '. Che partita è stata?' : e === 'n' ? 'Finisce ' + ris + ' con ' + o + '. Punto guadagnato o due persi?' : 'Sconfitta ' + ris + ' con ' + o + '. Cosa è mancato?';
    if (pr) q = 'Alla vigilia avevate detto: «' + pr.promessa + '». ' + q;
    var A = e === 'v' ? ['Abbiamo fatto quello che avevamo detto: vittoria meritata.', 'Tre punti importanti, ma resta tanto da lavorare.', o + ' ha visto chi comanda.']
      : e === 'n' ? ['Un punto che ci tiene in corsa.', 'Potevamo fare di più, lo ammetto.', 'Con un po\' di fortuna in più l\'avremmo vinta noi.']
        : ['Una giornata storta: si riparte subito.', 'Hanno meritato loro, complimenti a ' + o + '.', 'Non commento: chi deve capire ha capito.'];
    return { o: o, e: e, ris: ris, q: q, a: A.map(function (x, i) { return { t: x, k: i }; }) };
  }
  window.GirrrConfDopo = function (t) {
    if (!D) return '';
    caricaDopo();
    var g = ultimaGiocata(t); if (!g) return '';
    if (ds.g !== g.n) ds = { g: g.n, a: null, free: '' };
    var Q = domandeDopo(t, g), mia = (DOPO || []).filter(function (x) { return x.team === t && x.giornata === g.n; })[0];
    var h = '<div class="card cf-dopo"><h3>Dopo la partita · Giornata ' + g.n + '</h3><p class="sm mut" style="margin:4px 0 10px">Una domanda sola, sul risultato vero. La risposta esce in Curva su Girrr Sport e non si cambia più.</p>'
      + '<div class="q"><p>' + E(Q.q) + '</p><div class="opts">';
    var dis = mia ? ' disabled' : '';
    if (mia) {
      var r0 = mia.risposta || {};
      h += Q.a.map(function (a) { return '<button aria-pressed="' + (String(r0.a) === String(a.k) && r0.t === a.t) + '" disabled>' + E(a.t) + '</button>'; }).join('')
        + (r0.a === 'free' ? '<button aria-pressed="true" disabled>' + E(r0.t) + '</button>' : '');
    } else {
      h += Q.a.map(function (a, i) { return '<button data-cdq="' + i + '" aria-pressed="' + (ds.a === i) + '">' + E(a.t) + '</button>'; }).join('')
        + (ds.a === 'free' ? '<input class="cdfree" maxlength="80" value="' + E(ds.free) + '" placeholder="Scrivi la tua risposta" autocomplete="off" enterkeyhint="done">' : '<button data-cdq="free" aria-pressed="false">Rispondo a modo mio…</button>');
    }
    h += '</div></div>';
    var scelta = mia ? mia.risposta : ds.a === 'free' ? (ds.free.trim() ? { a: 'free', t: ds.free.trim(), k: 1 } : null) : ds.a != null ? { a: ds.a, t: Q.a[ds.a].t, k: Q.a[ds.a].k } : null;
    if (scelta) h += '<div class="mut sm" style="margin-top:4px">Tono: ' + TONI[scelta.k != null ? scelta.k : 1] + '</div>';
    h += mia ? '<button class="btn" disabled style="opacity:.6;cursor:default;margin-top:12px">Pubblicata · Non si cambia più</button>'
      : '<button class="btn" id="cdpub" style="margin-top:12px"' + (scelta && !dsInvio ? '' : ' disabled') + '>Pubblica su Curva</button>';
    if (dopoAttivo === false) h += '<p class="sm mut" style="margin-top:8px">Prova: il database non ha ancora la conferenza del dopo partita, quindi qui non si salva niente.</p>';
    if (scelta) {
      var mm = g.m.filter(function (z) { return z[0] === t || z[3] === t; })[0];
      var testo = '<b>DOPO LA PARTITA</b> · ' + E(mm[0] + ' - ' + mm[3] + ' ' + mm[4]) + '<br>' + E(chiParla(t)) + ': «' + E(scelta.t) + '»';
      h += '<h4 style="margin:14px 0 6px">Come appare in Curva</h4>' + (fa('gsPost') ? fa('gsPost')(testo, mia ? 'Pubblicata' : 'Adesso') : '<div class="post"><q>' + testo + '</q></div>');
    }
    h += '</div>';
    /* Sala stampa del dopo partita */
    var altri = squadre().filter(function (x) { return x !== t; });
    h += '<div class="card cf-sala cf-sala-dopo"><h3>Sala stampa · Dopo la giornata ' + g.n + '</h3>';
    if (!dopoAttivo) h += '<p class="sm mut">Le parole delle altre squadre compaiono qui quando il database avrà la conferenza del dopo partita.</p>';
    else altri.forEach(function (x) {
      var c = DOPO.filter(function (z) { return z.team === x && z.giornata === g.n; })[0], av = avversario(x, g.n), m = g.m.filter(function (z) { return z[0] === x || z[3] === x; })[0], r = m && gol(m[4]);
      h += '<div class="cf-ss"><div class="row" style="gap:6px;flex-wrap:wrap"><b>' + E(x) + '</b>' + (r ? '<span class="mut sm">' + E(m[0]) + ' ' + r[0] + '-' + r[1] + ' ' + E(m[3]) + '</span>' : '') + '</div>'
        + (c && c.risposta && c.risposta.t ? '<p class="sm" style="margin:4px 0">«' + E(c.risposta.t) + '»</p>' : '<p class="sm mut cf-silenzio">Silenzio stampa.</p>') + '</div>';
    });
    return h + '</div>';
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cdq],#cdpub'); if (!b || b.disabled) return;
    e.preventDefault();
    if (b.id !== 'cdpub') { var v = b.dataset.cdq; ds.a = v === 'free' ? 'free' : +v; ridisegna(); if (v === 'free') { var i = document.querySelector('.cdfree'); if (i) i.focus(); } return; }
    var t = (window.GirrrApp && window.GirrrApp.me) ? window.GirrrApp.me() : null; if (!t) return;
    var g = ultimaGiocata(t), Q = domandeDopo(t, g);
    var r = ds.a === 'free' ? { a: 'free', t: ds.free.trim().slice(0, 80), k: 1 } : { a: ds.a, t: Q.a[ds.a].t, k: Q.a[ds.a].k };
    if (!r.t) return;
    dsInvio = true; ridisegna();
    rpcCorpo('conf_dopo_salva', { p_team: t, p_code: codice(), p_giornata: g.n, p_risposta: r }).then(function (x) {
      dsInvio = false;
      if (x.ok) { avviso('Dopo partita pubblicato'); caricaDopo(true); return; }
      avviso(x.status === 404 ? 'Prova: la conferenza del dopo partita non è ancora nel database. Niente è stato salvato.' : ((x.j && x.j.message) || 'Qualcosa non ha funzionato'));
      ridisegna();
    }).catch(function () { dsInvio = false; avviso('Non riesco a collegarmi: riprova tra poco'); ridisegna(); });
  });
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('.cdfree'); if (!f) return;
    ds.free = f.value.slice(0, 80);
    var b = document.getElementById('cdpub'); if (b) b.disabled = !ds.free.trim();
  });
  function avviso(m) { if (fa('toast')) fa('toast')(m); else try { alert(m); } catch (e) {} }

  /* ---------- 5. Le mie promesse (Carriera) ---------- */
  window.GirrrPromesse = function (t) {
    if (!pronto() || !PROM) return stato === 2 && !PROM ? '<div class="card"><h3>Promesse</h3><p class="sm mut">Non riesco a leggere le conferenze in questo momento: riprova tra poco.</p></div>' : attesa('Promesse');
    var toni = {};
    (CONF || []).forEach(function (c) { toni[c.team + '|' + c.giornata] = tono(c); });
    var L = PROM.filter(function (p) { return p.team === t && p.promessa; }).map(function (p) {
      var q = { team: p.team, giornata: p.giornata, promessa: p.promessa, pesa: p.pesa || 1, tono: toni[p.team + '|' + p.giornata] };
      q.esito = esito(t, p.giornata); q.effetto = q.esito ? effetto(q, q.esito) : null; q.avv = avversario(t, p.giornata);
      return q;
    }).sort(function (a, b) { return b.giornata - a.giornata; });
    var cnt = { v: 0, n: 0, p: 0 }, tot = 0;
    L.forEach(function (p) { if (p.esito) { cnt[p.esito]++; tot += p.effetto; } });
    tot = Math.round(tot * 10) / 10;
    var h = '<div class="card"><h3>Le promesse in conferenza stampa</h3><p class="sm mut" style="margin:4px 0 10px">Ogni promessa fatta in conferenza stampa la giudica il risultato: se vinci la dirigenza apprezza, se pareggi o perdi se lo segna. Più va avanti la stagione, più pesa.</p>'
      + '<div class="h2h cf-sum" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:10px 0 4px">'
      + [['Mantenute', cnt.v], ['Pareggi', cnt.n], ['Tradite', cnt.p], ['Sulla fiducia', L.some(function (p) { return p.esito; }) ? segno(tot) : '–']].map(function (x) {
        return '<div><small>' + x[0] + '</small><b class="num" style="font-size:22px;display:block;margin-top:4px">' + x[1] + '</b></div>';
      }).join('') + '</div></div>';
    h += '<div class="card"><h3>Giornata per giornata</h3>';
    if (!L.length) h += '<p class="sm mut">Nessuna promessa in questa stagione. Chi non promette niente non ha niente da farsi contestare.</p>';
    L.forEach(function (p, i) {
      var et = !p.esito ? '<span class="tag">In attesa della partita</span>' : p.esito === 'v' ? '<span class="tag o">Mantenuta</span>' : p.esito === 'n' ? '<span class="tag">Pareggio</span>' : '<span class="tag" style="color:var(--bad);border-color:var(--bad)">Tradita</span>';
      h += '<div class="cf-pr" style="padding:10px 0;border-top:' + (i ? '1px solid var(--line)' : '0') + '">'
        + '<div class="mut sm">Giornata ' + p.giornata + (p.avv ? ' · Contro ' + E(p.avv) : '') + '</div>'
        + '<p style="margin:4px 0 6px;font-weight:700">«' + E(p.promessa) + '»</p>'
        + '<div class="row" style="gap:6px;flex-wrap:wrap">' + et + (p.tono != null ? '<span class="tag">Tono: ' + TONI[p.tono] + '</span>' : '') + (p.pesa >= 2 ? '<span class="tag">Pesa doppio</span>' : '')
        + (p.effetto != null ? '<b class="num" style="margin-left:auto">' + segno(p.effetto) + ' di fiducia</b>' : '') + '</div></div>';
    });
    h += '<p class="sm mut cf-come" style="margin-top:12px;line-height:1.5">Come si calcola: promessa mantenuta +1,5, pareggio −1, tradita −4, per il peso della promessa (doppio se provocatoria). Il tono aggiunge: provocatorio +0,5 se vinci, −0,5 se pareggi, −1,5 se perdi; umile +0,5 se vinci. Tutto si moltiplica per il peso della giornata, dal 20% a inizio stagione al 100% alla fine. Stagioni passate: Dato non conservato.</p></div>';
    return h;
  };

  /* ---------- 6. Testa a testa (pagina Derby) ---------- */
  function classifica() {
    var T = {};
    (D.teams || []).forEach(function (x) { T[x.name] = { t: x.name, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0, fp: 0 }; });
    (D.cal.lega || []).forEach(function (g) {
      if (!giocata(g)) return;
      g.m.forEach(function (m) {
        var r = gol(m[4]), a = T[m[0]], b = T[m[3]]; if (!r || !a || !b) return;
        [[a, r[0], r[1], +m[1] || 0], [b, r[1], r[0], +m[2] || 0]].forEach(function (z) {
          var s = z[0]; s.g++; s.gf += z[1]; s.gs += z[2]; s.fp += z[3];
          if (z[1] > z[2]) { s.v++; s.pt += 3; } else if (z[1] === z[2]) { s.n++; s.pt++; } else s.p++;
        });
      });
    });
    var o = Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.pt - a.pt || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf || b.fp - a.fp; });
    o.forEach(function (x, i) { x.pos = i + 1; });
    return T;
  }
  function scontri(a, b) {
    var out = [];
    (D.cal.lega || []).forEach(function (g) {
      g.m.forEach(function (m) {
        if ((m[0] === a && m[3] === b) || (m[0] === b && m[3] === a)) out.push({ c: 'Campionato', n: g.n, casa: m[0], fuori: m[3], r: giocata(g) ? gol(m[4]) : null });
      });
    });
    (D.cal.cup || []).forEach(function (g) {
      g.m.forEach(function (m) {
        if ((m[1] === a && m[4] === b) || (m[1] === b && m[4] === a)) out.push({ c: 'Champions Cup', n: g.n, casa: m[1], fuori: m[4], r: giocata(g, true) ? gol(m[5]) : null });
      });
    });
    return out;
  }
  document.addEventListener('change', function (e) {
    var s = e.target.closest && e.target.closest('[data-tt]'); if (!s) return;
    sel[s.dataset.tt] = s.value; ridisegna();
  });
  window.GirrrTesta = function (a0, b0) {
    if (!pronto()) return attesa('Testa a testa');
    var nomi = (D.teams || []).map(function (x) { return x.name; });
    var a = sel.a && nomi.indexOf(sel.a) >= 0 ? sel.a : (nomi.indexOf(a0) >= 0 ? a0 : nomi[0]);
    var b = sel.b && nomi.indexOf(sel.b) >= 0 ? sel.b : (nomi.indexOf(b0) >= 0 && b0 !== a ? b0 : nomi.filter(function (x) { return x !== a; })[0]);
    if (b === a) b = nomi.filter(function (x) { return x !== a; })[0];
    function scelta(k, v) {
      return '<select data-tt="' + k + '" aria-label="' + (k === 'a' ? 'Prima squadra' : 'Seconda squadra') + '">' + nomi.map(function (x) {
        return '<option value="' + E(x) + '"' + (x === v ? ' selected' : '') + '>' + E(x) + '</option>';
      }).join('') + '</select>';
    }
    var h = '<div class="card cf-tt"><h3>Testa a testa</h3><p class="sm mut" style="margin:4px 0 10px">Scegli due squadre: gli scontri della stagione, la classifica a confronto e, se è un Derby, la sua storia.</p>'
      + '<div class="row cf-tt-sel" style="gap:8px;flex-wrap:wrap">' + scelta('a', a) + scelta('b', b) + '</div>';
    if (a === b) return h + '<p class="sm mut" style="margin-top:10px">Scegli due squadre diverse.</p></div>';
    var S2 = scontri(a, b), bil = { a: 0, n: 0, b: 0 };
    S2.forEach(function (x) {
      if (!x.r) return;
      var ga = x.casa === a ? x.r[0] : x.r[1], gb = x.casa === a ? x.r[1] : x.r[0];
      if (ga > gb) bil.a++; else if (ga < gb) bil.b++; else bil.n++;
    });
    h += '<div class="h2h" style="grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);margin-top:14px"><div><small>' + E(a) + '</small><b class="num" style="font-size:28px;display:block">' + bil.a + '</b><span class="mut sm">Vittorie</span></div>'
      + '<div><small>Pareggi</small><b class="num" style="font-size:28px;display:block">' + bil.n + '</b><span class="mut sm">&nbsp;</span></div>'
      + '<div><small>' + E(b) + '</small><b class="num" style="font-size:28px;display:block">' + bil.b + '</b><span class="mut sm">Vittorie</span></div></div>';
    h += '<h4 style="margin:14px 0 6px">Scontri della stagione</h4>';
    if (!S2.length) h += '<p class="sm mut">In questa stagione non si affrontano.</p>';
    S2.forEach(function (x) {
      h += '<div class="row" style="padding:7px 0;border-top:1px solid var(--line);gap:8px;flex-wrap:wrap"><span class="tag" style="' + (x.c === 'Campionato' ? 'border-color:#d62839' : 'border-color:#4cc9f0') + '">' + x.c + '</span>'
        + '<span class="grow" style="flex:1 1 180px;min-width:0">' + E(x.casa) + ' <b class="num">' + (x.r ? x.r[0] + ' - ' + x.r[1] : 'vs') + '</b> ' + E(x.fuori) + '</span>'
        + '<span class="mut sm">' + (x.c === 'Campionato' ? x.n + 'ª giornata' : x.n + 'ª giornata di Coppa') + (x.r ? '' : ' · Da giocare') + '</span></div>';
    });
    var C = classifica(), A = C[a], B = C[b];
    if (A && B) {
      var righe = [['Posizione', A.pos + '°', B.pos + '°'], ['Punti', A.pt, B.pt], ['Vittorie · Pareggi · Sconfitte', A.v + ' · ' + A.n + ' · ' + A.p, B.v + ' · ' + B.n + ' · ' + B.p], ['Gol fatti · Subiti', A.gf + ' · ' + A.gs, B.gf + ' · ' + B.gs]];
      h += '<h4 style="margin:14px 0 6px">Classifica a confronto</h4><div class="cf-cl">' + righe.map(function (r) {
        return '<div class="row" style="padding:6px 0;border-top:1px solid var(--line);gap:8px"><b class="num" style="flex:1;text-align:left">' + r[1] + '</b><span class="mut sm" style="flex:2;text-align:center">' + r[0] + '</span><b class="num" style="flex:1;text-align:right">' + r[2] + '</b></div>';
      }).join('') + '</div>';
    }
    var der = !!(fa('isDer') && fa('isDer')(a, b)), ri = fa('rvInfo') ? fa('rvInfo')(a, b) : null;
    h += '<h4 style="margin:14px 0 6px">' + (der ? 'Il Derby' : 'La rivalità') + '</h4>';
    if (ri) {
      var o = ri.o || {};
      h += (der ? '<p style="font-weight:800;margin-bottom:6px">' + E(fa('derName') ? fa('derName')(o.a ? o : { a: a, b: b }) : 'Derby') + '</p>' : '')
        + '<p class="sm">Rivalità: <b>' + (fa('rvWord') ? fa('rvWord')(ri.riv) : ri.riv) + '</b> · Stagioni insieme: <b>' + (o.h || 0) + '</b> · Nelle zone alte insieme: <b>' + (o.z || 0) + '</b></p>'
        + (o.s ? '<p class="sm mut" style="margin-top:6px">' + E(o.s) + '</p>' : '');
    }
    h += '<p class="sm mut" style="margin-top:12px">Scontri diretti delle stagioni passate: Dato non conservato. Allenatori: ' + E(mg(a)) + ' e ' + E(mg(b)) + '.</p></div>';
    return h;
  };
})();
