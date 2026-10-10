/* Curva · banca dei cori e account automatici.
   Tutto deterministico: stessi dati + stessa data = stessi post per tutti.
   Uso: CVB.genera(D, SQ, ST, adesso_ms) -> post; CVB.tendenze(D, adesso_ms) -> [[#tag, cori]]
   Per i veri scambi: aggiungere a data.json  "scambi":[{"t":"2027-02-03T20:00:00+01:00","a":"Squadra A","b":"Squadra B","da":"Giocatore","db":"Giocatore"}] */
(function(){
'use strict';
function h32(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function prng(seed){var a=typeof seed==='string'?h32(seed):seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pick(r,a){return a[Math.floor(r()*a.length)]}
function shuffle(r,a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
/* data a Roma */
var FM=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'});
function roma(ms){var o={};FM.formatToParts(new Date(ms)).forEach(function(p){o[p.type]=p.value});return{y:+o.year,mo:+o.month,d:+o.day,h:+o.hour,mi:+o.minute,wd:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday)}}
function offRoma(y,mo,d){/* offset Roma (ms) a mezzogiorno di quel giorno */var u=Date.UTC(y,mo-1,d,12),r=roma(u);return(Date.UTC(r.y,r.mo-1,r.d,r.h,r.mi)-u)}
function ts(y,mo,d,h,mi){var base=Date.UTC(y,mo-1,d,h,mi);return base-offRoma(y,mo,d)}
function giorno(ms){var r=roma(ms);return Math.floor(Date.UTC(r.y,r.mo-1,r.d)/864e5)}
function dalGiorno(g){var t=new Date(g*864e5);return{y:t.getUTCFullYear(),mo:t.getUTCMonth()+1,d:t.getUTCDate(),wd:t.getUTCDay()}}

/* tendenze: ruotano a ogni giornata */
var POOL=['LampadinaNuova','Cappotto','AstaDiRiparazione','BufalaDiMercato','CambiateAllenatore','FC27','SorpresaDellaSettimana','VarParlante','PanchinaCorta','RotazioniSelvagge','ScontroDirettoTrattativa','ModuloMisterioso','FantaDivano','SquadraSognata','AllenatoreDelPopolo','InfortuniDaBar','RigoreImmaginario','CoroDellaCurva','GufateInLibertà','MercatoFantasma'];
var MERC=['AstaDiRiparazione','BufalaDiMercato','MercatoFantasma'];
function tendenze(D,ms){
 var n=(D&&D.cal&&giocate(D))||1,r=prng('tags'+n),sc=shuffle(r,POOL.filter(function(x){return MERC.indexOf(x)<0}));
 var t=['Giornata'+n].concat(sc.slice(0,3));
 t.push(MERC[n%MERC.length]);
 return t.map(function(x,i){return[x,200+Math.floor(prng('c'+x+n)()*2400)+(4-i)*60]});
}
function giocate(D){var L=(D.cal&&D.cal.lega)||[],n=0;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))n=Math.max(n,g.n)});return n}

