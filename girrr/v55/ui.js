/* O Girrr 5.5 — nell'Anteprima nessuna scrittura al database; sul sito vero (SITO55) sondaggio della Curva e notifiche usano il database */
(function(){
'use strict';
var root=new URL('./',document.currentScript.src).href;
var mode=document.body.dataset.v53||'',skin=document.body.dataset.v53Skin||'lega',dataUrl='https://giandjcosta.github.io/o-fant-a-girrr/data.json';
var k='og:53:',teamList=[],D=null,CRON=null,HIST55={};
function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cronacheValide(){if(!CRON||!D)return [];var firma=JSON.stringify(completeRounds(false).map(function(x){return {n:x.n,m:x.m}}));return firma===CRON.firma?(CRON.eventi||[]):[]}
function notizia(){return cronacheValide().find(function(e){return e.giornata===(latest()||{}).n})||null}
function n(v){return Number(v)||0}
function dec(x){return Number.isFinite(Number(x))?Number(x).toLocaleString('it-IT',{maximumFractionDigits:2}):'—'}
function get(key,def){try{var x=localStorage.getItem(k+key);return x?JSON.parse(x):def}catch(e){return def}}
function set(key,x){try{localStorage.setItem(k+key,JSON.stringify(x))}catch(e){}}
function mark(t){return '<span class="v53-kicker">'+esc(t)+'</span>'}
/* Notifiche personali su Supabase (funzioni notifiche_stato e notifiche_segna_lette, chiave pubblica come nelle pagine del sito). */
var SB='https://qmjqfgmvimsuxvghetgi.supabase.co',SBK='sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n';
/* Modalità ospite come sul sito (?ospite=1, vale per tutta la visita): sola lettura, niente parti personali. */
var OSP=(function(){try{if(/[?&]ospite\b/.test(location.search))sessionStorage.setItem('ospite','1');return sessionStorage.getItem('ospite')==='1'}catch(e){return /[?&]ospite\b/.test(location.search)}})();
function ospite(){if(!OSP)return;document.documentElement.classList.add('v53-ospite');
 var st=document.createElement('style');st.textContent='a[href$="o-fant-a-girrr/index.html"],a[href*="totogirrr"],.lg-leghe,#mst,.c.bet{display:none!important}.osp{position:sticky;top:0;z-index:9998;background:#ffd166;color:#1d2a52;font:800 12px/1.3 Inter,system-ui,sans-serif;letter-spacing:.14em;text-align:center;padding:7px 10px;text-transform:uppercase}'+
  (skin==='stadio'?'@media(min-width:821px){body .cards{grid-template-columns:repeat(4,minmax(0,1fr))!important}}@media(max-width:820px){body .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}}':'@media(min-width:560px){body .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}}');
 document.head.appendChild(st);var b=document.createElement('div');b.className='osp';b.textContent='Modalità ospite · Sola lettura';
 var v=document.querySelector('.v53-banner');if(v&&v.parentNode)v.parentNode.insertBefore(b,v.nextSibling);else document.body.insertBefore(b,document.body.firstChild)}
function chi(){if(OSP)return null;try{var o=JSON.parse(localStorage.getItem('fg')||'{}');return o&&o.team&&o.code?o:null}catch(e){return null}}
function rpcN(n,b){return fetch(SB+'/rest/v1/rpc/'+n,{method:'POST',headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw Error(j&&j.message||('Errore '+r.status));return j})})}
function sitoUrl(pag){return 'https://giandjcosta.github.io/o-fant-a-girrr/'+(skin==='stadio'?'stadio/girrr/':'girrr/')+pag}
function quando(t){var d=(Date.now()-new Date(t).getTime())/36e5;if(!(d>=0))return '';if(d<1)return 'Poco fa';if(d<24)return Math.round(d)+' ore fa';var g=Math.round(d/24);return g===1?'Ieri':g+' giorni fa'}
function personali(st){return (st&&st.eventi||[]).map(function(e){return {key:e.chiave,type:e.tipo,ic:e.ic,title:e.titolo,detail:e.testo,when:e.quando,nuova:!!e.nuova,personale:true,
 link:window.OGDest55.link(e,root,skin)}}).filter(function(e){return !!e.link})}

