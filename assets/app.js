/* Quando il sito e' aperto come app (aggiunto alla Home) non c'e' la barra del browser e su iPhone non si puo'
   ricaricare con il gesto: qui mettiamo un pulsante Aggiorna e ricarichiamo da soli se si rientra dopo un po'. */
(function(){
  var sa=false;
  try{sa=window.navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)}catch(e){}
  if(!sa)return;
  var st=document.createElement('style');
  /* con la barra di stato trasparente il sito riempie tutto lo schermo: lasciamo noi lo spazio sotto l'orologio */
  st.textContent='body{padding-top:env(safe-area-inset-top,0px)!important}.app-bar{display:flex;justify-content:flex-end;padding:6px 14px 0;position:relative;z-index:50}.app-agg{height:32px;padding:0 13px;border-radius:16px;border:1px solid rgba(255,255,255,.25);background:rgba(20,29,61,.7);color:#fbf6ec;font:800 12px Inter,system-ui,sans-serif;letter-spacing:.06em;display:flex;align-items:center;gap:6px;cursor:pointer;opacity:.85}.app-agg:active{transform:scale(.95)}.app-agg i{font-style:normal;font-size:15px;display:inline-block}.app-agg.gira i{animation:aggiro .7s linear infinite}@keyframes aggiro{to{transform:rotate(360deg)}}';
  document.head.appendChild(st);
  var bar=document.createElement('div');bar.className='app-bar';
  var b=document.createElement('button');
  b.className='app-agg';b.type='button';b.setAttribute('aria-label','Aggiorna la pagina');b.innerHTML='<i>\u21BB</i>Aggiorna';
  b.onclick=function(){b.classList.add('gira');setTimeout(function(){location.reload()},150)};
  bar.appendChild(b);
  function monta(){if(document.body)document.body.insertBefore(bar,document.body.firstChild);else setTimeout(monta,50)}
  monta();
  /* Se si torna nell'app dopo piu' di 3 minuti si aggiorna da sola (tranne in Totogirrr, per non perdere una schedina a meta') */
  var via=0,bet=/totogirrr/.test(location.pathname);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){via=Date.now();return}
    if(!bet&&via&&Date.now()-via>180000)location.reload();
  });
})();
