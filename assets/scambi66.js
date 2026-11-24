/* O Girrr 6.6 · Scambi nell'app (Claude, 24 novembre 2026, decisioni di Gianluca).
   Va in assets/scambi66.js del sito, incluso dallo Spogliatoio (index.html) DOPO lo script principale.
   Lo script principale espone window.SC66 (squadra, codice, dati, scelta di «Valuta uno scambio») e chiama:
   - SC66btn(squadra, dai, ricevi): il pulsante «Effettua lo scambio» sotto la valutazione, quando lo scambio è valido;
   - SC66box(): l'elenco «Richieste di scambio» in cima a Mercato Scambi.
   Database: sql/scambi-66.sql (funzioni scambio_proponi, scambio_rispondi, scambio_stato). Senza quelle funzioni
   (prima del «Vai» per l'SQL) l'elenco dice che gli scambi non sono ancora attivi e il pulsante non manda niente.
   Regole: niente crediti; la conferma la dà l'altra squadra, Gianluca (Oranje VC) o un altro allenatore come testimone,
   mai chi ha registrato lo scambio; vale la prima conferma (anche quella automatica da Leghe). */
(function () {
  'use strict';
  var SUP = 'https://qmjqfgmvimsuxvghetgi.supabase.co', KEY = 'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
  var stato = null, errore = '', carico = false, bozza = null, msg = '', occupato = false;
  var evidenzia = (/[?&]scambio=(\d+)/.exec(location.search) || [])[1] || '';
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ctx() { return window.SC66 && window.SC66.ctx ? window.SC66.ctx() : null; }
  function nomeSq(t) { return t; }   /* «The Blues Brothers» lo scrive nomi.js su tutta la pagina */
  function rpc(nome, corpo) {
    return fetch(SUP + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.text().then(function (x) { var j = null; try { j = x ? JSON.parse(x) : null; } catch (e) {} if (!r.ok) { var m = j && j.message || 'Errore di rete'; if (r.status === 404 || /Could not find the function/.test(m)) m = 'NON_ATTIVO'; throw new Error(m); } return j; }); });
  }
  function ruolo(id) { var c = ctx(), p = c && c.D.P[id]; return p ? p.r : '?'; }
  function nomeG(s, id) { var n = s.nomi && s.nomi[id], c = ctx(), p = c && c.D.P[id]; return (n && n.n) || (p && p.n) || 'Giocatore'; }
  function squadraG(s, id) { var n = s.nomi && s.nomi[id], c = ctx(), p = c && c.D.P[id]; return (n && n.t) || (p && p.t) || ''; }
  function pill(s, id) { return '<span class="mkp"><i class="rb ' + E(ruolo(id)) + '">' + E(ruolo(id)) + '</i><span><b>' + E(nomeG(s, id)) + '</b><small>' + E(squadraG(s, id)) + '</small></span></span>'; }

  function carica() {
    var c = ctx(); if (carico) return; carico = true;
    rpc('scambio_stato', c && c.authed ? { p_team: c.team, p_code: c.code } : {})
      .then(function (j) { stato = j || { scambi: [] }; errore = ''; })
      .catch(function (e) { errore = e.message; stato = stato || { scambi: [] }; })
      .then(function () { carico = false; ridisegna(); if (evidenzia) vai(); });
  }
  function vai() {
    var el = document.getElementById('sc66-' + evidenzia); if (!el) return;
    el.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'center' }); el.classList.add('sc66-luce'); evidenzia = '';
  }
  function ridisegna() { var b = document.getElementById('sc66'); if (b) { b.innerHTML = corpo(); } var f = document.getElementById('sc66-fai'); if (f && bozza) f.outerHTML = bottone(bozza.a, bozza.dai, bozza.ricevi); }

  var ETI = { attesa: 'In attesa di conferma', confermato: 'Ufficiale', rifiutato: 'Rifiutato', annullato: 'Annullato', scaduto: 'Scaduto', non_valido: 'Non valido' };
  function chiConferma(s) {
    return s.conferma === 'squadra' ? 'Confermato da ' + nomeSq(s.a) : s.conferma === 'lega' ? 'Confermato dalla Lega' :
      s.conferma === 'testimone' ? 'Confermato da ' + nomeSq(s.confermato_da) + ' come testimone' : s.conferma === 'leghe' ? 'Confermato da Leghe Fantacalcio' : '';
  }
  function scheda(s, c) {
    var me = c && c.authed ? c.team : '', att = s.stato === 'attesa';
    var az = '';
    if (att && me && me !== s.da) az += '<button class="btn pri" data-sc66-ok="' + s.id + '">' + (me === s.a ? 'Conferma lo scambio' : me === 'Oranje VC' ? 'Conferma per la Lega' : 'Conferma come testimone') + '</button>';
    if (att && me === s.a) az += '<button class="btn" data-sc66-no="' + s.id + '">Rifiuta</button>';
    if (att && me === s.da) az += '<button class="btn" data-sc66-annulla="' + s.id + '">Annulla la richiesta</button>';
    var nota = att ? (me === s.da ? 'Lo deve confermare ' + nomeSq(s.a) + ', la Lega o un altro allenatore come testimone.' : me === s.a ? nomeSq(s.da) + ' ti propone questo scambio.' : 'Puoi confermarlo se lo scambio è stato fatto davvero.') :
      s.stato === 'confermato' ? chiConferma(s) + (s.applicato ? ' · Rose aggiornate' : ' · Rose aggiornate domani mattina') : s.stato === 'non_valido' ? (s.esito || 'Le rose non lo permettono') : '';
    return '<article class="card mk sc66" id="sc66-' + s.id + '" data-stato="' + E(s.stato) + '"><div class="mkh"><span class="tagme">' + E(ETI[s.stato] || s.stato) + '</span><span class="meta">' + E(nomeSq(s.da)) + ' e ' + E(nomeSq(s.a)) + '</span></div>' +
      '<div class="mkc"><div class="mkcol"><span class="mkl">' + E(nomeSq(s.da)) + ' dà</span>' + s.dai.map(function (i) { return pill(s, i); }).join('') + '</div><div class="mkarr" aria-hidden="true">⇄</div>' +
      '<div class="mkcol"><span class="mkl">' + E(nomeSq(s.a)) + ' dà</span>' + s.ricevi.map(function (i) { return pill(s, i); }).join('') + '</div></div>' +
      (nota ? '<p class="meta sc66-nota">' + E(nota) + '</p>' : '') + (az ? '<div class="sc66-az">' + az + '</div>' : '') + '</article>';
  }
  function corpo() {
    var c = ctx();
    if (!stato) { carica(); return '<div class="empty" role="status">Carico le richieste di scambio…</div>'; }
    if (errore === 'NON_ATTIVO') return '<div class="note">Gli scambi nell\'app si attivano con la versione 6.6.</div>';
    var l = (stato.scambi || []), att = l.filter(function (s) { return s.stato === 'attesa'; }),
      rec = l.filter(function (s) { return s.stato !== 'attesa' && s.chiuso && Date.now() - Date.parse(s.chiuso) < 14 * 864e5 && ['confermato', 'rifiutato', 'non_valido'].indexOf(s.stato) >= 0; }).slice(0, 4);
    var h = (msg ? '<div class="note sc66-msg" role="status">' + E(msg) + '</div>' : '') + (errore ? '<div class="note sc66-msg ko" role="alert">' + E(errore) + '</div>' : '');
    h += att.length ? att.map(function (s) { return scheda(s, c); }).join('') : '<div class="empty">Nessuna richiesta di scambio in attesa. Per registrarne una: «Valuta uno scambio», scegli i giocatori e tocca «Effettua lo scambio».</div>';
    if (rec.length) h += '<details class="card help sc66-recenti"><summary><h3 style="display:inline">Scambi recenti</h3> <span class="meta">' + rec.length + '</span></summary>' + rec.map(function (s) { return scheda(s, c); }).join('') + '</details>';
    return h;
  }
  function bottone(a, dai, ricevi) {
    var c = ctx();
    if (!c || !c.authed) return '';
    if (errore === 'NON_ATTIVO') return '<div id="sc66-fai" class="note" style="margin-top:12px">«Effettua lo scambio» si attiva con la versione 6.6.</div>';
    var occ = (stato && stato.scambi || []).filter(function (s) { return s.stato === 'attesa' && (s.dai.concat(s.ricevi)).some(function (i) { return dai.indexOf(i) >= 0 || ricevi.indexOf(i) >= 0; }); })[0];
    if (occ) return '<div id="sc66-fai" class="note" style="margin-top:12px">Uno di questi giocatori è già in una richiesta di scambio in attesa. <a href="#sc66-' + occ.id + '" data-sc66-vai="' + occ.id + '">Vedi la richiesta</a></div>';
    if (bozza.conferma) return '<div id="sc66-fai" class="card sc66-conf" role="group" aria-label="Conferma dello scambio"><h3>Registri lo scambio con ' + E(nomeSq(a)) + '?</h3><p class="meta">Fallo solo per uno scambio già fatto o concordato su Leghe. Niente crediti. Diventa ufficiale quando lo conferma ' + E(nomeSq(a)) + ', la Lega o un altro allenatore come testimone, oppure quando arrivano le rose aggiornate da Leghe. Tutta la lega riceve la notifica.</p><div class="sc66-az"><button class="btn pri" data-sc66-invia' + (occupato ? ' disabled' : '') + '>' + (occupato ? 'Invio…' : 'Sì, invia la richiesta') + '</button><button class="btn" data-sc66-indietro>Indietro</button></div></div>';
    return '<div id="sc66-fai" class="sc66-fai"><button class="btn pri" data-sc66-fai>Effettua lo scambio</button><span class="meta">Diventa una richiesta da confermare, niente crediti</span></div>';
  }

  window.SC66btn = function (a, dai, ricevi) {
    if (!stato) carica();
    var o = bozza;
    if (!o || o.a !== a || o.dai.join() !== dai.join() || o.ricevi.join() !== ricevi.join()) bozza = { a: a, dai: dai.slice(), ricevi: ricevi.slice(), conferma: false };
    return bottone(a, dai, ricevi);
  };
  window.SC66box = function () { return '<h2 class="sec">Richieste di scambio</h2><div id="sc66" aria-live="polite">' + corpo() + '</div>'; };

  function nomi(ids) { var c = ctx(), o = {}; ids.forEach(function (i) { var p = c.D.P[i]; if (p) o[i] = { n: p.n, t: p.t, r: p.r }; }); return o; }
  function esegui(promessa, ok) {
    occupato = true; ridisegna();
    promessa.then(function (j) { msg = ok(j || {}); errore = ''; }).catch(function (e) { errore = e.message === 'NON_ATTIVO' ? 'NON_ATTIVO' : e.message; msg = ''; })
      .then(function () { occupato = false; stato = null; carica(); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target, b, c = ctx(); if (!c) return;
    if ((b = t.closest('[data-sc66-fai]'))) { bozza.conferma = true; ridisegna(); var f = document.getElementById('sc66-fai'); if (f && f.animate && !calmo) f.animate({ opacity: [0, 1], transform: ['translateY(6px)', 'none'] }, { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' }); return; }
    if ((b = t.closest('[data-sc66-indietro]'))) { bozza.conferma = false; ridisegna(); return; }
    if ((b = t.closest('[data-sc66-vai]'))) { e.preventDefault(); evidenzia = b.dataset.sc66Vai; vai(); return; }
    if ((b = t.closest('[data-sc66-invia]'))) {
      if (occupato || !bozza) return; var x = bozza;
      esegui(rpc('scambio_proponi', { p_team: c.team, p_code: c.code, p_a: x.a, p_dai: x.dai, p_ricevi: x.ricevi, p_nomi: nomi(x.dai.concat(x.ricevi)) }), function (j) {
        bozza = null; evidenzia = String(j.id || ''); if (window.SC66.fatto) window.SC66.fatto();
        return 'Richiesta inviata a ' + nomeSq(x.a) + ' e a tutta la lega. Diventa ufficiale alla prima conferma.';
      });
      return;
    }
    var az = (b = t.closest('[data-sc66-ok]')) ? 'conferma' : (b = t.closest('[data-sc66-no]')) ? 'rifiuta' : (b = t.closest('[data-sc66-annulla]')) ? 'annulla' : '';
    if (!az || occupato) return;
    var id = +(b.dataset.sc66Ok || b.dataset.sc66No || b.dataset.sc66Annulla);
    esegui(rpc('scambio_rispondi', { p_team: c.team, p_code: c.code, p_id: id, p_azione: az }), function (j) {
      if (j.gia) return j.stato === 'confermato' ? 'Era già stato confermato: lo scambio è ufficiale.' : 'Questa richiesta è già chiusa.';
      return az === 'conferma' ? 'Scambio confermato: è ufficiale. Le rose del sito si aggiornano domani mattina.' : az === 'rifiuta' ? 'Scambio rifiutato.' : 'Richiesta annullata.';
    });
  });

  var st = document.createElement('style');
  st.textContent = '.sc66-fai{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:12px}.sc66-conf{margin-top:12px;display:grid;gap:8px}.sc66-conf h3{margin:0}' +
    '.sc66-az{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sc66-nota{margin:8px 0 0}.sc66-msg.ko{color:var(--bad)}.sc66 .mkc{margin-top:4px}' +
    '.sc66[data-stato=confermato] .tagme{background:var(--ok);color:#06210f}.sc66[data-stato=rifiutato] .tagme,.sc66[data-stato=non_valido] .tagme{background:var(--bad);color:#fff}' +
    '.sc66-luce{animation:sc66luce 1.6s ease 2}@keyframes sc66luce{50%{box-shadow:0 0 0 3px var(--hl),0 0 22px rgba(var(--halo),.6)}}' +
    '.sc66-recenti summary{cursor:pointer}@media(prefers-reduced-motion:reduce){.sc66-luce{animation:none;outline:3px solid var(--hl)}}';
  document.head.appendChild(st);
  if (evidenzia && window.SC66 && window.SC66.apri) window.SC66.apri();
})();
