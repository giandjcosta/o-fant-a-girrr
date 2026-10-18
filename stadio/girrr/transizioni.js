/* Transizioni morbide: quando l'utente preme una tab / un selettore, il contenuto che cambia entra con una dissolvenza leggera. */
(function(){
if(window._fx)return;window._fx=1;
try{var _v=localStorage.getItem('orr_gv'),_p=location.pathname,_st=_p.indexOf('/stadio/girrr/')>=0;if(_v==='n'&&!_st&&/\/girrr\//.test(_p)){location.replace(_p.replace('/girrr/','/stadio/girrr/')+location.search+location.hash);return}if(_v==='a'&&_st){location.replace(_p.replace('/stadio/girrr/','/girrr/')+location.search+location.hash);return}}catch(e){}
var _g=document.createElement('style');_g.textContent='html{scrollbar-gutter:stable}';document.head.appendChild(_g);
if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
var st=document.createElement('style');
st.textContent='@keyframes fxin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.fx-in{animation:fxin .62s cubic-bezier(.22,.61,.36,1) both;animation-delay:calc(var(--fxd,0)*70ms)}[role=tab],.seg button,.at button,.chips button,.sw button,.ptabs button,.tabs button{transition:background-color .1s linear,color .1s linear,border-color .1s linear,opacity .15s ease,transform .25s ease}';
document.head.appendChild(st);
/* il logo della lega riporta alla Home dell'anteprima (stessa grafica) */
document.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('#lg,#olg');if(!l)return;var p=location.pathname,d=null;
if(/\/girrr\/(?!app\.html)/.test(p)){if(/\/index\.html$|\/girrr\/$/.test(p))return;d='index.html'}
else if(/\/girrr\/app\.html$/.test(p))d='index.html';
if(!d)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href=d},true);
var _ls=document.createElement('style');_ls.textContent='#lg,#olg{cursor:pointer}';document.head.appendChild(_ls);
/* la scritta sopra il logo riporta al livello sopra (Home › Albo d'oro › Derby); il logo riporta sempre alla Home */
(function(){
var NOMI={index:'O Girrr',albo:"Albo d'oro",derby:'I Derby',rivalita:'Le rivalità',squadre:'Squadre',tabellone:'Tabellone',totogirrr:'Totogirrr',statistiche:'Statistiche',curva:'Curva',giornale:'Giornale',sport:'Girrr Sport',spog:'Spogliatoio',toto:'Totogirrr'};
var PADRE={albo:'index',derby:'albo',rivalita:'albo',squadre:'tabellone',tabellone:'index',totogirrr:'index',statistiche:'index',curva:'index',giornale:'index'};
var LABPADRE={sfide:'sport'};
var p=location.pathname,lab=/\/girrr\/app\.html$/.test(p),uf=/\/girrr\//.test(p)&&!lab;if(!lab&&!uf)return;
var cur=lab?'lab':(p.split('/').pop().replace('.html','')||'index');
if(cur==='index')return;
var dir=p.slice(0,p.lastIndexOf('/')+1);
function agg(){var h=lab?(location.hash||'').slice(1):'',pr=lab?LABPADRE[h]:PADRE[cur],href;
  if(!pr)pr='index';
  if(lab&&LABPADRE[h])href='#'+pr;else if(pr==='toto'||pr==='totogirrr')href=dir+'totogirrr.html';else href=dir+pr+'.html';
  [].forEach.call(document.querySelectorAll('a.back,a.oback,.oback'),function(a){if(!/^\s*‹/.test(a.textContent))return;a.setAttribute('href',href);a.textContent='‹ '+NOMI[pr]})}
if(document.body)agg();else document.addEventListener('DOMContentLoaded',agg);
window.addEventListener('hashchange',agg);setTimeout(agg,600);
})();
/* il logo della lega riporta alla Home dell'anteprima (stessa grafica) */
document.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('#lg,#olg');if(!l)return;var p=location.pathname,d=null;
if(/\/girrr\/(?!app\.html)/.test(p)){if(/\/index\.html$|\/girrr\/$/.test(p))return;d='index.html'}
else if(/\/girrr\/app\.html$/.test(p))d='index.html';
if(!d)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href=d},true);
var _ls=document.createElement('style');_ls.textContent='#lg,#olg{cursor:pointer}';document.head.appendChild(_ls);
/* tendine <details> con la stessa animazione fluida delle Ere */
(function(){
var st=document.createElement('style');
st.textContent='.dw{display:grid;grid-template-rows:0fr;transition:grid-template-rows .6s cubic-bezier(.22,.61,.36,1)}details.ao>.dw{grid-template-rows:1fr}.dwi{min-height:0;overflow:hidden;opacity:0;transition:opacity .45s ease}details.ao>.dw>.dwi{opacity:1;transition:opacity .55s ease .08s}.sto details>summary .fr{transition:transform .55s cubic-bezier(.22,.61,.36,1)!important}.sto details.ao>summary .fr{transform:rotate(90deg)}.sto details[open]:not(.ao)>summary .fr{transform:none}';
document.head.appendChild(st);
document.addEventListener('click',function(e){
  var sm=e.target.closest&&e.target.closest('summary');if(!sm)return;var d=sm.parentNode;if(!d||d.tagName!=='DETAILS'||!d.closest('.sto'))return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  e.preventDefault();if(d._busy)return;
  var w=d.querySelector(':scope>.dw');
  if(!w){w=document.createElement('div');w.className='dw';var i=document.createElement('div');i.className='dwi';[].slice.call(d.childNodes).forEach(function(n){if(n!==sm)i.appendChild(n)});w.appendChild(i);d.appendChild(w)}
  d._busy=1;
  if(!d.open){d.open=true;void w.offsetHeight;requestAnimationFrame(function(){d.classList.add('ao');setTimeout(function(){d._busy=0},620)})}
  else{d.classList.remove('ao');setTimeout(function(){d.open=false;d._busy=0},620)}
},true);
})();
/* passaggio da una pagina all'altra: dissolvenza in uscita e in entrata, e pagina successiva precaricata al passaggio del mouse */
(function(){
if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
var st=document.createElement('style');
st.textContent='@keyframes pin{from{opacity:0}to{opacity:1}}html{animation:pin .38s ease both}html.pout{opacity:0;transition:opacity .2s ease}';
document.head.appendChild(st);
function ok(a,e){if(!a||!a.href||a.target==='_blank'||a.hasAttribute('download'))return false;if(e&&(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button>0))return false;var u=new URL(a.href,location.href);if(u.origin!==location.origin)return false;if(u.pathname===location.pathname&&u.search===location.search)return false;return /\.html$|\/$/.test(u.pathname)}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!ok(a,e)||e.defaultPrevented)return;e.preventDefault();document.documentElement.classList.add('pout');var h=a.href;setTimeout(function(){location.href=h},190)});
window.addEventListener('pageshow',function(ev){if(ev.persisted)document.documentElement.classList.remove('pout')});
var pre={};function pf(e){var a=e.target.closest&&e.target.closest('a[href]');if(!ok(a)||pre[a.href])return;pre[a.href]=1;var l=document.createElement('link');l.rel='prefetch';l.href=a.href;document.head.appendChild(l)}
document.addEventListener('mouseover',pf,{passive:true});document.addEventListener('touchstart',pf,{passive:true});
})();
var last=0;
function mark(){last=Date.now()}
document.addEventListener('pointerdown',mark,true);document.addEventListener('keydown',mark,true);document.addEventListener('click',mark,true);
function ok(n){return n.nodeType===1&&!/^(SCRIPT|STYLE|LINK|AUDIO|VIDEO|OPTION|INPUT|SELECT|TEXTAREA)$/.test(n.tagName)&&!n.closest('.fx-in')&&!n.closest('.tabs,.seg,.at,.chips,.sw,.ptabs,select,input,textarea,button')}
function anim(n,i){n.style.setProperty('--fxd',Math.min(i,6));n.classList.add('fx-in');n.addEventListener('animationend',function f(e){if(e.target!==n)return;n.classList.remove('fx-in');n.style.removeProperty('--fxd');n.removeEventListener('animationend',f)})}
function avvia(){
new MutationObserver(function(ms){
  if(Date.now()-last>800)return;
  var i=0;
  ms.forEach(function(m){m.addedNodes.forEach(function(n){if(ok(n)&&n.getBoundingClientRect().height>12)anim(n,i++)})})
}).observe(document.body,{childList:true,subtree:true});
/* pannelli mostrati/nascosti con l'attributo hidden (es. tab dell'Albo d'oro) */
new MutationObserver(function(ms){
  if(Date.now()-last>800)return;
  ms.forEach(function(m){var n=m.target;if(m.attributeName==='hidden'&&!n.hidden&&ok(n))anim(n,0)})
}).observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden']});
}
if(document.body)avvia();else document.addEventListener('DOMContentLoaded',avvia);
})();
