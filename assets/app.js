/* Quando il sito e' aperto come app (aggiunto alla Home) non c'e' la barra del browser e su iPhone non si puo'
   ricaricare con il gesto: qui mettiamo un pulsante Aggiorna e ricarichiamo da soli se si rientra dopo un po'. */
(function(){
  var sa=false;
  try{sa=window.navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)}catch(e){}
  if(!sa)return;
  var st=document.createElement('style');
  st.textContent='.app-agg{position:absolute;z-index:9999;top:calc(env(safe-area-inset-top,0px) + 8px);right:10px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(20,29,61,.82);color:#fbf6ec;font:900 19px Inter,system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:.8}.app-agg:active{transform:scale(.92)}.app-agg.gira{animation:aggiro .7s linear infinite}@keyframes aggiro{to{transform:rotate(360deg)}}';
  document.head.appendChild(st);
  var b=document.createElement('button');
  b.className='app-agg';b.type='button';b.setAttribute('aria-label','Aggiorna la pagina');b.title='Aggiorna';b.textContent='↻';
  b.onclick=function(){b.classList.add('gira');setTimeout(function(){location.reload()},150)};
  function monta(){if(document.body)document.body.appendChild(b);else setTimeout(monta,50)}
  monta();
  /* Se si torna nell'app dopo piu' di 3 minuti si aggiorna da sola (tranne in Totogirrr, per non perdere una schedina a meta') */
  var via=0,bet=/totogirrr/.test(location.pathname);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){via=Date.now();return}
    if(!bet&&via&&Date.now()-via>180000)location.reload();
  });
})();
