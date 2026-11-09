/* O Girrr · Notifiche già lette rimpicciolite (Claude, 9 novembre 2026, richiesta di Gianluca: «così non devi scrollare all'infinito»).
   Va nella radice del sito (/o-fant-a-girrr/notifiche-lette.js), incluso dalle due pagine Notifiche.
   Le notifiche nuove restano come sono. Quelle già lette (data-read="true") vanno in fondo in un gruppo chiuso,
   «Già lette · 12 ›»: un tocco lo apre con una transizione morbida e le mostra compatte, su una riga.
   La pagina (ui.js) ridisegna l'elenco quando cambi filtro o segni tutto come letto: qui si ricompone ogni volta. */
(function () {
  var stadio = /\/stadio\//.test(location.pathname), ACC = stadio ? '#ffd166' : '#d62839';
  var aperto = false; try { aperto = sessionStorage.getItem('girrr_lette_aperte') === '1'; } catch (e) {}
  var lavoro = false;

  function stile() {
    var s = document.createElement('style');
    s.textContent =
      '.nl-g{margin-top:10px}' +
      '.nl-h{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;font-weight:800;font-size:14px;color:inherit;cursor:pointer;' +
      'padding:12px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);' + (stadio ? 'border-radius:12px' : 'border-radius:4px 14px 14px 4px') + '}' +
      '.nl-h span{flex:1}.nl-h small{font-weight:700;font-size:12px;opacity:.75}' +
      '.nl-h i{font-style:normal;color:' + ACC + ';font-size:18px;line-height:1;transition:transform .35s ease}.nl-g.su .nl-h i{transform:rotate(90deg)}' +
      '.nl-c{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s ease,opacity .35s ease;opacity:0}.nl-g.su .nl-c{grid-template-rows:1fr;opacity:1}' +
      '.nl-c>div{overflow:hidden;min-height:0}' +
      /* lette compatte: una riga, senza descrizione */
      '.nl-c .v53-notifcard{margin:6px 0 0!important;opacity:.8}' +
      '.nl-c .v53-notifcard .v55-notiflink{padding-top:8px!important;padding-bottom:8px!important;min-height:0!important}' +
      '.nl-c .v55-notifdetail{display:none!important}' +
      '.nl-c .v55-notiftext b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13.5px}' +
      '.nl-c .v53-ic{transform:scale(.85)}' +
      '.nl-vuoto{padding:10px 2px 0;font-size:13px;font-weight:700;opacity:.75}' +
      '@media (prefers-reduced-motion: reduce){.nl-c,.nl-h i{transition:none!important}}';
    document.head.appendChild(s);
  }

  function componi(box) {
    if (lavoro) return;
    var lette = Array.prototype.filter.call(box.children, function (c) { return c.matches && c.matches('article.v53-notifcard[data-read="true"]'); });
    if (!lette.length) return; /* niente da raggruppare (o già raggruppate) */
    lavoro = true;
    var vecchio = box.querySelector('.nl-g'); if (vecchio) vecchio.remove();
    var nuove = box.querySelectorAll(':scope > article.v53-notifcard[data-read="false"]').length;
    var g = document.createElement('div'); g.className = 'nl-g' + (aperto ? ' su' : '');
    g.innerHTML = (nuove ? '' : '<div class="nl-vuoto">Nessuna notifica nuova.</div>') +
      '<button type="button" class="nl-h" aria-expanded="' + aperto + '"><span>Già lette · ' + lette.length + '</span><small>' + (aperto ? 'Chiudi' : 'Mostra') + '</small><i aria-hidden="true">›</i></button>' +
      '<div class="nl-c"><div></div></div>';
    var dentro = g.querySelector('.nl-c > div');
    lette.forEach(function (c) { dentro.appendChild(c); });
    box.appendChild(g);
    g.querySelector('.nl-h').onclick = function () {
      aperto = !g.classList.contains('su');
      g.classList.toggle('su', aperto); this.setAttribute('aria-expanded', String(aperto));
      this.querySelector('small').textContent = aperto ? 'Chiudi' : 'Mostra';
      try { sessionStorage.setItem('girrr_lette_aperte', aperto ? '1' : '0'); } catch (e) {}
    };
    lavoro = false;
  }

  function avvia() {
    var box = document.getElementById('v53notifications'); if (!box) return;
    stile();
    componi(box);
    if (window.MutationObserver) new MutationObserver(function () { if (!lavoro) componi(box); }).observe(box, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
