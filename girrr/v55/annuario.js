/* Annuario O Girrr: risultati e rose reali in sola lettura. */
(function(){
'use strict';
var stato={fase:'attesa',dati:null,archivio:[]};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]})}
function n(v){return Number(v).toLocaleString('it-IT',{maximumFractionDigits:1})}
function nome(d,id){var s=((d.P||{})[id]||{}).n||'Giocatore '+id;return s==='Martinez L.'?'Lautaro Martinez':s}
function calcola(d){
 var teams=(d.teams||[]).map(function(t){return {nome:t.name,pl:t.pl||[],costo:(t.pl||[]).reduce(function(a,p){return a+(Number(p.c)||0)},0),pt:0,gf:0,gs:0,fp:0,serie:0,massima:0,marcatore:null}});
 var mappa={};teams.forEach(function(t){mappa[t.nome]=t});
 var acquisti=[];teams.forEach(function(t){t.pl.forEach(function(p){acquisti.push({nome:nome(d,p.id),squadra:t.nome,costo:Number(p.c)||0})})});
 acquisti.sort(function(a,b){return b.costo-a.costo||a.nome.localeCompare(b.nome,'it')});
 var calendario=((d.cal||{}).lega||[]).slice().sort(function(a,b){return a.n-b.n});
 var giocate=[];calendario.some(function(g){if(g.n!==giocate.length+1||!g.m||g.m.length!==teams.length/2||!g.m.every(function(m){return /^\d+-\d+$/.test(String(m[4]))}))return true;var presenti=g.m.flatMap(function(m){return [m[0],m[3]]}).sort().join('|');if(presenti!==teams.map(function(t){return t.nome}).sort().join('|'))return true;giocate.push(g);return false});
 var sa={};giocate.forEach(function(g){sa[String(g.sa)]=true});
 var gol={};Object.keys(d.votes||{}).forEach(function(id){
   var tot=0;Object.keys(d.votes[id]||{}).forEach(function(g){if(!sa[String(g)])return;
     ((d.votes[id][g]||{}).b||[]).forEach(function(x){var match=/^(\d+)\s+(gol|rigore segnato)$/i.exec(String(x));if(match)tot+=Number(match[1])});
   });gol[id]=tot;
 });
 var marcatori=[];teams.forEach(function(t){var arr=t.pl.map(function(p){return {nome:nome(d,p.id),squadra:t.nome,gol:gol[p.id]||0}}).sort(function(a,b){return b.gol-a.gol||a.nome.localeCompare(b.nome,'it')});t.marcatore=arr[0]&&arr[0].gol>0?arr[0]:null;marcatori=marcatori.concat(arr)});
 marcatori.sort(function(a,b){return b.gol-a.gol||a.nome.localeCompare(b.nome,'it')});
 var massimo=null,minimo=null,scarto=null;
 giocate.forEach(function(g){g.m.forEach(function(m){
   var a=mappa[m[0]],b=mappa[m[3]],v=String(m[4]).split('-').map(Number);if(!a||!b)return;
   [[a,m[1]],[b,m[2]]].forEach(function(x){var pts=Number(x[1]);if(!Number.isFinite(pts))return;
     if(!massimo||pts>massimo.valore)massimo={squadra:x[0].nome,valore:pts,giornata:g.n};
     if(!minimo||pts<minimo.valore)minimo={squadra:x[0].nome,valore:pts,giornata:g.n};
     x[0].fp+=pts;
   });
   a.gf+=v[0];a.gs+=v[1];b.gf+=v[1];b.gs+=v[0];
   a.pt+=v[0]>v[1]?3:v[0]===v[1]?1:0;b.pt+=v[1]>v[0]?3:v[0]===v[1]?1:0;
   a.serie=v[0]>v[1]?a.serie+1:0;b.serie=v[1]>v[0]?b.serie+1:0;
   a.massima=Math.max(a.massima,a.serie);b.massima=Math.max(b.massima,b.serie);
   var diff=Math.abs(v[0]-v[1]);if(diff>0&&(!scarto||diff>scarto.differenza))scarto={squadra:v[0]>v[1]?a.nome:b.nome,contro:v[0]>v[1]?b.nome:a.nome,risultato:m[4],giornata:g.n,differenza:diff};
 })});
 var serie=Math.max(0,...teams.map(function(t){return t.massima}));
 var completa=calendario.length>=34&&calendario.every(function(g){return g.m&&g.m.length===5&&g.m.every(function(m){return /^\d+-\d+$/.test(String(m[4]))})});
 var classifica=completa?teams.slice().sort(function(a,b){return b.pt-a.pt||b.fp-a.fp||(b.gf-b.gs)-(a.gf-a.gs)||b.gf-a.gf}).map(function(t){return t.nome}):null;
 return {stagione:'2026/27',giornate:giocate.length,acquisto:acquisti[0]||null,cara:teams.slice().sort(function(a,b){return b.costo-a.costo})[0]||null,economica:teams.slice().sort(function(a,b){return a.costo-b.costo})[0]||null,
   capocannoniere:marcatori.length&&marcatori[0].gol>0?marcatori[0]:null,marcatori:teams.map(function(t){return {squadra:t.nome,giocatore:t.marcatore}}),
   migliore:massimo,peggiore:minimo,scarto:scarto,serie:{n:serie,squadre:teams.filter(function(t){return t.massima===serie&&serie>0}).map(function(t){return t.nome})},
   completa:completa,classifica:classifica};
}
function mia(){try{return (JSON.parse(localStorage.getItem('fg')||'{}')||{}).team||''}catch(e){return ''}}
function tocca(v){var m=mia();return !!(m&&v&&String(v).split(/ · | contro |, /).indexOf(m)>=0)}
function campo(t,v){var io=tocca(v)||(!!mia()&&t===mia());return '<div style="min-width:0;border:'+(io?'2px solid #ffd166;background:rgba(255,209,102,.1)':'1px solid rgba(255,255,255,.18)')+';border-radius:12px;padding:12px"><span class="mut sm" style="display:block">'+esc(t)+(io?' · <b style="color:#ffd166">La tua squadra</b>':'')+'</span><b style="display:block;margin-top:6px;overflow-wrap:anywhere">'+esc(v||'In corso')+'</b></div>'}
function griglia(arr){return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px">'+arr.map(function(x){return campo(x[0],x[1])}).join('')+'</div>'}
function view(){
 var h='<p class="lead">Ogni stagione lascia i suoi record. I numeri della stagione in corso si aggiornano dai risultati e dalle rose della Lega.</p>';
 var d=stato.dati;
 if(stato.fase==='attesa'||stato.fase==='caricamento')h+='<div class="card"><p>Caricamento dei risultati…</p></div>';
 if(stato.fase==='errore')h+='<div class="card"><p>I risultati aggiornati non sono disponibili; ricarica la pagina per riprovare.</p></div>';
 if(d){
   var a=d.acquisto,mc=d.capocannoniere,hi=d.migliore,lo=d.peggiore,sc=d.scarto;
   h+='<div class="card"><h3>2026/27 · '+(d.completa?'Stagione conclusa':'In corso')+'</h3><p class="sm mut" style="margin:8px 0 12px">'+d.giornate+' giornate concluse. Campione, podio e ultimo si assegnano a stagione conclusa.</p>';
   h+=griglia([
     ['Giocatore più pagato',a?a.nome+' · '+n(a.costo)+' fantacrediti · '+a.squadra:null],
     ['Rosa più costosa',d.cara?d.cara.nome+' · '+n(d.cara.costo)+' fantacrediti':null],
     ['Rosa più economica',d.economica?d.economica.nome+' · '+n(d.economica.costo)+' fantacrediti':null],
     ['Più gol fra i giocatori in rosa',mc?mc.nome+' · '+mc.gol+' gol · '+mc.squadra:'In corso'],
     ['Miglior punteggio di giornata',hi?hi.squadra+' · '+n(hi.valore)+' Fantapunti (G'+hi.giornata+')':null],
     ['Peggior punteggio di giornata',lo?lo.squadra+' · '+n(lo.valore)+' Fantapunti (G'+lo.giornata+')':null],
     ['Vittoria più larga',sc?sc.squadra+' contro '+sc.contro+' · '+sc.risultato+' (G'+sc.giornata+')':null],
     ['Serie di vittorie più lunga',d.serie.n?d.serie.squadre.join(', ')+' · '+d.serie.n+' consecutive':'In corso'],
     ['Campione',d.completa?d.classifica[0]:'In corso'],
     ['Podio',d.completa?d.classifica.slice(0,3).map(function(x,i){return (i+1)+'° '+x}).join(' · '):'In corso'],
     ['Ultimo',d.completa?d.classifica[d.classifica.length-1]:'In corso']
   ]);
   h+='<details style="margin-top:15px"><summary style="cursor:pointer;font-weight:800">Marcatori nelle rose · giornate di Serie A associate</summary><div style="margin-top:10px">'+griglia(d.marcatori.map(function(x){return [x.squadra,(x.giocatore?x.giocatore.nome+' · '+x.giocatore.gol+' gol':'Nessun gol registrato')]}))+'</div></details></div>';
 }
 var archivio={};stato.archivio.forEach(function(x){if(x&&x.stagione&&x.stagione!=='2026/27')archivio[x.stagione]=x});
 h+='<div class="card"><h3>Stagioni precedenti</h3><div style="display:grid;gap:6px;margin-top:10px">';
 for(var y=2025;y>=2016;y--){var k=y+'/'+String((y+1)%100).padStart(2,'0'),x=archivio[k];h+='<div style="display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.14);overflow-wrap:anywhere"><b>'+k+'</b><span class="mut sm">'+(x?esc(x.riassunto||'Dati conservati'):'Dato non conservato')+'</span></div>'}
 return h+'</div></div>';
}
function avvia(aggiorna){
 if(stato.fase!=='attesa')return;stato.fase='caricamento';
 Promise.all([
  fetch('https://giandjcosta.github.io/o-fant-a-girrr/data.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Dati '+r.status);return r.json()}),
  fetch(new URL('/o-fant-a-girrr/girrr/v55/annuario.json',location.href).href,{cache:'no-store'}).then(function(r){return r.ok?r.json():{stagioni:[]}}).catch(function(){return {stagioni:[]}})
 ]).then(function(x){stato.dati=calcola(x[0]);stato.archivio=x[1].stagioni||[];stato.fase='pronto';aggiorna()}).catch(function(){stato.fase='errore';aggiorna()});
}
window.OAnnuario={calcola:calcola,avvia:avvia,view:view};
})();