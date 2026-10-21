/* Da eseguire (javascript_tool) in una scheda di Leghe gia' aperta e con il login fatto:
     leghe.fantacalcio.it/o-fant-a-girrr/view/competition/<id>/round/<n>      (campionato id 762521, Champions Cup id 833624)
   Scorre tutte le partite della lista a sinistra e salva in window.__leghe un JSON con, per ogni partita e per ogni squadra:
   s=squadra, mi=mister, mo=modulo, g=gol, fp=fantapunti totali, md=modificatore difesa, inv=invio formazione,
   tit/pan=[nome, voto, fantavoto, 1 se ha giocato davvero] (titolari e panchina).
   Per la Coppa basta window.__soloIntestazioni=true prima di lanciarlo (solo squadre, gol, fantapunti).
   Poi si legge a pezzi da 900 caratteri: window.__leghe.slice(0,900), slice(900,1800)... (il tool taglia a ~1000). */
(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const num=s=>s==='s.v.'?null:parseFloat(s);
 const lis=[...document.querySelectorAll('li')].filter(l=>l.querySelector('.team-card'));
 const art=()=>document.querySelector('article');
 const estrai=()=>{
  const a=art(),T=a.innerText.split('\n').map(s=>s.trim()).filter(Boolean);
  const r=a.getBoundingClientRect(),mid=r.left+r.width/2;
  const pan=[...a.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()==='Panchina');
  const py=pan?pan.getBoundingClientRect().top+scrollY:1e9;
  const sq={A:{tit:[],pan:[]},B:{tit:[],pan:[]}};
  if(!window.__soloIntestazioni)a.querySelectorAll('ui-match-player').forEach(m=>{
   const nm=m.querySelector('.player-name .truncate');if(!nm)return;
   const q=m.getBoundingClientRect(),lato=(q.left+q.width/2)<mid?'A':'B';
   const n=[...m.querySelectorAll('*')].filter(e=>e.children.length===0&&/^(s\.v\.|\d+(\.\d+)?)$/.test(e.textContent.trim())).map(e=>e.textContent.trim());
   sq[lato][(q.top+scrollY)<py?'tit':'pan'].push([nm.textContent.trim(),n[0]?num(n[0]):null,n[1]?num(n[1]):null,m.classList.contains('opacity-50')?0:1]);
  });
  const i8=T.indexOf('-');
  const mods=[],inv=[];T.forEach((s,i)=>{if(s==='modificatore difesa'){mods.push(num(T[i-1]),/^\d+(\.\d+)?$/.test(T[i+1]||'')?num(T[i+1]):0)}if(s==='Formazione inviata via app'||s==='Formazione inviata via web')inv.push(T[i+1])});
  return {A:{s:T[0],mi:T[1],mo:T[2],g:num(T[i8-2]),fp:num(T[i8-1]),...sq.A,md:mods[0],inv:inv[0]},B:{s:T[i8+3],mi:T[i8+4],mo:T[i8+5],g:num(T[i8+1]),fp:num(T[i8+2]),...sq.B,md:mods[1],inv:inv[1]}};
 };
 const out=[];
 for(const li of lis){li.querySelector('div.grid').click();await sleep(1800);out.push(estrai())}
 window.__leghe=JSON.stringify(out);
})();