/* Personaggi */
var PERS={
 nonno_cesare:{
  mk:['Ai miei tempi il calciomercato si faceva al bar con una stretta di mano. Oggi ci vogliono tre avvocati e un fax. {sq} ha capito: stretta di mano.','Mi dicono che {gio} è in vendita. Ai miei tempi un giocatore si comprava, si portava a casa e si faceva mangiare dalla moglie.'],
  pm:['Ho visto {sq} oggi. Ai miei tempi si giocava con undici uomini e un pallone. Oggi con undici uomini, un pallone e quindici notifiche.','{pt} punti per {sq}. Ai miei tempi bastavano due gol e una sigaretta.'],
  al:['Cambiare allenatore? Ai miei tempi l\'allenatore si cambiava solo se moriva. E anche allora lo si portava in panchina.'],
  so:['Sorpreso da {sq}? Io no. Ho visto cose che voi umani non potete nemmeno immaginare. Tipo il catenaccio.'],
  fc:['Mio nipote mi parla di FC27. Gli ho detto: io ho giocato al calcio vero. Mi ha risposto che il mio overall è 42.'],
  gen:['Il fantacalcio è come la bocciofila, ma con più urla.','Ho appena capito come funziona il modulo. Peccato che ormai sia cambiato.','Il segreto è non guardare i voti prima della domenica sera. Poi li si guarda comunque.'],
  cl:['{sq} al {pos}° posto. Una volta questa era una posizione di prestigio. Oggi è una posizione.']},
 tifoso_arrabbiato:{
  al:['Cambiate allenatore! Non importa quale squadra, cambiate e basta. Poi vediamo.','{sq} con {pt} punti. Un allenatore così lo manderei a coltivare patate. {#}','Basta! Cambio allenatore e modulo e giocatori. Il resto va bene.','Dopo questa giornata dico solo una cosa: cambiate allenatore. A chiunque.'],
  pm:['{pt} punti? Ma stiamo scherzando? Io voglio le dimissioni. Di tutti. Anche mie. {#}','Sono uscito dal divano per dire che {sq} è una vergogna. Torno sul divano.'],
  so:['Sorpreso da {sq}? Io sono furioso, che è peggio.'],
  mk:['{gio} non vale il prezzo. Vendete tutto. Ricominciate. Poi vendete di nuovo.'],
  gen:['Quando perdo do la colpa all\'arbitro. Quando vinco ringrazio l\'arbitro. Quando pareggio mi arrabbio con tutti.','Ho litigato con la TV. Ha vinto lei. Era spenta.'],
  cl:['{sq} al {pos}° posto. Posizione che meriterebbe una commissione d\'inchiesta.']},
 mister_divano:{
  pm:['{sq} ha preso {pt} punti. Col 4-3-3 ne avrebbe fatti dieci in più. Fidatevi.','Ho rivisto la partita di {sq}. Dal divano si vede tutto. Soprattutto gli errori degli altri. {#}'],
  so:['Sorpreso dalla squadra? No. Sono sorpreso che qualcuno sia sorpreso. 4-3-3 e passa la paura.','{sq} ha cambiato modulo e ha dato un senso alla sua stagione. Io lo dicevo da agosto. Nessuno ascolta il divano.'],
  al:['Allenatore? Chiamatemi. Divano incluso. Compenso: una pizza.'],
  gen:['Il segreto dei grandi allenatori è lo spazio tra le linee. Io ho solo lo spazio tra i cuscini.','4-3-3. 4-4-2. 3-5-2. Sono tutti numeri. Il vero modulo è la fortuna.','Dopo la giornata sono sicuro di una cosa: la panchina è il vero titolare.'],
  mk:['Se prendessi {gio} cambierei modulo e alleno da casa. Già pronto per il prossimo ruolo.'],
  fc:['In FC27 sono un fenomeno. Nella vita no. Preferisco FC27.'],
  cl:['{sq} al {pos}° posto: i numeri non mentono, ma il divano sì.']},
 radio_spogliatoio:{
  mk:['Voci di corridoio: {sq} starebbe sondando {gio}. Nessuna conferma. Molta convinzione. {#}','Fonti vicine a una bottiglia d\'acqua: {gio} cambia casacca. Aggiornamenti non prima di domani.','Rumors insistenti: {sq} e {sq2} stanno parlando. Di cosa? Di calcio. O di pizza. Dipende.'],
  pm:['Si dice che dopo {pt} punti {sq} non dormirà stanotte. Il giocatore smentisce. Il suo gatto conferma.'],
  al:['Dicono che l\'allenatore di {sq} sia in bilico. Ma anche io lo sono, sulla sedia.'],
  so:['Sentito dire: {sq} ha cambiato qualcosa. Cosa? Non lo so. Ma qualcosa.'],
  gen:['Radio Spogliatoio non conferma e non smentisce. Si limita a confermare. Poi smentisce.'],
  cl:['Voci: {sq} al {pos}° posto non è un caso. Qualcuno sa. Io no.']},
 mamma_di_capitan:{
  pm:['Bravo, ho visto la partita. Hai fatto {pt} punti. Hai mangiato?','{pt} punti non sono pochi. Sono giusti. Come i calzini: né troppi né pochi.','Mio figlio ha perso ma ha giocato bene. Lo dico ogni settimana. Ogni settimana è vero.'],
  mk:['Mio figlio mi dice che vuole {gio}. Io gli ho detto: prima mangia.','Dicono che {gio} vale tanto. Io pago in lasagne.'],
  al:['L\'allenatore di mio figlio è bravissimo. Anche se non ne azzecca una. Ma chi è perfetto.'],
  so:['Sorpresa dalla squadra di mio figlio? Mai. Io lo so da quando era piccolo che aveva talento.'],
  gen:['Ho comprato un cuscino per la tribuna. Non serve a niente ma è comodo.','Ho chiesto a mio figlio cos\'è un fantallenatore. Mi ha detto "sei tu, mamma". Quindi sì.'],
  cl:['{sq} al {pos}° posto. Posizione dignitosa. Come tutte, dopotutto.']},
 ex_ds_provincia:{
  mk:['Il mercato è così: vendi un portiere a gennaio, a maggio ti chiede ancora i soldi dell\'assicurazione. {#}','{gio} a quel prezzo? Io l\'ho venduto a meno. E mi ringraziavano.','Consiglio di mercato: guardate le gambe, non il curriculum. Il curriculum non corre.','Ho portato in squadra {gio}. Era in prova. Poi la prova è finita ma lui è rimasto.'],
  pm:['Quando una squadra fa {pt} punti, il DS ha già pronto il comunicato. Di solito parla di "visione".'],
  al:['Un allenatore si cambia a gennaio, quando il DS ha finito le scuse.'],
  so:['Sorpreso da {sq}? Io no: ho visto il bilancio.'],
  gen:['Il DS è come l\'arbitro: se si nota, ha sbagliato.'],
  cl:['{sq} al {pos}° posto: il budget lo permette. Il resto no.']},
 var_parlante:{
  pm:['Ho rivisto l\'azione. Il {pt} di {sq} era regolare. Anche se faceva male.','Controllo in corso su {sq}. Ho dei dubbi. Anche sui miei dubbi.','Revisione al monitor: {gio} era in fuorigioco di una testa. Non la sua.'],
  al:['Dalla sala VAR: l\'allenatore è fuori area. Ma resta dentro l\'ego.'],
  so:['La squadra {sq} sorprende. VAR: nessuna irregolarità. Per ora.'],
  mk:['Revisione del trasferimento di {gio}: il contratto è regolare. Il portafoglio no.'],
  gen:['Ho rivisto tutto. Non ho cambiato idea. Ma ho cambiato l\'ora.','Il VAR non sbaglia mai. È l\'umano che lo interpreta. Io interpreto male da sempre.'],
  cl:['Posizione di {sq}: {pos}°. Controllo terminato. Confermata.']},
 fc27_ratings:{
  pm:['Aggiornamento overall: {sq} {pt} dopo la giornata. Troppo? Chiedetelo a chi ha perso. #FC27','FC27 Ratings: {sq} prende +{gol} dopo la giornata. {sq2} perde il sorriso.'],
  so:['Il nuovo overall di {sq} è un po\' sospetto. Ma noi non commentiamo. Cambiamo e basta.'],
  mk:['Overall di {gio}: lo alziamo se qualcuno lo compra. Il mercato è un videogioco.'],
  fc:['Le carte speciali di FC27 sono uscite. Sono tutte uguali tranne il prezzo.','In FC27 la squadra più forte sono io. Ho fatto una modifica nei file. Reclami non accettati.','Mio nipote ha comprato un pacchetto di FC27 e ha preso un portiere. Ha detto che è la sua carta preferita.'],
  gen:['Aggiorniamo gli overall quando ci pare. Reclami non accettati.'],
  cl:['{sq} al {pos}° posto. Overall in aggiornamento. Notizie dal campo.']},
 il_cugino_del_dt:{
  mk:['Mio cugino lavora con un DT e dice che {gio} sta per cambiare squadra. Lui dice di non dirlo. Ma io lo dico.','Il cugino di un amico di mio cugino dice che {sq} ha un colpo in canna. Probabilmente è una pistola ad acqua.'],
  al:['Mio cugino dice che l\'allenatore di {sq} è sotto esame. Poi mi ha chiesto dei soldi. Quindi non so.'],
  pm:['Mio cugino era allo stadio. Dice che {sq} ha fatto una grande partita. Poi ha detto che era a casa.'],
  gen:['Mio cugino è convinto che il calcio sia truccato. Anche il suo televisore.','Mio cugino conosce uno che conosce uno che ha giocato in Serie A. Una volta. A calcetto.'],
  so:['Mio cugino non è sorpreso da {sq}. Lui non si sorprende mai. Nemmeno dalle bollette.'],
  cl:['Mio cugino dice che {sq} al {pos}° posto è un segno del destino. E di una formazione sbagliata.']},
 telecronista_stanco:{
  pm:['Siamo qui. E {sq} fa {pt} punti. Non so voi ma io sono già stanco.','{gio} tocca palla. Tocca ancora. Tocca di nuovo. Insomma tocca. Ora aspettiamo un gol. O un caffè.'],
  so:['Che sorpresa {sq}! E io ancora a commentare. Vado a bere.'],
  al:['Ora in panchina c\'è tensione. Come in tutta la mia vita lavorativa.'],
  gen:['Un saluto a chi ci segue da casa. E a chi ci segue anche se non vuole.','Intanto in tribuna c\'è un signore che dorme. Il vero spettatore neutrale.'],
  mk:['E mentre {gio} è seduto in panchina, il mercato corre. Noi invece restiamo fermi. Per contratto.'],
  cl:['{sq} al {pos}° posto. Cala il sipario, anzi, resta aperto.']},
 gufo_professionista:{
  pm:['Ho gufato {sq} e infatti {pt} punti. Il mio lavoro è fatto.','Gufata riuscita su {sq}. Il successo è questione di allenamento.','Dicevo che {gio} avrebbe fatto bene. Ha fatto male. Il mio talento è reale.'],
  al:['Non gufo l\'allenatore. Ma lo guardo con tanta preoccupazione. Quasi professionale.'],
  so:['Sorpreso da {sq}? Io ho gufato in senso contrario. Ho sbagliato. Ora gufo meglio.'],
  gen:['Ho smesso di gufare. Ma la mia energia negativa no. È più forte di me.','Oggi mi sento ottimista. Sto cercando di capire chi gufare.'],
  mk:['Ho gufato {gio} e infatti. Il mercato è stato clemente. Per ora.'],
  cl:['{sq} al {pos}° posto. Segno che il mio gufo funziona al contrario.']},
 il_filosofo_del_pallone:{
  pm:['Il {pt} non è un numero. È un\'idea. Un\'idea di {sq}.','Cosa resta dopo {pt} punti? Resta il silenzio. E poi la prossima giornata.'],
  al:['Cambiare allenatore è cambiare il mondo? No. È cambiare la mail dell\'allenatore.','Ogni mister è un\'illusione. Il vero mister è il caso.'],
  so:['Perché {sq} sorprende? Perché ci sorprendiamo di essere sorpresi.'],
  mk:['{gio} cambia squadra. Ma il pallone resta rotondo. Tutto il resto è mercato.'],
  gen:['Il calcio è come la vita. Tranne che nel calcio ci sono i voti. Nella vita no. Per fortuna.','Siamo tutti allenatori. Qualcuno è solo più rumoroso.'],
  fc:['FC27 è un\'allegoria del capitalismo: ti fanno pagare per sbloccare un portiere.'],
  cl:['{sq} al {pos}° posto. La classifica è un\'illusione numerata.']},
 bomber_da_bar:{
  pm:['Io {pt} punti li avrei fatti con una mano. Con l\'altra bevevo.','{sq} non ha fatto male. Ma io avrei segnato di più. Fidatevi, ho il bomber dentro.'],
  mk:['Prendo {gio} gratis, lo faccio giocare al bar e vince lo scudetto del bar.','{gio} costa troppo. Io mi accontento di un giocatore da seconda categoria. Che fa gli stessi gol.'],
  al:['Allenatore? Nessuno. Mi alleno da solo, al bancone.'],
  so:['{sq} sorprende? Io sono sorpreso dalla mia stessa sorpresa. Un giro per tutti?'],
  gen:['Il calcio vero si gioca all\'oratorio. Il resto è fantacalcio.','Oggi ho fatto un gol in cortile. Lo racconto da una settimana.'],
  fc:['Ho comprato FC27 per guardare il bomber. Ho trovato il menù.'],
  cl:['{sq} al {pos}° posto. Birra per tutti.']},
 statistico_folle:{
  pm:['Statistica del giorno: il {pt} di {sq} è esattamente la media tra il suo punteggio e quello dell\'altra squadra. Ma non sempre.','Probabilità che {sq} faccia {pt} punti due volte di fila: 3,2%. Probabilità che io abbia ragione: 0%.'],
  so:['Secondo i miei calcoli, {sq} sorprende nel 73% dei casi in cui sorprende.'],
  al:['L\'allenatore cambia ogni 8,3 settimane. Il mio algoritmo è sbagliato ma coerente.'],
  mk:['{gio}: valore atteso 0,81 gol a partita. Valore reale: sì.'],
  gen:['Il 67% delle statistiche viene inventato sul momento. Il restante 33% è un\'approssimazione.','Dati alla mano: dopo ogni giornata c\'è un\'altra giornata. Fonte: calendario.'],
  fc:['In FC27 la media overall è 71,4. In vita mia, 41,4.'],
  cl:['{sq} al {pos}° posto: percentuale scudetto 4,7%. Margine errore 100%.']},
 arbitro_in_pensione:{
  pm:['Ho arbitrato 400 partite. Questa di {sq} la sospenderei per eccesso di fantasia.','{pt} punti per {sq}. Ho visto di peggio. Ho fischiato di peggio.'],
  al:['L\'allenatore protesta. Cartellino giallo morale. Il rosso lo tengo per le emergenze.'],
  so:['{sq} sorprende. Ammonizione per eccesso di talento.'],
  mk:['{gio} cambia squadra. Se avessi un euro per ogni trasferimento che ho ignorato.'],
  gen:['Il segreto di un buon arbitro è sembrare sicuri anche quando non lo si è. Vale anche per i fantallenatori.','Quando dico "gioco fermo" intendo che il mondo si ferma. E invece il fantacalcio continua.'],
  fc:['In FC27 puoi comprare l\'arbitro. Almeno lì lo ammettono.'],
  cl:['{sq} al {pos}° posto. Posizione regolare. Controllo effettuato.']}
};
var AUTORI=Object.keys(PERS);
/* risposte generiche */
var RISP=['Confermo.','Firmo.','Verissimo.','Però {sq} ha dei dubbi.','Non è colpa mia, giuro.','Seguiamo con attenzione.','Applauso, ma con riserva.','Su questo non ho nulla da aggiungere. Quindi aggiungo.','Ai posteri.','Questo coro merita un premio. O un esame.','Ho letto e sono ancora qui.','Ma anche no.','Bomba. Poi si vedrà.','Hai detto tutto. Anche troppo.','Lo dicevo anche io. Ma più forte.'];
/* Ciro */
var CIRO=[
 {x:'🚨 Ci siamo… forse. {sq} avrebbe un\'idea per {gio}. Il giocatore è sereno. Il giornalista meno. {#}\n\nAggiornamento a breve. 🧵',t:['2/3 Trattativa avviata da ore. O da minuti. Il bar sotto casa conferma. Più o meno.','3/3 Prossimo aggiornamento: quando vorrò io. Ci siamo. Forse.']},
 {x:'🚨 Mercato: {sq} lavora in silenzio su {gio}. Silenzio assoluto. Tanto che non so nulla. Ma lo dico lo stesso. {#}',t:[]},
 {x:'Ultime sul mercato: {sq} e {sq2} hanno parlato. Di cosa? Non posso dirlo. Perché non lo so. 🧵',t:['2/2 Quando lo saprò, voi sarete già in vacanza.']},
 {x:'🚨 Esclusiva (quasi): {inj} è in dubbio per {inj_sq}. Il medico sociale smentisce. Il medico sociale è mia zia.',t:[]},
 {x:'Ci siamo, ma non ci siamo. {gio} è sul mercato, ma non è sul mercato. Un classico. {#}',t:[]},
 {x:'🚨 Fonti vicine al barista: {sq} pronta al colpo di mercato. Il colpo si chiama {gio}. O forse no. 🧵',t:['2/2 In ogni caso: auguri a tutti.']},
 {x:'Aggiornamento di mercato: nessun aggiornamento. Ma lo dico con sicurezza. {#}',t:[]},
 {x:'🚨 {sq} pensa a un cambio di allenatore. Anzi no. Anzi sì. Dipende dalla giornata. {#}',t:[]},
 {x:'Voci di mercato: {gio} piace a {sq} e a {sq2}. Alla fine finirà a una terza. Come sempre.',t:[]},
 {x:'Trattativa avanzata per {gio}: manca solo la firma. E l\'accordo. E il giocatore. {#}',t:[]}
];
var SCAMBIO=['🚨 È UFFICIALE: scambio tra {a} e {b}. {da} passa a {b}, {db} passa a {a}. Il bar sotto casa conferma. {#}','🚨 Scambio fatto: {a} cede {da}, {b} cede {db}. Tutto vero, questa volta. Ho anche le fonti. {#}'];
var ENFA=['Giornale','Lega','Ciro'];

