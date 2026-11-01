/* Modalità ospite: si entra con ?ospite=1, resta attiva per la scheda. Sola lettura: niente Spogliatoio, scambi e Totogirrr. */
(function(){
 var on=false;
 try{if(/[?&]ospite\b/.test(location.search))sessionStorage.setItem('ospite','1');on=sessionStorage.getItem('ospite')==='1'}catch(e){on=/[?&]ospite\b/.test(location.search)}
 if(!on)return;
 window.OSPITE=true;
 if(/totogirrr\.html$/.test(location.pathname)){location.replace('index.html');return}
 var st=document.createElement('style');
 st.textContent='a[href="../index.html"],a[href^="totogirrr"],.lg-leghe,#mst,.c.bet{display:none!important}.osp{position:sticky;top:0;z-index:99;background:#ffd166;color:#1d2a52;font:800 12px/1.3 Inter,system-ui,sans-serif;letter-spacing:.14em;text-align:center;padding:7px 10px;text-transform:uppercase}/* Ospite · Lega: i quattro riquadri grandi con la descrizione, 2+2 da tablet in su (mai 3+1) */@media(min-width:560px){body .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}}';
 document.head.appendChild(st);
 document.addEventListener('DOMContentLoaded',function(){
  var b=document.createElement('div');b.className='osp';b.textContent='Modalità ospite · Sola lettura';document.body.insertBefore(b,document.body.firstChild);
 });
})();