function note(t){return '<div class="v53-empty">'+esc(t)+'</div>'}
function matchPlayed(m,cup){return Array.isArray(m)&&/^\d+-\d+$/.test(String(m[cup?5:4]))}
function games(cup){return ((D&&D.cal&&(cup?D.cal.cup:D.cal.lega))||[]).slice()}
function completeRounds(cup){var out=[];games(cup).sort(function(a,b){return a.n-b.n}).some(function(g){var mm=g.m||[];if(g.n!==out.length+1||!mm.length||!mm.every(function(m){return matchPlayed(m,cup)}))return true;if(!cup){var names=mm.flatMap(function(m){return [m[0],m[3]]}).sort().join('|');if(names!==(D.teams||[]).map(function(t){return t.name}).sort().join('|'))return true}out.push(g);return false});return out}
function latest(){var g=completeRounds(false);return g[g.length-1]||null}
function next(){return games(false).find(function(g){return g.m&&g.m.some(function(m){return !matchPlayed(m,false)})})||null}
function mFor(g,t){return g&&g.m&&g.m.find(function(m){return m[0]===t||m[3]===t})}
function allFinished(){var out=[];completeRounds(false).forEach(function(g){(g.m||[]).forEach(function(m,i){if(matchPlayed(m,false))out.push({g:g,m:m,id:g.n+'-'+i})})});return out.reverse()}
function ranks(until){var map={};(D.teams||[]).forEach(function(t){map[t.name]={team:t.name,pt:0,fp:0,gf:0,gs:0,g:0,v:0,nn:0,p:0}});
completeRounds(false).filter(function(g){return g.n<=until}).forEach(function(g){(g.m||[]).forEach(function(m){if(!matchPlayed(m,false))return;
var a=map[m[0]],b=map[m[3]],r=String(m[4]).split('-').map(Number);if(!a||!b||!Number.isFinite(r[0])||!Number.isFinite(r[1]))return;
a.g++;b.g++;if(r[0]>r[1]){a.v++;b.p++}else if(r[0]<r[1]){b.v++;a.p++}else{a.nn++;b.nn++}a.pt+=r[0]>r[1]?3:r[0]===r[1]?1:0;b.pt+=r[0]<r[1]?3:r[0]===r[1]?1:0;
a.fp+=n(m[1]);b.fp+=n(m[2]);a.gf+=r[0];a.gs+=r[1];b.gf+=r[1];b.gs+=r[0]})});
return Object.values(map).sort(function(a,b){return b.pt-a.pt||b.fp-a.fp||b.gf-b.gs-(a.gf-a.gs)||b.gf-a.gf||['The Blue brothers','Apo team','Mariana Coneja','stif dc','Real Madrink','Atletico ma non troppo','Oranje VC','AFA SELECCION','Grodah','WOA'].indexOf(a.team)-['The Blue brothers','Apo team','Mariana Coneja','stif dc','Real Madrink','Atletico ma non troppo','Oranje VC','AFA SELECCION','Grodah','WOA'].indexOf(b.team)})}
function href(which){return window.OG55?OG55.pagina(which,skin,root):root+which+'-'+skin+'.html'}
var SITO55=!!(window.OG55&&OG55.sito);
function albo(q){return href('albo')+q+(SITO55?'#oro':'')}
function nav(){
 var old=el('v53nav');if(old)old.remove();
 /* Home: la testata resta quella di sempre (logo grande e interruttore Lega/Stadio); le notifiche sono in «Oggi al Girrr» (Gianluca, 2 novembre) */
 if(mode==='home'||mode==='curva')return; /* Home e Curva hanno la loro testata */
 var where=document.querySelector('.ohead,.hero,.mast,header.top,header');if(!where)return;
 var names={home:'Home',board:'Tabellone',campo:'Campo',albo:"Albo d’oro",curva:'Curva',notifications:'Notifiche'};
 var parent=mode==='campo'?'tabellone':'index',prev=null;
 try{var ref=new URL(document.referrer),base=new URL(root);if(ref.origin===base.origin&&ref.pathname.startsWith(base.pathname)&&(window.OG55?!!OG55.nome(ref.pathname):/\/(index|tabellone|campo|albo|curva|notifiche)-(lega|stadio)\.html$/.test(ref.pathname))&&ref.href!==location.href)prev=ref}catch(e){}
 var utilities=document.createElement('nav');utilities.className='v53 v53-utilities v55-header';utilities.setAttribute('aria-label','Navigazione della Lega');
 function update(){
  if(mode==='campo'){skin=document.body.dataset.skin||skin;document.body.dataset.v53Skin=skin;}
  var target=prev?prev.href:href(parent),label=prev?((window.OG55&&OG55.nome(prev.pathname))||prev.pathname.split('/').pop().split('-')[0]):parent;if(label==='albo')label='albo';
  /* Campo: un solo «indietro», che torna al Tabellone sulla stessa giornata (anche in coppa) */
  var rt=mode==='campo'&&el('ritorno-tabellone');if(rt&&(!prev||/\/tabellone[-.]/.test(prev.pathname))){target=rt.href;label='tabellone'}
  var labels={index:'Home',tabellone:'Tabellone',campo:'Campo',albo:"Albo d’oro",curva:'Curva',notifiche:'Notifiche'};
  var page=mode==='home'?'index':mode==='board'?'tabellone':mode==='notifications'?'notifiche':mode;
  function skinTarget(){var altra=skin==='lega'?'stadio':'lega',u=new URL(window.OG55?OG55.pagina(page,altra,root):page+'-'+altra+'.html',root);if(SITO55&&mode==='albo'){u.hash=location.hash;u.search=location.search;return u.href}u.search=location.search;if(mode==='campo'||u.searchParams.has('skin'))u.searchParams.set('skin',skin==='lega'?'stadio':'lega');if(/^#(lega|coppa)(-\d+)?$/.test(location.hash))u.hash=location.hash;return u.href;}
  utilities.innerHTML='<a class="v55-home-logo" href="'+href('index')+'" aria-label="Home O Girrr"><img src="https://giandjcosta.github.io/o-fant-a-girrr/assets/loghi/logo-lega-o-fant-a-girrr.png" alt="O Girrr"></a>'+
   '<a class="v55-return" href="'+esc(target)+'" aria-label="Torna a '+esc(labels[label]||'Home')+'">‹ '+esc(labels[label]||'Home')+'</a>';
  /* Gianluca, 2 novembre: in alto solo il logo per la Home e il link alla pagina precedente; la grafica si cambia nella Home */
  var swap=null;if(swap){['pointerenter','pointerdown','focus','click'].forEach(function(event){swap.addEventListener(event,function(){swap.href=skinTarget()})});
  /* la scelta resta anche per le pagine del sito che la leggono (orr_gv: a = Lega, n = Stadio) */
  swap.addEventListener('click',function(){try{localStorage.setItem('orr_gv',skin==='lega'?'n':'a')}catch(e){}});}
  var back=utilities.querySelector('.v55-return');if(prev)back.onclick=function(e){if(history.length>1){e.preventDefault();history.back()}};
 }
 update();where.insertAdjacentElement('beforebegin',utilities);document.body.classList.add('v55-has-header');
 if(mode==='campo')new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-skin']});
}
function redirect(){
if(SITO55)return; /* sul sito vero i link e le azioni della Curva funzionano davvero */
document.addEventListener('click',function(e){
 var a=e.target.closest&&e.target.closest('a[href]');
 if(a&&a.closest('.v53'))return;
 if(a){var val=(a.getAttribute('href')||'').split('#')[0].split('?')[0],end=val.split('/').pop();if(['index.html','tabellone.html','albo.html','curva.html'].includes(end)&&!val.startsWith('https:')&&!val.startsWith('http:')){e.preventDefault();e.stopImmediatePropagation();location.href=root+end.replace('.html','')+'-'+skin+'.html';return}}
 if(mode==='curva'&&e.target.closest&&e.target.closest('#go,#ad-go,[data-a=invia],[data-a=vota],[data-a=del],[data-a=delr],[data-a=salvaav],[data-a=addel],[data-a=ap],[data-a=ril],[data-seg]')){e.preventDefault();e.stopImmediatePropagation();}
},true);
if(mode==='curva')document.addEventListener('submit',function(e){if(!e.target.closest('.v53')){e.preventDefault();e.stopImmediatePropagation()}},true);
}
function load(cb){fetch(dataUrl,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Dati temporaneamente indisponibili');return r.json()}).then(function(v){if(!v||!v.cal||!v.teams)throw Error('Formato dati non riconosciuto');D=window.CVPUB?window.CVPUB(v):v;teamList=v.teams.map(function(t){return t.name});Promise.all([fetch(SITO55?OG55.dir('lega')+'dati/cronache.json':root+'cronache.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}),mode==='home'?fetch(root+'allenatori.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():{}}).catch(function(){return {}}):Promise.resolve({})]).then(function(x){CRON=x[0];HIST55=x[1];cb()})}).catch(function(e){var ids=mode==='home'?['v53metrics','v53news']:mode==='notifications'?['v53notifications']:mode==='board'?['v53boardcontent']:mode==='albo'?['v53annual']:['v53poll'];ids.forEach(function(id){if(el(id))el(id).innerHTML=note('I dati della stagione non sono raggiungibili. La navigazione e le sezioni originali restano disponibili.')});console.warn('5.5 dati non caricati:',e.message)})}
function teamPicker(id,cb){
 var s=el(id);if(!s)return;
 var io=chi(),registro=/\/o-girrr-registro\//.test(location.pathname)||(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&/\/anteprima\/5\.5\//.test(location.pathname));
 var prova=registro&&new URLSearchParams(location.search).get('riepilogo')!=='personale';
 var mia=io&&teamList.indexOf(io.team)>=0?io.team:null,choices=prova?teamList:mia?[mia]:[];
 var t=prova?get('team',mia||teamList[0]):mia;if(choices.indexOf(t)<0)t=choices[0]||null;
 s.innerHTML=choices.length?choices.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join(''):'<option value="">Entra con la tua squadra</option>';
 s.value=t||'';s.disabled=!prova;
 var label=document.querySelector('label[for="'+id+'"]');if(label)label.textContent=prova?'Squadra in prova':'La mia squadra';
 s.closest('.v53-team').classList.toggle('v55-ownteam',!prova);
 s.addEventListener('change',function(){if(!prova){s.value=mia||'';return}if(choices.indexOf(s.value)<0)return;set('team',s.value);cb(s.value)});cb(t)
}
function home(){
 var generation=0;
 var live=el('v53news').parentElement;live.classList.add('v55-notice');
 var header=document.createElement('div');header.className='v55-notice-head';
 header.innerHTML='<h3><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg> Notifiche <span id="v55unread" aria-live="polite"></span></h3><a href="'+href('notifiche')+'">Tutte ›</a>';
 var panel=document.querySelector('.v53-home');live.prepend(header);header.append(el('v53read'));panel.prepend(live);
 var dashboard=document.createElement('details');dashboard.id='v55dashboard';dashboard.className='v55-dashboard';dashboard.open=get('home-open',true)!==false;
 var summary=document.createElement('summary'),heading=document.querySelector('.v53-homehead');
 summary.append(heading.firstElementChild);
 var compact=document.createElement('span');compact.id='v55compact';compact.className='v55-compact';summary.firstElementChild.append(compact);
 summary.insertAdjacentHTML('beforeend','<span class="v55-disclosure-label"></span><span class="v55-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>');
 var body=document.createElement('div');body.className='v55-dashboard-body';
 Array.from(panel.children).forEach(function(child){if(child!==live)body.append(child)});
 dashboard.append(summary,body);panel.append(dashboard);
 function stato(){summary.querySelector('.v55-disclosure-label').textContent=dashboard.open?'Chiudi riepilogo':'Apri riepilogo'}
 stato();dashboard.addEventListener('toggle',function(){stato();set('home-open',dashboard.open)});
 teamPicker('v53team',function(t){
 var version=++generation,day=latest(),nm=day&&day.n,cls=nm?ranks(nm):[],sets=completeRounds(false).map(function(g){return {n:g.n,table:ranks(g.n)}});
 var box=el('v53metrics');box.classList.add('v55-unified');
 box.innerHTML=t?window.OGHome55.render({team:t,table:cls,sets:sets,rounds:completeRounds(false),cupRounds:completeRounds(true),cupLink:href('tabellone')+'#coppa',coachLink:albo('?albo=all'),calendar:games(false).sort(function(a,b){return a.n-b.n}),archivio:HIST55,
  dayLink:function(n){return href('tabellone')+'#lega-'+n},boardLink:href('tabellone'),careerLink:function(team){return SITO55?href('app')+'#carriera':new URL('../'+(skin==='lega'?'attuale.html':'index.html'),root).href+'?come='+encodeURIComponent(team)+'#carriera'}}):note('Entra con la tua squadra per vedere il tuo riepilogo personale.');
 var ownrow=cls.find(function(r){return r.team===t});compact.textContent=t?t+(ownrow?' · '+(cls.indexOf(ownrow)+1)+'ª · '+ownrow.pt+' punti':''):'Il riepilogo della tua squadra';
 var z=notizia(),items=[],me=chi(),personal=[],busy=!!(chi()&&chi().team===t);
 if(z)items.push({key:z.chiave,title:z.titolo,detail:z.testo,link:href('tabellone')+'?sezione=classifica&cronaca='+encodeURIComponent(z.chiave)+'#lega-'+nm});
 if(day)items.push({key:'result-'+nm,title:'Risultati della '+nm+'ª giornata',detail:'Risultati, classifica e dettagli delle partite.',link:href('tabellone')+'?sezione=risultati#lega-'+nm});
 var nx=next();if(nx)items.push({key:'poll-'+nx.n,title:'La Curva prepara la '+nx.n+'ª',detail:'Apri il sondaggio e scegli la sfida da seguire.',link:href('curva')+'?sondaggio='+nx.n+'#v53poll'});
 function unread(x){return x.personale?x.nuova:!get('read-'+x.key,false)}
 function draw(){
  var all=personal.concat(items),fresh=all.filter(unread),chosen=fresh.slice(0,2),total=fresh.length;
  el('v55unread').textContent=total?total+' da leggere':'Tutto letto';
  document.querySelectorAll('.v55-notify-count').forEach(function(x){x.hidden=!total;x.textContent=total;x.parentElement.title=total+' notifiche da leggere'});
  el('v53news').innerHTML=chosen.length?chosen.map(function(x){return '<a class="v55-news-link" href="'+esc(x.link)+'"><span class="v53-dot" aria-hidden="true"></span><span><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></span><span aria-hidden="true">›</span></a>'}).join(''):'<a class="v55-news-link" href="'+href('notifiche')+'">Nessuna nuova notifica. Apri il centro notifiche ›</a>';
  var b=el('v53read');b.hidden=!total;b.disabled=busy;
 }
 draw();
 if(me&&me.team===t)rpcN('notifiche_stato',{p_team:me.team,p_code:me.code}).then(function(st){if(version!==generation)return;busy=false;personal=personali(st);if(Array.isArray(st.chiavi))st.chiavi.forEach(function(k){set('read-'+k,true)});draw()}).catch(function(){if(version===generation){busy=false;draw();el('v55unread').textContent='Novità della Lega';}});
 el('v53read').onclick=function(){
  if(busy)return;items.forEach(function(x){set('read-'+x.key,true)});
  var old=personal.map(function(x){return x.nuova});personal.forEach(function(x){x.nuova=false});
  if(me&&me.team===t){busy=true;draw();rpcN('notifiche_segna_lette',{p_team:me.team,p_code:me.code,p_chiavi:items.map(function(x){return x.key}).slice(0,100)}).then(function(){if(version!==generation)return;busy=false;draw()}).catch(function(){if(version!==generation)return;busy=false;personal.forEach(function(x,i){x.nuova=old[i]});draw();el('v55unread').textContent='Lettura non salvata. Riprova.'})}else draw();
 };
 });
}
function board(){
if(window.OGDest55)window.OGDest55.board({eventi:cronacheValide()});
var holder=el('v53boardcontent'),rounds=completeRounds(false),sets=ranks((latest()||{}).n||0);
if(!holder)return;
var buttons=el('v53boardtabs');
function switchTo(part){buttons.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.view===part?'true':'false')});if(part==='compare')compare();else matchCenter()}
buttons.addEventListener('click',function(e){var b=e.target.closest('button[data-view]');if(b)switchTo(b.dataset.view)});
function compare(){
 var opts=rounds.map(function(g){return '<option value="'+g.n+'">'+g.n+'ª giornata</option>'}).join('');
 if(rounds.length<2){holder.innerHTML=note('Servono due giornate complete per confrontare i movimenti in classifica.');return}
 holder.innerHTML='<div class="v53-field"><label for="v53from">Dalla</label><select class="v53-select" id="v53from">'+opts+'</select><label for="v53to">Alla</label><select class="v53-select" id="v53to">'+opts+'</select></div><div id="v53delta" class="v53-row"></div><p class="v53-muted">Movimenti della classifica tra le due giornate selezionate.</p>';
 var a=el('v53from'),b=el('v53to');a.value=String(rounds[Math.max(0,rounds.length-3)].n);b.value=String(rounds[rounds.length-1].n);
 function update(){var x=ranks(n(a.value)),y=ranks(n(b.value));el('v53delta').innerHTML=y.map(function(t,i){var p=x.findIndex(function(v){return v.team===t.team})+1,d=p-(i+1);return '<div class="v53-box"><small>'+(i+1)+'º posto · '+esc(t.team)+'</small><strong>'+(d>0?'↑ '+d+' posizioni':d<0?'↓ '+(-d)+' posizioni':'= stessa posizione')+'</strong><small>'+t.pt+' punti · '+dec(t.fp)+' Fantapunti · DR '+(t.gf-t.gs)+'</small></div>'}).join('')}
 a.onchange=update;b.onchange=update;update();
}
function matchCenter(){
var matches=allFinished();if(!matches.length){holder.innerHTML=note('Il centro partita si aprirà dopo il primo incontro concluso.');return}
 holder.innerHTML='<div class="v53-field"><label for="v53match">Scegli la partita</label><select class="v53-select" id="v53match" style="flex:1;min-width:160px">'+matches.slice(0,70).map(function(x){return '<option value="'+esc(x.id)+'">'+x.g.n+'ª · '+esc(x.m[0]+' '+x.m[4]+' '+x.m[3])+'</option>'}).join('')+'</select></div><div id="v53matchstats"></div>';
 var select=el('v53match');function draw(){var x=matches.find(function(v){return v.id===select.value})||matches[0],m=x.m,gol=m[4].split('-').map(Number),assegnati=gol[0]===gol[1]?[1,1]:gol[0]>gol[1]?[3,0]:[0,3];el('v53matchstats').innerHTML='<div class="v53-row"><div class="v53-box"><span class="v53-mini-title">RISULTATO UFFICIALE</span><div class="score">'+esc(m[0]+' '+m[4]+' '+m[3])+'</div><small>Campionato · '+x.g.n+'ª giornata</small></div><div class="v53-box"><span class="v53-mini-title">DATI LEGHE FANTACALCIO</span><div class="score">'+dec(m[1])+' <em>–</em> '+dec(m[2])+'</div><small>Fantapunti · Fonte Leghe Fantacalcio</small></div></div><p class="v53-muted">Punti in classifica assegnati nel turno: '+esc(m[0])+' '+assegnati[0]+' · '+esc(m[3])+' '+assegnati[1]+'.</p>'}select.onchange=draw;draw()
}
switchTo('compare');
}
function annual(){
var tgt=el('v53annual');if(!tgt)return;var g=latest(),r=ranks(g&&g.n||0),gamesPlayed=allFinished(),teams=D.teams||[];
var all=gamesPlayed.reduce(function(z,x){var m=x.m;z.push({team:m[0],fp:n(m[1]),against:m[3],result:m[4],day:x.g.n});z.push({team:m[3],fp:n(m[2]),against:m[0],result:m[4],day:x.g.n});return z},[]);
var hi=all.slice().sort(function(a,b){return b.fp-a.fp})[0];
var rosters=teams.map(function(t){return {name:t.name,players:(t.pl||[]).length,value:(t.pl||[]).reduce(function(s,p){return s+n(p.c)},0)}}).sort(function(a,b){return b.value-a.value});
var cl='<ol>'+r.slice(0,3).map(function(x,i){return '<li><b>'+esc(x.team)+'</b> — '+x.pt+' punti ('+dec(x.fp)+' Fantapunti)</li>'}).join('')+'</ol>';
var year='<div class="v53-crumb">'+(g?'Campionato · giocata la '+g.n+'ª giornata':'Campionato · stagione in corso')+'. Nessun titolo assegnato prima della fine ufficiale.</div>';
var items=[
['Classifica e podio',cl+'<p class="v53-muted">Posizioni provvisorie. Titolo e podio definitivi soltanto a stagione conclusa.</p>'],
['Rose e valori','<ul>'+rosters.slice(0,10).map(function(x){return '<li>'+esc(x.name)+': '+x.players+' giocatori · '+dec(x.value)+' fantacrediti di costo registrato</li>'}).join('')+'</ul><p class="v53-muted">Il valore è ricavato dai dati di rosa disponibili, non è una valutazione di mercato.</p>'],
['Record di giornata',hi?'<p><strong>'+esc(hi.team)+'</strong>: '+dec(hi.fp)+' Fantapunti alla '+hi.day+'ª giornata contro '+esc(hi.against)+' (risultato '+esc(hi.result)+').</p>':note('Nessun record disponibile.')],
['Champions Cup','<p>Gironi, risultati, quarti, semifinali e finale sono consultabili nella scheda Champions Cup del Tabellone. Le vittorie sono assegnate solo quando i risultati sono pubblicati.</p><a class="v53-btn ghost" href="'+href('tabellone')+'">Apri la Champions Cup</a>'],
['Albo storico e stagioni precedenti','<p>Le stagioni precedenti mantengono tutti i dati dell’Albo già presente nella pagina. Nuovi record storici non conservati: <strong>Dato non conservato</strong>.</p>']
];
tgt.innerHTML=year+items.map(function(item,i){return '<details class="v53-details" '+(i===0?'open':'')+'><summary>'+esc(item[0])+'</summary><div class="v53-detailbody">'+item[1]+'</div></details>'}).join('');
}
function optsPoll(){var requested=Number(new URLSearchParams(location.search).get('sondaggio')),g=requested?games(false).find(function(x){return x.n===requested}):next(),mm=(g&&g.m)||[];return {day:g&&g.n||0,opts:mm.map(function(m){return m[0]+' – '+m[3]})}}
/* Le voci sono quelle della banca reale curva-banca.js. Tono distinto,
   variazioni deterministiche per giornata e, se disponibile, vere reazioni CVB. */
