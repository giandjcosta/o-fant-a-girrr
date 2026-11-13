(function(){
'use strict';
const root=new URL('../../',document.currentScript.src).href,skin=location.pathname.includes('/stadio/')?'stadio':'lega',page=location.pathname.split('/').pop()||'index.html',q=new URLSearchParams(location.search),before=false;
document.documentElement.dataset.ptSkin=skin;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=t=>t==='The Blue brothers'?'The Blues Brothers':t==='stif dc'?'STIF DC':t;
let data,editoriale,config,mvp={votazione:null,archivio:[]},myVote=null,pollError='',busyVote=false,derbyReady=false,knownLogin=null,refreshId=0,factsVersion='';
let team=null,competition='lega',sportMvp=q.get('sezione')==='mvp',careerWeek=q.get('sezione')==='settimana',signatures={};
function identity(){try{const f=JSON.parse(localStorage.getItem('fg')||'null');return f&&f.team&&f.code?f:null}catch(e){return null}}
function chosenTeam(){const candidates=[document.getElementById('cteam')?.value,q.get('come'),identity()?.team,document.getElementById('v53team')?.value];return candidates.find(t=>data?.teams.includes(t))||null}
function url(file,hash='',other=skin){const u=new URL((other==='stadio'?'stadio/girrr/':'girrr/')+file,root);if(file==='app.html'&&team)u.searchParams.set('come',team);if(file==='app.html'&&hash.replace(/^#/,'')==='sport')u.searchParams.set('sezione','mvp');if(file==='app.html'&&hash.replace(/^#/,'')==='carriera')u.searchParams.set('sezione','settimana');u.hash=hash;return u.href}
async function rpc(name,args={}){const r=await fetch(config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error('Servizio non disponibile. Riprova tra poco.');const j=await r.json();if(j?.error)throw Error(j.error);return j}
function ballot(){return GirrrTifosiModel.ballot(data)}
function votes(){const id=identity();return id&&myVote?{[id.team]:myVote}:{}}
function tally(){return mvp.votazione?.giornata===ballot()?.day?mvp.votazione.classifica:[]}
const link=(f,h,t)=>'<a href="'+E(url(f,h))+'">'+t+' ›</a>';
const box=(id,title,body,kicker='')=>'<section class="pt-box" id="'+id+'">'+(kicker?'<div class="pt-kicker">'+E(kicker)+'</div>':'')+'<h2>'+E(title)+'</h2>'+body+'</section>';
function reason(c){return (c.away?'In trasferta':'In casa')+' contro '+N(c.op)+': '+c.gf+'–'+c.gs+'.'}
function episode(day){const entry=editoriale.giornate?.[String(day)],e=entry?.squadre?.[team];if(e&&entry.firma===signatures[day])return {title:e.titolo,paragraphs:e.paragrafi};return {title:'Il racconto è in preparazione',paragraphs:['La redazione sta preparando il capitolo della tua squadra con i risultati verificati della settimana.']}}
function storyCard(day,compact=false){const e=episode(day),matches=GirrrTifosiModel.weeklyMatches(data,team,day);return '<article class="pt-article-copy"><div class="pt-result">'+matches.length+' '+(matches.length===1?'incontro giocato':'incontri giocati')+' · '+matches.map(m=>m.comp).join(' + ')+'</div><h3>'+E(e.title)+'</h3>'+e.paragraphs.map(p=>'<p>'+E(p)+'</p>').join('')+(compact?'<div class="pt-links">'+link('app.html','carriera','Rileggi la tua stagione')+'</div>':'')+'</article>'}
function story(){const all=GirrrTifosiModel.complete(data),rounds=all.filter(g=>g.n===all.at(-1)?.n||editoriale.giornate?.[g.n]?.squadre?.[team]).slice().reverse();return box('pt-storia','La mia settimana','<p class="pt-sub">'+E(N(team))+' · Un racconto diverso per ogni giornata e per il suo percorso.</p>'+rounds.map((g,i)=>'<details class="pt-week" data-pt-day="'+g.n+'"'+(i===0?' open':'')+'><summary><span class="pt-day">'+g.n+'</span><span class="pt-week-title"><b>'+g.n+'ª giornata</b><small>'+E(episode(g.n).title)+'</small></span></summary><div class="pt-week-body">'+storyCard(g.n)+'</div></details>').join(''),'La tua stagione · '+data.stagione)}
function poll(){
 const b=ballot();
 if(!b?.candidates.length)return box('pt-mvp','Squadra della settimana','<p>Le candidature saranno disponibili dopo una giornata completa con squadre vincitrici.</p>');
 const week=mvp.votazione;
 if(!week||week.giornata!==b.day||week.firma!==signatures[b.day])return box('pt-mvp','Squadra della settimana','<p>Le scelte della '+b.day+'ª giornata sono in preparazione. Redazione e personaggi partecipano sempre; il voto degli allenatori è facoltativo.</p>'+(pollError?'<p role="status">'+E(pollError)+'</p>':'')+'<div class="pt-links">'+link('albo.html','pt-archivio','Archivio del premio')+'</div>');
 const rows=tally(),mine=votes(),id=identity(),human=rows[0]?.humanCount||0,closed=!!week.chiusa||Date.now()>=Date.parse(week.chiude);
 const cards=rows.map((r,i)=>'<article class="pt-candidate"><div><span class="pt-chip">'+(i===0?(week.chiusa?'Vincitrice':'In testa'):'Candidata')+'</span><h3>'+E(N(r.team))+'</h3></div><span class="pt-number">'+Number(r.total).toLocaleString('it-IT',{maximumFractionDigits:1})+'<small>%</small></span><p>'+E(reason(r))+'</p><div class="pt-meter"><span style="width:'+Number(r.total)+'%"></span></div><small class="pt-sub">Redazione '+r.red+' · Personaggi '+r.personaggi+' · Allenatori '+r.umani+'</small>'+(!closed&&id?'<button type="button" data-pt-vote="'+E(r.team)+'" aria-pressed="'+(mine[id.team]===r.team)+'"'+(busyVote?' disabled':'')+'>'+(mine[id.team]===r.team?'Il tuo voto ✓':'Vota '+E(N(r.team)))+'</button>':'')+'</article>').join('');
 const status=closed?(week.chiusa?'Il verdetto è conservato nell’archivio.':'Votazione conclusa. Il verdetto sarà archiviato automaticamente.'):(id?(mine[id.team]?'Hai votato '+N(mine[id.team])+'. Puoi cambiare o ritirare il voto.':'Non hai votato. Il premio viene assegnato anche senza il tuo voto.'):'Entra con la tua squadra nella Curva per votare. La partecipazione è facoltativa.');
 return box('pt-mvp','Squadra della settimana','<p>Redazione e personaggi della Curva scelgono il club della '+b.day+'ª giornata. Il tuo voto è facoltativo.</p><div class="pt-jury"><div><b>Redazione</b><span>'+(human?'40%':'50%')+' del risultato</span></div><div><b>Personaggi della Curva</b><span>'+(human?'40%':'50%')+' del risultato</span></div><div><b>Allenatori</b><span>'+(human?'20% · '+human+' '+(human===1?'voto':'voti'):'Nessun voto · Nessuna attesa')+'</span></div></div><div class="pt-grid">'+cards+'</div><p class="pt-status" role="status">'+E(pollError||status)+'</p>'+(!closed&&id&&mine[id.team]?'<button type="button" data-pt-withdraw'+(busyVote?' disabled':'')+'>Ritira il mio voto</button>':'')+'<p class="pt-sub">Chiusura: '+E(new Date(week.chiude).toLocaleString('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}))+' · Ora di Roma</p><details><summary>Giurie e criteri</summary><p>Con i voti degli allenatori: 40% redazione, 40% personaggi e 20% allenatori. Senza voti umani: 50% alle due giurie automatiche. A parità prevale la redazione, poi il nome della squadra.</p><p>Le candidature considerano vittorie, risultato, trasferta e avversario. Ogni personaggio applica un criterio riconoscibile; le preferenze sono normalizzate, così il loro numero non decide da solo il premio.</p><ul>'+[...(week.redazione||[]),...(week.personaggi||[])].map(v=>'<li><b>'+E(v.autore)+'</b> · '+E(N(v.scelta))+': '+E(v.motivo)+'</li>').join('')+'</ul></details><div class="pt-links">'+link('curva.html','pt-mvp','Il voto nella Curva')+link('albo.html','pt-archivio','Archivio del premio')+'</div>','MVP dei tifosi · Club · '+b.day+'ª giornata');
}
function derby(){if(!derbyReady)return box('pt-derby','Classifica dei Derby','<p>Il registro dei Derby non è disponibile adesso. Riprova tra poco.</p>');const x=GirrrTifosiModel.derbyClassifica(data,competition);return box('pt-derby','Classifica dei Derby','<p>I punti conquistati negli scontri fra le coppie ufficiali della stagione.</p><div class="seg pt-competition" role="group" aria-label="Competizione dei Derby"><button data-pt-comp="lega" aria-pressed="'+(competition==='lega')+'">Campionato</button><button data-pt-comp="cup" aria-pressed="'+(competition==='cup')+'">Champions Cup</button></div>'+(x.rows.length?'<table class="pt-table"><thead><tr><th>#</th><th>Squadra</th><th>Pti</th><th>G</th><th>V</th><th>N</th><th>P</th></tr></thead><tbody>'+x.rows.map(r=>'<tr'+(r.team===team?' class="pt-you"':'')+'><td>'+r.rank+'</td><td>'+E(N(r.team))+'</td><td class="pt-wins">'+r.pt+'</td><td>'+r.g+'</td><td>'+r.v+'</td><td>'+r.n+'</td><td>'+r.p+'</td></tr>').join('')+'</tbody></table>':'<p>Nessun Derby concluso in questa competizione.</p>')+'<p class="pt-sub">Pti = Punti · G = Giocati · V = Vittorie · N = Pareggi · P = Sconfitte. Vittoria 3 punti, pareggio 1. A pari punti: vittorie e differenza reti; altrimenti pari merito.</p><details><summary>Le '+x.matches.length+' partite conteggiate</summary><ul class="pt-audit">'+x.matches.map(m=>'<li><b>'+E(N(m.a))+' '+m.score+' '+E(N(m.b))+'</b><small>'+m.day+'ª giornata · '+E(m.name)+'</small></li>').join('')+'</ul><p class="pt-sub">Registro ufficiale della stagione corrente. Non ricostruisce cambi storici di ufficialità non conservati.</p></details>','Derby · Stagione 2026/27').replace('<section','<section data-pt-competition="'+competition+'"')}
function archive(){const rows=mvp.archivio||[];return box('pt-archivio','MVP dei tifosi',rows.length?rows.map(w=>{const winner=w.classifica?.[0];return winner?'<article class="pt-award-day"><h3>'+w.giornata+'ª giornata · '+E(N(winner.team))+'</h3><p>'+E(w.redazione?.[0]?.motivo||'Verdetto della redazione e dei tifosi.')+'</p><p class="pt-sub">Verdetto conservato il '+E(new Date(w.chiusa).toLocaleDateString('it-IT'))+'</p></article>':''}).join(''):'<p>Non ci sono ancora premi conclusi in questa stagione. I verdetti compariranno qui dopo la chiusura delle votazioni.</p>','Albo d’oro · Record · '+data.stagione)}
function insert(host,id,content,first=false){if(host&&!document.getElementById(id))host.insertAdjacentHTML(first?'afterbegin':'beforeend',content)}
function home(){const summary=document.querySelector('.v55-summary');
 if(team&&summary&&GirrrTifosiModel.complete(data).length&&!document.getElementById('pt-home-story'))summary.insertAdjacentHTML('afterend','<section class="pt-box pt-compact" id="pt-home-story"><details><summary>La tua settimana · '+E(N(team))+'</summary>'+storyCard(GirrrTifosiModel.complete(data).at(-1).n,true)+'</details></section>');
 const host=document.getElementById('v53news');if(host&&!document.getElementById('pt-mvp-notice'))host.insertAdjacentHTML('afterbegin','<a class="v55-news-link" id="pt-mvp-notice" href="'+E(url('app.html','sport'))+'"><span class="v53-dot"></span><span><b>Squadra della settimana</b><small>Scopri le candidate · Puoi votare anche tu</small></span><span>›</span></a>');
}
function sport(){if(!location.hash.includes('sport'))return;const nav=[...document.querySelectorAll('#view .seg')].find(e=>e.querySelector('[data-sp]'));if(!nav)return;
 if(!nav.querySelector('[data-pt-sport]'))nav.querySelector('[data-sp="giornale"]').insertAdjacentHTML('afterend','<button type="button" data-pt-sport="mvp" aria-pressed="false">Squadra della settimana</button>');
 const btn=nav.querySelector('[data-pt-sport]');btn.setAttribute('aria-pressed',String(sportMvp));
 const view=document.getElementById('view');let after=false;[...view.children].forEach(el=>{if(el===nav){after=true;return}if(after&&el.id!=='pt-mvp')el.hidden=sportMvp});
 if(sportMvp){nav.querySelectorAll('[data-sp]').forEach(b=>b.setAttribute('aria-pressed','false'));insert(view,'pt-mvp',poll())}else document.getElementById('pt-mvp')?.remove();
}
function career(){if(!location.hash.includes('carriera')||!team)return;const nav=document.querySelector('#view [data-ctab]')?.closest('.seg');if(!nav)return;
 if(!nav.querySelector('[data-pt-week]'))nav.insertAdjacentHTML('beforeend','<button type="button" data-pt-week aria-pressed="false">La mia settimana</button>');
 nav.querySelector('[data-pt-week]').setAttribute('aria-pressed',String(careerWeek));
 const view=document.getElementById('view');let after=false;[...view.children].forEach(el=>{if(el===nav){after=true;return}if(after&&el.id!=='pt-storia')el.hidden=careerWeek});
 if(careerWeek){nav.querySelectorAll('[data-ctab]').forEach(b=>b.setAttribute('aria-pressed','false'));insert(view,'pt-storia',story())}else document.getElementById('pt-storia')?.remove();
}
function section(value){const u=new URL(location.href);if(value)u.searchParams.set('sezione',value);else u.searchParams.delete('sezione');history.replaceState(null,'',u);void 0}
function mount(){if(!data||!editoriale)return;const login=JSON.stringify(identity());if(login!==knownLogin){knownLogin=login;myVote=null;queueMicrotask(refresh)}const chosen=chosenTeam();if(team!==chosen){team=chosen;document.getElementById('pt-home-story')?.remove();document.getElementById('pt-storia')?.remove()}
 if(page==='index.html')home();
 if(page==='curva.html')insert(document.getElementById('v53sondaggio'),'pt-mvp',poll(),true);
 if(page==='derby.html')insert(document.getElementById('al'),'pt-derby',derby(),true);
 if(page==='derby-stagione.html')insert(document.getElementById('al'),'pt-derby',derby(),true);
 if(page==='app.html'){
  sport();
  career();
 }
 if(page==='albo.html'){
  insert(document.querySelector('[data-ap="rec"]'),'pt-archivio',archive());
  insert(document.querySelector('[data-ap="derby"]'),'pt-derby-access','<a class="card" id="pt-derby-access" href="'+E(url('derby.html','pt-derby'))+'" style="display:block;text-decoration:none;color:inherit"><h3>Classifica dei Derby</h3><div style="font-weight:700;font-size:14px">I punti conquistati contro i rivali ufficiali →</div></a>');
  if(location.hash==='#pt-archivio'){const b=document.querySelector('[data-at="rec"]');if(b&&b.getAttribute('aria-selected')!=='true')setTimeout(()=>{if(b.isConnected&&b.getAttribute('aria-selected')!=='true')b.click()},0)}
 }
}
document.addEventListener('click',e=>{
 const vote=e.target.closest('[data-pt-vote],[data-pt-withdraw]');if(vote&&data){e.preventDefault();e.stopImmediatePropagation();sendVote(vote.hasAttribute('data-pt-withdraw')?null:vote.dataset.ptVote);return}
 const comp=e.target.closest('[data-pt-comp]');if(comp){e.preventDefault();e.stopImmediatePropagation();competition=comp.dataset.ptComp;document.getElementById('pt-derby').outerHTML=derby();return}
 const sp=e.target.closest('[data-pt-sport]');if(sp){e.preventDefault();e.stopImmediatePropagation();sportMvp=true;section('mvp');mount();return}
 if(e.target.closest('[data-sp]')){sportMvp=false;section('');document.getElementById('pt-mvp')?.remove();document.querySelectorAll('#view>[hidden]').forEach(x=>x.hidden=false)}
 if(e.target.closest('[data-pt-week]')){e.preventDefault();e.stopImmediatePropagation();careerWeek=true;section('settimana');mount();return}
 if(e.target.closest('[data-ctab]')){careerWeek=false;section('');document.getElementById('pt-storia')?.remove();document.querySelectorAll('#view>[hidden]').forEach(x=>x.hidden=false)}
},true);
function redrawPoll(){const p=document.getElementById('pt-mvp');if(p)p.outerHTML=poll();const a=document.getElementById('pt-archivio');if(a)a.outerHTML=archive()}
async function refresh(){
 if(!config||!data||busyVote)return;
 const generation=++refreshId,login=JSON.stringify(identity());
 try{const state=await rpc('mvp_stato',{p_stagione:data.stagione,p_giornata:null});let choice=null;const id=identity(),w=state.votazione;if(id&&w){const mine=await rpc('mvp_mio',{p_team:id.team,p_code:id.code,p_stagione:data.stagione,p_giornata:w.giornata});choice=mine.scelta||null}if(generation!==refreshId||login!==JSON.stringify(identity()))return;mvp=state;pollError='';myVote=choice}catch(e){if(generation!==refreshId)return;pollError='La votazione non si è aggiornata. Riprova tra poco.'}
 redrawPoll();mount();
}
async function sendVote(choice){
 const id=identity(),w=mvp.votazione;if(!id||!w||busyVote)return;++refreshId;busyVote=true;pollError='';redrawPoll();
 try{const result=await rpc('mvp_vota',{p_team:id.team,p_code:id.code,p_stagione:data.stagione,p_giornata:w.giornata,p_scelta:choice});mvp=result;myVote=JSON.stringify(id)===JSON.stringify(identity())?(result.scelta||null):null}catch(e){pollError='Il voto non è stato confermato. Controlla l’accesso della squadra e la scadenza, poi riprova.'}finally{busyVote=false;redrawPoll()}
}
async function loadFacts(){
 const [raw,edition]=await Promise.all([fetch(new URL('data.json',root),{cache:'no-cache'}).then(r=>r.json()),fetch(new URL('girrr/dati/tifosi-settimane.json',root),{cache:'no-cache'}).then(r=>r.ok?r.json():{giornate:{}})]);
 const next=GirrrTifosiModel.fromSite(raw,{stagione:config.stagione,derby:data?.derby_ufficiali}),last=GirrrTifosiModel.complete(next).at(-1)?.n||0,version=GirrrTifosiModel.factsText(next,last)+JSON.stringify(edition);
 if(version===factsVersion)return;factsVersion=version;data=next;editoriale=edition;
 await Promise.all(GirrrTifosiModel.complete(data).map(async g=>{const bytes=new TextEncoder().encode(GirrrTifosiModel.factsText(data,g.n)),hash=await crypto.subtle.digest('SHA-256',bytes);signatures[g.n]=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}));
 document.querySelectorAll('#pt-home-story,#pt-storia,#pt-mvp,#pt-derby,#pt-archivio').forEach(el=>el.remove());mount();
}
async function start(){
 config=await fetch(new URL('girrr/v60/tifosi-config.json',root)).then(r=>{if(!r.ok)throw Error('Configurazione mancante');return r.json()});
 await loadFacts();
 mount();let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount()})}}).observe(document.body,{subtree:true,childList:true});
 window.addEventListener('hashchange',()=>{mount();refresh()});window.addEventListener('load',mount,{once:true});window.addEventListener('storage',()=>{myVote=null;mount();refresh()});
 document.addEventListener('change',e=>{if(e.target.matches('#cteam,#v53team')){setTimeout(()=>{document.getElementById('pt-storia')?.remove();document.getElementById('pt-home-story')?.remove();mount()},0)}});
 try{const derby=await rpc('mvp_derby',{p_stagione:data.stagione});data.derby_ufficiali=derby;for(const pair of derby.coppie||[]){if(pair.n==='Derby'){const old=window.NOV?.riv?.find(r=>[r.a,r.b].includes(pair.a)&&[r.a,r.b].includes(pair.b));if(old?.n)pair.n=old.n}}derbyReady=true;document.getElementById('pt-derby')?.remove();mount()}catch(e){derbyReady=false}
 await refresh();setInterval(async()=>{if(!document.hidden&&!busyVote){try{await loadFacts();await refresh()}catch(e){pollError='I dati non si sono aggiornati. Riprova tra poco.';redrawPoll()}}},60000);
}
start().catch(()=>{console.info('Le novità dei tifosi non sono disponibili adesso. Le altre sezioni restano accessibili.')});
})();
