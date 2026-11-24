/* Quando il sito e' aperto come app (aggiunto alla Home) non c'e' la barra del browser e su iPhone non si puo'
   ricaricare con il gesto: nella Home mettiamo un pulsante Aggiorna, nelle altre pagine si trascina in giù (6.5.1), e ricarichiamo da soli se si rientra dopo un po'. */
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
  /* 6.5.1 (Gianluca, 24 novembre): il pulsante Aggiorna solo nella Home; nelle altre pagine si ricarica trascinando in giù dall'alto */
  var home=/\/girrr\/(index\.html)?$/.test(location.pathname);
  if(home)bar.appendChild(b);
  function monta(){if(document.body)document.body.insertBefore(bar,document.body.firstChild);else setTimeout(monta,50)}
  monta();
  if(!home){
    var ri=document.createElement('div');ri.className='app-tira';ri.setAttribute('aria-hidden','true');ri.innerHTML='<i>\u21BB</i>';
    var st2=document.createElement('style');
    st2.textContent='.app-tira{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:60;width:34px;height:34px;margin-left:-17px;border-radius:50%;background:rgba(20,29,61,.85);border:1px solid rgba(255,255,255,.25);color:#fbf6ec;display:flex;align-items:center;justify-content:center;font:800 18px Inter,system-ui,sans-serif;opacity:0;transform:translateY(-44px);pointer-events:none}.app-tira.su{transition:transform .25s,opacity .25s}.app-tira.gira i{animation:app-gira .7s linear infinite}@keyframes app-gira{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.app-tira.gira i{animation:none}}';
    document.head.appendChild(st2);
    (function m(){if(document.body)document.body.appendChild(ri);else setTimeout(m,50)})();
    var y0=null,dy=0;
    document.addEventListener('touchstart',function(e){y0=(window.scrollY<=0&&e.touches.length===1&&!(e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]')))?e.touches[0].clientY:null;dy=0;ri.classList.remove('su')},{passive:true});
    document.addEventListener('touchmove',function(e){if(y0===null)return;dy=e.touches[0].clientY-y0;if(window.scrollY>0||dy<=0){ri.style.opacity=0;ri.style.transform='translateY(-44px)';return}
      var k=Math.min(dy/90,1);ri.style.opacity=k;ri.style.transform='translateY('+(Math.min(dy*.5,54)-44)+'px)';ri.firstChild.style.transform='rotate('+(dy*3)+'deg)'},{passive:true});
    function fine(){if(y0===null)return;y0=null;ri.classList.add('su');
      if(dy>=90){ri.classList.add('gira');ri.style.transform='translateY(10px)';setTimeout(function(){location.reload()},250)}
      else{ri.style.opacity=0;ri.style.transform='translateY(-44px)'}}
    document.addEventListener('touchend',fine,{passive:true});document.addEventListener('touchcancel',fine,{passive:true});
  }
  /* Se si torna nell'app dopo piu' di 3 minuti si aggiorna da sola (tranne in Totogirrr, per non perdere una schedina a meta') */
  var via=0,bet=/totogirrr/.test(location.pathname);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){via=Date.now();return}
    if(!bet&&via&&Date.now()-via>180000)location.reload();
  });
})();
