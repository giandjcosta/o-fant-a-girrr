/* Componenti della Home: solo calendario pubblico e storia già conservata nel Lab. */
(function(){
'use strict';
var E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var dec=function(n){return Number(n).toLocaleString('it-IT',{maximumFractionDigits:1})};
function circleChart(rows,label,href,historical){
 if(!rows.length)return '<p class="v53-muted">Nessuna posizione registrata.</p>';
 var xx=function(i){return rows.length===1?180:27+i*306/(rows.length-1)},yy=function(r){return 26+(r.pos-1)*7.6},h='';
 [1,5,10].forEach(function(v){h+='<path d="M15 '+yy({pos:v})+'H345" class="v55-grid"/>'});
 rows.forEach(function(r,i){if(i&&r.pos&&rows[i-1].pos&&(!historical||r.anno===rows[i-1].anno+1))h+='<path class="v55-trace" '+(r.provvisorio?'stroke-dasharray="4 4"':'')+' d="M'+xx(i-1)+','+yy(rows[i-1])+'L'+xx(i)+','+yy(r)+'"/>'});
 rows.forEach(function(r,i){var x=xx(i),g='<g class="'+(i===rows.length-1?'v55-current':'')+'">';
  if(r.pos)g+='<circle cx="'+x+'" cy="'+yy(r)+'" r="12"><title>'+E(r.label+': '+r.pos+'º'+(r.totale?' su '+r.totale:'')+(r.provvisorio?' · In corso':''))+'</title></circle><text class="v55-value" x="'+x+'" y="'+(yy(r)+4)+'" text-anchor="middle">'+r.pos+'</text>';
  else g+='<text x="'+x+'" y="65" text-anchor="middle">—</text>';
  g+='<text x="'+x+'" y="126" text-anchor="middle">'+E(r.label)+'</text></g>';
  h+=href&&r.n?'<a href="'+E(href(r.n))+'" aria-label="Classifica dopo la '+r.n+'ª giornata, '+r.pos+'º posto">'+g+'</a>':g;
 });
 return '<svg class="v55-chart" viewBox="0 0 360 138" role="img" aria-label="'+E(label+': '+rows.map(function(r){return r.label+', '+(r.pos?r.pos+'º posto':'Non registrato')+(r.provvisorio?', provvisorio':'')}).join('; '))+'">'+h+'</svg>';
}
function historyView(o){
 var coaches=(o.archivio.squadre||{})[o.team]||[],hist=o.archivio.allenatori||{};
 if(!coaches.length)return '';
 return '<details class="v55-more v55-history"><summary>La storia dei tuoi allenatori <span>Stagione per stagione</span></summary>'+coaches.map(function(c){
  var records=hist[c]||[],map={};records.forEach(function(r){map[parseInt(r[0],10)]=r});
  var rows=[];for(var y=2021;y<=2026;y++){var r=map[y];rows.push({anno:y,label:String(y).slice(2)+'/'+String(y+1).slice(2),pos:r?Number(r[1]):y===2026?o.pos:null,totale:r?Number(r[2]):y===2026?o.table.length:null,provvisorio:y===2026})}
  return '<h4>'+E(c)+'</h4>'+circleChart(rows,'Posizioni stagionali di '+c,null,true)+'<p class="v53-muted">Posizioni finali registrate dal 2021 · 2026/27 provvisoria. Una stagione non registrata interrompe la linea.</p>';
 }).join('')+'<a class="v55-allcoaches" href="'+E(o.coachLink)+'">Tutti gli allenatori nell’Albo ›</a></details>';
}
function render(o){
 var team=o.team,table=o.table,row=table.find(function(r){return r.team===team}),pos=row?table.indexOf(row)+1:0;
 o.pos=pos;o.archivio=o.archivio||{};
 var previous=o.sets.length>1?o.sets[o.sets.length-2].table.findIndex(function(x){return x.team===team})+1:pos,delta=previous-pos;
 var move=delta?(delta>0?'↑ ':'↓ ')+Math.abs(delta)+' '+(Math.abs(delta)===1?'posizione':'posizioni'):'Posizione invariata';
 var played=o.rounds.map(function(g){var m=g.m.find(function(m){return m[0]===team||m[3]===team}),home=m[0]===team,score=m[4].split('-').map(Number),gf=score[home?0:1],gs=score[home?1:0];return {n:g.n,m:m,home:home,op:home?m[3]:m[0],gf:gf,gs:gs,pt:gf>gs?3:gf===gs?1:0}}),last=played[played.length-1];
 var future=o.calendar.filter(function(g){return g.n>(o.rounds.length?o.rounds[o.rounds.length-1].n:0)}).slice(0,3).map(function(g){var m=g.m.find(function(m){return m[0]===team||m[3]===team});if(!m)return null;var home=m[0]===team,op=m[home?3:0],p=table.findIndex(function(t){return t.team===op})+1;return {n:g.n,op:op,home:home,pos:p}}).filter(Boolean),next=future[0];
 var series=o.sets.slice(-5).map(function(s){return {n:s.n,label:s.n+'ª',pos:s.table.findIndex(function(t){return t.team===team})+1}});
 var h='<div class="v55-summary"><div class="v55-position"><strong>'+(pos?pos+'ª':'—')+'</strong><div><span>Posizione in classifica</span><b class="'+(delta<0?'v55-down':delta>0?'v55-up':'')+'">'+E(pos?move:'Classifica in attesa')+'</b></div><div class="v55-points"><strong>'+(row?row.pt:'—')+'</strong><span>Punti</span></div></div><div class="v55-trend"><div class="v55-caption">Il cammino in classifica <span>Ultime '+series.length+' giornate</span></div>'+circleChart(series,'Posizioni nelle ultime giornate',o.dayLink,false)+'</div></div>';
 h+='<div class="v55-fixtures"><div><span class="v55-caption">Ultimo risultato'+(last?' · '+last.n+'ª':'')+'</span>'+(last?'<a href="'+E(o.dayLink(last.n))+'" class="v55-last"><strong class="'+(last.pt===0?'v55-down':last.pt===3?'v55-up':'')+'">'+last.gf+'–'+last.gs+'</strong><span>'+E(last.pt===3?'Vittoria contro ':last.pt===1?'Pareggio con ':'Sconfitta contro ')+E(last.op)+'<small>Fantapunti '+dec(last.m[last.home?1:2])+'–'+dec(last.m[last.home?2:1])+'</small></span></a>':'<p>Nessuna partita conclusa.</p>')+'</div><div><span class="v55-caption">Prossima sfida'+(next?' · '+next.n+'ª':'')+'</span><a href="'+E(next?o.dayLink(next.n):o.boardLink)+'" class="v55-next"><strong>'+E(next?next.op:'Da definire')+'</strong><small>'+E(next?(next.home?'In casa':'In trasferta'):'Calendario in aggiornamento')+'</small></a></div></div>';
 var nearby=pos?table.slice(Math.max(0,Math.min(pos-2,table.length-3)),Math.max(0,Math.min(pos-2,table.length-3))+3):[];
 h+='<div class="v55-secondary"><section class="v55-form"><h3>Le ultime cinque</h3><div class="v55-formline">'+played.slice(-5).map(function(r){return '<a href="'+E(o.dayLink(r.n))+'" class="v55-formgame" aria-label="'+r.n+'ª giornata contro '+E(r.op)+', '+r.gf+' a '+r.gs+'"><b class="'+(r.pt===3?'won':r.pt===1?'draw':'lost')+'">'+r.gf+'–'+r.gs+'</b><span>'+E(r.op)+'</span><small>'+r.n+'ª giornata</small></a>'}).join('')+'</div>'+(played.length?'':'<p class="v53-muted">La forma si aggiornerà dopo le prime partite.</p>')+'</section><section class="v55-near"><h3>Intorno a te <a href="'+E(o.boardLink)+'">Classifica ↗</a></h3>'+(nearby.length?'<table><thead><tr><th scope="col">Pos.</th><th scope="col">Squadra</th><th scope="col">DR</th><th scope="col">Pt</th></tr></thead><tbody>'+nearby.map(function(t){return '<tr class="'+(t.team===team?'v55-me':'')+'"><td>'+ (table.indexOf(t)+1)+'</td><th scope="row">'+E(t.team)+'</th><td>'+(t.gf-t.gs>0?'+':'')+(t.gf-t.gs)+'</td><td>'+t.pt+'</td></tr>'}).join('')+'</tbody></table>':'<p class="v53-muted">Classifica dopo la prima giornata completa.</p>')+'</section></div>';
 h+='<details class="v55-more"><summary>Le prossime tre sfide <span>Avversari e posizione attuale</span></summary><div class="v55-upcoming">'+future.map(function(r){return '<a href="'+E(o.dayLink(r.n))+'"><small>'+r.n+'ª giornata · '+(r.home?'Casa':'Trasferta')+'</small><b>'+E(r.op)+'</b><span>'+(r.pos?r.pos+'º posto':'Classifica in attesa')+'</span></a>'}).join('')+'</div><p class="v53-muted">Il confronto mostra la posizione attuale degli avversari, senza pronostici di difficoltà.</p></details>';
 if(row){var chosen=[row];if(next){var opponent=table.find(function(t){return t.team===next.op});if(opponent)chosen.push(opponent)}table.some(function(t){if(!chosen.some(function(x){return x.team===t.team}))chosen.push(t);return chosen.length===3});
 h+='<details class="v55-more"><summary>Il rendimento degli allenatori <span>Vittorie e punti a partita</span></summary><div class="v55-coaches">'+chosen.map(function(r){var pct=r.g?Math.round(r.v/r.g*100):0,m=(o.archivio.squadre||{})[r.team]||[];return '<a href="'+E(o.careerLink(r.team))+'"><b>'+E(m.join(' e ')||r.team)+'</b><small>'+E(r.team)+'</small><div class="v55-coachbar"><i style="height:'+pct+'%"></i><strong>'+pct+'%</strong></div><span>'+r.v+' vittorie / '+r.g+' gare · '+dec(r.g?r.pt/r.g:0)+' punti a partita</span></a>'}).join('')+'</div><p class="v53-muted">Stagione 2026/27 · Vittorie sulle gare di campionato concluse. I due allenatori dello stesso club condividono il bilancio.</p></details>';
 }
 h+=historyView(o);
 var cup=o.cupRounds||[],cu=cup[cup.length-1],fase=cu?(cu.n<11?'Fase a gironi':cu.n===11?'Quarti di finale':cu.n===12?'Semifinali':'Finale'):'Calendario e gironi';
 h+='<details class="v55-more"><summary>Le competizioni <span>Campionato e Champions Cup</span></summary><div class="v55-competitions"><a href="'+E(o.boardLink)+'"><span aria-hidden="true">🏆</span><div><b>Campionato</b><small>'+o.rounds.length+' giornate concluse</small></div><span aria-hidden="true">↗</span></a><a href="'+E(o.cupLink)+(cu?'-'+cu.n:'')+'"><span aria-hidden="true">🏆</span><div><b>Champions Cup</b><small>'+E(fase)+'</small></div><span aria-hidden="true">↗</span></a></div></details>';
 return h;
}
window.OGHome55={render:render};
})();
