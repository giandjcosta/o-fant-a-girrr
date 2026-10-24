/* Interruttore della grafica nella Home, a destra del titolo. Si sceglie una volta e la scelta resta (orr_gv).
   Nomi provvisori delle due grafiche: si cambiano solo qui e in confronto.html (NOMI). */
(function(){
var NOMI={a:'Lega',n:'Stadio'};
/* Stadio: fondo scuro già sulla pagina, niente lampo bianco nel cambio. Non sulla Lega: un colore su html coprirebbe le strisce di body::before */
/* Cambio fluido tra Lega e Stadio: dove il browser sa dissolvere da una pagina all'altra (Chrome, Edge, Safari recenti) lo fa lui; negli altri la pagina sfuma in uscita e rientra in entrata */
var VT=('CSSViewTransitionRule' in window);
try{var _s=document.createElement('style');_s.textContent=(location.pathname.indexOf('/stadio/girrr/')>=0?'html{background-color:#141d3d!important}':'')+(VT?'@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:.45s;animation-timing-function:ease}':'html.gsw-out body{opacity:0;transition:opacity .3s ease}'+(sessionStorage.getItem('gsw_da')?'body{animation:gswin .45s ease both}@keyframes gswin{from{opacity:0}to{opacity:1}}':''));document.head.appendChild(_s)}catch(x){}
function go(){
var h=document.querySelector('.hero');if(!h||document.getElementById('gsw'))return;
var nuova=location.pathname.indexOf('/stadio/girrr/')>=0;
var st=document.createElement('style');
st.textContent='.hero{position:relative}#gsw{position:absolute;top:0;right:0;z-index:2;display:flex;gap:2px;padding:3px;border-radius:999px;background:rgba(20,29,61,.94);border:1px solid rgba(255,255,255,.22);user-select:none;-webkit-tap-highlight-color:transparent}#gsw{position:absolute}#gsw .th{position:absolute;top:3px;bottom:3px;left:0;width:0;border-radius:999px;background:#d62839;z-index:0;pointer-events:none;transition:transform .32s cubic-bezier(.3,.9,.3,1),width .32s cubic-bezier(.3,.9,.3,1),background-color .32s}#gsw .th.n{background:#ffd166}#gsw button{position:relative;z-index:1;border:0;border-radius:999px;padding:5px 13px;font:800 11.5px Inter,system-ui,sans-serif;letter-spacing:.04em;color:#fbf6ec;background:transparent;opacity:.7;cursor:pointer;transition:background-color .35s,color .35s,opacity .35s}#gsw button[aria-pressed=true]{opacity:1;color:#fff;cursor:default}#gsw button[data-m=n][aria-pressed=true]{color:#1d2a52}#gsw.mv button[data-m=a]{color:#fff}#gsw.mv button{transition:color .32s,opacity .32s}@media(max-width:700px){.hero:not(.gsw-su){padding-top:40px}}.app-bar #gsw{position:relative;margin-right:8px;align-self:center}';
document.head.appendChild(st);
var d=document.createElement('div');d.id='gsw';d.setAttribute('role','group');d.setAttribute('aria-label','Grafica');
d.innerHTML=['a','n'].map(function(m){return '<button data-m="'+m+'" aria-pressed="'+((m==='n')===nuova)+'">'+NOMI[m]+'</button>'}).join('');
var th=document.createElement('i');th.className='th'+(nuova?' n':'');d.insertBefore(th,d.firstChild);
function pos(m,anim){var b=d.querySelector('[data-m="'+m+'"]');if(!b)return;if(!anim)th.style.transition='none';th.style.width=b.offsetWidth+'px';th.style.transform='translateX('+b.offsetLeft+'px)';th.classList.toggle('n',m==='n');if(!anim){void th.offsetWidth;th.style.transition=''}}
h.appendChild(d);
/* la pagina dell'altra grafica si scarica in anticipo, così il cambio non aspetta la rete */
try{var p=location.pathname,_p=p,_o=(!nuova?p.replace('/girrr/','/stadio/girrr/'):p.replace('/stadio/girrr/','/girrr/'));if(_o!==_p){var _l=document.createElement('link');_l.rel='prefetch';_l.href=_o;document.head.appendChild(_l)}}catch(x){}
var da=null;try{da=sessionStorage.getItem('gsw_da');sessionStorage.removeItem('gsw_da')}catch(x){}
var cur=nuova?'n':'a';
if(da&&da!==cur){pos(da,false);requestAnimationFrame(function(){requestAnimationFrame(function(){pos(cur,true)})})}else pos(cur,false);
window.addEventListener('resize',function(){pos(cur,false)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){pos(cur,false)});
/* Se il sito è aperto come app (aggiunto alla Home) c'è la riga con il tasto Aggiorna: il selettore va sulla stessa riga, a sinistra di Aggiorna */
var n=0;(function su(){var b=document.querySelector('.app-bar');if(b){b.insertBefore(d,b.firstChild);h.classList.add('gsw-su');return}if(n++<12)setTimeout(su,250)})();
d.onclick=function(e){var bt=e.target.closest('button');if(!bt)return;var m=bt.dataset.m;if((m==='n')===nuova)return;
try{localStorage.setItem('orr_gv',m)}catch(x){}
if(window.top!==window.self){try{window.parent.postMessage({orrGrafica:m},location.origin)}catch(x){}return}
var p=location.pathname,dest=(m==='n'?p.replace('/girrr/','/stadio/girrr/'):p.replace('/stadio/girrr/','/girrr/'))+location.search+location.hash;
d.classList.add('mv');d.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===bt)});pos(m,true);
try{sessionStorage.setItem('gsw_da',cur)}catch(x){}
if(!VT)document.documentElement.classList.add('gsw-out');
setTimeout(function(){location.href=dest},VT?340:330)};
}
if(document.body)go();else document.addEventListener('DOMContentLoaded',go);
})();