/* helper dati */
function nomi(D){var m={};(D.teams||[]).forEach(function(t){(t.pl||[]).forEach(function(p){var pp=D.P[p.id];if(pp)m[p.id]={n:pp.n,sq:t.name}})});return m}
function ctxDi(D,SQ,ST,seed){
 var r=prng(seed),NM=nomi(D),ids=Object.keys(NM);
 return function(){
  var c={};c.sq=pick(r,SQ);do{c.sq2=pick(r,SQ)}while(c.sq2===c.sq);
  c.gol=1+Math.floor(r()*4);
  var g=ids.length?NM[pick(r,ids)]:{n:'il bomber',sq:c.sq};c.gio=g.n;c.gio_sq=g.sq;
  var ij=(D.inj||[]).filter(function(i){return NM[i.id]});
  var j=ij.length?pick(r,ij):null;c.inj=j?j.n:'il centravanti';c.inj_sq=j?NM[j.id].sq:c.sq;
  var pos=ST.cls.map(function(t){return t.n}).indexOf(c.sq);c.pos=pos<0?'?':pos+1;
  var pt='?';if(ST.ult)ST.ult.m.forEach(function(m){if(m[0]===c.sq)pt=m[1];else if(m[3]===c.sq)pt=m[2]});
  c.pt=String(pt).replace('.',',');
  return c;
 };
}
function riempi(t,c,tag){return t.replace(/\{(\w+)\}/g,function(m,k){return c[k]!==undefined?c[k]:m}).replace('{#}',tag?('#'+tag):'').replace(/\s+$/,'').replace(/\s{2,}/g,' ').replace(/\.\.(?!\.)/g,'.')}
var PESI={0:{pm:5,so:3,al:3,gen:3,mk:1,fc:1,cl:1},1:{pm:5,so:3,al:3,gen:3,mk:1,fc:1,cl:2},2:{cl:5,al:3,so:3,gen:3,mk:1,fc:2,pm:1},3:{cl:3,so:3,al:2,gen:3,mk:2,fc:2,pm:1},4:{mk:5,gen:3,fc:3,so:2,al:2,cl:1,pm:0},5:{mk:5,gen:3,fc:3,so:2,al:2,cl:1,pm:0},6:{pm:3,gen:3,mk:2,so:2,fc:2,al:1,cl:0}};
function post_giorno(D,SQ,ST,g){
 var dd=dalGiorno(g),tg=tendenze(D),tags=tg.map(function(x){return x[0]}),r=prng('giorno'+g),mk=ctxDi(D,SQ,ST,'ctx'+g);
 var w=PESI[dd.wd],cats=[];Object.keys(w).forEach(function(k){for(var i=0;i<w[k];i++)cats.push(k)});
 var n=6+Math.floor(r()*3),out=[],usati={};
 var ordine=shuffle(r,AUTORI);
 for(var i=0;i<n;i++){
  var a=ordine[i%ordine.length],cat=pick(r,cats),lis=PERS[a][cat];
  if(!lis||!lis.length){var ks=Object.keys(PERS[a]);cat=pick(r,ks);lis=PERS[a][cat]}
  /* nessuna ripetizione di template a ravvicinato: indice ruotato per giorno */
  var ix=(Math.floor(g/1)+i*7+h32(a+cat))%lis.length,c=mk();
  var tag=r()<0.45?pick(r,tags):null;
  var x=riempi(lis[ix],c,tag);
  var hh=8+Math.floor((i+r())*(15/n)),mi=Math.floor(r()*60);
  out.push({k:'v:'+g+':'+i,a:a,x:x,ts:ts(dd.y,dd.mo,dd.d,Math.min(23,hh),mi),_r:r});
 }
 /* risposte generiche */
 out.forEach(function(p){var rr=prng(p.k),nr=Math.floor(rr()*3);p.r=[];var s=shuffle(rr,AUTORI.filter(function(a){return a!==p.a}));for(var j=0;j<nr;j++){var c=mk();p.r.push({a:s[j],x:riempi(pick(rr,RISP),c,null),ts:p.ts+(5+Math.floor(rr()*90))*60000})}});
 return out;
}
function conta(k,base){var r=prng(k+'n');var b=base||1;return{ap:Math.floor((4+r()*40)*b),ril:Math.floor(r()*12*b),v:Math.floor((200+r()*2400)*b)}}
function genera(D,SQ,ST,ms){
 var r=roma(ms),oggi=giorno(ms),all=[],tg=tendenze(D).map(function(x){return x[0]});
 var tag=function(k,i){return tg[(h32(k)+i)%tg.length]};
 for(var g=oggi-3;g<=oggi;g++){
  post_giorno(D,SQ,ST,g).forEach(function(p){if(p.ts<=ms&&p.ts>=ms-96*36e5){var c=conta(p.k);p.ap=c.ap;p.ril=c.ril;p.v=c.v;p.r=p.r.filter(function(x){return x.ts<=ms});all.push(p)}});
  /* Ciro: venerdì 18:00 + un aggiornamento il lunedì */
  var dd=dalGiorno(g),mk=ctxDi(D,SQ,ST,'ciro'+g);
  if(dd.wd===5||dd.wd===1||dd.wd===3&&g%2===0){
   var cr=prng('ciro'+g),tpl=CIRO[(g*3)%CIRO.length],cc=mk(),T=ts(dd.y,dd.mo,dd.d,dd.wd===5?18:dd.wd===1?12:10,Math.floor(cr()*50));
   var p={k:'c:'+g,a:'ciro_trattativa',x:riempi(tpl.x,cc,tag('c'+g,0)),thr:tpl.t.map(function(t){return riempi(t,cc,null)}),ts:T,r:[]};
   var c=conta(p.k,2);p.ap=c.ap;p.ril=c.ril;p.v=c.v;
   if(p.ts<=ms&&p.ts>=ms-96*36e5)all.push(p);
  }
 }
 /* Lega e Giornale legati ai risultati */
 var n=giocate(D);
 if(n&&D.cal&&D.cal.date){
  var dp=D.cal.date.split('-').map(Number),gd=Math.floor(Date.UTC(dp[0],dp[1]-1,dp[2])/864e5),wd=dalGiorno(gd).wd;
  var gTue=gd-((wd-2+7)%7),gWed=gd-((wd-3+7)%7),a=dalGiorno(gTue),b=dalGiorno(gWed);
  var P1={k:'lega:'+n,a:'lega_ofantagirrr',x:'Fine giornata. Ecco i risultati della '+n+'ª giornata di campionato. #Giornata'+n,tipo:'ris',ts:ts(a.y,a.mo,a.d,21,15),r:[]};
  var P2={k:'gior:'+n,a:'giornale_girrr',x:'È uscito il numero '+n+' del Giornale: pagelle, il Coro della settimana e la Bufala di mercato. #Giornata'+n,tipo:'gio',ts:ts(b.y,b.mo,b.d,9,0),r:[]};
  [P1,P2].forEach(function(p){var c=conta(p.k,1.4);p.ap=c.ap;p.ril=c.ril;p.v=c.v;if(p.ts<=ms)all.push(p)});
 }
 /* veri scambi */
 (D.scambi||[]).forEach(function(s,i){var T=Date.parse(s.t);if(!(T<=ms))return;var cc={a:s.a,b:s.b,da:s.da,db:s.db};var p={k:'sc:'+i,a:'ciro_trattativa',x:riempi(SCAMBIO[i%2],cc,null),ts:T,r:[],ap:20,ril:6,v:900};all.push(p)});
 all.sort(function(a,b){return b.ts-a.ts});
 return all;
}
function reazioni(k,t,ms,SQ){var r=prng('rz'+k),age=(ms-t)/60000;if(age<1)return{ap:0,ril:0,r:[]};
 var fa=2+Math.floor(r()*11),fr=Math.floor(r()*4),pr=Math.pow(Math.min(1,age/360),0.6),out=[];
 var nr=Math.floor(r()*3),ord=shuffle(r,AUTORI);
 for(var i=0;i<nr;i++){var d=10+r()*240,tx=pick(r,RISP).replace('{sq}',pick(r,SQ)),a=ord[i];if(age>=d)out.push({a:a,x:tx,ts:t+d*60000})}
 return{ap:Math.floor(fa*pr),ril:Math.floor(fr*pr),r:out}}
