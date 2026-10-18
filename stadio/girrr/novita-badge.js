/* Il bollino "Novità" sparisce da solo, ovunque, dopo l'ultimo giorno (novita-dati.js, campo "fino": fine giornata, ora del telefono). Se manca "fino" valgono 15 giorni dal rilascio. */
(function(){var R=(window.NOV&&window.NOV.rilascio)||'',t=Date.parse(R+'T00:00:00');
  var F=(window.NOV&&window.NOV.fino)||'',tf=F?Date.parse(F+'T23:59:59'):0;
  var attivo=tf?Date.now()<=tf:(t&&Date.now()<t+15*864e5);
  var st=document.createElement('style');
  st.textContent='.nt-nv{display:inline-block;margin-left:8px;border-radius:999px;background:var(--acc);color:#fff;font:900 10px Inter,system-ui,sans-serif;letter-spacing:.14em;padding:3px 8px;vertical-align:middle;text-transform:uppercase}'+(attivo?'':'.nt-nv{display:none!important}');
  document.head.appendChild(st)})();