var BOT_FRASI=[
 ['il_barista','Il Barista',[
 'Per {sfida} ho già acceso la macchina del caffè. Il risultato lo discutiamo al bancone.',
 'Qui al bar abbiamo un pronostico per ogni partita. E un caffè per ogni pronostico sbagliato.',
 'Per la {giornata}ª giornata il tavolo vicino alla TV è già prenotato. Da tutti.']],
 ['mister_divano','Mister Divano',[
 'Io punterei su {sfida}. Se mi date un telecomando vi spiego pure il modulo.',
 'La partita da seguire? Quella in cui ascoltano finalmente il mio 4-3-3. Quindi nessuna.',
 'A {sfida} suggerisco pressing alto. Mi alzo dal divano solo per il gol.']],
 ['il_complottista','Il Complottista',[
 'Chi ha deciso che {sfida} è la sfida del giorno? Io voglio il verbale.',
 'Vi fidate davvero dei sondaggi? Io chiedo il controllo incrociato delle schede.',
 'Non dico che il calendario sia sospetto. Dico che lo sto guardando con una lente.']],
 ['il_super_tifoso','Il Super Tifoso',[
 'Per me la partita è {sfida}! Sempre sostenuta, da circa cinque minuti.',
 'Io tifo la prima. Quale? Aspetto che esca la nuova classifica.',
 'Per la {giornata}ª ci sarò. Sciarpa pronta e pronostico già dimenticato.']],
 ['nonno_cesare','Nonno Cesare',[
 'Ai miei tempi una partita bastava per tutta la domenica. Adesso vorrei vederle tutte.',
 'Ho già preparato la radiolina per {sfida}. E sì, funziona ancora.',
 'Una volta votavamo al bar con un cenno del capo. Ma mi piace vedere tutta la Curva qui.']],
 ['statistico_folle','Lo Statistico Folle',[
 'Per {sfida} confronto risultati e forma recente. Anche il caffè può aspettare.',
 'Le percentuali del sondaggio le voglio confrontare con la classifica dopo la {giornata}ª.',
 'Ho aperto un foglio di calcolo per decidere fra le partite. Il foglio è ancora indeciso.']],
 ['il_romantico_del_pallone','Il Romantico del Pallone',[
 '{sfida}: non conosco il finale, ed è proprio per questo che la seguirei.',
 'I sondaggi passano. Il ricordo della partita resta. Basta che sia una bella sfida.',
 'In fondo, alla {giornata}ª ci interessa ancora la stessa cosa: il pallone.']],
 ['gufo_professionista','Il Gufo Professionista',[
 'Mi aspetto grandi cose da {sfida}. Ora, dopo questa frase, non posso più guardarla.',
 'Voto con fiducia. Ma non è detto che la fiducia sia una buona notizia.',
 'Spero vincano tutti. È statisticamente impossibile, ma la gufata è pronta.']],
 ['telecronista_stanco','Il Telecronista Stanco',[
 'Un altro turno e un altro sondaggio. Vi voglio bene, ma mi manca il sonno.',
 'A {sfida} ci sarò. Se il microfono regge.',
 'La {giornata}ª sarà emozionante. Lo dico con le ultime energie disponibili.']],
 ['arbitro_in_pensione','L’Arbitro in Pensione',[
 'Per {sfida} voglio solo due cose: rispetto del regolamento e un bel fischio finale.',
 'Un voto nel sondaggio non equivale a un voto in campo. Lo preciso per regolamento.',
 'Chiunque vinca il sondaggio, in partita contano i gol. Come sempre.']]
];
function botComments(p){
 var top=latest()&&ranks(latest().n)[0],sfida=p.opts[p.day%p.opts.length]||p.opts[0],ctx={sfida:sfida,giornata:p.day,capolista:top?top.team:'da definire'};
 var list=BOT_FRASI.map(function(b,i){var arr=b[2],choice=(p.day+i*7)%arr.length;return [b[1],arr[choice].replace(/\{(\w+)\}/g,function(_,key){return ctx[key]||''})]});
 var day=latest(),mm=day&&day.m||[];
 var commenti=['Al bancone oggi si parla di questo risultato. Il prossimo caffè lo offrono i vincitori.',
 'Dal divano ho visto il risultato. Per la prossima partita ho già pronto un altro modulo.',
 'Il risultato è registrato. Sul resto pretendo il verbale, come sempre.',
 'La sciarpa resta al collo: oggi si canta, domani si torna in campo.',
 'Una giornata non fa una stagione, ragazzi. Il campo chiederà altre risposte.',
 'Gol e punti raccontano due numeri diversi: io li tengo entrambi nel taccuino.',
 'Resta una partita da ricordare. Il pallone sa sempre cambiare il racconto.',
 'Non dico niente sulla prossima. Ho già fatto abbastanza danni con i miei auguri.',
 'Ho ancora il risultato davanti. Ora lasciatemi riposare la voce.',
 'Risultato agli atti. Le opinioni al bar, il regolamento resta quello.'];
 list=list.map(function(x,i){if(!mm.length||(i+p.day)%3!==0)return x;var m=mm[(i+p.day)%mm.length],q=m[4].split('-').map(Number),f=q[0]===q[1]?m[0]+' e '+m[3]+' hanno pareggiato '+m[4]+'.':(q[0]>q[1]?m[0]+' ha battuto '+m[3]:m[3]+' ha battuto '+m[0])+' '+(q[0]>q[1]?m[4]:q[1]+'-'+q[0])+'.';return [x[0],f+' '+commenti[i]]});
 var zona=notizia();if(zona)list[5]=['Lo Statistico Folle',zona.testo+' Questa sì che è una serie da studiare.'];

 try{var bank=window.CVB;if(bank&&bank.reazioni&&bank.PERS){
   var ts=Date.now()-24*3600000;
   var replies=bank.reazioni('p53-sondaggio-'+p.day,ts,Date.now(),teamList,'Quale partita seguiresti alla '+p.day+'ª giornata?').r||[];
   var names={il_complottista:'Il Complottista',il_super_tifoso:'Il Super Tifoso',mister_divano:'Mister Divano',il_barista:'Il Barista',nonno_cesare:'Nonno Cesare',statistico_folle:'Lo Statistico Folle',il_romantico_del_pallone:'Il Romantico del Pallone',gufo_professionista:'Il Gufo Professionista',tifoso_arrabbiato:'Il Tifoso Arrabbiato',il_mago_cabala:'Il Mago della Cabala'};
   replies.filter(function(x){return bank.PERS[x.a]}).slice(0,5).forEach(function(x){list.push([names[x.a]||x.a,x.x])});
 }}catch(e){console.warn('Risposte CVB non disponibili nella prova',e.message)}
 return list;
}
/* Claude, 2 novembre: sondaggio della giornata come un post della Curva (Gianluca).
   Sta sotto «Cosa succede in curva?» solo in «Per te». Si vota finché non comincia la giornata di Serie A collegata
   (orari da data.json: sa per la giornata in arrivo, fx per quelle passate). Dopo il voto, o dopo l'inizio, la scheda
   diventa un post con il conteggio. I commenti si aprono e si chiudono. */
