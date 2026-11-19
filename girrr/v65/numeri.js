/* O Girrr 6.5 · Numeri del Campionato e della Champions Cup, stesso modulo per tutte le grafiche. */
(function(){
'use strict';
if(document.body.dataset.v53!=='board'||new URLSearchParams(location.search).get('sezione')!=='numeri')return;
var src=document.currentScript,root=new URL('../../',src.src),g=document.querySelector('.grid'),nav=document.querySelector('.giornata-nav');
if(!g||!nav)return;
var box=document.createElement('section');box.id='v65numeri';box.setAttribute('aria-label','Numeri della stagione');
g.parentNode.insertBefore(box,g);g.hidden=true;g.style.display='none';
var style=document.createElement('style');style.textContent=
'#v65numeri{padding:18px;margin:12px 0;background:rgba(20,32,65,.7);color:#fbf6ec;border:1px solid #ffffff35;border-left:8px solid #d62839;border-radius:16px;overflow-wrap:anywhere}'
+'body[data-mode=coppa] #v65numeri{border-left-color:#3d93d6}body[data-v53-skin=stadio] #v65numeri{border-left-color:#ffd166}'
+'#v65numeri h2{font-size:clamp(21px,4vw,30px);margin:0 0 8px}#v65numeri p{font-size:13px;color:#bfe3ff}'
+'.v65-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px}'+'.giornata-nav:has(>[data-v65-numeri]){flex-wrap:nowrap!important;overflow:hidden}.giornata-nav:has(>[data-v65-numeri])>*{flex:1 1 0;min-width:0;white-space:nowrap;text-align:center;padding-left:4px!important;padding-right:4px!important}@media(max-width:480px){.giornata-nav:has(>[data-v65-numeri])>*{font-size:13px!important}}'+'#v65numeri~.grid,body:has(#v65numeri) :is(#v53board,.v55-striscia),body:has(#v65numeri) .wrap>.gs{display:none!important}'
+'.v65-metric{background:#ffffff0a;border:1px solid #ffffff30;border-radius:12px;padding:10px 12px;min-width:0}'
+'.v65-metric small{font-size:11px;color:#bfe3ff;display:block}.v65-metric b{font-size:clamp(15px,2.6vw,22px);line-height:1.2;display:block;overflow-wrap:anywhere;margin:2px 0}'
+'.v65-metric em{font-size:11px;color:#c9d8ec;font-style:normal}'
+'@media(max-width:359px){#v65numeri{padding:10px}}@media(prefers-reduced-motion:reduce){#v65numeri *{transition:none!important;animation:none!important}}';
document.head.appendChild(style);
/* 6.5 (Claude): la scheda Numeri risulta scelta; Classifica e Risultati riportano alla loro sezione */
function schede(){var lk=nav.querySelector('a[href*="sezione=numeri"]');if(lk)lk.setAttribute('aria-current','page');
 nav.querySelectorAll('button[data-sez]').forEach(function(b){b.setAttribute('aria-selected','false');if(b.dataset.v65)return;b.dataset.v65='1';
  b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();location.href='tabellone.html?sezione='+b.dataset.sez},true)})}
