/* O Girrr 6.5 · Copertina di ingresso solo la prima volta che si entra nel Girrr da un dispositivo (Gianluca, 18 novembre), soltanto sulla Home
   con Notte Tropicale attiva. Non altera la grafica normale né la navigazione. */
(function(){
 'use strict';
 var h=document.documentElement;
 function avvia(){
  if(!document.body || document.body.getAttribute('data-v53')!=='home' ||
     h.getAttribute('data-event-theme')!=='notte-tropicale' ||
     h.getAttribute('data-nt-entrata-avviata'))return;
  h.setAttribute('data-nt-entrata-avviata','1');
  var q=new URLSearchParams(location.search);
  /* Ripetizione SOLO sul Lab e localhost, per le prove. Mai sul sito reale. */
  var debug=/(?:localhost|127\.0\.0\.1)$/.test(location.hostname) ||
            /\/o-girrr-registro\//.test(location.pathname);
  var forza=debug && q.get('entrata-prova')==='1';
  var giorno;
  try{
   giorno=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }catch(e){giorno=new Date().toISOString().slice(0,10);}
  var chiave='nt_entrata_vista',gia=false;   /* una volta per dispositivo, non ogni giorno */
  try{gia=localStorage.getItem(chiave)==='1';}catch(e){}
  if(gia&&!forza)return;
  var sorgente=document.currentScript;
  /* Con script dinamici document.currentScript è presente; altrimenti ripiega
     sul percorso del tema già caricato. */
  var base;
  try{base=new URL('./',sorgente&&sorgente.src?sorgente.src:
        document.querySelector('script[src*="/notte-tropicale/entrata.js"]')?.src||location.href);}catch(e){return;}
  var asset=new URL('gta6-lucia-jason-cover.webp',base).href;
  var css=new URL('entrata.css',base).href;
  if(!document.querySelector('link[data-nt-entrata-css]')){
   var stile=document.createElement('link');stile.rel='stylesheet';stile.href=css;
   stile.setAttribute('data-nt-entrata-css','');
   document.head.appendChild(stile);
  }
  var overlay=document.createElement('div');
  overlay.className='nt-ingresso';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-label','Notte Tropicale, edizione speciale dal 19 al 27 novembre');
  overlay.setAttribute('aria-modal','true');
  overlay.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;z-index:2147483200;opacity:0;display:grid;place-items:center;overflow:hidden;background:#140a2e;pointer-events:auto;transition:opacity .3s ease';
  var fondo=document.createElement('div');fondo.className='nt-ingresso-fondo';
  fondo.style.backgroundImage='url("'+asset+'")';
  var immagine=document.createElement('img');
  immagine.className='nt-ingresso-poster';immagine.alt='';
  immagine.loading='eager';immagine.decoding='async';immagine.fetchPriority='high';
  immagine.src=asset;
  immagine.addEventListener('error',function(){
    var alternativa=new URL('miami-tramonto.jpg',base).href;
    if(immagine.src!==alternativa){immagine.src=alternativa;fondo.style.backgroundImage='url("'+alternativa+'")';}
  });
  var titoli=document.createElement('div');titoli.className='nt-ingresso-titoli';
  var nome=document.createElement('strong');nome.textContent='O GIRRR';
  var sotto=document.createElement('div'),scritta=document.createElement('em');
  scritta.textContent='Notte Tropicale';
  var date=document.createElement('small');date.textContent='19–27 novembre 2026';
  sotto.append(scritta,date);titoli.append(nome,sotto);
  var salta=document.createElement('button');
  salta.type='button';salta.className='nt-ingresso-salta';
  salta.textContent='Salta ›';salta.setAttribute('aria-label',"Salta l'introduzione");
  overlay.append(fondo,immagine,titoli,salta);
  var chiuso=false,timers=[];
  function timer(fn,ms){timers.push(setTimeout(fn,ms));}
  function pulisci(){
   if(chiuso)return;chiuso=true;
   timers.forEach(clearTimeout);
   document.removeEventListener('keydown',tasto);
   overlay.remove();
  }
  function tasto(e){if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();pulisci();}}
  overlay.addEventListener('click',pulisci);
  document.addEventListener('keydown',tasto);
  document.body.appendChild(overlay);
  try{localStorage.setItem(chiave,'1');}catch(e){}
  var ridotto=false;
  try{ridotto=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  /* Due frame permettono al browser di disegnare davvero lo splash iniziale. */
  requestAnimationFrame(function(){requestAnimationFrame(function(){
   if(chiuso)return;
   overlay.style.opacity='1';overlay.classList.add('nt-ingresso-visibile');
  });});
  if(ridotto){
   overlay.style.transition='none';
   overlay.style.opacity='1';overlay.classList.add('nt-ingresso-visibile');
   timer(pulisci,1000);
  }else{
   /* 0,3 s ingresso + 1,6 s fermo + 0,5 s uscita; watchdog ≤4 s. */
   timer(function(){
    if(chiuso)return;
    overlay.classList.add('nt-ingresso-uscita');
    overlay.style.transition='opacity .5s cubic-bezier(.22,.61,.36,1)';
    overlay.style.opacity='0';overlay.style.pointerEvents='none';
   },1900);
   timer(pulisci,2450);
  }
  timer(pulisci,4000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',avvia,{once:true});
 else avvia();
})();