/* le date di Serie A non hanno l'anno: da agosto a dicembre è il primo anno della stagione, da gennaio a luglio il secondo */
function oraSA(t){var m=/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(String(t||''));if(!m)return null;var now=new Date(),inizio=now.getMonth()>=6?now.getFullYear():now.getFullYear()-1,mese=+m[2];
 return new Date(mese>=7?inizio:inizio+1,mese-1,+m[1],+m[3],+m[4])}
function inizioGiornata(g){var L=(D&&D.sa&&D.sa[String(g.sa)])||(D&&D.fx&&D.fx[String(g.sa)])||[],min=null;L.forEach(function(x){var d=oraSA(x[2]);if(d&&(!min||d<min))min=d});return min}
function sondaggi(){var gs=games(false).filter(function(g){return g.m&&g.m.length}),now=new Date(),aperto=null,chiuso=null;
 gs.forEach(function(g){var played=g.m.every(function(m){return matchPlayed(m,false)}),ini=inizioGiornata(g),partita=played||(ini&&ini<=now);
  if(!partita&&!aperto)aperto=g;if(partita)chiuso=g});
 var q=Number(new URLSearchParams(location.search).get('sondaggio'));if(q){var r=gs.find(function(g){return g.n===q});if(r){var ini=inizioGiornata(r),pt=r.m.every(function(m){return matchPlayed(m,false)})||(ini&&ini<=now);if(pt)chiuso=r;else aperto=r}}
 return {aperto:aperto,chiuso:chiuso}}