schede();setTimeout(schede,400);
function E(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function F(n){return Number(n).toLocaleString('it-IT',{maximumFractionDigits:2})}
function numeri(d,coppa){
var rows=[],teams={};
function team(s){return teams[s]||(teams[s]={nome:s,gf:0,gs:0,pari:0,casa:[],fuori:[],tutte:[]})}
(d.cal[coppa?'cup':'lega']||[]).forEach(function(g){
/* 6.5: i risultati non diventano pubblici prima dell'ora successiva a voti e calcoli. */
var v=(d.votiTs||{})[g.sa],c=(d.calcTs||{})[g.sa];
if((v||c)&&Date.now()<Math.max(v?Date.parse(v):0,c?Date.parse(c):0)+3600000)return;
(g.m||[]).forEach(function(m){
var a=coppa?m[1]:m[0],b=coppa?m[4]:m[3],score=coppa?m[5]:m[4],r=/^(\d+)-(\d+)$/.exec(String(score));
if(!r)return;var x=+r[1],y=+r[2],px=Number(coppa?m[2]:m[1]),py=Number(coppa?m[3]:m[2]);
var z={a:a,b:b,x:x,y:y,px:px,py:py,day:g.n,tot:x+y,diff:Math.abs(x-y)};rows.push(z);
var A=team(a),B=team(b),ra=x>y?'V':x===y?'N':'P',rb=x<y?'V':x===y?'N':'P';
A.gf+=x;A.gs+=y;B.gf+=y;B.gs+=x;A.pari+=ra==='N'?1:0;B.pari+=rb==='N'?1:0;
A.casa.push(ra);B.fuori.push(rb);A.tutte.push({day:g.n,r:ra});B.tutte.push({day:g.n,r:rb});
})});
var T=Object.values(teams),gol=rows.reduce(function(x,m){return x+m.tot},0),home=rows.filter(function(m){return m.x>m.y}).length,
away=rows.filter(function(m){return m.x<m.y}).length,draw=rows.length-home-away;
function leaders(k,low){var v=T.slice().sort(function(a,b){return low?a[k]-b[k]:b[k]-a[k]});return v.length?v.filter(function(x){return x[k]===v[0][k]}).map(function(x){return x.nome}).join(', ')+' · '+v[0][k]:'Dato non conservato'}
function match(k){if(!rows.length)return 'Dato non conservato';var r=rows.slice().sort(function(a,b){return b[k]-a[k]})[0];return r.a+' '+r.x+'–'+r.y+' '+r.b+' · '+r.day+'ª giornata'}
function serie(win){var best={n:0,nome:''};T.forEach(function(t){var c=0;t.tutte.slice().sort(function(a,b){return a.day-b.day}).forEach(function(m){c=(win?m.r==='V':m.r!=='P')?c+1:0;if(c>best.n)best={n:c,nome:t.nome}})});return best.n?best.nome+' · '+best.n+' partite':'Dato non conservato'}
var fps=rows.flatMap(function(r){return [{nome:r.a,n:r.px,day:r.day},{nome:r.b,n:r.py,day:r.day}]}).filter(function(x){return Number.isFinite(x.n)});
var top=fps.slice().sort(function(a,b){return b.n-a.n})[0],bottom=fps.slice().sort(function(a,b){return a.n-b.n})[0];
var fp=function(x){return x?x.nome+' · '+F(x.n)+' Fantapunti · '+x.day+'ª giornata':'Dato non conservato'};
var never=function(k){return T.filter(function(t){return t[k].length&&!t[k].includes('P')}).map(function(t){return t.nome}).join(', ')||'Nessuna'};
return [
['Giornate con risultati',new Set(rows.map(function(x){return x.day})).size,'Almeno una partita conclusa'],
['Partite concluse',rows.length,'Risultati pubblicati'],['Gol totali',gol,'Gol ufficiali'],
['Gol a partita',rows.length?F(gol/rows.length):'0','Media dei risultati'],['Vittorie in casa',home,'Partite'],
['Vittorie in trasferta',away,'Partite'],['Pareggi',draw,'Partite'],
['Vittoria più larga',match('diff'),'Differenza gol'],['Partita con più gol',match('tot'),'Totale gol del risultato'],
['Miglior attacco',leaders('gf',false),'Gol fatti'],['Miglior difesa',leaders('gs',true),'Gol subiti'],
['Serie di vittorie',serie(true),'Consecutive'],['Serie senza sconfitte',serie(false),'Consecutive'],
['Più pareggi',leaders('pari',false),'Partite finite in parità'],
['Massimo Fantapunti',fp(top),'Punteggio singola squadra'],['Minimo Fantapunti',fp(bottom),'Punteggio singola squadra'],
['Imbattute in casa',never('casa'),'Con almeno una partita in casa'],
['Imbattute fuori',never('fuori'),'Con almeno una trasferta']
];
}
/* 6.5 (Claude): l'intestazione della pagina dice Numeri, non Risultati della giornata */
function testa(){var coppa=document.body.getAttribute('data-mode')==='coppa',k=document.getElementById('kick'),t=document.getElementById('tit'),tt=(coppa?'Champions Cup':'Campionato')+' · Stagione 2026/27';
 if(k&&k.textContent!=='NUMERI')k.textContent='NUMERI';if(t&&t.textContent!==tt)t.textContent=tt}
(function(){var k=document.getElementById('kick'),t=document.getElementById('tit');testa();if(window.MutationObserver)[k,t].forEach(function(x){if(x)new MutationObserver(testa).observe(x,{childList:true,characterData:true,subtree:true})})})();
function mostra(d){var coppa=document.body.getAttribute('data-mode')==='coppa',m=numeri(d,coppa);
box.innerHTML='<h2>Numeri · '+(coppa?'Champions Cup':'Campionato')+'</h2><p>Stagione 2026/27 · Solo incontri conclusi. Gol del risultato, punti in classifica e Fantapunti sono dati differenti.</p><div class="v65-grid">'+m.map(function(x){return '<div class="v65-metric"><small>'+E(x[0])+'</small><b>'+E(x[1])+'</b><em>'+E(x[2])+'</em></div>'}).join('')+'</div>'}
box.innerHTML='<h2>Numeri della stagione</h2><p>Caricamento dei risultati…</p>';
fetch(new URL('data.json',root),{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Dati');return r.json()}).then(function(d){mostra(d);new MutationObserver(function(){mostra(d)}).observe(document.body,{attributes:true,attributeFilter:['data-mode']})}).catch(function(){box.innerHTML='<h2>Numeri</h2><p>Dato non conservato. Dati non disponibili.</p>'});
})();
