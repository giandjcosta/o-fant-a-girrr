/* Testo più grande sulla TV (Claude, 10 novembre 2026, Gianluca: «che si veda solo nella TV»).
   Va nella radice del sito (/o-fant-a-girrr/tv.js), incluso da tutte le pagine di Lega e Stadio e dallo Spogliatoio.
   Riconosce i browser delle smart TV (Samsung Tizen, LG webOS, Android TV e Google TV, Fire TV, Sony, Hisense, Philips…)
   e ingrandisce tutta la pagina del 30% con lo zoom: su telefoni, tablet e PC non cambia niente.
   Per provarlo da un PC: aggiungere ?tv all'indirizzo (vale solo per quella pagina). Rispetta «riduci movimento»: nessuna animazione. */
(function () {
  var ua = navigator.userAgent || '';
  var tv = /SMART-?TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|GoogleTV|Android TV|AndroidTV|AFT[A-Z]|CrKey|HbbTV|VIDAA|Hisense|Philips|Roku|PlayStation|Xbox|Viera|AQUOS|\bTV\b/i.test(ua)
    && !/iPhone|iPad|Mobile/i.test(ua);
  if (/[?&]tv(=|&|$)/.test(location.search)) tv = true;
  if (!tv) return;
  var css = 'html.tv-grande{zoom:1.3}'
    + 'html.tv-grande body{overflow-x:hidden}';
  var st = document.createElement('style'); st.id = 'tv-grande'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.classList.add('tv-grande');
})();
/* 6.2.2 · Niente alone al tocco (Gianluca): su telefono il browser colorava di azzurro o di grigio il riquadro
   di «‹ O Girrr» e degli altri link mentre si premono. tv.js è in tutte le pagine di Lega, Stadio e Spogliatoio. */
(function () { try { var s = document.createElement('style'); s.textContent = 'a,button,summary,label,[role=button]{-webkit-tap-highlight-color:transparent}a:focus:not(:focus-visible),button:focus:not(:focus-visible){outline:none}.back:active{opacity:.7}'; (document.head || document.documentElement).appendChild(s); } catch (e) {} })();