function quandoChiude(g){var d=inizioGiornata(g);if(!d)return 'Si chiude quando comincia la giornata';return 'Si chiude '+d.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'numeric'})+' alle '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}
var SEC55=null,POLL55=null;
function posizionaSondaggio(){var sec=SEC55||el('v53sondaggio'),v=el('vista');if(!sec||!v)return;
 var perTe=!!document.querySelector('button[data-f="tutti"].on')&&!!v.querySelector('article.post,.vuoto,.comp,.ban2');
 sec.hidden=!perTe||sec.dataset.vuoto==='1';if(!perTe)return;
 var dopo=v.querySelector(':scope>.comp')||v.querySelector(':scope>.ban2');
 if(dopo){if(dopo.nextElementSibling!==sec)dopo.insertAdjacentElement('afterend',sec)}else if(v.firstElementChild!==sec)v.insertBefore(sec,v.firstElementChild)}
function curva(){
SEC55=SEC55||el('v53sondaggio');POLL55=POLL55||el('v53poll');var host=POLL55;if(!host||!SEC55)return;
var Sg=sondaggi(),reale=SITO55,io=chi(),stato={},msg='',aperti={};
function opts(g){return g.m.map(function(m){return m[0]+' – '+m[3]})}
function chiave(g){return 'poll-'+g.n}
function kv(g){return chiave(g)+'-vote'+(io?'-'+io.team:'')}
function mioVoto(g){return get(kv(g),null)}
function conta(g,i){var o=opts(g)[i];if(!reale){var c=get(chiave(g)+'-counts',{});return n(c[i])}var v=((stato[g.n]||{}).voti||[]).find(function(x){return x.scelta===o});return v?n(v.n):0}
function commenti(g){if(reale)return ((stato[g.n]||{}).commenti||[]).map(function(c){return [c.team,c.testo]});return get(chiave(g)+'-comments',[]).map(function(c){return ['Il tuo commento · locale',c]})}
function testa(g,sotto){return '<div class="v55-pp-head"><img src="https://giandjcosta.github.io/o-fant-a-girrr/assets/loghi/logo-lega-o-fant-a-girrr.png" alt=""><div><b>O Girrr</b> <span>· Sondaggio della '+g.n+'ª giornata</span><small>'+esc(sotto)+'</small></div></div>'}
function risultati(g,chiusa){var o=opts(g),tot=0,c=o.map(function(x,i){var k=conta(g,i);tot+=k;return k}),mio=mioVoto(g);
 var h='<article class="v55-pollpost" data-g="'+g.n+'">'+testa(g,chiusa?'Concluso':quandoChiude(g))+'<p class="v55-pp-q">Quale sfida seguirai con più attenzione?</p><div class="poll">';
 o.forEach(function(x,i){var pc=tot?Math.round(c[i]*100/tot):0;h+='<div class="po-r v55-por'+(mio===i?' me':'')+'"><i style="width:'+pc+'%"></i><span>'+esc(x)+(mio===i?' ✓':'')+'</span><span><b>'+pc+'%</b></span></div>'});
 h+='<div class="pom">'+tot+(tot===1?' voto':' voti')+' · '+(chiusa?'Concluso':'Votazione aperta')+'</div></div>';
 var cm=botComments({day:g.n,opts:o}).map(function(t){return [t[0]+' · bot',t[1]]}).concat(commenti(g)),ap=!!aperti[g.n];
 h+='<button class="v55-pp-tog" type="button" data-pp="'+g.n+'" aria-expanded="'+ap+'">'+(ap?'Chiudi i commenti':'Commenti ('+cm.length+')')+'</button>';
 if(ap){h+='<div class="v55-pp-cm">'+cm.map(function(t){return '<div class="v53-comment"><b>'+esc(t[0])+'</b><p>'+esc(t[1])+'</p></div>'}).join('')+
  (!chiusa&&(!reale||io)?'<form class="v53-field v55-pp-form" data-g="'+g.n+'"><input class="v53-input" maxlength="280" required placeholder="'+(reale?'Il tuo commento':'Il tuo commento (solo locale)')+'" aria-label="Commenta il sondaggio"><button class="v53-btn" type="submit">Commenta</button></form>':'')+
  '<button class="v55-pp-tog" type="button" data-pp="'+g.n+'" aria-expanded="true">Chiudi i commenti</button></div>'}
 return h+'</article>'}
function scheda(g){var o=opts(g),puo=!reale||!!io;
 return '<article class="v55-pollpost" data-g="'+g.n+'">'+testa(g,quandoChiude(g))+'<p class="v55-pp-q">Quale sfida seguirai con più attenzione?</p><form id="v53vote">'+o.map(function(x,i){return '<label class="v53-poll-option"><input type="radio" name="v53choice" value="'+i+'"'+(puo?'':' disabled')+'><span>'+esc(x)+'</span></label>'}).join('')+(puo?'<button class="v53-btn" type="submit">Vota</button>':'<p class="v53-muted">Entra con la tua squadra per votare.</p>')+'</form>'+(msg?'<p class="v53-muted" role="status">'+esc(msg)+'</p>':'')+'</article>'}
function disegna(){var h='',A=Sg.aperto,C=Sg.chiuso;
 if(A)h+=(mioVoto(A)===null&&(!reale||io))?scheda(A):risultati(A,false);
 if(C&&(!reale||n(((stato[C.n]||{}).voti||[]).reduce(function(t,x){return t+n(x.n)},0))>0))h+=risultati(C,true);
 host.innerHTML=h||'';SEC55.dataset.vuoto=h?'':'1';posizionaSondaggio();
 var fv=host.querySelector('#v53vote');if(fv)fv.onsubmit=function(e){e.preventDefault();var v=fv.querySelector('input:checked');if(!v)return;var i=n(v.value);
  if(!reale){var c=get(chiave(A)+'-counts',{});c[i]=n(c[i])+1;set(chiave(A)+'-counts',c);set(kv(A),i);disegna();return}
  rpcN('sondaggio_vota',{p_team:io.team,p_code:io.code,p_giornata:A.n,p_scelta:opts(A)[i]}).then(function(r){stato[A.n]=r;set(kv(A),i);msg='';disegna()}).catch(function(x){msg='Voto non registrato: '+x.message;disegna()})};
 host.querySelectorAll('.v55-pp-form').forEach(function(f){f.onsubmit=function(e){e.preventDefault();var g=games(false).find(function(x){return x.n===n(f.dataset.g)}),t=f.querySelector('input').value.trim();if(!t||!g)return;
  if(!reale){var L=get(chiave(g)+'-comments',[]);L.push(t.slice(0,280));set(chiave(g)+'-comments',L);disegna();return}
  rpcN('sondaggio_commenta',{p_team:io.team,p_code:io.code,p_giornata:g.n,p_testo:t.slice(0,280)}).then(function(r){stato[g.n]=r;disegna()}).catch(function(x){msg='Commento non pubblicato: '+x.message;disegna()})}});
 if(window.OGDest55)window.OGDest55.poll();
}
host.addEventListener('click',function(e){var b=e.target.closest('[data-pp]');if(!b)return;var g=n(b.dataset.pp),post=b.closest('.v55-pollpost');aperti[g]=!aperti[g];disegna();
 if(!aperti[g]){var np=host.querySelector('.v55-pollpost[data-g="'+g+'"]');if(np&&np.getBoundingClientRect().top<0)np.scrollIntoView({behavior:CALMO?'auto':'smooth',block:'start'})}});
disegna();
if(window.MutationObserver){var vv=el('vista');if(vv)new MutationObserver(posizionaSondaggio).observe(vv,{childList:true})}
if(reale)[Sg.aperto,Sg.chiuso].forEach(function(g){if(g)rpcN('sondaggio_stato',{p_giornata:g.n}).then(function(r){stato[g.n]=r;disegna()}).catch(function(){})});
}
/* Curva: le risposte aperte di un coro si chiudono anche dal fondo, senza risalire */
function chiudiCommenti(){var v=el('vista');if(!v||!window.MutationObserver)return;
 function metti(){v.querySelectorAll('.acts+.thr.open').forEach(function(t){if(t.querySelector(':scope>.v55-chiudi'))return;var b=document.createElement('button');b.type='button';b.className='lnk v55-chiudi';b.textContent='Chiudi i commenti';
  b.addEventListener('click',function(){var post=t.closest('.post'),k=post&&post.dataset.k,r=post&&post.querySelector('[data-a="rsp"]');if(r)r.click();setTimeout(function(){var np=k&&v.querySelector('.post[data-k="'+k+'"]');if(np&&np.getBoundingClientRect().top<0)np.scrollIntoView({behavior:CALMO?'auto':'smooth',block:'start'})},30)});t.appendChild(b)})}
 metti();new MutationObserver(metti).observe(v,{childList:true,subtree:true})}
