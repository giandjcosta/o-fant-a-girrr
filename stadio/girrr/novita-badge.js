/* Il bollino "Novità" resta per 15 giorni dal rilascio e poi sparisce da solo, ovunque. La data di rilascio è una sola, in novita-dati.js (RILASCIO). */
(function(){var R=(window.NOV&&window.NOV.rilascio)||'',t=Date.parse(R+'T00:00:00');
  var attivo=t&&Date.now()<t+15*864e5;
  var st=document.createElement('style');
  st.textContent='.nt-nv{display:inline-block;margin-left:8px;border-radius:999px;background:var(--acc);color:#fff;font:900 10px Inter,system-ui,sans-serif;letter-spacing:.14em;padding:3px 8px;vertical-align:middle;text-transform:uppercase}'+(attivo?'':'.nt-nv{display:none!important}');
  document.head.appendChild(st)})();
