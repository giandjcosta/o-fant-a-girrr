/* Calcoli puri, verificabili anche senza browser. Nessuna chiamata di rete. */
(function(root){
'use strict';
function complete(data){var names=data.teams.slice().sort().join('|'),out=[];
 for(var g of data.rounds.slice().sort((a,b)=>a.n-b.n)){
  if(g.n!==out.length+1||g.m.length*2!==data.teams.length||!g.m.every(m=>/^\d+-\d+$/.test(m[4]))||g.m.flatMap(m=>[m[0],m[3]]).sort().join('|')!==names)break;
  out.push(g);
 }return out}
function table(data,rounds){var rows=Object.fromEntries(data.teams.map(t=>[t,{team:t,pt:0,g:0,v:0,n:0,p:0,gf:0,gs:0,fp:0}]));
 rounds.forEach(g=>g.m.forEach(m=>{var s=m[4].split('-').map(Number);[0,1].forEach(i=>{var r=rows[m[i?3:0]],gf=s[i],gs=s[1-i];r.g++;r.gf+=gf;r.gs+=gs;r.fp+=Number(m[i?2:1])||0;if(gf>gs){r.v++;r.pt+=3}else if(gf===gs){r.n++;r.pt++}else r.p++})}));
 return Object.values(rows).sort((a,b)=>b.pt-a.pt||(b.gf-b.gs)-(a.gf-a.gs)||b.fp-a.fp||a.team.localeCompare(b.team));}
function ballot(data,day){var rounds=complete(data),g=rounds.find(g=>g.n===day)||rounds.at(-1);if(!g)return null;
 var prev=table(data,rounds.filter(r=>r.n<g.n));var candidates=g.m.flatMap(m=>{var s=m[4].split('-').map(Number);return [0,1].filter(i=>s[i]>s[1-i]).map(i=>{var team=m[i?3:0],op=m[i?0:3],opp=prev.findIndex(r=>r.team===op)+1;return {team,op,gf:s[i],gs:s[1-i],away:i===1,opPos:opp,score:10*(s[i]-s[1-i])+s[i]+(i?2:0)+(data.teams.length-opp)/10}})}).sort((a,b)=>b.score-a.score||a.team.localeCompare(b.team)).slice(0,3);
 // Nessuna candidatura inventata se ci sono meno di tre vincitrici.
 return {day:g.n,id:'mvp-club-'+(data.stagione||'2026/27').replace('/','-')+'-g'+g.n,candidates};}
function tally(b){if(!b||!b.candidates.length)return [];return b.candidates.map((c,i)=>{var red=i===0?2:0,personaggi=(i===Math.min(1,b.candidates.length-1)?2:0)+(i===Math.min(2,b.candidates.length-1)?1:0);return {...c,red,personaggi,total:red+personaggi}}).sort((a,b)=>b.total-a.total||b.red-a.red||a.team.localeCompare(b.team))}
function derbies(data){var out=data.teams.map(team=>({team,g:0,v:0,n:0,p:0,gf:0,gs:0})),matches=[];complete(data).forEach(g=>g.m.forEach(m=>{var r=(data.derby_ufficiali?.coppie||[]).find(r=>[r.a,r.b].includes(m[0])&&[r.a,r.b].includes(m[3]));if(!r)return;var s=m[4].split('-').map(Number);matches.push({day:g.n,a:m[0],b:m[3],score:m[4],name:r.n,fonte:'Registro ufficiale',dal:r.dal});[0,1].forEach(i=>{var row=out.find(x=>x.team===m[i?3:0]);row.g++;row.gf+=s[i];row.gs+=s[1-i];if(s[i]>s[1-i])row.v++;else if(s[i]===s[1-i])row.n++;else row.p++})}));var rows=out.filter(r=>r.g).sort((a,b)=>b.v-a.v||a.team.localeCompare(b.team));rows.forEach((r,i)=>{r.rank=i&&rows[i-1].v===r.v?rows[i-1].rank:i+1});return {rows,matches}}
function story(data,team,until){var rounds=complete(data).filter(g=>until==null||g.n<=until),last=rounds.at(-1);if(!last)return null;var rows=table(data,rounds),row=rows.find(r=>r.team===team),recent=rounds.slice(-2).map(g=>{var m=g.m.find(m=>m[0]===team||m[3]===team),i=m[0]===team?0:1,s=m[4].split('-').map(Number);return {day:g.n,home:i===0,op:m[i?0:3],gf:s[i],gs:s[1-i],pt:s[i]>s[1-i]?3:s[i]===s[1-i]?1:0}}),points=recent.reduce((s,r)=>s+r.pt,0),next=data.rounds.find(g=>g.n===last.n+1),m=next&&next.m.find(m=>m[0]===team||m[3]===team),op=m&&m[m[0]===team?3:0];
 var dossier=data.dossier.ultima_giocata===last.n?data.dossier.squadre[team]:null,conference=dossier&&dossier.ultima_conferenza;
 if(!conference||conference.giornata!==last.n+1)conference=null;
 return {team,day:last.n,pos:rows.indexOf(row)+1,points:row.pt,recent,windowPoints:points,next:op,nextDay:next&&next.n,quote:conference&&conference.risposte&&conference.risposte[0],history:rounds.map((g,i)=>({day:g.n,pos:table(data,rounds.slice(0,i+1)).findIndex(r=>r.team===team)+1}))};}
function weeklyMatches(data,team,day){const g=complete(data).find(g=>g.n===day);if(!g)return [];const out=[];const l=g.m.find(m=>m[0]===team||m[3]===team);if(l)out.push({comp:'Campionato',day:g.n,a:l[0],b:l[3],score:l[4]});
 (data.cupRounds||[]).filter(c=>c.sa===g.sa).forEach(c=>c.m.filter(m=>(m[1]===team||m[4]===team)&&/^\d+-\d+$/.test(m[5])).forEach(m=>out.push({comp:'Champions Cup',day:c.n,a:m[1],b:m[4],score:m[5]})));return out}
function tallyOptional(b,human={}){if(!b||!b.candidates.length)return [];const voters=Object.values(human).filter(t=>b.candidates.some(c=>c.team===t)),nr=2,nb=3,nh=voters.length;
 const rw=nh?.4:.5,bw=nh?.4:.5,hw=nh?.2:0;
 return b.candidates.map((c,i)=>{const red=i===0?2:0,personaggi=(i===Math.min(1,b.candidates.length-1)?2:0)+(i===Math.min(2,b.candidates.length-1)?1:0),umani=voters.filter(t=>t===c.team).length;return {...c,red,personaggi,umani,total:100*(rw*red/nr+bw*personaggi/nb+(nh?hw*umani/nh:0)),humanCount:nh}}).sort((a,b)=>b.total-a.total||b.red-a.red||a.team.localeCompare(b.team))}
function derbyClassifica(data,comp='lega'){const done=complete(data),through=done.at(-1)?.sa||0;let matches=[];const pair=(a,b)=>(data.derby_ufficiali?.coppie||[]).find(r=>[r.a,r.b].includes(a)&&[r.a,r.b].includes(b));const collect=(a,b,score,n)=>{const d=pair(a,b);if(d&&/^\d+-\d+$/.test(score))matches.push({a,b,score,day:n,name:d.n})};
 if(comp==='cup')(data.cupRounds||[]).filter(c=>c.sa<=through&&c.m.every(m=>/^\d+-\d+$/.test(m[5]))).forEach(c=>c.m.forEach(m=>collect(m[1],m[4],m[5],c.n)));else done.forEach(g=>g.m.forEach(m=>collect(m[0],m[3],m[4],g.n)));
 const rows=data.teams.map(team=>({team,g:0,v:0,n:0,p:0,pt:0,gf:0,gs:0}));matches.forEach(m=>{const s=m.score.split('-').map(Number);[0,1].forEach(i=>{const r=rows.find(r=>r.team===(i?m.b:m.a)),gf=s[i],gs=s[1-i];r.g++;r.gf+=gf;r.gs+=gs;if(gf>gs){r.v++;r.pt+=3}else if(gf===gs){r.n++;r.pt++}else r.p++})});
 const sorted=rows.filter(r=>r.g).sort((a,b)=>b.pt-a.pt||b.v-a.v||(b.gf-b.gs)-(a.gf-a.gs)||a.team.localeCompare(b.team));sorted.forEach((r,i)=>{const p=sorted[i-1];r.rank=p&&p.pt===r.pt&&p.v===r.v&&p.gf-p.gs===r.gf-r.gs?p.rank:i+1});return {rows:sorted,matches}}
function fromSite(raw,options={}){
 const now=options.now??Date.now(),published=g=>{const ts=[raw.votiTs?.[g.sa],raw.calcTs?.[g.sa]].filter(Boolean).map(Date.parse);return !ts.length||now>=Math.max(...ts)+3600000};
 const teams=(raw.teams||[]).map(t=>typeof t==='string'?t:t.name),round=(g,cup)=>({n:g.n,sa:g.sa,m:g.m.map(m=>{const x=m.slice(0,cup?6:5);if(!published(g))x[cup?5:4]='-';return x})});
 return {stagione:options.stagione||'2026/27',teams,rounds:(raw.cal?.lega||[]).map(g=>round(g,false)),cupRounds:(raw.cal?.cup||[]).map(g=>round(g,true)),titoli:options.titoli||[],dossier:options.dossier||{ultima_giocata:0,squadre:{}},derby_ufficiali:options.derby||{coppie:[]}};
}
function factsText(data,day){const rounds=complete(data).filter(g=>g.n<=day),sa=rounds.at(-1)?.sa||0;return JSON.stringify({stagione:data.stagione,league:rounds,cup:(data.cupRounds||[]).filter(c=>c.sa<=sa)})}
var api={fromSite,factsText,complete,table,ballot,tally,tallyOptional,weeklyMatches,derbyClassifica,derbies,story};if(typeof module!=='undefined')module.exports=api;else root.GirrrTifosiModel=api;
})(typeof window!=='undefined'?window:globalThis);