function notifications(){
var to=el('v53notifications');if(!to)return;
var g=latest(),nx=next(),items=[];
if(g){items.push({key:'result-'+g.n,type:'partita',ic:'⚽',title:'Risultati della '+g.n+'ª giornata',detail:'Sono disponibili i risultati delle '+g.m.length+' partite di campionato.',link:href('tabellone')+'?sezione=risultati#lega-'+g.n})}
if(g){var rs=ranks(g.n);if(rs.length)items.push({key:'ranking-'+g.n,type:'classifica',ic:'🏆',title:'Classifica aggiornata',detail:'Posizioni e punti dopo la '+g.n+'ª giornata completa.',link:href('tabellone')+'?sezione=classifica#lega-'+g.n})}
if(nx){items.push({key:'next-'+nx.n,type:'partita',ic:'📅',title:'Prossimo turno',detail:'La '+nx.n+'ª giornata è in calendario. Guarda gli incontri.',link:href('tabellone')+'?sezione=risultati#lega-'+nx.n})}
if(nx){items.push({key:'poll-'+nx.n,type:'curva',ic:'💬',title:'Sondaggio della Curva',detail:'Scegli la sfida più interessante del prossimo turno e commenta.',link:href('curva')+'?sondaggio='+nx.n+'#v53poll'})}
items.push({key:'annuario',type:'albo',ic:'📖',title:'Annuario 2026/27',detail:'Podio provvisorio, rose e record verificabili in un solo posto.',link:albo('?albo=annuario&stagione=2026%2F27')});
var z=notizia();if(z)items.unshift({key:z.chiave,type:'classifica',ic:'↗',title:z.titolo,detail:z.testo,link:href('tabellone')+'?sezione=classifica&cronaca='+encodeURIComponent(z.chiave)+'#lega-'+z.giornata});var filters=el('v53filters'),chosen='tutte';
var me=chi(),chiaviLette=null,stato=el('v53notifstato');
function letta(x){return x.personale?!x.nuova:chiaviLette?chiaviLette.indexOf(x.key)>=0||!!get('read-'+x.key,false):!!get('read-'+x.key,false)}
if(stato)stato.textContent=OSP?'Modalità ospite: qui trovi le novità della Lega. Le notifiche personali sono per chi entra con la propria squadra.':me?'Notifiche di '+me.team+': risposte, applausi, sfide, prestiti e Totogirrr, uguali su telefono e computer.':'Entra con la tua squadra sul sito per vedere anche le notifiche personali (risposte, sfide, prestiti).';
if(me)rpcN('notifiche_stato',{p_team:me.team,p_code:me.code}).then(function(st){chiaviLette=st.chiavi||[];items=personali(st).concat(items);render()}).catch(function(e){if(stato)stato.textContent='Notifiche personali non disponibili: '+e.message});
filters.innerHTML=[['tutte','Tutte'],['partita','Partite'],['classifica','Classifica'],['curva','Curva'],['derby','Derby'],['totogirrr','Totogirrr'],['albo','Albo']].map(function(x){return '<button class="v53-pill" data-f="'+x[0]+'" aria-selected="'+(chosen===x[0])+'">'+x[1]+'</button>'}).join('');
function render(){
var arr=items.filter(function(x){return chosen==='tutte'||x.type===chosen});to.innerHTML=arr.map(function(x){return '<article class="v53-notifcard" data-read="'+letta(x)+'"><a class="v55-notiflink" href="'+esc(x.link)+'"><span class="v53-ic" aria-hidden="true">'+x.ic+'</span><span class="v55-notiftext"><b>'+esc(x.title)+'</b>'+(x.when?'<small class="v53-quando">'+esc(quando(x.when))+'</small>':'')+'<span class="v55-notifdetail">'+esc(x.detail)+'</span></span><span class="v55-notifarrow" aria-hidden="true">›</span></a></article>'}).join('')||note('Nessuna notifica per questo filtro.');
filters.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.f===chosen?'true':'false')});
}
filters.onclick=function(e){var b=e.target.closest('button[data-f]');if(!b)return;chosen=b.dataset.f;render()};
el('v53markread').onclick=function(){var gen=items.filter(function(x){return !x.personale}).map(function(x){return x.key});gen.forEach(function(k){set('read-'+k,true)});items.forEach(function(x){if(x.personale)x.nuova=false});render();
 if(me)rpcN('notifiche_segna_lette',{p_team:me.team,p_code:me.code,p_chiavi:gen.slice(0,100)}).then(function(r){chiaviLette=r.chiavi||chiaviLette;render()}).catch(function(){})};