function ultimo(D,ms){var SQ=(D.teams||[]).map(function(t){return t.name}),L=(D.cal&&D.cal.lega)||[],u=null;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});
 var p=genera(D,SQ,{cls:SQ.map(function(n){return{n:n}}),ult:u,next:null},ms);return p.length?p[0].ts:0}
var NOMI={nonno_cesare:'Nonno Cesare',tifoso_arrabbiato:'Il Tifoso Arrabbiato',mister_divano:'Il Tecnico da Divano',radio_spogliatoio:'Radio Spogliatoio',mamma_di_capitan:'Mamma di Capitan Sfortuna',ex_ds_provincia:'Ex DS di Provincia',var_parlante:'VAR Parlante',fc27_ratings:'FC27 Ratings Italia',il_cugino_del_dt:'Il Cugino del DT',telecronista_stanco:'Il Telecronista Stanco',gufo_professionista:'Gufo Professionista',il_filosofo_del_pallone:'Il Filosofo del Pallone',bomber_da_bar:'Bomber da Bar',statistico_folle:'Lo Statistico Folle',arbitro_in_pensione:'Arbitro in Pensione',ciro_trattativa:'Ciro Trattativa',lega_ofantagirrr:'Lega O Fant A Girrr',giornale_girrr:'O Giornale del Girrr'};
function anteprima(D,ms,n){var SQ=(D.teams||[]).map(function(t){return t.name}),L=(D.cal&&D.cal.lega)||[],u=null;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});
 return genera(D,SQ,{cls:SQ.map(function(x){return{n:x}}),ult:u,next:null},ms).filter(function(p){return !p.tipo}).slice(0,n).map(function(p){return{a:p.a,n:NOMI[p.a]||p.a,x:p.x.replace(/\n[\s\S]*/,'')}})}
window.CVB={anteprima:anteprima,reazioni:reazioni,ultimo:ultimo,genera:genera,tendenze:tendenze,PERS:PERS,RISP:RISP,CIRO:CIRO,roma:roma,giorno:giorno,h32:h32};
})();
