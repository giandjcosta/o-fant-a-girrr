/* Modalità ospite: si entra con ?ospite=1, resta attiva per la scheda. Sola lettura: dello Spogliatoio solo le schede pubbliche; niente scambi né Totogirrr. */
(function(){
 var on=false;
 try{if(/[?&]ospite\b/.test(location.search))sessionStorage.setItem('ospite','1');on=sessionStorage.getItem('ospite')==='1'}catch(e){on=/[?&]ospite\b/.test(location.search)}
 if(!on)return;
 if(window.OSPITE)return;window.OSPITE=true;
 if(/totogirrr\.html$/.test(location.pathname)){location.replace('index.html');return}
 var st=document.createElement('style');
 st.textContent='a[href^="totogirrr"],.lg-leghe,#mst,.c.bet{display:none!important}.osp-gm{display:block;width:max-content;max-width:100%;margin:10px auto 6px;background:#ffd166;color:#1d2a52;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;padding:6px 12px;border-radius:999px;text-transform:uppercase}/* Ospite · Lega: i quattro riquadri grandi con la descrizione, 2+2 da tablet in su (mai 3+1) */@media(min-width:560px){body .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';
 document.head.appendChild(st);
 document.addEventListener('DOMContentLoaded',function(){
  if(!/\/girrr\/(index\.html)?$/.test(location.pathname)||document.querySelector('.osp-gm'))return;var b=document.createElement('div');b.className='osp-gm';b.textContent='Guest Mode';var h=document.querySelector('header.top')||document.querySelector('.top');if(h&&h.parentNode)h.parentNode.insertBefore(b,h.nextSibling);else document.body.insertBefore(b,document.body.firstChild);
 });
})();