render();
}
/* Initial DOM integration: no existing Tabellone/Albo/Curva components are replaced. */
/* Tabellone: versione C scelta da Gianluca (1° novembre): schede Classifica · Risultati · Campo, approfondimenti in fondo */
function sigla(t){var w=String(t).replace(/^the\s+/i,'').split(/\s+/);return (w[0]||'').slice(0,3).toUpperCase()}
function schede(){var nav=document.querySelector('.giornata-nav'),panel=document.querySelector('.grid>aside.panel'),board=document.querySelector('.grid>section');if(!nav||!panel||!board)return;
 var campo=el('campo-link'),q=new URLSearchParams(location.search),sez=q.get('sezione')==='risultati'?'risultati':'classifica';
 nav.innerHTML='';nav.className='giornata-nav v55-schede';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Sezioni del Tabellone');
 [['classifica','Classifica'],['risultati','Risultati']].forEach(function(x){var b=document.createElement('button');b.type='button';b.dataset.sez=x[0];b.textContent=x[1];b.setAttribute('role','tab');nav.appendChild(b)});
 if(campo){campo.textContent='Campo';campo.removeAttribute('aria-current');nav.appendChild(campo)}
 var striscia=document.createElement('button');striscia.type='button';striscia.className='v55-striscia';striscia.setAttribute('aria-label','Risultati della giornata: apri i Risultati');panel.insertBefore(striscia,panel.firstChild);
 function riempi(){var ms=[].slice.call(document.querySelectorAll('#board>.m:not(.ko)'));striscia.hidden=!ms.length;striscia.innerHTML='<span class="v55-st-tit">'+esc(((document.querySelector('#board>.nota')||{}).textContent||'Risultati'))+'</span>'+ms.map(function(m){var t=m.querySelectorAll('.t span'),sc=m.querySelectorAll('.sc b');return '<span class="v55-st-m"><b>'+esc(sigla(t[0]?t[0].textContent:''))+'</b><i>'+esc(sc[0]?sc[0].textContent:'–')+'–'+esc(sc[1]?sc[1].textContent:'–')+'</i><b>'+esc(sigla(t[1]?t[1].textContent:''))+'</b></span>'}).join('')+'<span class="v55-st-vai">Risultati ›</span>'}
 riempi();var bd=el('board');if(bd&&window.MutationObserver)new MutationObserver(riempi).observe(bd,{childList:true});
 function mostra(s,ani){sez=s;nav.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.sez===s))});panel.hidden=s!=='classifica';board.hidden=s!=='risultati';
  var v=s==='classifica'?panel:board;if(ani&&!CALMO&&v.animate)v.animate({opacity:[0,1],transform:['translateY(6px)','none']},{duration:320,easing:'cubic-bezier(.22,.61,.36,1)'});
  try{var u=new URL(location.href);u.searchParams.set('sezione',s);history.replaceState(null,'',u)}catch(e){}}
 nav.addEventListener('click',function(e){var b=e.target.closest('button[data-sez]');if(b)mostra(b.dataset.sez,true)});
 striscia.addEventListener('click',function(){mostra('risultati',true);nav.scrollIntoView({behavior:CALMO?'auto':'smooth',block:'start'})});
 mostra(sez,false)}
/* Claude, 1° novembre: fase finale della Champions Cup come un tabellone di tennis. Quarti → Semifinali → Finale da sinistra a destra:
   scegliendo una fase il tabellone scorre verso destra, le colonne già giocate si chiudono e le partite rimaste si allargano.
   Si cambia fase anche scorrendo col dito (o col trackpad) sul tabellone. Le squadre restano «Da definire» finché il calendario non le contiene. */
var KOF=[{n:11,c:'q',tit:'Quarti di finale',sig:'Q',k:4},{n:12,c:'s',tit:'Semifinali',sig:'S',k:2},{n:13,c:'f',tit:'Finale',sig:'F',k:1}];
function koPartita(f,i){var g=D&&D.cal&&(D.cal.cup||[]).filter(function(x){return x.n===f.n})[0],m=g&&g.m&&g.m[i],prev=KOF[KOF.indexOf(f)-1];
 var a=m?m[1]:(prev?'Vincente '+prev.sig+(2*i+1):'Da definire'),b=m?m[4]:(prev?'Vincente '+prev.sig+(2*i+2):'Da definire'),ris=m&&/^\d+-\d+$/.test(String(m[5]))?String(m[5]).split('-'):null;
 function riga(t,x,y){var w=ris&&+x>+y;return '<div class="v55-ko-r'+(w?' w':'')+(m?'':' vuota')+'"><span>'+esc(t)+'</span><b>'+(ris?esc(x):'–')+'</b></div>'}
 return '<div class="v55-ko-m"><span class="v55-ko-sig">'+f.sig+(f.k>1?i+1:'')+'</span>'+riga(a,ris&&ris[0],ris&&ris[1])+riga(b,ris&&ris[1],ris&&ris[0])+'</div>'}
function koColonna(f){var h='<div class="v55-ko-col" data-c="'+f.c+'" data-n="'+f.n+'"><div class="v55-ko-tit">'+f.tit+'</div><div class="v55-ko-corpo">';
 if(f.k===1)h+=koPartita(f,0);else for(var i=0;i<f.k;i+=2)h+='<div class="v55-ko-coppia">'+koPartita(f,i)+koPartita(f,i+1)+'</div>';return h+'</div></div>'}
function tabelloneKo(){var bd=el('board');if(!bd||!bd.parentNode||el('v55ko'))return;
 var box=document.createElement('div');box.id='v55ko';box.className='v55-ko';box.hidden=true;box.setAttribute('role','region');box.setAttribute('aria-label','Tabellone della fase finale');
 box.innerHTML='<div class="v55-ko-gr">'+KOF.map(koColonna).join('')+'</div><p class="v55-ko-aiuto">Scorri verso destra per andare verso la Finale.</p>';bd.parentNode.insertBefore(box,bd);
 function chip(n){return document.querySelector('#chips button[data-n="'+n+'"]')}
 var era=false;
 function aggiorna(){var k=bd.querySelectorAll('.m.ko').length,f=KOF.filter(function(x){return x.k===k})[0];
  if(!f){box.hidden=true;bd.classList.remove('v55-ko-attivo');era=false;return}
  /* aggiorna solo le partite cambiate: la cornice resta e la fase scorre con la transizione */
  KOF.forEach(function(x){var c=box.querySelector('.v55-ko-col[data-c="'+x.c+'"]'),nuovo=koColonna(x),t=document.createElement('div');t.innerHTML=nuovo;var corpo=t.querySelector('.v55-ko-corpo').innerHTML,cc=c.querySelector('.v55-ko-corpo');if(cc.innerHTML!==corpo)cc.innerHTML=corpo;
   var prima=KOF.indexOf(x)<KOF.indexOf(f);c.setAttribute('aria-hidden',String(prima));c.classList.toggle('attiva',x===f)});
  bd.classList.add('v55-ko-attivo');box.hidden=false;void box.offsetWidth;box.dataset.fase=f.c;
  if(!era){var rb=document.querySelector('.v55-schede button[data-sez=risultati]');if(rb&&rb.getAttribute('aria-selected')!=='true')rb.click()}era=true}
 new MutationObserver(aggiorna).observe(bd,{childList:true});
 function passo(d){var cur=KOF.filter(function(x){return x.c===box.dataset.fase})[0],i=KOF.indexOf(cur)+d,b=KOF[i]&&chip(KOF[i].n);if(b)b.click()}
 box.addEventListener('click',function(e){var c=e.target.closest('.v55-ko-col');if(!c||c.dataset.c===box.dataset.fase)return;var b=chip(c.dataset.n);if(b)b.click()});
 var x0=null,y0=0;box.addEventListener('pointerdown',function(e){x0=e.clientX;y0=e.clientY});
 box.addEventListener('pointerup',function(e){if(x0===null)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3)passo(dx<0?1:-1)});
 box.addEventListener('pointercancel',function(){x0=null});
 var ruota=0;box.addEventListener('wheel',function(e){if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;e.preventDefault();var t=Date.now();if(t-ruota<700||Math.abs(e.deltaX)<20)return;ruota=t;passo(e.deltaX>0?1:-1)},{passive:false});
 aggiorna()}
