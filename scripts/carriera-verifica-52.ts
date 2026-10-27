// Codice sorgente della Supabase Edge Function carriera-verifica-52.
// I premi sono derivati esclusivamente dal data.json ufficiale e NON accreditati senza riscatto.
const C=[
['The Blue brothers','Leanzino & Mario','Phönix Automobile','single',75,50,6,7],
['Apo team','apo','Phönix Automobile','single',75,50,6,5],
['Grodah','RikyArma','Autofficina Rossi','single',70,50,4,3],
['WOA','ser','Phönix Automobile','single',65,50,5,2],
['Real Madrink','AndrewTT','Pizzeria Da Gigi','repeated65',2,75,4,3],
['stif dc','stifson','Panificio Zanon','repeated60',3,75,3,6],
['Mariana Coneja','Mark Lenders','Ottica Visione','position10',7,100,3,6],
['AFA SELECCION','Maria','Panificio Zanon','repeated60',3,75,5,4],
['Oranje VC','DJ Cst Brazil','Termoidraulica Bepi','position10',5,100,4,4],
['Atletico ma non troppo','Riccardo','Pizzeria Da Gigi','repeated65',2,75,3,8]
];
const allowedOrigin='https://raw.githubusercontent.com/giandjcosta/o-fant-a-girrr/gh-pages/data.json';
Deno.serve(async (req)=>{
 if(req.method!=='POST') return new Response('Method not allowed',{status:405});
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)throw Error('Service unavailable');
  const src=await fetch(allowedOrigin,{headers:{'Accept':'application/json','Cache-Control':'no-cache'}});
  if(!src.ok)throw Error('Official results unavailable');
  const j=await src.json(),cal=j.cal?.lega;
  if(!Array.isArray(cal)||cal.length<10)throw Error('Official league calendar incomplete');
  const rounds=cal.slice().sort((a,b)=>a.n-b.n);
  let fully=0;
  for(let i=0;i<rounds.length;i++){
   const round=rounds[i];
   if(round.n!==fully+1||!Array.isArray(round.m)||round.m.length!==5||
     !round.m.every(m=>Array.isArray(m)&&/^\d+-\d+$/.test(m[4])&&
      Number.isFinite(m[1])&&Number.isFinite(m[2]))) break;
   fully++;
  }
  const scores={};for(const [team] of C)scores[team]=[];
  for(const round of rounds){if(round.n>fully)break;
    for(const m of round.m){scores[m[0]].push({n:round.n,p:m[1],result:m[4].split('-').map(Number),side:'home'});
      scores[m[3]].push({n:round.n,p:m[2],result:m[4].split('-').map(Number),side:'away'});
    }
  }
  function standings(n){let list=C.map(([t])=>({t,pts:0,fp:0}));
    const by=Object.fromEntries(list.map(x=>[x.t,x]));
    for(const round of rounds){if(round.n>n)break;for(const m of round.m){const [a,b]=m[4].split('-').map(Number);
       by[m[0]].pts+=a>b?3:a===b?1:0;by[m[3]].pts+=b>a?3:b===a?1:0;
       by[m[0]].fp+=m[1];by[m[3]].fp+=m[2];
    }}list.sort((a,b)=>b.pts-a.pts||b.fp-a.fp);return Object.fromEntries(list.map((x,i)=>[x.t,i+1]))}
  const position10=fully>=10?standings(10):null,position34=fully>=34?standings(34):null;
  const targets=[];
  for(const [team,manager,sponsor,kind,threshold,credits,winGoal,finalExpected] of C){
   const games=scores[team]||[];
   let pass=false,evidence={};
   if(kind==='single'){const hit=games.find(g=>g.p>threshold);pass=!!hit;if(hit)evidence={round:hit.n,points:hit.p,threshold};}
   if(kind==='repeated65'||kind==='repeated60'){
     const value=kind==='repeated65'?65:60,hits=games.filter(g=>g.p>value);
     pass=hits.length>=threshold;if(pass)evidence={rounds:hits.slice(0,threshold).map(g=>g.n),points:hits.slice(0,threshold).map(g=>g.p),threshold:value};
   }
   if(kind==='position10'&&position10){pass=position10[team]<=threshold;evidence={round:10,position:position10[team],maximum:threshold}}
   if(pass)targets.push({team,manager,sponsor,objective:'sponsor_2026_27',kind:'sponsor',rep:1,credits,evidence});
   if(fully>=8){
     const wins=games.filter(g=>g.n<=8&&((g.side==='home'&&g.result[0]>g.result[1])||(g.side==='away'&&g.result[1]>g.result[0]))).length;
     if(wins>=winGoal)targets.push({team,manager,sponsor:'Presidente',objective:'presidente_vittorie_g8_2026_27',kind:'presidente',rep:2,credits:0,evidence:{round:8,wins,minimum:winGoal}});
   }
   if(position34&&position34[team]<=finalExpected)targets.push({team,manager,sponsor:'Presidente',objective:'presidente_posizione_finale_2026_27',kind:'presidente',rep:2,credits:0,evidence:{round:34,position:position34[team],maximum:finalExpected}});
  }
  const outcomes=[];
  for(const e of targets){
   const r=await fetch(url+'/rest/v1/rpc/carriera_registra_server',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({
     p_season:'2026/27',p_manager:e.manager,p_team:e.team,p_objective:e.objective,p_sponsor:e.sponsor,p_kind:e.kind,p_rep:e.rep,p_credits:e.credits,
     p_proof:{source:'official_github_data_json',results_url:allowedOrigin,verified_through:fully,...e.evidence}
   })});
   if(!r.ok)throw Error('DB reward registry failure: '+r.status+' '+(await r.text()).slice(0,150));
   outcomes.push({team:e.team,objective:e.objective,result:await r.json()});
  }
  return Response.json({ok:true,verified_through:fully,eligible:targets.length,created:outcomes.filter(x=>x.result==='created').length});
 }catch(e){return Response.json({ok:false,error:String(e)},{status:500})}
});
