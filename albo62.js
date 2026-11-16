/* 6.2 · Albo d'oro › Record: MVP dei tifosi, MVP del campionato e partita più seguita, con la grafica dei Record (Claude, 15 novembre 2026, richiesta di Gianluca).
   Dati da v62_albo (preparata da ChatGPT). Finché non c'è, gli MVP si ricavano dall'archivio di mvp_stato e la partita
   più seguita resta «Dato non disponibile». Niente oro nell'Albo (decisione di Gianluca). */
(function(){'use strict';
const ROOT=new URL('./',document.currentScript.src).href;
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=x=>String(x??'').replace(/The Blue brothers/g,'The Blues Brothers');
const C=x=>{x=N(x);return x.charAt(0).toUpperCase()+x.slice(1)};   /* come cap() dei Record: «stif dc» -> «Stif dc» */
/* Stessa grafica dei «Record della lega» (card + righe .rec di albo.html), così la pagina è coordinata (Gianluca). */
const card=(id,titolo,corpo)=>'<div class="card" id="'+id+'"><h3>'+E(titolo)+'</h3>'+corpo+'</div>';
const riga=(icona,etichetta,nome,dettaglio,valore)=>'<div class="rec"><div class="i">'+icona+'</div><div><small>'+E(etichetta)+'</small><b>'+E(nome)+'</b>'+(dettaglio?'<div class="d">'+E(dettaglio)+'</div>':'')+'</div><div class="v">'+E(valore)+'</div></div>';
const nota=x=>'<div class="nt">'+E(x)+'</div>';
let cfg=null,albo=null,archivio=[];
async function rpc(nome,args){const r=await fetch(cfg.url+'/rest/v1/rpc/'+nome,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'});if(!r.ok)throw Error(nome);const j=await r.json();if(j?.error)throw Error(nome);return j}
function daArchivio(stato){
 const mvp=(stato?.archivio||[]).filter(a=>a.chiusa&&a.classifica?.[0]?.team).map(a=>({giornata:a.giornata,team:a.classifica[0].team,chiusa:a.chiusa})).sort((a,b)=>a.giornata-b.giornata);
 const per={};mvp.forEach(m=>{(per[m.team]=per[m.team]||{team:m.team,mvp:0,giornate:[]});per[m.team].mvp++;per[m.team].giornate.push(m.giornata)});
 const classifica=Object.values(per).sort((a,b)=>b.mvp-a.mvp||Math.max(...b.giornate)-Math.max(...a.giornate));
 return {stagione:cfg.stagione,mvp,mvp_classifica:classifica,partite:null,stagione_conclusa:false};
}
function motivo(g,team){const w=archivio.find(x=>x.giornata===g);return ((w?.redazione)||[]).find(v=>v.scelta===team)?.motivo||''}
function mvpTifosi(a){
 const m=a.mvp||[];
 if(!m.length)return card('al-mvp','MVP dei tifosi',nota('Nessun premio ancora: il primo verdetto arriva alla chiusura della votazione della giornata.'));
 return card('al-mvp','MVP dei tifosi',m.map(x=>riga('🏆',x.giornata+'ª giornata',C(x.team),motivo(x.giornata,x.team)||'Verdetto di redazione, personaggi della Curva e allenatori.','MVP')).join(''));
}
function mvpCampionato(a){
 const c=a.mvp_classifica||[],fine=!!a.stagione_conclusa,tit=fine?'MVP del campionato':'Corsa all’MVP del campionato';
 const spiega=nota('Vince la squadra con più MVP dei tifosi nella stagione. A pari numero, pari merito.');
 if(!c.length)return card('al-mvp-campionato',tit,nota('Nessun verdetto ancora.')+spiega);
 const max=c[0].mvp;let pos=0,prec=null;const medaglia=['🥇','🥈','🥉'];
 return card('al-mvp-campionato',tit,c.map((x,i)=>{if(x.mvp!==prec){pos=i+1;prec=x.mvp}
  const lab=fine&&x.mvp===max?'MVP del campionato '+(a.stagione||cfg.stagione):(x.mvp===max?'In testa':pos+'° posto')+(c.filter(y=>y.mvp===x.mvp).length>1?' · Pari merito':'');
  return riga(medaglia[pos-1]||pos+'°',lab,C(x.team),'Giornate: '+(x.giornate||[]).map(g=>g+'ª').join(', '),x.mvp)}).join('')+spiega);
}
function partitaSeguita(a){
 const spiega=nota('Voti ai sondaggi «Quale sfida seguire»: allenatori dall’app, redazione e personaggi della Curva.');
 if(a.partite==null)return card('al-partita-seguita','La partita più seguita',nota('Dato non disponibile.')+spiega);
 const p=(a.partite||[]).slice(0,5);
 if(!p.length)return card('al-partita-seguita','La partita più seguita',nota('Nessun sondaggio delle partite ancora concluso.')+spiega);
 const det=v=>'Allenatori '+(v.allenatori||0)+' · Redazione '+(v.redazione||0)+' · Personaggi '+(v.personaggi||0);
 return card('al-partita-seguita','La partita più seguita',p.map((x,i)=>riga(i?'👀':'📣',(i?'':'La più seguita · ')+x.giornata+'ª giornata',(x.partita||'').split(' - ').map(C).join(' – '),det(x.voti||{}),(x.voti?.totale||0))).join('')+spiega);
}
function disegna(){
 const host=document.querySelector('[data-ap="rec"]');if(!host||!albo)return;
 let dopo=document.getElementById('pt-archivio');
 for(const [id,html] of [['al-mvp',mvpTifosi(albo)],['al-mvp-campionato',mvpCampionato(albo)],['al-partita-seguita',partitaSeguita(albo)]]){
  const el=document.getElementById(id);
  if(el){if(el.outerHTML!==html)el.outerHTML=html}
  else if(dopo&&dopo.parentElement===host)dopo.insertAdjacentHTML('afterend',html);
  else host.insertAdjacentHTML('beforeend',html);
  dopo=document.getElementById(id);
 }
 if(location.hash==='#pt-archivio'&&!disegna.fatto){disegna.fatto=true;setTimeout(()=>document.getElementById('al-mvp')?.scrollIntoView({block:'start'}),300)}
}
async function carica(){
 try{cfg=cfg||await fetch(ROOT+'girrr/v60/tifosi-config.json').then(r=>r.json())}catch(e){return}
 let stato=null;try{stato=await rpc('mvp_stato',{p_stagione:cfg.stagione});archivio=stato?.archivio||[]}catch(e){}
 try{albo=await rpc('v62_albo',{p_stagione:cfg.stagione})}catch(e){albo=stato?daArchivio(stato):null}
 disegna();
}
new MutationObserver(()=>{if(albo&&!document.getElementById('al-partita-seguita'))disegna()}).observe(document.documentElement,{childList:true,subtree:true});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',carica):carica();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)carica()});
})();
