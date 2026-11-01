/* Destinazioni delle notifiche: nessuna pubblicazione, nessuna scrittura. */
(function(){
'use strict';
/* Claude, rilascio 5.5: indirizzi delle pagine. Nell'Anteprima «tabellone-lega.html»; sul sito vero (/o-fant-a-girrr/) «girrr/tabellone.html» e «stadio/girrr/tabellone.html». */
window.OG55=window.OG55||(function(){var sito=/^\/o-fant-a-girrr\//.test(location.pathname),base=new URL('/o-fant-a-girrr/',location.href).href,
 file={index:'index.html',tabellone:'tabellone.html',campo:'campo.html',curva:'curva.html',notifiche:'notifiche.html',albo:'app.html',app:'app.html',totogirrr:'totogirrr.html'};
 function dir(sk){return base+(sk==='lega'?'girrr/':'stadio/girrr/')}
 return {sito:sito,dir:dir,pagina:function(which,sk,root){if(sito)return dir(sk)+(file[which]||which+'.html');
  if(which==='app')return new URL('../'+(sk==='lega'?'attuale.html':'index.html'),root).href;if(which==='totogirrr')return new URL('../totogirrr-52.html?skin='+sk,root).href;
  return new URL(which+'-'+sk+'.html',root).href},
  nome:function(path){var m=/\/(index|tabellone|campo|albo|app|curva|notifiche)(?:-(lega|stadio))?\.html$/.exec(path);if(!m)return null;if(!sito&&!m[2])return null;if(sito&&m[2])return null;return m[1]==='app'?'albo':m[1]}}})();
var root=new URL('./',document.currentScript.src),q=new URLSearchParams(location.search);
var skin=document.body.dataset.v53Skin||q.get('skin')||(/stadio/.test(location.pathname)?'stadio':'lega');
var key=q.get('notifica')||'';
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function page(n){return new URL(OG55.pagina(n,skin,root))}
function personalLink(e,base,s){
 var k=String(e.chiave||''),u;
 if(/^(risp-\d+|app-[pr]\d+-\d+)$/.test(k))u=new URL(OG55.pagina('curva',s,base));
 else if(/^(prest-\d+-[\w]+|mov-\d+)$/.test(k)){
  u=new URL(OG55.pagina('totogirrr',s,base));if(!OG55.sito)u.searchParams.set('skin',s);u.searchParams.set('t',k.indexOf('prest-')===0?'prestiti':'movimenti');
 }else if(/^sfida-(r-)?\d+$/.test(k)){u=new URL(OG55.pagina('app',s,base));if(!OG55.sito)u.searchParams.set('skin',s);u.hash='sport'}
 else return null;
 u.searchParams.set('notifica',k);return u.href;
}
function focus(el){
 if(!el)return;el.classList.add('v55-destinazione');el.setAttribute('tabindex','-1');
 el.scrollIntoView({block:'start'});el.focus({preventScroll:true});
}
function wait(find,done,failed){
 var finished=false,obs=new MutationObserver(check),timer,settle;
 // Il Tabellone conclude due render asincroni (calendario e Derby).
 // Aspetta che il contenitore sia stabile, senza perdere il punto d'arrivo.
 function check(){if(finished)return;clearTimeout(settle);var el=find();if(el)settle=setTimeout(function(){if(!finished&&el.isConnected&&find()===el){finished=true;obs.disconnect();clearTimeout(timer);done(el)}},250)}
 obs.observe(document.body,{childList:true,subtree:true});
 timer=setTimeout(function(){if(!finished){finished=true;obs.disconnect();clearTimeout(settle);if(failed)failed()}},20000);check();
}
function unavailable(host,what){
 host.innerHTML='<h2>'+E(what||'Contenuto non disponibile')+'</h2><p>Il contenuto richiesto non è più disponibile oppure non è accessibile con questa squadra.</p><a href="'+page('notifiche').href+'">Torna alle notifiche ›</a>';focus(host);
}
function board(o){
 var part=q.get('sezione'),story=q.get('cronaca');
 if(!part&&!story)return;
 wait(function(){var e=document.getElementById(part==='risultati'?'board':'tab');return e&&e.querySelector(part==='risultati'?'.m, .nota':'table')?e:null},function(host){
  if(story){
   var ev=(o.eventi||[]).find(function(e){return e.chiave===story});
   var card=document.createElement('section');card.className='v53 v55-cronaca';card.id='v55cronaca';card.dataset.cronaca=story;host.prepend(card);
   if(!ev){unavailable(card,'Cronaca non disponibile');return}
   card.innerHTML='<span class="v53-kicker">Il punto della '+ev.giornata+'ª giornata</span><h3>'+E(ev.titolo)+'</h3><p>'+E(ev.testo)+'</p>';focus(card);
  }else{host.dataset.v55Destinazione=part;focus(host)}
 });
}
function poll(){
 var day=q.get('sondaggio');if(!day)return;
 wait(function(){var el=document.getElementById('v53poll');return el&&el.querySelector('form, .v53-empty')?el:null},function(el){el.dataset.giornata=day;focus(el)});
}
function annual(){
 if(q.get('albo')!=='annuario'||!q.get('stagione'))return;
 wait(function(){return Array.from(document.querySelectorAll('.ann-anno')).find(function(el){var ss=el.querySelectorAll('summary span');return ss[0]&&ss[0].textContent===q.get('stagione')&&ss[1]&&!/Caricamento/.test(ss[1].textContent)})},function(el){el.open=true;el.dataset.v55Stagione=q.get('stagione');focus(el)});
}
function who(){try{if(sessionStorage.getItem('ospite')==='1'||q.has('ospite'))return null;var me=JSON.parse(localStorage.getItem('fg')||'null');return me&&me.team&&me.code?me:null}catch(e){return null}}
function privateRecord(){
 if(!/^(prest-\d+-[\w]+|mov-\d+|sfida-(r-)?\d+)$/.test(key))return;
 var host=document.createElement('section');host.className='v53 card v55-record';host.id='v55record';host.dataset.notifica=key;
 var app=document.getElementById('app'),view=document.getElementById('view');
 document.body.classList.add('v55-record-mode');document.body.dataset.v53Skin=skin;
 if(app)app.append(host);else if(view)view.insertAdjacentElement('afterend',host);else document.body.append(host);
 var tipo=key.indexOf('prest-')===0?'Prestito':key.indexOf('mov-')===0?'Movimento':'Sfida Derby';
 var id=(key.match(/\d+/)||[])[0],section=tipo==='Sfida Derby'?'Girrr Sport · Sfide':'Totogirrr · '+(tipo==='Prestito'?'Prestiti':'Movimenti');
 var back=page('notifiche'),backLabel='Notifiche';
 try{var ref=new URL(document.referrer);if(ref.origin===root.origin&&/^(index|notifiche)$/.test(OG55.nome(ref.pathname)||'')){back=ref;backLabel=OG55.nome(ref.pathname)==='index'?'Home':'Notifiche'}}catch(e){}
 host.innerHTML='<nav class="v55-record-nav"><a class="v55-home-logo" href="'+page('index').href+'" aria-label="Home O Girrr"><img src="https://giandjcosta.github.io/o-fant-a-girrr/assets/loghi/logo-lega-o-fant-a-girrr.png" alt="O Girrr"></a><a href="'+E(back.href)+'">‹ '+backLabel+'</a></nav><span class="v53-kicker">'+section+'</span><h1 class="v53-h1">'+tipo+' n. '+id+'</h1><div id="v55recordbody" role="status">Caricamento…</div>';
 document.addEventListener('click',function(ev){if(!ev.target.closest('[data-tab]'))return;document.body.classList.remove('v55-record-mode');host.remove();var u=new URL(location.href);u.searchParams.delete('notifica');history.replaceState(null,'',u)},true);
 var body=document.getElementById('v55recordbody'),me=who();if(!me){body.innerHTML='<p>Entra con la tua squadra per aprire questo contenuto.</p>';focus(host);return}
 // Usa la lettura stabile già presente. Le vecchie RPC Toto/Derby scrivono
 // anche durante "stato": non vengono chiamate dalla vista dell'avviso.
 fetch('https://qmjqfgmvimsuxvghetgi.supabase.co/rest/v1/rpc/notifiche_stato',{method:'POST',headers:{apikey:'sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n',Authorization:'Bearer sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n','Content-Type':'application/json'},body:JSON.stringify({p_team:me.team,p_code:me.code})})
 .then(function(r){if(!r.ok)throw Error('Lettura non disponibile');return r.json()}).then(function(st){
  if(!host.isConnected)return;
  var e=(st.eventi||[]).find(function(e){return e.chiave===key});if(!e){unavailable(body,tipo+' non disponibile');return}
  var date=e.quando?new Date(e.quando):null;
  body.innerHTML='<h2>'+E(e.titolo)+'</h2><p class="v55-record-text">'+E(e.testo)+'</p><dl><div><dt>Squadra</dt><dd>'+E(me.team)+'</dd></div>'+(date&&isFinite(date)?'<div><dt>Data</dt><dd>'+E(date.toLocaleString('it-IT',{timeZone:'Europe/Rome'}))+'</dd></div>':'')+'</dl>';
  if(tipo==='Movimento')body.insertAdjacentHTML('beforeend','<p class="v53-muted">Importo espresso in fantacrediti.</p>');
  host.dataset.v55Destinazione=key;focus(host);
 }).catch(function(){unavailable(body,tipo+' non disponibile')});
}
function curva(){
 if(!/^(risp-\d+|app-[pr]\d+-\d+)$/.test(key))return;
 var host=document.createElement('section');host.className='v53 v55-curva-target';host.innerHTML='<p>Caricamento del coro…</p>';
 var vista=document.getElementById('vista');if(!vista)return;
 vista.insertAdjacentElement('beforebegin',host);document.body.classList.add('v55-curva-target-mode');
 if(!who()){unavailable(host,'Entra con la tua squadra');return}
 var busy=false,pages=0,done=false;
 document.addEventListener('click',function(e){if(!e.target.closest('[data-v],[data-u],[data-f],[data-pt]'))return;done=true;host.remove();document.body.classList.remove('v55-curva-target-mode')},true);
 function attempt(){
  if(done||busy||!window.OGCurva55)return;
  var api=window.OGCurva55,data=api.get();if(!data.ready)return;
  var reply=/^risp-(\d+)$/.exec(key)||/^app-r(\d+)-\d+$/.exec(key),post=/^app-(p\d+)-\d+$/.exec(key),rid=reply&&reply[1];
  var r=rid&&(data.replies||[]).find(function(r){return String(r.id)===rid}),pk=post?post[1]:r&&r.k;
  if(pk&&!/^[a-zA-Z0-9_:.-]{1,120}$/.test(pk)){done=true;unavailable(host,'Coro non disponibile');return}
  busy=true;
  if(pk&&api.open(pk,rid)){
   done=true;host.remove();document.body.classList.remove('v55-curva-target-mode');
   var el=rid?document.querySelector('[data-risposta="'+rid+'"]'):document.querySelector('article.post[data-k="'+pk+'"]');
   if(el){el.dataset.v55Destinazione=key;focus(el)}return;
  }busy=false;
  if(!data.more||pages>=20){done=true;unavailable(host,'Coro non disponibile');return}
  busy=true;pages++;api.older().then(function(more){busy=false;if(!more){done=true;unavailable(host,'Coro non disponibile')}else attempt()}).catch(function(){done=true;unavailable(host,'Coro non disponibile')});
 }
 document.addEventListener('og:curva-render',attempt);setTimeout(attempt,0);
}
window.OGDest55={link:personalLink,board:board,poll:poll};
function init(){annual();privateRecord();curva()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
