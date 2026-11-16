/* Fatti condivisi fra redazione, servizio e sito. Nessuna rete o preferenza casuale. */
'use strict';
const M=require('./model.js'),crypto=require('node:crypto');
function contesto(raw,options={}){
 const d=M.fromSite(raw,options),rounds=M.complete(d);
 const giornate=rounds.map(g=>({giornata:g.n,sa:g.sa,stagione:d.stagione,
  firma:crypto.createHash('sha256').update(M.factsText(d,g.n)).digest('hex'),
  fatti:M.factsText(d,g.n),
  coppaCompleta:!(d.cupRounds||[]).filter(c=>c.sa===g.sa).some(c=>c.m.some(m=>!/^\d+-\d+$/.test(m[5]))),
  candidati:M.ballot(d,g.n).candidates,
  squadre:Object.fromEntries(d.teams.map(t=>[t,{partite:M.weeklyMatches(d,t,g.n),cammino:M.story(d,t,g.n),storia:d.titoli.filter(x=>JSON.stringify(x).includes(t))}]))
 }));
 return {stagione:d.stagione,squadre:d.teams,ultima:rounds.at(-1)?.n||0,giornate};
}
function personaggi(week){
 if(!week.candidati.length)return [];
 const rules=[
  ['Nonno Cesare',c=>-(c.gs*20)+c.gf-c.gs,'premia la solidità del risultato'],
  ['Statistico Folle',c=>c.score,'considera margine, trasferta e posizione dell’avversario'],
  ['Il Romantico del Pallone',c=>{const r=week.squadre[c.team].cammino.recent;return (r.length>1&&r[0].pt!==3?20:0)+c.gf},'premia il ritorno alla vittoria'],
  ['Tifoso Arrabbiato',c=>{const r=week.squadre[c.team].cammino.recent;return (r.length>1&&r[0].pt===0?20:0)+c.gf-c.gs},'premia una risposta dopo una sconfitta'],
  ['Telecronista Stanco',c=>c.gf*10+(c.away?1:0),'premia i gol della vincitrice, poi la trasferta'],
  ['Il Complottista',c=>-(c.gf-c.gs)*10+c.gs,'sospetta delle vittorie di misura, più sono sofferte e più ci crede'],
  ['Gufo Professionista',c=>-(c.opPos||99)*10+(c.gf-c.gs),'premia chi ha battuto l’avversaria più in alto in classifica'],
  ['Il Mago della Cabala',c=>(c.gf+c.gs)*10+c.gf,'segue i numeri: premia la partita con più gol'],
  ['Il Tassista',c=>(c.away?20:0)+(c.gf-c.gs),'premia la vittoria in trasferta, poi il margine'],
  ['Arbitro in Pensione',c=>(c.gf-c.gs)*10-c.gs,'premia il risultato più netto, poi la porta più pulita'],
  ['Klaus Pünktlich',c=>(c.away?0:20)-c.gs*2+c.gf,'premia l’ordine: vittoria in casa con pochi gol subiti']
 ];
 const tutti=!(week.stagione==='2026/27'&&week.giornata<8);
 return (tutti?rules:rules.slice(0,5)).map(([autore,score,why])=>{const c=week.candidati.slice().sort((a,b)=>score(b)-score(a)||a.team.localeCompare(b.team))[0];return {autore,scelta:c.team,motivo:autore+' '+why+': '+c.gf+'–'+c.gs+' contro '+c.op+'.'}});
}
module.exports={contesto,personaggi};
if(require.main===module){let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{const i=JSON.parse(s),ctx=contesto(i.data,i.options);ctx.giornate.forEach(g=>g.personaggi=personaggi(g));process.stdout.write(JSON.stringify(ctx))})}
