/* O Girrr · Caricatore dei temi evento (Claude, 17 novembre 2026). Proposta per il lavoro di ChatGPT sul tema evento.
   Va incluso UNA volta per pagina, il prima possibile (per esempio da tv.js, che è già in tutte le pagine di Lega, Stadio e
   Spogliatoio): accende il tema solo dentro la sua finestra di date, in ora italiana, e lo decide il browser all'apertura.
   Dopo la fine il tema si spegne da solo, senza rilasci e anche nella copia offline (il service worker conserva i file, ma
   la data la legge la pagina). Lega e Stadio non cambiano: il tema è solo l'attributo data-event-theme e il suo CSS.
   Per provarlo prima o dopo: ?evento=on | off | auto oppure ?evento=<nome del tema> (ricordato per la sessione) e
   ?evento-data=2026-11-19T12:00 per simulare il giorno (vale solo per quella pagina). Con l'attributo data-solo-manuale sul
   <script> (anteprima del Lab) il tema si accende solo a mano, mai per data. Se qualcosa va storto resta la grafica di sempre. */
(function () {
  'use strict';
  var EVENTI = [
    /* id, inizio e fine (fine esclusa) in ora italiana, foglio di stile accanto a questo file */
    /* 18 novembre: tolta la voce «vice-city» (prova di ChatGPT, non scelta): era prima nell'elenco, avrebbe vinto per data e senza il suo
       file la skin non si sarebbe accesa. Resta una sola skin: dal 18 novembre (uscita del gioco) alla fine della giornata 8 (Monza–Fiorentina, 23 novembre 20:45), decisione di Gianluca. */
    { id: 'notte-tropicale', inizio: '2026-11-19T00:00:00+01:00', fine: '2026-11-28T00:00:00+01:00', css: 'notte-tropicale/notte-tropicale.css', js: 'notte-tropicale/notte-tropicale.js',
      /* la Curva ha la sua grafica chiara/scura da app (iPhone e Android): il tema non la tocca, lì il testo diventava illeggibile */
      escludi: /\/curva\.html$/,
      /* grafica unica (Gianluca, 17 novembre: «non ci sarà Lega o Stadio, sarà una grafica unica») */
      unica: true }
  ];
  try {
    var me = document.currentScript, base = me && me.src ? me.src : location.href;
    var q = new URLSearchParams(location.search), K = 'girrr-evento';
    var modo = q.get('evento'), manuale = !!(me && me.hasAttribute('data-solo-manuale'));
    var nomi = EVENTI.map(function (x) { return x.id; });
    if (modo === 'on' || modo === 'off' || nomi.indexOf(modo) >= 0) { try { sessionStorage.setItem(K, modo); } catch (e) {} }
    else if (modo === 'auto') { try { sessionStorage.removeItem(K); } catch (e) {} modo = null; }
    if (!modo) { try { modo = sessionStorage.getItem(K); } catch (e) {} }
    var ora = new Date(), sim = q.get('evento-data');
    if (sim) { var d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(sim) ? sim : sim + '+01:00'); if (!isNaN(d)) ora = d; }
    var ev = null;
    /* Skin che tornano ogni anno (negozio delle skin, Gianluca 17 novembre): con ogniAnno inizio e fine sono «MM-GGTHH:MM» e la
       finestra si calcola sull'anno in corso (anche a cavallo di Capodanno). Le skin archiviate restano qui con le loro date passate:
       non si accendono più da sole, ma si provano sempre a mano con ?evento=<nome>. */
    var finestra = function (e) {
      if (!e.ogniAnno) return [new Date(e.inizio), new Date(e.fine)];
      var y = ora.getFullYear(), a = new Date(y + '-' + e.inizio + ':00+01:00'), b = new Date(y + '-' + e.fine + ':00+01:00');
      if (b <= a) { if (ora < b) a = new Date((y - 1) + '-' + e.inizio + ':00+01:00'); else b = new Date((y + 1) + '-' + e.fine + ':00+01:00'); }
      return [a, b];
    };
    for (var i = 0; i < EVENTI.length; i++) {
      var e = EVENTI[i];
      if (modo === e.id) { ev = e; break; }
      if (nomi.indexOf(modo) >= 0) continue;   /* scelto un altro tema per nome */
      var fw = finestra(e);
      if (modo === 'on' || (!manuale && modo !== 'off' && ora >= fw[0] && ora < fw[1])) { ev = e; break; }
    }
    window.OGirrrEvento = Object.freeze({ attivo: ev ? ev.id : null, modo: modo || 'auto', ora: ora.toISOString() });
    /* Grafica unica: durante l'evento tutti vedono le pagine della Lega con il tema sopra, e l'interruttore Lega/Stadio sparisce.
       Chi aveva scelto Stadio (orr_gv = n) se lo ritrova da solo quando l'evento finisce: la scelta è messa da parte, non persa. */
    var GV = 'orr_gv', GVP = 'orr_gv_prima_evento', path = location.pathname;
    function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
    if (!ev || modo === 'off') {
      var prima = ls(GVP);
      if (prima) { ls(GV, prima); ls(GVP, null); if (prima === 'n' && /\/girrr\//.test(path) && !/\/stadio\/girrr\//.test(path)) { location.replace(path.replace('/girrr/', '/stadio/girrr/') + location.search + location.hash); } }
      return;
    }
    if (ev.unica) {
      if (ls(GV) === 'n') { ls(GVP, 'n'); ls(GV, 'a'); }
      if (/\/stadio\/girrr\//.test(path)) { location.replace(path.replace('/stadio/girrr/', '/girrr/') + location.search + location.hash); return; }
    }
    if (ev.escludi && ev.escludi.test(location.pathname)) { window.OGirrrEvento = Object.freeze({ attivo: null, modo: modo || 'auto', ora: ora.toISOString(), escluso: ev.id }); return; }
    var h = document.documentElement;
    h.setAttribute('data-event-theme', ev.id);
    /* variante dello sfondo (Notte Tropicale): ?evento-sfondo=notte|tramonto|scena; senza, la foto predefinita del tema, ricordata per la sessione */
    var sf = q.get('evento-sfondo');
    if (sf) { try { sessionStorage.setItem(K + '-sfondo', sf); } catch (e) {} } else { try { sf = sessionStorage.getItem(K + '-sfondo'); } catch (e) {} }
    if (sf && /^[a-z-]{1,20}$/.test(sf)) h.setAttribute('data-event-sfondo', sf);
    /* parti messe da parte, solo a mano per provarle: ?evento-extra=barra,menu (ricordate per la sessione), ?evento-extra=no per toglierle */
    var ex = q.get('evento-extra');
    if (ex) { try { sessionStorage.setItem(K + '-extra', ex); } catch (e) {} } else { try { ex = sessionStorage.getItem(K + '-extra'); } catch (e) {} }
    if (ex && ex !== 'no') h.setAttribute('data-event-extra', ex.split(',').filter(function (v) { return /^[a-z-]{1,20}$/.test(v); }).join(' '));
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL(ev.css, base).href; l.setAttribute('data-evento', ev.id);
    l.onerror = function () { h.removeAttribute('data-event-theme'); };   /* senza CSS niente tema a metà */
    (document.head || h).appendChild(l);
    /* Regola fissa di Gianluca (18 novembre 2026), per TUTTE le skin: l'avviso della nuova versione
       («È uscita la …») sta sempre in cima alla Home, subito sotto il titolo e sopra ogni altro blocco. */
    var r = document.createElement('style'); r.setAttribute('data-evento-regola', 'avviso-versione-in-cima');
    r.textContent = 'html[data-event-theme] body[data-v53="home"] .wrap>header.hero{order:-2!important}' +
      'html[data-event-theme] body[data-v53="home"] .wrap>.vv-avviso{order:-1!important;margin-top:0!important}';
    (document.head || h).appendChild(r);
    /* script facoltativo del tema (per esempio la barra in basso di Notte Tropicale): parte dopo il CSS, se il CSS non arriva no */
    if (ev.js) {
      var s = document.createElement('script'); s.src = new URL(ev.js, base).href; s.async = true; s.setAttribute('data-evento', ev.id);
      l.addEventListener('load', function () { (document.head || h).appendChild(s); });
    }
  } catch (err) { try { document.documentElement.removeAttribute('data-event-theme'); } catch (e2) {} }
})();