/* Claude, 1° novembre: cinque partite su PC senza buchi. Tre a sinistra e due a destra, centrate in altezza (stesso spazio sopra e sotto). */
function cinque(){var bd=el('board');if(!bd)return;
 function sistema(){var ms=[].slice.call(bd.querySelectorAll(':scope>.m:not(.ko)'));var si=ms.length===5;bd.classList.toggle('v55-cinque',si);ms.forEach(function(m,i){if(si)m.dataset.v55p=String(i+1);else delete m.dataset.v55p})}
 sistema();if(window.MutationObserver)new MutationObserver(sistema).observe(bd,{childList:true})}
function vista(){document.body.classList.add('vista-c');setTimeout(schede,0);setTimeout(tabelloneKo,0);cinque();
 var v=el('v53board'),g=document.querySelector('.grid');if(v&&g&&g.parentNode)g.parentNode.insertBefore(v,g.nextSibling)}
/* Fluidità: tendine che scorrono, cambio di pagina con dissolvenza dove il browser non ha le transizioni native. Niente animazioni con «riduci movimento». */
var CALMO=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function tendine(){if(CALMO||!Element.prototype.animate)return;
 document.addEventListener('click',function(e){var s=e.target.closest&&e.target.closest('summary');if(!s||e.defaultPrevented)return;var d=s.parentElement;if(!d||d.tagName!=='DETAILS'||d.dataset.anima==='1')return;
  e.preventDefault();d.dataset.anima='1';var cs=getComputedStyle(d),chiusa=s.offsetHeight+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth),h0=d.offsetHeight,opz={duration:300,easing:'cubic-bezier(.22,.61,.36,1)'};
  d.style.overflow='hidden';
  if(d.open){var a=d.animate({height:[h0+'px',chiusa+'px']},{duration:opz.duration,easing:opz.easing,fill:'forwards'});a.onfinish=function(){d.open=false;a.cancel();d.style.overflow='';d.dataset.anima=''}}
  else{d.open=true;var h1=d.offsetHeight,b=d.animate({height:[h0+'px',h1+'px']},opz);[].forEach.call(d.children,function(c){if(c!==s)c.animate({opacity:[0,1]},{duration:320,easing:'ease-out'})});b.onfinish=function(){d.style.overflow='';d.dataset.anima=''}}
 },true)}
function passaggi(){if(CALMO||'startViewTransition' in document)return;
 document.documentElement.classList.add('v55-entra');
 document.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('a[href]');if(!l||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||l.target==='_blank')return;
  var u;try{u=new URL(l.href,location.href)}catch(x){return}if(u.origin!==location.origin||(u.pathname===location.pathname&&u.hash))return;
  e.preventDefault();document.documentElement.classList.add('v55-esce');setTimeout(function(){location.href=u.href},170)});
 window.addEventListener('pageshow',function(){document.documentElement.classList.remove('v55-esce')})}
/* Claude, 1° novembre: Tabellone e Campo entrano tutti insieme, in dissolvenza, solo quando sono pronti (niente pezzi che compaiono uno alla volta). */
/* Campo: la partita scelta resta in vista quando si cambia giornata; la sfumatura a destra sparisce in fondo alla fila */
function partiteCampo(){var m=el('matches');if(!m)return;
 function fine(){m.classList.toggle('v55-fine',m.scrollLeft+m.clientWidth>=m.scrollWidth-4)}
 function scelta(){var b=m.querySelector('[aria-pressed=true]');if(b&&m.scrollWidth>m.clientWidth){var x=b.offsetLeft-m.offsetLeft-5;m.scrollTo({left:Math.max(0,x),behavior:CALMO?'auto':'smooth'})}setTimeout(fine,350)}
 m.addEventListener('scroll',fine,{passive:true});if(window.MutationObserver)new MutationObserver(scelta).observe(m,{childList:true});scelta()}
function pronto(sel){var h=document.documentElement;if(!h.classList.contains('v55-attesa'))return;var fatto=false;
 function via(){if(fatto)return;fatto=true;clearInterval(t);h.classList.add('v55-pronto');requestAnimationFrame(function(){requestAnimationFrame(function(){h.classList.remove('v55-attesa')})})}
 var t=setInterval(function(){if(document.querySelector(sel))setTimeout(via,80)},50);setTimeout(via,1500)}
/* Claude, 2 novembre: aggiornare tirando giù la pagina (Tabellone, Campo, Notifiche, Albo). Parte solo se la pagina è già in cima
   quando si appoggia il dito, e serve un tiro lungo (160 px): così non scatta per sbaglio risalendo. La Curva ha il suo, la Home il pulsante. */
function tiraGiu(){if(!('ontouchstart' in window))return;var SOGLIA=160,y0=null,x0=0,d=0,ind=document.createElement('div');
 ind.className='v55-ptr';ind.setAttribute('aria-hidden','true');ind.innerHTML='<i>↻</i><span>Tira per aggiornare</span>';document.body.appendChild(ind);
 function torna(){ind.style.transition=CALMO?'none':'transform .3s ease,opacity .3s ease';ind.style.transform='translate(-50%,-70px)';ind.querySelector('i').style.transform='';ind.style.opacity='0';ind.classList.remove('pronto');d=0}
 document.addEventListener('touchstart',function(e){if(e.touches.length!==1||window.scrollY>0||document.scrollingElement.scrollTop>0){y0=null;return}y0=e.touches[0].clientY;x0=e.touches[0].clientX;d=0;ind.style.transition='none'},{passive:true});
 document.addEventListener('touchmove',function(e){if(y0===null)return;var dy=e.touches[0].clientY-y0,dx=Math.abs(e.touches[0].clientX-x0);if(dy<=0||dx>dy){if(d)torna();y0=dy<=0?y0:null;return}
  d=dy;var v=Math.min(d*.45,95);ind.style.opacity=String(Math.min(1,d/80));ind.style.transform='translate(-50%,'+(v-70)+'px)';ind.querySelector('i').style.transform='rotate('+Math.round(d*1.6)+'deg)';
  var ok=d>=SOGLIA;ind.classList.toggle('pronto',ok);ind.querySelector('span').textContent=ok?'Rilascia per aggiornare':'Tira per aggiornare'},{passive:true});
 document.addEventListener('touchend',function(){if(y0===null)return;y0=null;if(d>=SOGLIA){ind.querySelector('i').style.transform='';ind.classList.add('gira');ind.querySelector('span').textContent='Aggiorno…';setTimeout(function(){location.reload()},250)}else torna()},{passive:true});
 document.addEventListener('touchcancel',function(){y0=null;torna()},{passive:true})}
function init(){
tendine();passaggi();ospite();nav();redirect();if(/^(board|campo|notifications|albo)$/.test(mode))tiraGiu();if(mode==='campo')pronto('#board .card');if(mode==='campo')setTimeout(partiteCampo,0);if(mode==='board')pronto('#tab table');if(mode==='board')vista();
if(mode==='albo')document.addEventListener('click',function(e){var b=e.target.closest('[data-oro]');if(!b)return;var u=new URL(location.href);u.searchParams.set('albo',b.dataset.oro);history.replaceState(null,'',u)});
if(mode==='home')load(home);
if(mode==='board')load(board);
if(mode==='albo'&&el('v53annual'))load(annual);
if(mode==='curva'){load(curva);chiudiCommenti()}
if(mode==='notifications')load(notifications);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
