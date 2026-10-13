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

function cupUlt(D){var C=(D.cal&&D.cal.cup)||[],u=null;C.forEach(function(g){var mm=g.m.filter(function(m){return m[5]!=='-'});if(mm.length)u={n:g.n,sa:g.sa,pub:g._pub,m:mm.map(function(m){return [m[1],m[2],m[3],m[4],m[5],m[0]]})}});return u}
function legaSa(D){var u=null;((D.cal&&D.cal.lega)||[]).forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});return u&&u.sa}
/* Personaggi */
var PERS={
 nonno_cesare:{
  mk:['Ai miei tempi il calciomercato si faceva al bar con una stretta di mano. Oggi ci vogliono tre avvocati e un fax. {sq} ha capito: stretta di mano.','Mi dicono che {gio} è in vendita. Ai miei tempi un giocatore si comprava, si portava a casa e si faceva mangiare dalla moglie.'],
  pm:['Ho visto {sq} oggi. Ai miei tempi si giocava con undici uomini e un pallone. Oggi con undici uomini, un pallone e quindici notifiche.','{pt} punti per {sq}. Ai miei tempi bastavano due gol e una sigaretta.'],
  al:['Cambiare allenatore? Ai miei tempi l\'allenatore si cambiava solo se moriva. E anche allora lo si portava in panchina.'],
  so:['Sorpreso da {sq}? Io no. Ho visto cose che voi umani non potete nemmeno immaginare. Tipo il catenaccio.'],
  fc:['Mio nipote mi parla di FC27. Gli ho detto: io ho giocato al calcio vero. Mi ha risposto che il mio overall è 42.'],
  gen:['Il fantacalcio è come la bocciofila, ma con più urla.','Ho appena capito come funziona il modulo. Peccato che ormai sia cambiato.','Il segreto è non guardare i voti prima della domenica sera. Poi li si guarda comunque.'],
  ri:["{vinc} batte {perd} {sc}. Ai miei tempi un risultato così si commentava solo con un silenzio rispettoso.", "{pv} punti per {vinc}. Per i miei standard è un campionato di altri tempi."],cl:['{sq} al {pos}° posto. Una volta questa era una posizione di prestigio. Oggi è una posizione.']},
 tifoso_arrabbiato:{
  al:['Cambiate allenatore! Non importa quale squadra, cambiate e basta. Poi vediamo.','{sq} con {pt} punti. Un allenatore così lo manderei a coltivare patate. {#}','Basta! Cambio allenatore e modulo e giocatori. Il resto va bene.','Dopo questa giornata dico solo una cosa: cambiate allenatore. A chiunque.'],
  pm:['{pt} punti? Ma stiamo scherzando? Io voglio le dimissioni. Di tutti. Anche mie. {#}','Sono uscito dal divano per dire che {sq} è una vergogna. Torno sul divano.'],
  so:['Sorpreso da {sq}? Io sono furioso, che è peggio.'],
  mk:['{gio} non vale il prezzo. Vendete tutto. Ricominciate. Poi vendete di nuovo.'],
  gen:['Quando perdo do la colpa all\'arbitro. Quando vinco ringrazio l\'arbitro. Quando pareggio mi arrabbio con tutti.','Ho litigato con la TV. Ha vinto lei. Era spenta.'],
  ri:["{perd} ha preso {pp} punti contro {vinc}? Una vergogna. Cambiate tutto, a partire dall'allenatore.", "{vinc} vince {sc} e io sono arrabbiato lo stesso. Perché si poteva fare meglio."],cl:['{sq} al {pos}° posto. Posizione che meriterebbe una commissione d\'inchiesta.']},

 il_complottista:{
  gen:['Qualcuno mi spiega perché il VAR guarda sempre dalla parte dei soliti? Io una spiegazione ce l\'ho. Non vi piacerà.','Gli arbitri sono tutti pagati. Non dico da chi. Dico solo che il bar sotto casa mia ha un fornitore interessante.','Il fischio di oggi era già scritto. Da settimane. Chiedete a chi sapete voi.','Quanti rigori sono stati dati alle prime della classe? Io li ho contati. Troppi. Fate voi le conclusioni. {#}','Se fosse un caso, non succederebbe ogni domenica. Il caso, di solito, si prende anche qualche giorno libero.','Tutto truccato. Tutto. Anche il fantacalcio. Soprattutto il fantacalcio.'],
  pm:['Con {pt} punti {sq} è stata derubata. Non so da chi. Ma qualcuno c\'è.','Il 5,5 a {gio}? Sembra un voto deciso a tavolino. Con il caffè.'],
  ri:['{vinc} vince {sc}. Casualità? Io non credo alle casualità. Guardate chi arbitrava.','{perd} ha perso per due episodi. Gli episodi li decide qualcuno.'],
  cl:['{sq} al {pos}° posto. Bene. Ora aspettiamo il rigore al 94° per {top}. {#}'],
  mk:['Se {gio} cambia squadra c\'è sotto qualcosa. Ci sono sempre le commissioni. Sempre.'],
  al:['Ma quale allenatore: sono gli arbitri che decidono tutto.'],
  so:['Sorpresi dal risultato? Io no. Era previsto dalla settimana scorsa. Da chi? Non lo dico.']},
 il_romantico_del_pallone:{
  gen:['Ventidue uomini in mutande che corrono dietro a un pallone. E intorno miliardi di euro. Ditemi che non è strano.','Girano troppi soldi nel calcio. Poi ti chiedono 12 euro per una birra. {#}','Il calcio era quello dell\'oratorio: un pallone, due zaini come pali. Poi sono arrivati i diritti tv.','Un giocatore costa quanto un ospedale. Ma i diritti tv sono più importanti. Capito?','Alla fine sono solo 22 persone dietro a una palla. Eppure ci scanniamo per {sq}. Siamo messi bene.','I procuratori guadagnano più dei giocatori. I giocatori più dei medici. Il calcio ha vinto, il resto no.'],
  pm:['{sq} ha {pt} punti. Una cifra irrisoria, rispetto a quanto costa uno solo dei suoi giocatori.'],
  mk:['{gio} cambia squadra per milioni. Io faccio fantacalcio con crediti finti. Almeno sono onesti.'],
  ri:['{vinc} vince {sc}, ma intanto i soldi li hanno vinti i procuratori.'],
  cl:['{sq} al {pos}° posto. Classifica che conta meno del bilancio.'],
  al:['L\'allenatore guadagna in un mese quanto io in tre vite. Con calma.'],
  so:['Mi stupisce poco: se paghi tanto, vinci. Principio base.']},
 ing_stadi:{
  gen:['Gli stadi italiani hanno in media 60 anni. Per un ingegnere non è un dettaglio: è un\'ammissione. {#}','Un nuovo stadio costa meno di tre giocatori medi. Eppure lo aspettiamo da vent\'anni.','Parcheggio medievale, bagni preistorici. Il calcio è bello, i bagni meno.','Servono stadi moderni: coperture, accessi, visibilità. Poi parlate del VAR.','Cinque ore di fila per entrare. Cinque minuti di partita. Rinnoviamo gli stadi o almeno le code.','Se rifacessero gli stadi con lo stesso impegno con cui si lamentano degli arbitri, avremmo l\'Etihad ovunque.'],
  pm:['{sq} segna, ma la visuale dal secondo anello? Non è dell\'altro mondo. È un altro mondo, e non va bene.'],
  mk:['{gio} è un bel colpo. Ma uno stadio nuovo sarebbe un colpo migliore.'],
  ri:['{vinc} vince {sc}. Però il tetto dello stadio perde. Nessuno ne parla.'],
  cl:['{sq} al {pos}° posto in classifica e al 17° per qualità dei bagni. Il confronto è severo.'],
  al:['Un allenatore si sostituisce in una settimana. Uno stadio in vent\'anni. Qualcosa non quadra.'],
  so:['Sorpresa? Sì. Come l\'acqua che entra nel tunnel di uno stadio italiano.']},
 il_super_tifoso:{
  gen:['Io sono sempre stato di {top}. Sempre. Da giovedì, ma sempre.','{top} è la mia vita. Se perdono vado in depressione. Se vincono sono contento. Se sono prime, ancora di più.','{gio} è il più forte del mondo, punto. Non ammetto repliche. Domenica scorsa il più forte era un altro, ma ero sotto choc.','Tifo {top} da quando è prima. Il mio è un tifo molto sentimentale. Molto solido. Molto in classifica.','Chi parla male di {gio} non capisce nulla. Io ne ho parlato male tre settimane fa, ma ero un altro.','Gli amici mi dicono: ma non tifavi {sq2}? Io non ho mai tifato {sq2}. Chi lo dice? {#}'],
  pm:['{sq} ha preso {pt} punti? Mai stato mio tifoso. Ma se vincono, ero con loro dall\'inizio.'],
  mk:['{gio} è il mio idolo. Qualunque squadra scelga. Anche quella che vince, tipo {top}.'],
  ri:['{vinc} vince {sc}. Grande squadra, grande storia, ci credevo dall\'inizio. Cioè da ieri sera.','{perd} perde. Che squadra mediocre. Non sono mai stato dei loro. Chi dice il contrario è un provocatore.'],
  cl:['{top} comanda la classifica. Segnatevi: io sono di {top}. Da sempre. Controllate pure.'],
  al:['Cambio allenatore? Dipende da chi vince. Se vince, è un genio.'],
  so:['Sorpreso? No. Ho sempre saputo che {sq} sarebbe salita. Anche se ieri dicevo il contrario.']},
 mister_divano:{
  pm:['{sq} ha preso {pt} punti. Col 4-3-3 ne avrebbe fatti dieci in più. Fidatevi.','Ho rivisto la partita di {sq}. Dal divano si vede tutto. Soprattutto gli errori degli altri. {#}'],
  so:['Sorpreso dalla squadra? No. Sono sorpreso che qualcuno sia sorpreso. 4-3-3 e passa la paura.','{sq} ha cambiato modulo e ha dato un senso alla sua stagione. Io lo dicevo da agosto. Nessuno ascolta il divano.'],
  al:['Allenatore? Chiamatemi. Divano incluso. Compenso: una pizza.'],
  gen:['Il segreto dei grandi allenatori è lo spazio tra le linee. Io ho solo lo spazio tra i cuscini.','4-3-3. 4-4-2. 3-5-2. Sono tutti numeri. Il vero modulo è la fortuna.','Dopo la giornata sono sicuro di una cosa: la panchina è il vero titolare.'],
  mk:['Se prendessi {gio} cambierei modulo e alleno da casa. Già pronto per il prossimo ruolo.'],
  fc:['In FC27 sono un fenomeno. Nella vita no. Preferisco FC27.'],
  ri:["{vinc} – {perd} {sc}. Il segreto è stato il modulo. Non l'ho visto ma lo so.", "{perd} ha perso di {scarto} punti. Con il 4-3-3 il risultato sarebbe stato diverso. Lo dico da divano."],cl:['{sq} al {pos}° posto: i numeri non mentono, ma il divano sì.']},
 radio_spogliatoio:{
  mk:['Voci di corridoio: {sq} starebbe sondando {gio}. Nessuna conferma. Molta convinzione. {#}','Fonti vicine a una bottiglia d\'acqua: {gio} cambia casacca. Aggiornamenti non prima di domani.','Rumors insistenti: {sq} e {sq2} stanno parlando. Di cosa? Di calcio. O di pizza. Dipende.'],
  pm:['Si dice che dopo {pt} punti {sq} non dormirà stanotte. Il giocatore smentisce. Il suo gatto conferma.'],
  al:['Dicono che l\'allenatore di {sq} sia in bilico. Ma anche io lo sono, sulla sedia.'],
  so:['Sentito dire: {sq} ha cambiato qualcosa. Cosa? Non lo so. Ma qualcosa.'],
  gen:['Radio Spogliatoio non conferma e non smentisce. Si limita a confermare. Poi smentisce.'],
  ri:["Si dice che {perd} dopo {sc} contro {vinc} abbia lasciato lo spogliatoio in silenzio. O forse in ritardo.", "Voci: {vinc} festeggia, {perd} riflette. Nessuna conferma. Solo molta convinzione."],cl:['Voci: {sq} al {pos}° posto non è un caso. Qualcuno sa. Io no.']},
 mamma_di_capitan:{
  pm:['Bravo, ho visto la partita. Hai fatto {pt} punti. Hai mangiato?','{pt} punti non sono pochi. Sono giusti. Come i calzini: né troppi né pochi.','Mio figlio ha perso ma ha giocato bene. Lo dico ogni settimana. Ogni settimana è vero.'],
  mk:['Mio figlio mi dice che vuole {gio}. Io gli ho detto: prima mangia.','Dicono che {gio} vale tanto. Io pago in lasagne.'],
  al:['L\'allenatore di mio figlio è bravissimo. Anche se non ne azzecca una. Ma chi è perfetto.'],
  so:['Sorpresa dalla squadra di mio figlio? Mai. Io lo so da quando era piccolo che aveva talento.'],
  gen:['Ho comprato un cuscino per la tribuna. Non serve a niente ma è comodo.','Ho chiesto a mio figlio cos\'è un fantallenatore. Mi ha detto "sei tu, mamma". Quindi sì.'],
  ri:["{perd} ha perso {sc} ma ha giocato bene. Lo dico perché sono la madre.", "{vinc} ha fatto {pv} punti. Un bravo ragazzo. Avrà mangiato."],cl:['{sq} al {pos}° posto. Posizione dignitosa. Come tutte, dopotutto.']},
 ex_ds_provincia:{
  mk:['Il mercato è così: vendi un portiere a gennaio, a maggio ti chiede ancora i soldi dell\'assicurazione. {#}','{gio} a quel prezzo? Io l\'ho venduto a meno. E mi ringraziavano.','Consiglio di mercato: guardate le gambe, non il curriculum. Il curriculum non corre.','Ho portato in squadra {gio}. Era in prova. Poi la prova è finita ma lui è rimasto.'],
  pm:['Quando una squadra fa {pt} punti, il DS ha già pronto il comunicato. Di solito parla di "visione".'],
  al:['Un allenatore si cambia a gennaio, quando il DS ha finito le scuse.'],
  so:['Sorpreso da {sq}? Io no: ho visto il bilancio.'],
  gen:['Il DS è come l\'arbitro: se si nota, ha sbagliato.'],
  ri:["{vinc} batte {perd} {sc}: il budget è sempre un fattore. Ma anche la fortuna.", "{pp} punti per {perd}: a gennaio si cambia qualcosa. O qualcuno."],cl:['{sq} al {pos}° posto: il budget lo permette. Il resto no.']},
 var_parlante:{
  pm:['Ho rivisto l\'azione. Il {pt} di {sq} era regolare. Anche se faceva male.','Controllo in corso su {sq}. Ho dei dubbi. Anche sui miei dubbi.','Revisione al monitor: {gio} era in fuorigioco di una testa. Non la sua.'],
  al:['Dalla sala VAR: l\'allenatore è fuori area. Ma resta dentro l\'ego.'],
  so:['La squadra {sq} sorprende. VAR: nessuna irregolarità. Per ora.'],
  mk:['Revisione del trasferimento di {gio}: il contratto è regolare. Il portafoglio no.'],
  gen:['Ho rivisto tutto. Non ho cambiato idea. Ma ho cambiato l\'ora.','Il VAR non sbaglia mai. È l\'umano che lo interpreta. Io interpreto male da sempre.'],
  ri:["Ho rivisto {vinc} – {perd}: il {sc} è regolare. Anche se fa male a {perd}.", "Controllo sul {sc} di {vinc}: nessuna irregolarità. Solo una gran giornata."],cl:['Posizione di {sq}: {pos}°. Controllo terminato. Confermata.']},
 fc27_ratings:{
  pm:['Aggiornamento overall: {sq} {pt} dopo la giornata. Troppo? Chiedetelo a chi ha perso. #FC27','FC27 Ratings: {sq} prende +{gol} dopo la giornata. {sq2} perde il sorriso.'],
  so:['Il nuovo overall di {sq} è un po\' sospetto. Ma noi non commentiamo. Cambiamo e basta.'],
  mk:['Overall di {gio}: lo alziamo se qualcuno lo compra. Il mercato è un videogioco.'],
  fc:['Le carte speciali di FC27 sono uscite. Sono tutte uguali tranne il prezzo.','In FC27 la squadra più forte sono io. Ho fatto una modifica nei file. Reclami non accettati.','Mio nipote ha comprato un pacchetto di FC27 e ha preso un portiere. Ha detto che è la sua carta preferita.'],
  gen:['Aggiorniamo gli overall quando ci pare. Reclami non accettati.'],
  ri:["{vinc} sale a {pv} di overall dopo il {sc} su {perd}. {perd} scende a {pp}. Reclami non accettati.", "Aggiornamento rapido: {vinc} +{scarto}, {perd} -{scarto}. Il resto è statistica."],cl:['{sq} al {pos}° posto. Overall in aggiornamento. Notizie dal campo.']},
 il_cugino_del_dt:{
  mk:['Mio cugino lavora con un DT e dice che {gio} sta per cambiare squadra. Lui dice di non dirlo. Ma io lo dico.','Il cugino di un amico di mio cugino dice che {sq} ha un colpo in canna. Probabilmente è una pistola ad acqua.'],
  al:['Mio cugino dice che l\'allenatore di {sq} è sotto esame. Poi mi ha chiesto dei soldi. Quindi non so.'],
  pm:['Mio cugino era allo stadio. Dice che {sq} ha fatto una grande partita. Poi ha detto che era a casa.'],
  gen:['Mio cugino è convinto che il calcio sia truccato. Anche il suo televisore.','Mio cugino conosce uno che conosce uno che ha giocato in Serie A. Una volta. A calcetto.'],
  so:['Mio cugino non è sorpreso da {sq}. Lui non si sorprende mai. Nemmeno dalle bollette.'],
  ri:["Mio cugino dice che {vinc} – {perd} {sc} era già scritto. Poi ha detto che anche lui ha scritto il contrario.", "Mio cugino era in tribuna per {vinc} – {perd}. Dice che si è divertito. Poi ha detto che era a casa."],cl:['Mio cugino dice che {sq} al {pos}° posto è un segno del destino. E di una formazione sbagliata.']},
 telecronista_stanco:{
  pm:['Siamo qui. E {sq} fa {pt} punti. Non so voi ma io sono già stanco.','{gio} tocca palla. Tocca ancora. Tocca di nuovo. Insomma tocca. Ora aspettiamo un gol. O un caffè.'],
  so:['Che sorpresa {sq}! E io ancora a commentare. Vado a bere.'],
  al:['Ora in panchina c\'è tensione. Come in tutta la mia vita lavorativa.'],
  gen:['Un saluto a chi ci segue da casa. E a chi ci segue anche se non vuole.','Intanto in tribuna c\'è un signore che dorme. Il vero spettatore neutrale.'],
  mk:['E mentre {gio} è seduto in panchina, il mercato corre. Noi invece restiamo fermi. Per contratto.'],
  ri:["{vinc} supera {perd} {sc}. Io sono stanco. Ma il risultato è bello.", "E il {sc} è servito: {vinc} vince, {perd} resta a guardare. Io pure."],cl:['{sq} al {pos}° posto. Cala il sipario, anzi, resta aperto.']},
 gufo_professionista:{
  pm:['Ho gufato {sq} e infatti {pt} punti. Il mio lavoro è fatto.','Gufata riuscita su {sq}. Il successo è questione di allenamento.','Dicevo che {gio} avrebbe fatto bene. Ha fatto male. Il mio talento è reale.'],
  al:['Non gufo l\'allenatore. Ma lo guardo con tanta preoccupazione. Quasi professionale.'],
  so:['Sorpreso da {sq}? Io ho gufato in senso contrario. Ho sbagliato. Ora gufo meglio.'],
  gen:['Ho smesso di gufare. Ma la mia energia negativa no. È più forte di me.','Oggi mi sento ottimista. Sto cercando di capire chi gufare.'],
  mk:['Ho gufato {gio} e infatti. Il mercato è stato clemente. Per ora.'],
  ri:["Ho gufato {perd} e infatti {sc} per {vinc}. Ho già prenotato il prossimo turno.", "{vinc} vince e io dico solo: tutto previsto. Anche l'errore."],cl:['{sq} al {pos}° posto. Segno che il mio gufo funziona al contrario.']},
 il_filosofo_del_pallone:{
  pm:['Il {pt} non è un numero. È un\'idea. Un\'idea di {sq}.','Cosa resta dopo {pt} punti? Resta il silenzio. E poi la prossima giornata.'],
  al:['Cambiare allenatore è cambiare il mondo? No. È cambiare la mail dell\'allenatore.','Ogni mister è un\'illusione. Il vero mister è il caso.'],
  so:['Perché {sq} sorprende? Perché ci sorprendiamo di essere sorpresi.'],
  mk:['{gio} cambia squadra. Ma il pallone resta rotondo. Tutto il resto è mercato.'],
  gen:['Il calcio è come la vita. Tranne che nel calcio ci sono i voti. Nella vita no. Per fortuna.','Siamo tutti allenatori. Qualcuno è solo più rumoroso.'],
  fc:['FC27 è un\'allegoria del capitalismo: ti fanno pagare per sbloccare un portiere.'],
  ri:["{vinc} – {perd} {sc}: il calcio non è una scienza esatta. Il fantacalcio nemmeno.", "Chi vince {sc} guadagna tre punti. Chi perde guadagna un'idea."],cl:['{sq} al {pos}° posto. La classifica è un\'illusione numerata.']},
 bomber_da_bar:{
  pm:['Io {pt} punti li avrei fatti con una mano. Con l\'altra bevevo.','{sq} non ha fatto male. Ma io avrei segnato di più. Fidatevi, ho il bomber dentro.'],
  mk:['Prendo {gio} gratis, lo faccio giocare al bar e vince lo scudetto del bar.','{gio} costa troppo. Io mi accontento di un giocatore da seconda categoria. Che fa gli stessi gol.'],
  al:['Allenatore? Nessuno. Mi alleno da solo, al bancone.'],
  so:['{sq} sorprende? Io sono sorpreso dalla mia stessa sorpresa. Un giro per tutti?'],
  gen:['Il calcio vero si gioca all\'oratorio. Il resto è fantacalcio.','Oggi ho fatto un gol in cortile. Lo racconto da una settimana.'],
  fc:['Ho comprato FC27 per guardare il bomber. Ho trovato il menù.'],
  ri:["{vinc} – {perd} {sc}: io avrei fatto un gol in più. Con una mano dietro la schiena.", "{pv} punti per {vinc}? Al bar ne farei di più. Ma sono senza segnare."],cl:['{sq} al {pos}° posto. Birra per tutti.']},
 statistico_folle:{
  pm:['Statistica del giorno: il {pt} di {sq} è esattamente la media tra il suo punteggio e quello dell\'altra squadra. Ma non sempre.','Probabilità che {sq} faccia {pt} punti due volte di fila: 3,2%. Probabilità che io abbia ragione: 0%.'],
  so:['Secondo i miei calcoli, {sq} sorprende nel 73% dei casi in cui sorprende.'],
  al:['L\'allenatore cambia ogni 8,3 settimane. Il mio algoritmo è sbagliato ma coerente.'],
  mk:['{gio}: valore atteso 0,81 gol a partita. Valore reale: sì.'],
  gen:['Il 67% delle statistiche viene inventato sul momento. Il restante 33% è un\'approssimazione.','Dati alla mano: dopo ogni giornata c\'è un\'altra giornata. Fonte: calendario.'],
  fc:['In FC27 la media overall è 71,4. In vita mia, 41,4.'],
  ri:["{vinc} – {perd} {sc}: la probabilità di questo risultato era 6,1%. Come sempre, ho sbagliato io.", "Differenza punti {scarto}: il 73% delle volte chi fa {pv} vince. Il restante 27% è un'altra storia."],cl:['{sq} al {pos}° posto: percentuale scudetto 4,7%. Margine errore 100%.']},
 arbitro_in_pensione:{
  pm:['Ho arbitrato 400 partite. Questa di {sq} la sospenderei per eccesso di fantasia.','{pt} punti per {sq}. Ho visto di peggio. Ho fischiato di peggio.'],
  al:['L\'allenatore protesta. Cartellino giallo morale. Il rosso lo tengo per le emergenze.'],
  so:['{sq} sorprende. Ammonizione per eccesso di talento.'],
  mk:['{gio} cambia squadra. Se avessi un euro per ogni trasferimento che ho ignorato.'],
  gen:['Il segreto di un buon arbitro è sembrare sicuri anche quando non lo si è. Vale anche per i fantallenatori.','Quando dico "gioco fermo" intendo che il mondo si ferma. E invece il fantacalcio continua.'],
  fc:['In FC27 puoi comprare l\'arbitro. Almeno lì lo ammettono.'],
  ri:["{vinc} – {perd} {sc}: partita regolare. Ammonizione a {perd} per scarsa mira.", "{pv} contro {pp}. Fischio finale e applausi. Un po' meno per {perd}."],cl:['{sq} al {pos}° posto. Posizione regolare. Controllo effettuato.']}
};
PERS.il_barista={
 gen:['Caffè e cornetto: 2 fantagol. Consiglio sul modulo: gratis, ma lo pagherete.','Qui al bar non esistono le formazioni sbagliate. Solo quelle che non hanno ancora vinto.','Ogni mattina qualcuno mi chiede il pronostico. Rispondo sempre uguale: un caffè.','La differenza tra un fantallenatore e un barista? Il barista almeno ascolta.'],
 live:['Bar aperto, tv accesa, {sq} nel cuore. Oggi si gioca e si consuma. {#}','Oggi tutti i tavoli prenotati per la giornata. Ordinazioni: un caffè e tanta speranza.','Sento già il profumo di caffè bruciato e panico da formazione. Giornata perfetta. {#}','Se {sq} stasera vince, offro io. Se perde, offre {sq2}.'],
 mk:['I miei clienti dicono che {gio} cambia squadra. Lo so, ne parlano da due caffè.','Voci raccolte al bancone: {sq} chiama {gio}. Sono voci. Del bancone.'],
 pm:['{sq} con {pt} punti? Oggi ne ho sentite tante. Questa è la migliore.'],
 al:['Mi hanno chiesto se allenerei {sq}. Ho risposto: prima un caffè.']
};
PERS.il_mago_cabala={
 gen:['Il numero 7 porta bene. Il 13 anche, se lo chiami 12+1. Il resto è casualità.','Ho consultato i fondi di caffè. Dicono: portate fortuna a chi gioca con il calzino sinistro per primo.','Non cambiate formazione di venerdì. Lo dico io, che non gioco.','Le stelle suggeriscono tre cose: pazienza, modulo prudente, mai l\'ultimo della lista.'],
 live:['Oggi giornata di Mercurio storto. Evitate il capitano al primo slot. {#}','I numeri della giornata: 4, 11 e il cognome di {gio}. Non chiedetemi perché.','Ho acceso una candela per {sq}. Il vicino dice che ha preso fuoco. Non è colpa mia.','Oggi {sq} è favorita. Le carte lo dicono. Le carte hanno già sbagliato, ma il principio resta.'],
 pm:['{sq} con {pt} punti: era scritto. Non so dove, ma era scritto.'],
 mk:['{gio} sta per cambiare squadra: me lo ha detto una carta. Quella del jolly.'],
 al:['Per l\'allenatore di {sq} consiglio un bagno di sale grosso. Per la panchina, due.']
};
PERS.la_suocera={
 gen:['A mio genero ho detto: il fantacalcio non ti porta da nessuna parte. Ha vinto. Non cambio idea.','Ai miei tempi la domenica si andava a pranzo dalla mamma. Ora tutti sul telefono a guardare i voti.','Mio genero sta di nuovo chiuso in camera con quel tablet. Si chiama lavoro, dice.','Non capisco il fantacalcio, ma capisco chi perde: sempre con la faccia lunga a tavola.'],
 live:['Oggi pranzo alle 12:30. Chi guarda la partita a tavola mangia da solo. {#}','Mio genero ha preparato la formazione dalle sei di mattina. Io ho preparato il ragù. Vediamo chi vince.','Se {sq} stasera perde, a cena silenzio. Lo dico agli ospiti.','La partita è alle 15. Il caffè alle 14:50. Rispettate gli orari.'],
 pm:['{pt} punti per {sq}. Mio genero ha fatto una faccia che non ho più dimenticato.'],
 al:['Ho consigliato a {sq} di cambiare allenatore. Mi hanno risposto "Signora, è un fantasy". Appunto.']
};
PERS.il_tassista={
 gen:['Ho portato un giocatore all\'aeroporto oggi. Non dico il nome. Ma lo chiamano il Pallone d\'Oro delle Serie B.','Un cliente mi ha spiegato il fantacalcio per mezz\'ora. Ho segnato il tassametro. Costava meno del fantacalcio.','Mi chiedono sempre un consiglio sul modulo. Io rispondo: Via Garibaldi, poi a destra.','Quando c\'è la partita il traffico sparisce. Ecco, almeno un vantaggio.'],
 live:['Oggi giornata di campionato: in giro nessuno, tutti incollati alla radio. Strade libere. {#}','Corsa da {sq} allo stadio: il cliente chiede la formazione, io il pagamento.','Fra un cliente e l\'altro sbircio i risultati. Il mio capitano è fermo in panchina. Come me.','Ho in macchina tre tifosi di {sq}. Il morale è altissimo. Il pagamento no.'],
 mk:['Ho sentito dire che {gio} cambia squadra. Me lo ha detto un passeggero che lavora nell\'ambiente. O forse faceva il parrucchiere.'],
 pm:['{sq} con {pt} punti? Un cliente stamattina ne era sicuro. Ho dovuto lasciarlo a metà strada.']
};
PERS.fidanzata_stufa={
 gen:['Il mio fidanzato ha un\'asta alle 21. Il mio anniversario era alle 20. Indovinate chi ha vinto.','Ho scoperto che esiste un modulo 3-5-2. Io volevo solo andare al cinema.','Mi hanno detto "è solo una lega tra amici". Allora perché piange per un 5,5?','Ho cambiato la password del Wi-Fi. Il mio fidanzato ha capito cos\'è davvero la disperazione.'],
 live:['Oggi giornata: lui non risponde ai messaggi fino alle 19. Lo so che è una persona adulta. {#}','Per {sq} oggi si decide tutto. Per me si decide solo cosa cucinare a cena.','Ho promesso di non ascoltare i commenti fino a stasera. Sono già al terzo.','Se oggi il capitano non segna, stasera lo consolo io. Con la tv spenta. {#}'],
 pm:['{sq} con {pt} punti. Mi hanno spiegato che è tanto. A me sembra un numero.'],
 so:['Sorpresa da {sq}? No. Ma mi hanno chiesto di fingermi sorpresa.'],
 al:['Se il mio fidanzato fosse allenatore di {sq}, avrebbe già cambiato modulo tre volte. Per me va bene.']
};
var IMGPER={il_barista:[['lavagna','pm,gen,live,so,al,fc'],['conto','mk'],['bar_class','cl,ri']],mister_divano:[['campo','*'],['divano','gen,pm,so,ri,live,cl']],fc27_ratings:[['carta','*'],['confronto','mk,ri,cl,pm']],statistico_folle:[['grafico','*'],['tabella','cl,ri,mk,gen']],il_mago_cabala:[['amuleto','*'],['oroscopo','gen,pm,ri,so,live']],telecronista_stanco:[['diretta','live,pm,so'],['tabellone','ri,cl,gen,al']],tifoso_arrabbiato:[['striscione','*'],['lettera','al,ri,gen,so']],nonno_cesare:[['epoca','*'],['figurina','mk,fc,gen']],il_complottista:[['dossier','*'],['ritaglio','ri,cl,gen']],il_romantico_del_pallone:[['cartello','*'],['scontrino','gen,mk,pm']],ing_stadi:[['blueprint','*'],['cantiere','gen,al,so']],il_super_tifoso:[['sciarpa','*'],['tessera','cl,mk,ri']],var_parlante:[['moviola','*']],bomber_da_bar:[['schedina','*']],ex_ds_provincia:[['contratto','*']]};
var LIVE={
 il_complottista:['Oggi gli arbitri sono già al bar con qualcuno. Noi lo sappiamo.','Giornata di campionato. Segnatevi chi fischia e poi controllate chi vince. {#}'],
 il_romantico_del_pallone:['Oggi si gioca. Il biglietto costa come un mese di spesa. Buona partita a tutti.','Giornata di campionato. Io guardo il pallone, voi guardate i soldi. Tanto è lo stesso.'],
 ing_stadi:['Oggi si gioca. Controllate le uscite di sicurezza: io lo faccio sempre. È deformazione professionale.','Buon calcio a tutti. Se piove, controllate il tetto. Spoiler: perde.'],
 il_super_tifoso:['Oggi tifo {sq}. Se perde, cambio squadra in diretta. {#}','Oggi sono tutto per {top}. Fino a fischio finale. Poi vediamo.'],
 nonno_cesare:['Oggi si gioca. Ai miei tempi la domenica era sacra: messa, pranzo, partita. Ora è solo notifiche.','Oggi spero che {sq} faccia un bel gioco. Se perde, ho sempre l\'arbitro da incolpare.','Preparo la radiolina. Il telefono non mi ascolta. {#}'],
 tifoso_arrabbiato:['OGGI CAMBIO TUTTO se {sq} non gioca bene. Allenatore compreso. {#}','Spero che oggi {gio} faccia qualcosa. Qualsiasi cosa. Anche un passo.','Giornata di campionato: ansia, caffè e voglia di urlare. In quest\'ordine.'],
 mister_divano:['Oggi guardo la giornata dal divano. Posizione ottimale per leggere il gioco. {#}','Per {sq} consiglio un 4-3-3 aggressivo. Se perde era colpa del 4-4-2. Mai del 4-3-3.','Il segreto per oggi è la compattezza tra le linee. Il segreto per me è il telecomando.'],
 radio_spogliatoio:['Oggi giornata importante. Dicono che {sq} abbia lavorato bene in settimana. Dicono.','Fonti non verificate: in {sq} stasera c\'è tensione. O fame. Non si capisce. {#}','Clima in spogliatoio sereno. Il capitano è nervoso ma lo nasconde bene. Non mi crede nessuno.'],
 mamma_di_capitan:['Oggi mio figlio gioca. Gli ho preparato il panino. Non capisce ma lo mangia. {#}','Spero che {sq} oggi faccia bene. E che mio figlio si copra, c\'è corrente.','Giornata di campionato: ho già acceso tre ceri e un cero extra. Per sicurezza.'],
 ex_ds_provincia:['Giornata di campionato: spero che {sq} giochi con equilibrio. Ho visto cose peggiori.','Oggi si decide il futuro di tanti. Anche del mio telefono: nessuno mi richiama. {#}','Fiducia in {sq}. Quanto basta per non dirlo a voce alta.'],
 var_parlante:['Oggi monitoro la giornata. Qualsiasi contatto sarà analizzato. Anche il saluto iniziale.','Spero che oggi nessuno tocchi {gio} in area. Mi viene il mal di testa. {#}','Revisione dell\'umore di oggi: moderatamente ottimista. Verifica in corso.'],
 fc27_ratings:['Oggi {gio} gioca. Spero che il suo overall regga alla pressione. {#}','Aggiornamento giornata: nessun aggiornamento. Ma il livello di sudore virtuale è alto.','Il mio auspicio per oggi: un gol di {sq} e un -2 a {sq2}. Matematica elementare.'],
 il_cugino_del_dt:['Mio cugino mi ha detto che oggi {sq} è carica. Sono parole del DT. O sue. Non ricordo.','Oggi tifo {sq} ma lo dico sottovoce. In famiglia ci sono più allenatori che divani.','Prima della giornata: nessuna novità. Ma voi non dite che ve l\'ho detto io.'],
 telecronista_stanco:['Oggi giornata di campionato. Cercherò di restare sveglio fino all\'intervallo. {#}','{sq} sembra in forma. O forse sono io che ho dormito poco.','Bentornati. Anche oggi si gioca. Anche oggi, purtroppo, parlo io.'],
 gufo_professionista:['Oggi gufo con grande rispetto. Per {sq} un po\' meno. {#}','Il mio obiettivo di oggi: che {sq2} faccia solo un punto. Più o meno.','Giornata di campionato: gufata pronta, spero di non dover usare gli straordinari.'],
 il_filosofo_del_pallone:['Si gioca. Il pallone gira. E noi, con lui. {#}','Che cos\'è una giornata? Un\'attesa con un pallone dentro. Buona giornata a {sq}.','Oggi {gio} dovrà scegliere: segnare o non segnare. L\'eterno dilemma.'],
 bomber_da_bar:['Oggi gioco io. Se mi chiamano. Nel frattempo tifo {sq}. {#}','Vi ricordo che al bar ho segnato 19 gol in una sera. Spero che {gio} faccia lo stesso.','Giornata di campionato: pronto al colpo di tacco. Quello vero lo faccio solo dal divano.'],
 statistico_folle:['Probabilità che oggi {sq} segni: 63%. Che la tv funzioni: 61%. Che io dorma: 4%. {#}','Dati di oggi: il 100% dei fantallenatori è in ansia. Il restante 0% non esiste.','Secondo il mio modello, {sq} oggi ha il 58% di fare bene. E il 51% di fare male.'],
 arbitro_in_pensione:['Oggi sarebbe stata una bella giornata da arbitro. Fischietto in tasca, per sicurezza. {#}','Spero che oggi i direttori di gara siano sereni. Io lo ero. Poi ho smesso.','Giornata di campionato: ricordate di rispettare il fischio finale. Anche quello di casa.']
};

/* Allenatori: i nomi piccoli sotto le squadre. Leanzino & Mario allenano in due. */
var MISTER={'Oranje VC':'DJ Cst Brazil','AFA SELECCION':'Maria','Apo team':'apo','Atletico ma non troppo':'Riccardo','Grodah':'RikyArma','Mariana Coneja':'Mark Lenders','Real Madrink':'AndrewTT','stif dc':'stifson','The Blue brothers':'Leanzino e Mario','WOA':'ser'};
var DUO='The Blue brothers';
var MA=['Se {sq} continua così, {all} farebbe bene a ripensarci. Ci siamo capiti.','{all} ha il fisico per allenare {sq}. Il resto lo mettiamo noi dal divano.','Chiedo ufficialmente: {all} resta alla guida di {sq}? Rispondete in massa.','Il presidente di {sq} sta valutando se confermare {all}. Fonti vicine al bar.','Dopo questa giornata, {all} merita la conferma. Fatelo contento, ve lo dico io.','{all} ha cambiato il modulo di {sq}? Allora è una svolta. O una disperazione.','Voci di esonero per {all} su {sq}. Smentite? No, solo silenzio.','Se {all} lascia {sq}, qualcuno ci penserà. Io, con piacere, no.','Bravo {all}: {sq} ha {pt} punti e un\'idea. Raro. {#}','Tutti a dire che {all} sia in bilico. Io dico: lasciatelo lavorare. Per ora. {#}','{all} allena {sq} come un vero professionista. Quasi.','Mandare via {all} da {sq}? Non è il momento. Forse domani.'];
var MAD=['In due non si fa un allenatore buono. Nemmeno {all} con {sq}. {#}','{all} hanno fatto la formazione di {sq} in due. Si vede. In che senso, non lo dico.','Bravi {all}: {sq} ha {pt} punti. Merito di entrambi. O di nessuno dei due.','Due allenatori su {sq} e nessuno ha visto il 5,5. Capita. {#}','{all}: uno dice 4-3-3, l\'altro dice 3-5-2. Alla fine esce un 4-4-2 per sbaglio.','Che bello vedere {all} litigare sulla formazione di {sq}. Il fantacalcio è anche questo.','Se {all} vincono, il merito è di entrambi. Se perdono, è sempre dell\'altro.','{sq} con {all} in panchina: due teste, un solo voto. Ci siamo. {#}','Complimenti a {all}: bravi, in due è tutto più facile. Ma bravi. {#}','Chi decide la formazione di {sq}? {all} dicono "insieme". Credo a metà.'];
var DUORISP=['eh, vabbeh, in due è tutto più facile','in due però vale doppio l\'errore','uno dei due ha sbagliato. non dico chi','eh, in due è dura sbagliare. eppure','bravi, ma in due è tutto più facile','il vero allenatore è il terzo che non si è presentato','almeno si dividono la colpa','quello dei due che ha scelto {gio}, si faccia avanti'];

/* Ciro Trattativa: consigli di mercato dai dati veri (svincolati, medie, presenze) */
var RUO={P:'portiere',D:'difensore',C:'centrocampista',A:'attaccante'};
var MKG=['👀 {gio} ({ruolo}, {sa}): {pg} presenze, media {fmv}, {ga}. In Lega è ancora svincolato. Io un pensierino lo farei. {#}','👀 Occhio a {gio} ({sa}): media {fmv} in {pg} presenze, {ga}. Nessuno lo ha preso. Strano. {#}','Segnatevelo: {gio}, {ruolo} del {sa}. Media {fmv} in {pg} presenze e {tit}. Ancora libero. 👀 {#}','👀 Svincolato di giornata: {gio} ({sa}), {ruolo}. {pg} presenze, media {fmv}, {ga}. Poi non dite che non vi avevo avvisato. {#}'];
var MKS=['👀 {sq}: {out} ({of}) rende meno di {gio} ({fmv}), ancora svincolato in Lega. Un giro lo farei. {#}','👀 Consiglio per {sq}: {gio} ({sa}) ha media {fmv} e nessuno lo ha preso. {out} ({of}) può fare spazio? {#}','Mercato: a {sq} servirebbe {gio} ({fmv} di media, svincolato). {out} per ora fa {of}. Pensateci. 👀 {#}'];
var MKR={d:['Concordo. Lo dico da settimane.','Preso subito, se solo avessi un posto libero.','Ciro per una volta ci ha preso.','Segnato. Se lo prendete voi, io lo scambio.','Giusto, ma con quella media durerà poco.'],n:['Ma {gio}? Con quei voti? Dai.','Io non lo prenderei nemmeno gratis.','Poche presenze non fanno una stagione.','Media gonfiata da un bonus. Fidatevi.','Ciro, hai bevuto?'],p:['Sei pazzo, {gio} è un bidone travestito.','Mi sa che Ciro ha il cugino che lo rappresenta.','Chi lo prende, poi non venga a piangere.','Se {gio} fa tanto, mi mangio la tastiera.','Fonti vicine al bar confermano: è un colpo di fortuna.']};
function mercato(D,SQ,g,dd,ms){
 var r=prng('mk'+g),FA=D.fa||[],PS=D.ps||{},P=D.P||{},FS=D.fas||{},inj={};(D.inj||[]).forEach(function(i){inj[i.id]=1});
 var cand=FA.filter(function(id){var s=PS[id],f=FS[id];return s&&P[id]&&!inj[id]&&(s.fmv||0)>=7&&(s.pg>=3||(s.pg>=2&&f&&f.tit>=2))}).sort(function(a,b){return PS[b].fmv-PS[a].fmv}).slice(0,10);
 if(!cand.length)return null;
 var id=cand[Math.floor(r()*cand.length)],s=PS[id],f=FS[id]||{},pl=P[id],c={gio:pl.n,sa:pl.t,ruolo:RUO[pl.r]||'giocatore',pg:s.pg,fmv:String(s.fmv).replace('.',','),tit:((f.h||'').replace(/[^T]/g,'').length?(f.h||'').replace(/[^T]/g,'').length+' titolarità nelle ultime 5':'sempre in panchina nelle ultime 5')},gv=[];
 if(s.g)gv.push(s.g+(s.g===1?' gol':' gol'));if(s.as)gv.push(s.as+(s.as===1?' assist':' assist'));c.ga=gv.length?gv.join(' e '):'zero bonus ma voti solidi';
 var spec=r()<0.55,tpl=pick(r,MKG),best=null;
 if(spec){var cs=SQ.filter(function(q){return q!==DUO||true});shuffle(r,cs).some(function(sq){var t=(D.teams||[]).filter(function(x){return x.name===sq})[0];if(!t)return false;var w=null;(t.pl||[]).forEach(function(q){var ps=PS[q.id],pp=P[q.id];if(ps&&pp&&pp.r===pl.r&&ps.pg>=3&&(ps.fmv||0)<=s.fmv-1.2&&(!w||ps.fmv<w.f))w={n:pp.n,f:ps.fmv}});if(w){best={sq:sq,out:w.n,of:String(w.f).replace('.',',')};return true}return false})}
 if(best){c.sq=best.sq;c.out=best.out;c.of=best.of;tpl=pick(r,MKS)}
 var tag=r()<0.4?'Mercato':'Svincolati';
 var T=ts(dd.y,dd.mo,dd.d,10+Math.floor(r()*2),Math.floor(r()*60));if(T>ms)return null;
 var p={k:'mk:'+g,a:'ciro_trattativa',x:riempi(tpl,c,tag),ts:T,r:[],cx:c},n=2+Math.floor(r()*3),ord=shuffle(r,AUTORI.filter(function(a){return a!=='ciro_trattativa'}));
 for(var i=0;i<n;i++){var kind=r(),cat=kind<0.4?'d':kind<0.75?'n':'p',x=riempi(pick(r,MKR[cat]),c,null),au;if(r()<0.45){var cu=comune(r);au=cu[0];x=x.charAt(0).toLowerCase()+x.slice(1)}else au=ord[i];
  var tt=T+(8+Math.floor(r()*150))*60000;if(tt<=ms)p.r.push({a:au,x:natura(x,'mkr'+g+i,au),ts:tt})}
 p.r.sort(function(a,b){return a.ts-b.ts});var cn=conta(p.k,1.6);p.ap=cn.ap;p.ril=cn.ril;p.v=cn.v;return p}
/* Motore degli scambi: copia identica di quello dello Spogliatoio (index.html), così le percentuali coincidono. */
function scambiMotore(D){
var MODS={'3-5-2':[3,5,2],'4-4-2':[4,4,2],'4-3-3':[4,3,3],'3-4-3':[3,4,3],'4-5-1':[4,5,1],'5-3-2':[5,3,2],'5-4-1':[5,4,1],'3-4-1-2':[3,5,2]};
var MKSTRICT=true;
function P(id){var p=D.P[id]||{n:'?',t:'',r:'C',p:'',q:0,f:0};return p}
function nxt(id){var s=(D.st||{})[id];return s?s:{s:'P'}}
function pct(id){var s=(D.ps||{})[id];if(s&&s.pct!=null&&nxt(id).s!=='I')return s.pct;return {T:95,B:60,R:40,D:30,P:10,I:5}[nxt(id).s]}
function roleBase(){var s={P:[0,0,0],D:[0,0,0],C:[0,0,0],A:[0,0,0]};Object.keys(D.ps||{}).forEach(function(id){var q=D.ps[id],p=P(id);if(p&&s[p.r]&&q.fmv!=null&&q.pg>=3){s[p.r][0]+=q.fmv;s[p.r][1]++;s[p.r][2]+=(q.mv!=null?q.mv:q.fmv)}});var b={mv:{}};['P','D','C','A'].forEach(function(r){b[r]=s[r][1]?s[r][0]/s[r][1]:6;b.mv[r]=s[r][1]?s[r][2]/s[r][1]:6});return b}
function mvEff(p,rb){var q=(D.ps||{})[p.id]||{},n=q.pg||0,b=rb.mv[p.r];return q.mv!=null?(q.mv*n+b*3)/(n+3):b}
function cdf(z){var t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),q=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-q:q}
function modBonus(mu){var F=function(x){return cdf((x-mu)/.4)};return 1*(F(6.25)-F(6))+1.5*(F(6.5)-F(6.25))+2*(F(6.75)-F(6.5))+3*(F(7)-F(6.75))+6*(1-F(7))}
function mkVals(T,hz,rb,mf){
  var out=T.pl.map(function(x){var id=String(x.id),p=P(id),q=(D.ps||{})[id]||{},n=q.pg||0,b=rb[p.r],pc=pct(id)/100,s=nxt(id).s;
    var yl=(D.ly||{})[id],wy=yl?yl[0]/(yl[0]+12):0,lf=yl?(yl[2]*yl[0]+b*6)/(yl[0]+6):b,pb=b+(lf-b)*wy*0.5,fb=q.fmv!=null?(q.fmv*n+pb*3)/(n+3):pb,eb=pc*fb;
    var pr0=b*(0.88+0.24*Math.min(1,0.5*(p.f||0)/mf[p.r]+0.5*(p.q||0)/mf.q[p.r])),prior=wy*lf+(1-wy)*pr0,fl=q.fmv!=null?(q.fmv*n+prior*8)/(n+8):prior,qr=Math.min(1,0.3+0.7*(p.q||0)/mf.q[p.r]),pp=yl?0.7*Math.min(1,yl[0]/34)+0.3*qr:qr,el=(0.7*pc+0.3*pp)*fl;
    return {id:id,r:p.r,f:p.f||0,m:mvEff(p,rb),q:hz==='b'?0.8*fb+0.2*fl:fl,e:hz==='b'?0.8*eb+0.2*el:el}});
  var gk=out.filter(function(v){return v.r==='P'}).sort(function(a,b){return b.e-a.e});if(gk[2])gk[2].third=true;
  return out;
}
function mkTeam(vals){
  var by={P:[],D:[],C:[],A:[]},i,best=-1;
  for(i=0;i<vals.length;i++)by[vals[i].r].push(vals[i]);
  ['P','D','C','A'].forEach(function(k){by[k].sort(function(a,b){return b.e-a.e})});
  var M=['3-5-2','4-4-2','4-3-3','3-4-3','4-5-1','5-3-2','5-4-1'];
  for(var mi=0;mi<7;mi++){var m=MODS[M[mi]],need={D:m[0],C:m[1],A:m[2]},t=0,k,j;
    if(by.P[0])t+=by.P[0].e;
    for(k in need)for(j=0;j<need[k]&&j<by[k].length;j++)t+=by[k][j].e;
    if(m[0]>=4&&by.P.length&&by.D.length>=4){var ds=by.D.slice(0,m[0]).map(function(v){return v.m}).sort(function(a,b){return b-a});t+=modBonus((by.P[0].m+ds[0]+ds[1]+ds[2])/4)}
    for(k in need){if(by[k][need[k]])t+=0.12*by[k][need[k]].q;if(by[k][need[k]+1])t+=0.05*by[k][need[k]+1].q}
    if(by.P[1])t+=0.06*by.P[1].q;
    if(t>best)best=t}
  return best;
}
function mkComb(a,k,fn,i,cur){if(cur.length===k){fn(cur);return}for(var j=i;j<a.length;j++){cur.push(a[j]);mkComb(a,k,fn,j+1,cur);cur.pop()}}
function mkPair(A,B){
  var vA=mkTeam(A),vB=mkTeam(B),out=[];
  var tA=A.filter(function(x){return !x.third}),tB=B.filter(function(x){return !x.third});
  function cand(S,own,oth,vS,vO){return S.map(function(p){return {p:p,s:(mkTeam(oth.concat(p))-vO)-(vS-mkTeam(own.filter(function(y){return y!==p})))}}).sort(function(a,b){return b.s-a.s}).map(function(x){return x.p})}
  var gc=cand(tA,A,B,vA,vB),rc=cand(tB,B,A,vB,vA);
  function cnt(S){var c={P:0,D:0,C:0,A:0};S.forEach(function(v){c[v.r]++});return c}
  var cA=cnt(A),cB=cnt(B),LIM={D:[6,10],C:[6,10],A:[4,8]};
  [[1,9],[2,9],[3,7]].forEach(function(kn){var k=kn[0];
    mkComb(gc.slice(0,kn[1]),k,function(G0){var G=G0.slice(),dg=cnt(G),sg=0;G.forEach(function(v){sg+=v.f});
      mkComb(rc.slice(0,kn[1]),k,function(R){var dr=cnt(R),sr=0,eR=0,eG=0,ok=dg.P===dr.P,r;if(!ok)return;
        for(r in LIM){if(MKSTRICT?dg[r]!==dr[r]:(cA[r]-dg[r]+dr[r]<LIM[r][0]||cA[r]-dg[r]+dr[r]>LIM[r][1]||cB[r]+dg[r]-dr[r]<LIM[r][0]||cB[r]+dg[r]-dr[r]>LIM[r][1]))return}
        R.forEach(function(v){sr+=v.f;eR+=v.e});G.forEach(function(v){eG+=v.e});if(eG<0.75*eR||eR<0.75*eG)return;if(sr>1.4*sg+3||sg>1.4*sr+3)return;
        var A2=A.filter(function(x){return G.indexOf(x)<0}).concat(R),B2=B.filter(function(x){return R.indexOf(x)<0}).concat(G);
        var gA=mkTeam(A2)-vA,gB=mkTeam(B2)-vB;
        if(gA>=0.05&&gB>=-0.1)out.push({G:G,R:R.slice(),k:k,gA:gA,gB:gB})},0,[])},0,[])});
  return out;
}
function mkConv(g){return Math.round(100/(1+Math.exp(-g/0.6)))}
function mkPick(list){
  var used={},res=[];
  function free(x){return x.G.concat(x.R).every(function(v){return !used[v.id]})}
  function take(x,kind){x.G.concat(x.R).forEach(function(v){used[v.id]=1});x.kind=kind;res.push(x)}
  var mir=list.filter(function(x){return x.gA>=0.05&&x.gB>=0.05&&Math.min(x.gA,x.gB)/Math.max(x.gA,x.gB)>=0.3});
  mir.forEach(function(x){x.s=Math.min(x.gA,x.gB)+0.3*Math.max(x.gA,x.gB)-0.05*(x.k-1)});
  mir.sort(function(a,b){return b.s-a.s});var n=0;
  mir.forEach(function(x){if(n<2&&free(x)){take(x,'m');n++}});
  var per=list.filter(function(x){return x.gA>=0.1&&x.gB>=-0.1});
  per.forEach(function(x){x.s=x.gA+Math.min(0,x.gB)*2-0.05*(x.k-1)});
  per.sort(function(a,b){return b.s-a.s});n=0;
  per.forEach(function(x){if(n<2&&free(x)){take(x,'p');n++}});
  return res;
}
function mkGain(Ab,Bb,G,R){
  function sel(S,a,b){return S.filter(function(x){return a.indexOf(x.id)<0}).concat(S===Ab?R2(Bb,b):R2(Ab,b))}
  function R2(S,ids){return S.filter(function(x){return ids.indexOf(x.id)>=0})}
  var A2=Ab.filter(function(x){return G.indexOf(x.id)<0}).concat(R2(Bb,R)),B2=Bb.filter(function(x){return R.indexOf(x.id)<0}).concat(R2(Ab,G));
  return {gA:mkTeam(A2)-mkTeam(Ab),gB:mkTeam(B2)-mkTeam(Bb)};
}
function mkSc(g){return g.gA>=0.05&&g.gB>=0.05?Math.min(g.gA,g.gB)+0.3*Math.max(g.gA,g.gB)+1:g.gA+2*Math.min(0,g.gB)}
function mkLab(a,b){var pa=mkConv(a),pb=mkConv(b);return a>=0.05&&b>=0.05?(Math.abs(pa-pb)<=10?'Equilibrato':pa>pb?'Conviene a entrambi, a te di più':'Conviene a entrambi, a lui di più'):a>=0.05?(b>=-0.02?'Più per te, lui resta pari':b>=-0.3?'Per te, lui ci perde poco':'Per te, lui ci perde'):b>=0.05?(a>=-0.02?'Più per lui, tu resti pari':'Per lui, tu ci perdi'):a>-0.05&&b>-0.05?'Alla pari':'Non conviene a nessuno'}
function coppia(nA,nB){
 var TA=(D.teams||[]).filter(function(t){return t.name===nA})[0],TB=(D.teams||[]).filter(function(t){return t.name===nB})[0];if(!TA||!TB)return[];
 var rb=roleBase(),mf={P:1,D:1,C:1,A:1,q:{P:1,D:1,C:1,A:1}};Object.keys(D.P).forEach(function(i){var p=D.P[i];if((p.f||0)>mf[p.r])mf[p.r]=p.f;if((p.q||0)>mf.q[p.r])mf.q[p.r]=p.q});
 var Ab=mkVals(TA,'b',rb,mf),Al=mkVals(TA,'l',rb,mf),Bb=mkVals(TB,'b',rb,mf),Bl=mkVals(TB,'l',rb,mf),seen={},L=[];
 [[Ab,Bb],[Al,Bl]].forEach(function(ab){mkPick(mkPair(ab[0],ab[1])).forEach(function(x){
  var G=x.G.map(function(v){return v.id}),R=x.R.map(function(v){return v.id}),k=G.slice().sort().join(',')+'>'+R.slice().sort().join(',');if(seen[k])return;seen[k]=1;
  function es(V,W,ids){var t=0;ids.forEach(function(i){var v=V.concat(W).filter(function(y){return y.id===i})[0];t+=v?v.e:0});return t}
  L.push({G:G,R:R,k:x.k,b:mkGain(Ab,Bb,G,R),l:mkGain(Al,Bl,G,R),rb:es(Ab,Bb,G)/es(Ab,Bb,R)})})});
 var out=L.map(function(x){var g=x.b;return {G:x.G,R:x.R,k:x.k,gA:g.gA,gB:g.gB,oA:x.l.gA,oB:x.l.gB,s:mkSc(g),q:x.rb}}).filter(function(x){return x.gA>0.05&&x.gB>=-0.1&&x.q>=0.75&&x.q<=1.34}).sort(function(a,b){return b.s-a.s});
 return out}
return {coppia:coppia,conv:mkConv,lab:mkLab}}

/* Ciro commenta gli scambi possibili tra le squadre, una coppia per volta */
var SWC={},SWM=null;
var SWB=["🤝 Scambio che approvo: {sa} dà {g} a {sb} e riceve {r}. Convenienza: {sa} {pa}%, {sb} {pb}%. Raro: qui vincono tutti e due. {#}","Ho fatto due conti sulle rose. {sa} e {sb}: {g} contro {r}. Convenienza {pa}% per {sa}, {pb}% per {sb}. Io lo firmerei. Voi? {#}","📊 Da tenere d'occhio: {sa} ({g}) e {sb} ({r}). Dai numeri conviene a entrambi: {pa}% e {pb}% di convenienza. Chi alza il telefono per primo? {#}"];
var SWU=["{ca}, qui potete far cassa: {g} a {sb} per {r}. Convenienza {pa}% per voi, {pb}% per {sb}. Io ci penserei. {#}","🚨 Occhio {sb}: {sa} potrebbe proporvi {g} per {r}. Convenienza {pa}% per loro, {pb}% per voi. Non è un regalo, ma nemmeno una truffa. {#}","Scambio possibile tra {sa} e {sb}: {g} per {r}. Convenienza: {sa} {pa}%, {sb} {pb}%. Se fossi {sb}, ci dormirei sopra. {#}"];
var SWN=["Ho passato al setaccio la rosa di {sa} con tutte le altre: nessuno scambio davvero utile oggi. Meglio tenersi i giocatori che si hanno. {#}","{ca}, buone notizie: la rosa regge. Brutte notizie: nessuno scambio con le altre squadre conviene davvero. Non forzate il mercato. {#}"];
var SWM2=["{sa} e {sb}: {g} per {r}. Conviene a entrambi, ma non allo stesso modo: {pa}% per {sa}, {pb}% per {sb}. {top} ci guadagna parecchio di più. {#}","📊 Scambio {sa}-{sb}: {g} per {r}. Tutti e due ne escono meglio, ma {top} ({pt}%) molto più di {low} ({pl}%). Chi guadagna di più dovrebbe offrire qualcosa. {#}","Occhio, {low}: lo scambio {g} per {r} conviene a tutti e due, però a {top} molto di più ({pt}% contro {pl}%). Si può fare, ma non regalate niente. {#}"];
var SWR={m:["{low}, ti conviene ma meno che all'altro: tratta, non accettare al primo prezzo.","{top} sta già festeggiando, {low} ha capito poco.","Va bene per tutti, ma c'è chi vince e chi vince di meno.","Convenienza {pt}% contro {pl}%: fate voi i conti, ma io tratterei.","{ca}, chiedete qualcosa in più e ci siamo."],b:["{sb} accetta e io mi prendo i pop corn.","Troppo bello per essere vero. Dov'è la fregatura?","Ciro che approva uno scambio: segno la data sul calendario.","Già immagino il gruppo WhatsApp che esplode.","Ora qualcuno deve avere il coraggio di chiamare."],u:["{sb}, non firmare: ti stanno fregando!","Se {sb} accetta lo scambio, chiamo il garante.","Con una convenienza del {pb}% per {sb}, il \"ci penso\" sarà molto lungo.","{ca}, ti stanno chiedendo {r} a prezzo di saldo?","Per {sa} un affare. Per gli altri, boh."],n:["Allora meglio non fare niente, come sempre.","Ciro che consiglia di non fare niente: il suo consiglio migliore.","Io intanto continuo a sperare in uno scambio con {sb}."]};
function swFm(D,id){var q=(D.ps||{})[id]||{},p=(D.P||{})[id]||{n:'?'};return p.n+(q.fmv!=null?' (FM '+String(q.fmv.toFixed?q.fmv.toFixed(2):q.fmv).replace('.',',')+(q.pg?', '+q.pg+' pres.':'')+')':'')}
function elenco(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' e '+a[a.length-1]}
function scambiPost(D,SQ,g,dd,ms,ore){
 var r=prng('sw'+g),M=SWM||(SWM=scambiMotore(D)),key=(D.updated||'')+'|'+D.round,ord=shuffle(prng('swo'),SQ.slice()),n=ord.length,best=null,sa=null,k,j;
 var ck=function(a,b){var kk=key+'|'+a+'|'+b;return SWC[kk]||(SWC[kk]=M.coppia(a,b))};
 for(k=0;k<Math.min(3,n)&&!best;k++){sa=ord[(g+k)%n];var bs=null;
  var cs=[];SQ.forEach(function(sb){if(sb===sa)return;var L=ck(sa,sb);if(L.length)cs.push({sb:sb,x:L[0]})});cs.sort(function(a,b){return b.x.s-a.x.s});if(cs.length)bs=cs[Math.floor(prng('swp'+g)()*Math.min(2,cs.length))];
  if(bs){best=bs;break}}
 var T=ts(dd.y,dd.mo,dd.d,ore,Math.floor(r()*50));if(T>ms)return null;
 var sb2=pick(r,SQ.filter(function(q){return q!==ord[g%n]})),c,tx,thr=[],cat;
 if(!best){sa=ord[g%n];c={sa:sa,sb:sb2,ca:MISTER[sa]||sa};tx=riempi(pick(r,SWN),c,'Scambi');cat='n';thr=['Ho confrontato titolarità, medie fantavoto e presenze di ogni giocatore con quelle delle altre rose. Nessuna coppia migliora entrambe le squadre. Passate, c\'è un\'altra giornata.']}
 else{var x=best.x,pa=M.conv(x.gA),pb=M.conv(x.gB),oa=M.conv(x.oA),ob=M.conv(x.oB),bal=x.gA>=0.05&&x.gB>=0.05&&Math.abs(pa-pb)<=10,mix=x.gA>=0.05&&x.gB>=0.05&&!bal;cat=bal?'b':mix?'m':'u';
  c={sa:sa,sb:best.sb,ca:MISTER[sa]||sa,g:elenco(x.G.map(function(i){return D.P[i].n})),r:elenco(x.R.map(function(i){return D.P[i].n})),pa:pa,pb:pb,top:pa>pb?sa:best.sb,low:pa>pb?best.sb:sa,pt:Math.max(pa,pb),pl:Math.min(pa,pb)};
  tx=riempi(pick(r,bal?SWB:mix?SWM2:SWU),c,'Scambi');
  thr=['Perché: per '+sa+' entrano '+x.R.map(function(i){return swFm(D,i)}).join(', ')+'. Escono '+x.G.map(function(i){return swFm(D,i)}).join(', ')+'. Il saldo sulla formazione migliora senza toccare i ruoli.','Lato '+best.sb+': arrivano '+x.G.map(function(i){return swFm(D,i)}).join(', ')+'. '+(bal?'Resa in crescita anche per loro, in modo simile.':mix?'Resa in crescita anche per loro, ma molto meno: '+c.top+' guadagna di più.':'Resa quasi invariata: per loro non è un affare, ma nemmeno un danno.')+' Nel lungo periodo: '+sa+' '+oa+'%, '+best.sb+' '+ob+'%.']}
 var p={k:'sw:'+g,a:'ciro_trattativa',x:tx,thr:thr,ts:T,r:[],cx:c},nr=2+Math.floor(r()*3),ordA=shuffle(r,AUTORI.filter(function(a){return a!=='ciro_trattativa'}));
 var rl=shuffle(r,SWR[cat].slice());for(var i=0;i<nr&&i<rl.length;i++){var xx=riempi(rl[i],c,null),au;if(r()<0.4){var cu=comune(r);au=cu[0]}else au=ordA[i];var tt=T+(8+Math.floor(r()*150))*60000;if(tt<=ms)p.r.push({a:au,x:natura(xx,'swr'+g+i,au),ts:tt})}
 p.r.sort(function(a,b){return a.ts-b.ts});var cn=conta(p.k,1.8);p.ap=cn.ap;p.ril=cn.ril;p.v=cn.v;return p}
/* Utenti qualunque: nomi a caso, toni diversi */
var COMUNI=[['fabrizio99','fabrizio99','s'],['errfantastico','ErrFantastico','i'],['ilbiscio','ilbiscio','c'],['giorgio_1987','giorgio_1987','g'],['xx_tommy_xx','xX_Tommy_Xx','s'],['la_pina','la_pina','g'],['marcorossi','MarcoRossi','p'],['superpippo','SuperPippo','s'],['ilgrandeste','ilGrandeSte','a'],['nicolino_','nicolino_','n'],['davide_ac','davide_ac','p'],['fantaguru88','FantaGuru88','i'],['roberta72','roberta72','g'],['il_lungo','il_lungo','c'],['kekko_','kekko_','s'],['mirko','mirko','a'],['antoniettab','AntoniettaB','g'],['gigi_er_mejo','Gigi_Er_Mejo','s'],['lucathebest','LucaTheBest','p'],['bbq_enjoyer','bbq_enjoyer','s'],['alepizza','alepizza','n'],['therealsandro','TheRealSandro','c'],['pino_arrosto','pino_arrosto','s'],['zio_beppe','zio_Beppe','n'],['chiarafanta','ChiaraFanta','g'],['il_carletto','il_carletto','a'],['maxpower','MaxPower','p'],['donrodrigo','DonRodrigo','i'],['tizio_a_caso','tizio_a_caso','s'],['sandokan79','sandokan79','c']];
var SECONDO={s:'sa',i:'ig',c:'cp',g:'gs',p:'pc',n:'ns',a:'as'};
COMUNI.forEach(function(u){u[2]=SECONDO[u[2]]||u[2]});
var TONI={
 s:['ho messo {gio} perché ha il nome simpatico. vediamo','qualcuno mi spiega come si cambia il modulo','oggi pizza e fantacalcio. la vita è bella','ma {sq} gioca di sabato o di domenica? chiedo per un amico','non ho capito niente ma mi sto divertendo','ho dimenticato la formazione. di nuovo. che bello','chi è {gio}? scherzo, lo so. forse','se vinco offro io. se perdo non mi cercate','il mio capitano è in panchina. e io sono sul divano. coerenza','oggi ho chiesto al mio gatto di scegliere la formazione. {sq2} non ha vinto, lui sì'],
 i:['Il punto non è chi vince la giornata, ma chi sbaglia meno le scelte in panchina. Il fantacalcio è gestione del rischio.','La differenza la fa la continuità di rendimento, non il bonus occasionale. Sempre.','Attenzione ai turnover: {gio} ha giocato troppo e il rendimento cala dopo tre partite ravvicinate.','A fine stagione vincerà chi avrà evitato i grandi errori, non chi avrà azzeccato quelli grandi.','Ogni formazione è una scommessa sul tempo: quanto vale un titolare oggi rispetto a domani?','Chi guarda solo la media voto sbaglia: conta la varianza. {gio} ne è un esempio.'],
 c:['ma {sq} gioca con i piedi o con le mani?','chi ha consigliato {gio} a {sq} deve spiegare','la formazione di {sq} sembra scelta da un gatto','certi allenatori andrebbero mandati in pensione. subito','{sq2} è fortunata. solo fortunata','se questa è una squadra io sono un astronauta','bravi a dare i voti dal divano. a giocare però siamo tutti uguali','quella formazione l\'avrei fatta meglio io con gli occhi chiusi','{gio} è sopravvalutato. lo dico io che sono prudente','non capisco perché si parli ancora di {sq}. ha giocato male e basta'],
 g:['complimenti a {sq}, bella stagione finora','forza {sq2}, dai che ce la fate!','bel campionato ragazzi, mi sto divertendo un sacco','buona giornata a tutti, che vinca il migliore (o il più fortunato)','grazie a tutti per i bei messaggi. siete una bella lega','in bocca al lupo a chi gioca oggi. a tutti, davvero','bellissimo vedere tutti questi commenti. questa lega è una famiglia','grazie al giornale per le pagelle di mercoledì. le leggo sempre per prime','ho vinto poco ma mi sono divertito tanto. è questo il fantacalcio','complimenti a chi ha organizzato tutto. davvero un bel lavoro'],
 p:['sempre i soliti a vincere. mah','questo regolamento va cambiato. lo dico da settimane','perché si perde sempre la domenica? è una cospirazione','il bonus capitano è troppo punitivo. punto','non mi trovo con le regole della coppa, ditelo se sbaglio','ho letto il regolamento due volte e ancora non capisco. dev\'essere colpa mia, o no?','la coppa dovrebbe avere regole più chiare. dico solo questo','troppe partite, troppi punti da ricontare. basta cambiare tutto ogni giornata','chi decide gli orari delle aste? vorrei parlare con questa persona'],
 n:['ricordo quando si giocava tutti alla stessa ora, la domenica alle 15','una volta il fantacalcio si faceva con carta e penna. ora ci sono le notifiche','bei tempi quando bastava leggere il giornale per fare la formazione','il primo fantacalcio l\'ho giocato nel 2004. ho perso. ma che bei ricordi','al bar la domenica si litigava per un voto. oggi si litiga per un emoji','mi manca il gazzettino con le pagelle ancora calde di inchiostro','mio nonno diceva che il calcio si guarda alla radio. aveva ragione','quando ho iniziato non c\'erano nemmeno i bonus. solo gol e pazienza'],
 a:['ho il cuore a mille. cambio formazione per la quarta volta','non riesco a guardare i risultati. li guardo. no, non li guardo','ho paura di tutto. soprattutto del 5,5','se {gio} non segna oggi mi viene un colpo','ansia da formazione. ansia da panchina. ansia da tutto','ho cambiato modulo ieri sera e non dormo ancora','non apro l\'app fino alle 19. lo giuro. forse. {#}','il capitano è un incubo. il vice è un incubo. la panchina è un incubo','ho sudato più io davanti al telefono che {gio} in campo']
};
/* Uscite fuori carattere: prima avvisano, poi dicono l'opposto di quello che dicono sempre */
var OPPOSTO={i:'s',s:'i',c:'g',g:'c',p:'g',n:'a',a:'i'};
var AVVISO={
 i:['Sapete come sono io, dico sempre cose giuste. Oggi però:','Di solito ragiono. Oggi no:','Non è da me, lo so, ma:'],
 g:['Oggi devo proprio sfogarmi:','Non è da me ma:','Per una volta non faccio il carino:','Scusate, oggi ho il nervoso:'],
 c:['Oggi devo proprio dare una nota positiva:','Oggi devo proprio complimentarmi:','Non crederete ai vostri occhi, ma:','Una volta ogni tanto:'],
 s:['Per una volta faccio il serio:','Oggi mi sento intelligente, ascoltate:','Fermi tutti, parlo seriamente:'],
 p:['Per una volta niente polemica:','Oggi sono d\'accordo con tutti, strano:','Pausa dalle lamentele:'],
 n:['Basta nostalgia, oggi si parla di adesso:','Una volta tanto guardo avanti:'],
 a:['Oggi sono incredibilmente calmo:','Respiro e dico:','Niente ansia, per oggi:']
};
var FUORI={
 tifoso_arrabbiato:['Oggi devo proprio dare una nota positiva: {sq} ha giocato bene. Lo dico una volta sola. Non abituatevi.','Oggi devo proprio complimentarmi con {sq2}. Mi sono scoppiate le vene dalla sorpresa.','Non è da me, ma: bel lavoro, {sq}. Sono stanco di essere arrabbiato, per oggi.'],
 nonno_cesare:['Devo ammetterlo, l\'app è comoda. Ai miei tempi no, ma ora sì. Non lo ripeto.','Oggi ho scoperto che {gio} è bravo. Mi ero sbagliato. Succede ogni vent\'anni.'],
 mister_divano:['Sapete come sono io: dico sempre che il modulo conta. Oggi ammetto che ha contato la fortuna.','Oggi parlo da persona normale: non so niente. Mi sto godendo il divano e basta.'],
 radio_spogliatoio:['Oggi niente voci, solo fatti: {sq} ha {pt} punti. Fine.','Non è da me, ma: oggi nessuna indiscrezione. Ho dormito poco e ho perso il filo.'],
 mamma_di_capitan:['Oggi devo proprio sfogarmi: basta, mio figlio ha sbagliato la formazione! Ma lo amo lo stesso.','Non è da me, ma: {sq} merita di perdere un po\'. Tanto poi gli faccio la torta.'],
 telecronista_stanco:['E ORA ATTENZIONE: {sq} CI PROVA! È l\'unica volta che alzo la voce, giuro.','Oggi sono carico, sveglio e pure felice. Non so cosa mi abbiano dato. {#}'],
 var_parlante:['Oggi niente analisi: mi sono emozionato. Succede.','Non è da me ma: oggi ho dato ragione a tutti. Anche al fallo che non c\'era.'],
 statistico_folle:['Oggi niente numeri. Solo sensazioni. {sq} mi piace e basta.','Non è da me, ma: ho spento il modello. Mi sembra una bella giornata.'],
 gufo_professionista:['Oggi tifo davvero per {sq}. Sinceramente. Non so cosa mi sia preso.','Non è da me: auguro il meglio a tutti. Anche a {sq2}. Anche a me.'],
 arbitro_in_pensione:['Devo ammetterlo: anche gli arbitri sbagliano. Lo dico io che ho sbagliato più di tutti.','Non è da me ma: oggi il fallo era netto. Netto davvero. Mi dispiace per voi.'],
 il_filosofo_del_pallone:['Basta filosofia, oggi parlo semplice: {sq} gioca bene. Fine.','Non è da me, ma: a volte un gol è solo un gol.'],
 il_cugino_del_dt:['Non è da me, ma ve lo dico: mio cugino non sa niente. Mai saputo.','Oggi parlo chiaro: mio cugino e {sq} non si parlano. È tutto qui.'],
 bomber_da_bar:['Per una volta ammetto: ho segnato 3 gol in 15 anni. Il resto era bar.','Non è da me, ma: {gio} è più forte di me. Un po\'.'],
 ex_ds_provincia:['Oggi parlo da DS vero: {gio} vale più di quanto pensiate. Ve lo dico gratis.','Devo ammetterlo: il mercato l\'ho sbagliato quasi sempre. Ma qualcosa ho azzeccato.']
};
var CREP=['lol','vero','ahahah','🤣🤣','no ma anche basta','concordo','boh io dico di no','top','che schifo','assolutamente sì','ma cosa dici?','bravo','potresti aver ragione','non so cosa dire. bravo comunque','ahah dai','ci sta','fortissimo','questa me la segno','🔥','mah. sarà'];

/* Risposte legate al contenuto del coro: argomento -> sentimento -> categoria -> neutre */
var RTOP=[
 [/arbitr|\bvar\b|rigor|fischi|moviola|fuorigioco|espuls/,['Con questo arbitro non vinciamo nemmeno al gioco dell\'oca.','Il VAR ha guardato. Ha visto. Ha deciso di no.','L\'arbitro ha sempre ragione, soprattutto quando sbaglia contro di noi.','Se non è rigore questo, il rigore cos\'è? Un\'opinione?','Moviola o no, la fischiata era già scritta.']],
 [/soldi|milion|costa|stipend|procurator|diritti tv|prezzo|ingaggi/,['Intanto il mio stipendio è fermo dal 2019.','Con quei soldi ci facevano tre ospedali. E un bar sport.','Il calcio è diventato un bilancio con due porte.','Mi paghi tu l\'abbonamento allora?']],
 [/stadi|bagni|tetto|curva nord|parcheggio|biglietto|code/,['I bagni dello stadio sono il vero test di resistenza.','Io lì ci vado solo per la birra. Il resto è un optional.','Hai dimenticato le scale da scalatore e la visuale da talpa.','Spoiler: il tetto perde anche quando non piove.']],
 [/divano|pigiama|poltrona|telecomando/,['Eh, per fortuna che quelli corrono e io sto sul divano.','Il divano è il vero campo da gioco: zero infortuni.','Anche io, solo che il mio divano ha le molle rotte.','Beato te. Io ho il turno domani.']],
 [/mercato|svincolat|trattativ|colpo|ceduto|acquist|scambio|offerta|rinforz/,['Ma chi lo compra davvero? Io no di sicuro.','Io lo avrei preso a zero, ma nessuno mi ascolta.','Ciro lo sa già da tre giorni, vedrai.','Se arriva lui cambio squadra. Anzi no.','Prima o poi lo prendo anche io. Un giorno. Forse.']],
 [/pagell|\bvoto|\bvoti|media|fantavoto|bonus|malus/,['Il vero voto lo dà il mio umore, e oggi è un 5.','Con quel voto il fantacalcio ti prende in giro.','Sei politico. Come i voti del Giornale.','Un 6 dato col cuore, non con la testa.']],
 [/classifica|primo posto|primi|ultimo posto|punti|scudetto|vetta|zona/,['La classifica è corta, poi si decide tutto all\'ultimo.','Ci sto male. Ma lunedì si ricomincia.','Finché dura, godiamocela.','Tanto alla fine vince sempre chi ha il cambio di modulo giusto.']],
 [/infortun|squalific|stira|out\b|lesion|indisponib|dubbio/,['Ci mancava solo questa.','Guarisce presto, poi si vedrà in che stato.','E noi che lo avevamo messo capitano.','Vabbè, dai: avevamo il piano B. Cioè niente.']],
 [/portier|difens|centrocamp|attacc|bomber|punta|rigorista|capitan/,['Se segna ancora lo faccio santo.','Io il portiere lo metterei in panchina e via.','Lui sì che si fa sentire. Gli altri sembrano turisti.','Un attaccante così basta e avanza. Lo dice la matematica.']],
 [/tifos|ultras|curva|sciarpa|bandiera|cori/,['Io tifo da sempre. Da quando vince, almeno.','Il coro più bello è quello della domenica prima della partita.','Tifosi si nasce, e poi si diventa pentiti.','Con la sciarpa al collo e la birra in mano: casa.']],
 [/allenator|mister|modulo|formazion|panchina|moduli|tattic/,['Il modulo è come il caffè: dipende da chi lo fa.','Io avrei schierato quello che sta in tribuna, ma ok.','Il mister sa quello che fa. Forse. Forse no.','In due non ne fanno uno buono, appunto.']],
 [/derby|sfida|scontro|chi perde|cena|scommess|pronostic/,['Segnati: la cena la paga chi perde, e perdi tu.','Pronostico? 1X2 e ci vediamo al bar.','Io scommetto sul pareggio così non litigo con nessuno.','Ti ricordo che l\'ultima volta hai perso e hai negato tutto.']],
 [/\bgol\b|rete|segna|tripletta|doppietta|assist/,['Che gol. Poi a casa non si capiva più niente.','Ripetilo: me lo sono perso, ero al bar.','Con quel tiro basta guardare l\'angolino. Fine.','E ancora qualcuno dice che non sa tirare.']],
 [/pioggia|freddo|nebbia|caldo|meteo/,['Qui a Eindhoven piove sempre, ma la partita si gioca lo stesso.','Con quel meteo il divano vince 3-0.','Alla fine è tutto sul campo, anche l\'ombrello.']]
];
var RPOS=['Meritato, applausi.','Grandi, davvero.','Finalmente una gioia.','Bravissimi, e ora tutti a dire che ci credevano.','Questa è la strada: continuate così.','Lo dicevo io. Anche se non lo dicevo.'];
var RNEG=['Che sfiga, ma dai, si rialza.','Oggi proprio no. Domani vediamo.','Purtroppo succede. Ci rifacciamo.','Brutta botta, però il campionato è lungo.','Mi dispiace, ma lo sapevamo un po\' tutti.','Ahia. Ho il fegato che brucia.'];
var RCAT={ri:['Il risultato non mi stupisce, nemmeno un po\'.','Il punteggio è bugiardo, ma il fantacalcio è sovrano.','Ora vediamo cosa dice la classifica.'],cl:['La classifica oggi è così. Domani? Chissà.','Primo, ultimo: tutto cambia alla prossima giornata.','Occhio a chi è dietro: sono sempre quelli più pericolosi.'],pm:['Il punteggio sta lì. Il resto sono chiacchiere.','Con quel punteggio ci si può anche accontentare.'],so:['Non è una sorpresa, ma fa comunque effetto.','Una sorpresa così non la vedevo da settimane.'],al:['L\'allenatore dice una cosa, il fantacalcio ne fa un\'altra.','Chi comanda davvero è la formazione, non il mister.'],mk:['Del mercato si parla sempre, poi alla fine restiamo con gli stessi.','Io al mercato ci vado solo per la frutta.'],fc:['Su FC27 i numeri sono sempre un po\' gonfiati, secondo me.','Il 99 è sempre della carta più brutta.'],live:['Fatemi sapere com\'è finita, sono in fila al supermercato.','Quanto manca? Sono già agitato.']};
var RNEU=['Ragionamento che non fa una piega. Tranne le pieghe.','Non ci avevo pensato, ora non dormo.','Dipende da cosa intendi, ma sono d\'accordo a metà.','Su questo ti seguo. Anche se non sono sicuro di dove.','Interessante. Pericoloso, ma interessante.','Eh, ma lo dici tu. E io? Io cosa dico?'];
var CPOS=['grandi','bravi','🔥','meritato','applausi','top','che gioia'],CNEG=['che sfiga','ahia','purtroppo','💀','forza dai','mah, ci sta','no vabbè'],CNEU=['ci sta','boh','dipende','e quindi?','chi lo sa','ahah dai','vero','concordo'];
var NEGR=/perso|sconfitt|\bko\b|flop|disastr|schifo|vergogna|infortun|squalific|crisi|polemic|rubat|truff|corrott|delus|incubo|piang|male\b/,POSR=/vinc|vitt|bravo|grande|\btop\b|primo|record|show|bomba|fenomen|stellar|meritat|applaus|bellissim|trionf|segna|gol\b|capolavoro/;
function risposta(rr,x,cat,cx){var t=(x||'').toLowerCase(),lis=null,i;
 for(i=0;i<RTOP.length;i++)if(RTOP[i][0].test(t)){lis=RTOP[i][1];break}
 var q=rr();
 if(cx&&cx.gio&&t.indexOf(cx.gio.toLowerCase())>=0&&q<0.3)lis=['Su '+cx.gio+' io non metterei la mano sul fuoco.',cx.gio+' in forma è un altro sport.','Secondo me '+cx.gio+' è sopravvalutato. Lo dico da mesi.','Se '+cx.gio+' sta bene, abbiamo risolto metà dei problemi.'];
 else if(cx&&cx.sq&&t.indexOf(cx.sq.toLowerCase())>=0&&q<0.3)lis=[cap1(cx.sq)+' questa settimana ha fatto più danni della grandine.',cap1(cx.sq)+' continua a sorprendermi. In bene e in male.','Su '+cx.sq+' ci sarebbe un libro da scrivere. Un horror.','Aspetta che '+cx.sq+' si svegli e vedi.'];
 else if(!lis){if(NEGR.test(t)&&!POSR.test(t))lis=RNEG;else if(POSR.test(t)&&!NEGR.test(t))lis=RPOS;else if(cat&&RCAT[cat]&&q<0.6)lis=RCAT[cat];else lis=RNEU}
 return lis[Math.floor(rr()*lis.length)]}
function cap1(t){return t.charAt(0).toUpperCase()+t.slice(1)}
function crep(rr,x){var t=(x||'').toLowerCase(),n=NEGR.test(t),q=POSR.test(t),l=n&&!q?CNEG:q&&!n?CPOS:CNEU;return l[Math.floor(rr()*l.length)]}
var AUTORI=Object.keys(PERS);
/* risposte generiche */
var RISP=['Confermo.','Firmo.','Verissimo.','Però {sq} ha dei dubbi.','Non è colpa mia, giuro.','Seguiamo con attenzione.','Applauso, ma con riserva.','Su questo non ho nulla da aggiungere. Quindi aggiungo.','Ai posteri.','Questo coro merita un premio. O un esame.','Ho letto e sono ancora qui.','Ma anche no.','Bomba. Poi si vedrà.','Hai detto tutto. Anche troppo.','Lo dicevo anche io. Ma più forte.'];
/* Ciro */
var CIRO=[
 {x:'🚨 Fonti vicine al barista: {gio} sarebbe nel mirino di {sq}. O forse di {sq2}. O forse del barista. {#}',t:[]},
 {x:'Ultim\'ora, anzi no, penultim\'ora: {sq} e {sq2} hanno parlato di {gio}. Hanno parlato. Di cosa? Del tempo, forse. {#}',t:[]},
 {x:'Mi dicono che {gio} sia sul mercato. Mi dicono anche tante altre cose. Ma questa mi piace. 🧵',t:['2/2 Fonte: un signore al bar. Il signore, però, era convinto.']},
 {x:'🚨 Colpo a sorpresa in arrivo. Non so chi, non so quando, non so come. Ma sarà un colpo. {#}',t:[]},
 {x:'Trattativa segreta tra {sq} e {sq2}. Così segreta che non lo sa nessuno. Nemmeno loro. {#}',t:[]},
 {x:'🚨 {gio} potrebbe cambiare maglia. Oppure no. Oppure sì. Oppure resta. Questo è il bello del mercato. {#}',t:[]},
 {x:'Conferma dalle mie fonti: {inj} ({inj_sq}) tornerà presto. Presto vuol dire tra una settimana, un mese o mai. {#}',t:[]},
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
  var c={};c.sq=pick(r,SQ);do{c.sq2=pick(r,SQ)}while(c.sq2===c.sq);c.all=MISTER[c.sq]||c.sq;c.all2=MISTER[c.sq2]||c.sq2;c.top=(ST.cls&&ST.cls[0]&&ST.cls[0].n)||c.sq;
  c.gol=1+Math.floor(r()*4);
  var g=ids.length?NM[pick(r,ids)]:{n:'il bomber',sq:c.sq};c.gio=g.n;c.gio_sq=g.sq;
  var ij=(D.inj||[]).filter(function(i){return NM[i.id]});
  var j=ij.length?pick(r,ij):null;c.inj=j?j.n:'il centravanti';c.inj_sq=j?NM[j.id].sq:c.sq;
  var pos=ST.cls.map(function(t){return t.n}).indexOf(c.sq);c.pos=pos<0?'?':pos+1;
  var pt='?';if(ST.ult)ST.ult.m.forEach(function(m){if(m[0]===c.sq)pt=m[1];else if(m[3]===c.sq)pt=m[2]});
  c.pt=String(pt).replace('.',',');
  var pool=(ST.ult?ST.ult.m:[]).concat(ST.ultC?ST.ultC.m:[]);var mm=pool.length?pool[Math.floor(r()*pool.length)]:null;
  if(mm){var gc=mm[4].split('-').map(Number),w=mm[1]>=mm[2];c.vinc=w?mm[0]:mm[3];c.perd=w?mm[3]:mm[0];c.pv=String(Math.max(mm[1],mm[2])).replace('.',',');c.pp=String(Math.min(mm[1],mm[2])).replace('.',',');c.sc=(w?gc[0]+'-'+gc[1]:gc[1]+'-'+gc[0]);c.scarto=(Math.abs(mm[1]-mm[2])).toFixed(1).replace('.',',').replace(',0','')}
  else{c.vinc=c.sq;c.perd=c.sq2;c.pv='70';c.pp='65';c.sc='2-1';c.scarto='5'}
  return c;
 };
}
function riempi(t,c,tag){return t.replace(/\{(\w+)\}/g,function(m,k){return c[k]!==undefined?c[k]:m}).replace('{#}',tag?('#'+tag):'').replace(/\s+$/,'').replace(/\s{2,}/g,' ').replace(/\.\.(?!\.)/g,'.')}
var PESI={0:{live:9,pm:2,so:2,al:2,gen:2,mk:1,fc:1,cl:1,ri:0},1:{pm:5,so:3,al:3,gen:3,mk:1,fc:1,cl:2,ri:1},2:{cl:4,ri:6,al:3,so:3,gen:3,mk:1,fc:2,pm:1},3:{cl:3,ri:5,so:3,al:2,gen:3,mk:2,fc:2,pm:1},4:{mk:5,ri:3,gen:3,fc:3,so:2,al:2,cl:1,pm:0},5:{mk:5,ri:1,gen:3,fc:3,so:2,al:2,cl:1,pm:0,live:2},6:{live:10,pm:1,ri:1,gen:2,mk:2,so:1,fc:2,al:1,cl:0}};
function comune(r){return COMUNI[Math.floor(r()*COMUNI.length)]}
function post_giorno(D,SQ,ST,g){
 var dd=dalGiorno(g),tg=tendenze(D),tags=tg.map(function(x){return x[0]}),r=prng('giorno'+g),mk=ctxDi(D,SQ,ST,'ctx'+g);
 var w=PESI[dd.wd],cats=[];Object.keys(w).forEach(function(k){for(var i=0;i<w[k];i++)cats.push(k)});
 var n=(dd.wd===0||dd.wd===6?17:12)+Math.floor(r()*5),out=[],usati={},prev=null;
 function quando(rq){if(prev!==null&&rq()<0.35){prev=Math.min(1430,prev+2+Math.floor(rq()*14));return prev}var m=Math.floor((7+Math.pow(rq(),0.75)*16.6)*60+rq()*60);prev=Math.min(1430,m);return prev}
 var ordine=shuffle(r,AUTORI);
 for(var i=0;i<n;i++){
  var a=ordine[i%ordine.length],cat=pick(r,cats),lis=cat==='live'?(PERS[a].live||LIVE[a]):PERS[a][cat];
  if(!lis||!lis.length){var ks=Object.keys(PERS[a]);cat=pick(r,ks);lis=PERS[a][cat]}
  if(FUORI[a]&&prng('fu'+g+i)()<0.1){cat='fuori';lis=FUORI[a]}
  /* nessuna ripetizione di template a ravvicinato: indice ruotato per giorno */
  var ix=(Math.floor(g/1)+i*7+h32(a+cat))%lis.length,c=mk();
  var tag=r()<0.45?pick(r,tags):null;
  var rm=prng('ma'+g+i);if(rm()<0.14){var du=rm()<0.3;if(du){c.sq=DUO;c.all=MISTER[DUO]}else{var cs=SQ.filter(function(q){return q!==DUO});c.sq=pick(rm,cs);c.all=MISTER[c.sq]||c.sq}lis=du?MAD:MA;ix=Math.floor(rm()*lis.length)}
  var x=natura(riempi(lis[ix],c,tag),'v:'+g+':'+i,a);
  var tq=quando(r),hh=Math.floor(tq/60),mi=tq%60;
  var po={k:'v:'+g+':'+i,a:a,x:x,ts:ts(dd.y,dd.mo,dd.d,Math.min(23,hh),mi),_r:r,cat:cat},ri=prng(po.k+'img');
  po.cx={sq:c.sq,sq2:c.sq2,gio:c.gio,pt:c.pt};
  if(IMGPER[a]&&ri()<0.6){var iml=IMGPER[a],ok=iml.filter(function(x){return x[1]==='*'||x[1].split(',').indexOf(cat)>=0});if(!ok.length)ok=iml;po.imgt=ok[Math.floor(ri()*ok.length)][0]}
  out.push(po);
 }
 /* utenti qualunque */
 var nc=8+Math.floor(r()*6)+((dd.wd===0||dd.wd===6)?5:0);
 for(var q=0;q<nc;q++){var rc=prng('cm'+g+'-'+q),cu=comune(rc),fc=rc()<0.12,pr0=cu[2][0],tn=fc?OPPOSTO[pr0]:(rc()<0.7?pr0:cu[2][cu[2].length-1]),cl=TONI[tn],cc=mk(),xt=riempi(pick(rc,cl),cc,rc()<0.25?pick(rc,tags):null);
  if(fc){var av=pick(rc,AVVISO[pr0]);xt=av+' '+(/[:,]$/.test(av)?xt.charAt(0).toLowerCase()+xt.slice(1):xt)}
  if(!fc&&tn!=='i'&&rc()<0.5)xt=xt.charAt(0).toLowerCase()+xt.slice(1);
  if(tn!=='i'&&rc()<0.35)xt=xt.replace(/\.$/,'');
  if(rc()<0.12)xt+=' '+pick(rc,GEN);
  if(rc()<0.1){var d2=rc()<0.3,cs2=SQ.filter(function(q){return q!==DUO}),sq3=d2?DUO:pick(rc,cs2);cc.sq=sq3;cc.all=MISTER[sq3]||sq3;xt=riempi(pick(rc,d2?MAD:MA),cc,null);if(rc()<0.5)xt=xt.replace(/^(\S+)/,function(m){return m===cc.all||m===cc.all.split(' ')[0]?m:m.toLowerCase()})}
  var tq2=quando(rc),hq=Math.floor(tq2/60),mq=tq2%60;
  out.push({k:'v:'+g+':u'+q,a:cu[0],x:xt,ts:ts(dd.y,dd.mo,dd.d,Math.min(23,hq),mq),r:[],cat:'u',cx:{sq:cc.sq,sq2:cc.sq2,gio:cc.gio,pt:cc.pt}})}
 /* risposte generiche */
 out.forEach(function(p){var rr=prng(p.k),nr=1+Math.floor(rr()*3);p.r=[];var s=shuffle(rr,AUTORI.filter(function(a){return a!==p.a}));for(var j=0;j<nr;j++){if(rr()<0.45){var cu=comune(rr);if(cu[0]!==p.a)p.r.push({a:cu[0],x:crep(rr,p.x),ts:p.ts+(5+Math.floor(rr()*120))*60000});continue}p.r.push({a:s[j],x:natura(risposta(rr,p.x,p.cat,p.cx),p.k+'r'+j,s[j]),ts:p.ts+(5+Math.floor(rr()*90))*60000})}});
 out.forEach(function(p){if(p.x.indexOf(MISTER[DUO])<0)return;var rd=prng(p.k+'duo');if(rd()<0.8){var cu=comune(rd),c=mk();if(cu[0]!==p.a){p.r=(p.r||[]).concat([{a:rd()<0.5?cu[0]:pick(rd,AUTORI.filter(function(a){return a!==p.a})),x:riempi(pick(rd,DUORISP),c,null),ts:p.ts+(8+Math.floor(rd()*90))*60000}]);p.r.sort(function(a,b){return a.ts-b.ts})}}});
 return out;
}
/* Rende i cori meno perfetti e più vivi: emoji, punti esclamativi, puntini, domande insistenti, qualche errore. Tutto raro e deterministico. */
var EMJ={il_complottista:['🕵️','🧐','💰'],il_romantico_del_pallone:['⚽','💸','😔'],ing_stadi:['🏟️','📐','🚧'],il_super_tifoso:['📣','😍','🔥'],il_barista:['☕','🥐','⚽'],il_mago_cabala:['🔮','🧿','✨'],la_suocera:['🍝','😤','🙄'],il_tassista:['🚕','📻','😅'],fidanzata_stufa:['🙄','😮‍💨','🍿'],nonno_cesare:['👴','🍷','⚽'],tifoso_arrabbiato:['😡','🤬','🔥'],mister_divano:['🛋️','📋','⚽'],radio_spogliatoio:['📻','👀','🤫'],mamma_di_capitan:['❤️','🍝','🥰'],ex_ds_provincia:['💼','🤝','😅'],var_parlante:['🖥️','🧐','🚩'],fc27_ratings:['🎮','📈','🔥'],il_cugino_del_dt:['🤫','👀','😏'],telecronista_stanco:['😴','🎙️','☕'],gufo_professionista:['🦉','😈','🔮'],il_filosofo_del_pallone:['🤔','🌌','⚽'],bomber_da_bar:['🍺','⚽','😎'],statistico_folle:['📊','🤓','🔢'],arbitro_in_pensione:['🟨','⚽','🙄']};
var GEN=['😂','🤦‍♂️','👏','🔥','🙄','😅','⚽','😬'];
var DOM=['Voi che dite?','Ma sono l\'unico?','Che ne pensate?','Qualcuno mi spiega?','Chi è d\'accordo?','Ma davvero?'];
function natura(x,key,a){
 var r=prng(key+'nat'+a),t=x;
 /* qualche errore, raramente */
 if(r()<0.07){var m=r();t=m<0.34?t.replace(/\bè\b/g,'e').replace(/\bpiù\b/g,'piu').replace(/\bperché\b/g,'perche'):m<0.67?t.replace(/(\b[Uu]n)'(?=[a-zàèéìòù])/g,'$1 ').replace(/\bl'(?=[a-zàèéìòù])/g,'l '):t.replace(/\b(\w*(?:imo|ona|ato|ata|ente))\b/,function(w){return w+w.slice(-1)+w.slice(-1)})}
 var fine=/[.!?…]$/.test(t)?t.slice(-1):'';var base=fine?t.slice(0,-1):t,multi=/[.!?]\s/.test(base);
 /* domande insistenti */
 if(fine==='?'&&r()<0.35)t=base+(r()<0.6?'??':'???');
 else if(fine==='.'&&!multi&&r()<0.1)t=base+'…';
 else if(fine==='.'&&!multi&&r()<0.12)t=base+(r()<0.7?'!':'!!');
 else if(!fine&&r()<0.08)t=base+'...';
 /* aggiunta di una domanda finale */
 if(r()<0.06&&t.length<100&&!/\?$/.test(t)){var q=pick(r,DOM);if(r()<0.35)q=q.slice(0,-1)+'??';t+=' '+q}
 /* tifoso arrabbiato: a volte tutto maiuscolo */
 if(a==='tifoso_arrabbiato'&&r()<0.12&&t.length<80)t=t.toUpperCase().replace(/#\w+/g,function(h){return h});
 /* emoji, raramente */
 if(r()<0.14){var set=(EMJ[a]||[]).concat(GEN);var e=pick(r,set);if(r()<0.15)e+=pick(r,set);t+=' '+e}
 return t}
function conta(k,base){var r=prng(k+'n');var b=base||1;return{ap:Math.floor((4+r()*40)*b),ril:Math.floor(r()*12*b),v:Math.floor((200+r()*2400)*b)}}
function genera(D,SQ,ST,ms){
 var r=roma(ms),oggi=giorno(ms),all=[],tg=tendenze(D).map(function(x){return x[0]});
 var tag=function(k,i){return tg[(h32(k)+i)%tg.length]};
 for(var g=oggi-3;g<=oggi;g++){
  post_giorno(D,SQ,ST,g).forEach(function(p){if(p.ts<=ms&&p.ts>=ms-96*36e5){var c=conta(p.k);p.ap=c.ap;p.ril=c.ril;p.v=c.v;p.r=p.r.filter(function(x){return x.ts<=ms});all.push(p)}});
  /* Ciro: venerdì 18:00 + un aggiornamento il lunedì */
  var dd=dalGiorno(g),mk=ctxDi(D,SQ,ST,'ciro'+g);
  if((dd.wd===2||dd.wd===4||dd.wd===6)&&g>=oggi-3){var mp=null;try{mp=mercato(D,SQ,g,dd,ms)}catch(e){}if(mp&&mp.ts<=ms&&mp.ts>=ms-96*36e5)all.push(mp)}
  if((dd.wd===3||dd.wd===5)&&g>=oggi-3){var sp=null;try{sp=scambiPost(D,SQ,g,dd,ms,dd.wd===3?16:14)}catch(e){}if(sp&&sp.ts<=ms&&sp.ts>=ms-96*36e5)all.push(sp)}
  if(dd.wd===5||dd.wd===1||dd.wd===3||dd.wd===0){
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
  var cu0=cupUlt(D),sr0=Math.max(legaSa(D)||0,(cu0&&cu0.sa)||0),gTue=gd-((wd-2+7)%7),gWed=gd-((wd-3+7)%7),a=dalGiorno(gTue+7*((legaSa(D)||sr0)-sr0)),b=dalGiorno(gWed);
  var P1c=null,P1={k:'lega:'+n,a:'lega_ofantagirrr',x:'Fine giornata. Ecco i risultati della '+n+'ª giornata di campionato. #Giornata'+n,tipo:'ris',ts:ts(a.y,a.mo,a.d,14,30),r:[]};
  var P2={k:'gior:'+n,a:'giornale_girrr',x:'È uscito il numero '+n+' del Giornale: pagelle, il Coro della settimana e la Bufala di mercato. #Giornata'+n,tipo:'gio',ts:ts(a.y,a.mo,a.d,14,30),r:[]};
  var cu=cupUlt(D);
  if(cu){var sr=Math.max(legaSa(D)||0,cu.sa||0),tc=gTue+7*((cu.sa||sr)-sr),ac=dalGiorno(tc);P1c={k:'lega:c'+cu.n,a:'lega_ofantagirrr',x:'Fine giornata di Champions Cup. Ecco i risultati della '+cu.n+'ª giornata dei gironi. #ChampionsCup',tipo:'rc',ts:ts(ac.y,ac.mo,ac.d,14,35),r:[]}}
  if(P1c)P1.ts=P1.ts;
  var LU=null;((D.cal&&D.cal.lega)||[]).forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))LU=g});
  if(LU&&LU._pub){P1.ts=LU._pub;P2.ts=LU._pub}
  if(P1c&&cu&&cu.pub)P1c.ts=cu.pub;
  [P1,P2].concat(P1c?[P1c]:[]).forEach(function(p){var c=conta(p.k,1);p.ap=Math.floor(21000+c.ap*850);p.ril=Math.floor(2400+c.ril*260);p.v=Math.floor(1100000+c.v*900);
   var rs=[];for(var q=0;q<7;q++){var z=reazioni(p.k+'#'+q,p.ts,ms,SQ,p.x);rs=rs.concat(z.r)}
   rs=rs.concat(comUff(p,D,SQ,cu,ms));rs=rs.filter(function(x){return x.ts<=ms}).sort(function(x,y){return x.ts-y.ts});p.r=rs;if(p.ts<=ms)all.push(p)});
 }
 /* veri scambi */
 (D.scambi||[]).forEach(function(s,i){var T=Date.parse(s.t);if(!(T<=ms))return;var cc={a:s.a,b:s.b,da:s.da,db:s.db};var p={k:'sc:'+i,a:'ciro_trattativa',x:riempi(SCAMBIO[i%2],cc,null),ts:T,r:[],ap:20,ril:6,v:900};all.push(p)});
 all.sort(function(a,b){return b.ts-a.ts});
 return all;
}

/* Commenti sotto i post ufficiali (Lega, Coppa, Giornale): tanti, sparsi nelle ore */
function comUff(p,D,SQ,cu,ms){
 var L=(D.cal&&D.cal.lega)||[],u=null;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});
 var coppa=p.k.indexOf('lega:c')===0,giorn=p.k.indexOf('gior:')===0,src=coppa?(cu&&cu.m):(u&&u.m);
 if(!src)return[];
 var r=prng('cu'+p.k),M=src.filter(function(m){return m[4]!=='-'}).map(function(m){var g=m[4].split('-').map(Number),d=g[0]-g[1];return{h:m[0],a:m[3],gh:g[0],ga:g[1],w:d>0?m[0]:d<0?m[3]:null,l:d>0?m[3]:d<0?m[0]:null,sc:m[4],tot:g[0]+g[1],dif:Math.abs(d)}});
 if(!M.length)return[];
 var big=M.slice().sort(function(a,b){return b.dif-a.dif})[0],pari=M.filter(function(m){return!m.w}),gol=M.slice().sort(function(a,b){return b.tot-a.tot})[0];
 var T=[],pm=function(){return M[Math.floor(r()*M.length)]};
 function add(x,min,max){T.push({x:x,d:min+r()*(max-min)})}
 var X=function(m,l){return l[Math.floor(r()*l.length)].replace(/\{h\}/g,m.h).replace(/\{a\}/g,m.a).replace(/\{w\}/g,m.w||m.h).replace(/\{l\}/g,m.l||m.a).replace(/\{sc\}/g,m.sc)};
 var VIT=['{w} vince {sc} e {l} esce ridimensionata. Zero alibi.','{sc} per {w}: {l} oggi non pervenuta.','Complimenti a {w}, {l} dovrebbe fare due chiacchiere con la panchina.','{l} in crisi nera, {w} ringrazia. {sc}.','Bella {w}, ma {l} ha lasciato punti ovunque.','{sc}. Se fossi {l} chiederei il VAR sulla formazione.','Ma {l} ha schierato la formazione a occhi chiusi?','{w} vola, {l} spiegatemi cosa è successo.'];
 var PAR=['{h}-{a} {sc}: pareggio che non serve a nessuno.','Pareggio tra {h} e {a}, tutti scontenti e nessuno colpevole.','{sc} tra {h} e {a}. Ci sta, ma che noia.'];
 var GEN=['Il campionato è apertissimo, io dico che ne vedremo delle belle.','Chi ha lasciato punti in panchina stasera non dorme.','Ogni giornata una sorpresa. Amo questo gioco.','Si vedono già le squadre vere e quelle da zona salvezza.','Il modificatore difesa decide più partite dell\'allenatore.','Voti pesanti questa settimana, ma i bonus fanno la differenza.','Aspetto il Giornale per capire chi sono i colpevoli.','Il mio fantavoto è ancora in sciopero.'];
 var COP=['In Champions Cup si fa sul serio, qui non si scherza.','Girone di ferro, altro che campionato.','Quest\'anno la Coppa la vince chi ha la panchina più lunga.','Le gare di Coppa sono più belle di quelle di campionato, ammettiamolo.','Le stesse formazioni del campionato: stesso risultato, doppio dolore.'];
 var GIO=['Le pagelle del Giornale sono troppo severe, io avrei dato un punto in più.','La Bufala di mercato questa settimana è la migliore di sempre 😂','Il Coro della settimana mi ha fatto ridere per dieci minuti.','Ho letto i Rimpianti: i punti lasciati in panchina fanno più male di una sconfitta.','Titolo di copertina perfetto, la redazione sta migliorando.','Bravi, il Giornale è l\'unica cosa seria in questa lega.','Chi ha scritto le pagelle vuole litigare con tutti, mi piace.','Ma {x} ha davvero lasciato quel punteggio in panchina? Il Giornale non perdona.','Quando esce il prossimo numero? Già dipendente.','Ho stampato il PDF e l\'ho appeso in ufficio.','Il Giornale mi ha fatto cambiare idea sulla classifica.','Non sono d\'accordo con le pagelle, ma le leggo sempre tutte.'];
 var n=coppa?18:giorn?26:34,i,m;
 for(i=0;i<n;i++){
  var t=r();
  if(giorn){m=pm();var g=GIO[Math.floor(r()*GIO.length)].replace('{x}',SQ[Math.floor(r()*SQ.length)]);
   if(t<0.65)add(g,15,600);else if(t<0.85)add(X(m,VIT),20,500);else add(X(big,['{w} {sc} e {l} è già al Giornale come caso clinico.']),30,600)}
  else{
   if(t<0.5){m=pm();add(m.w?X(m,VIT):X(m,PAR),5,420)}
   else if(t<0.62&&pari.length)add(X(pari[Math.floor(r()*pari.length)],PAR),10,400);
   else if(t<0.74)add(X(big,['{sc} il risultato più largo: {w} ha dominato, {l} umiliata.','Il {sc} di {w} su {l} è il risultato della giornata.','{l} sotto choc dopo il {sc}.']),5,300);
   else if(t<0.82)add(X(gol,['{sc} tra {h} e {a}: partita folle, tanti gol.','Quante reti in {h}-{a}! Lo spettacolo c\'è.']),8,360);
   else add((coppa?COP:GEN)[Math.floor(r()*(coppa?COP:GEN).length)],5,600)}
 }
 var ord=shuffle(r,AUTORI),out=[];
 T.forEach(function(e,j){var ts=p.ts+Math.round(e.d)*60000;if(ts>ms)return;
  if(r()<0.55){var cu2=comune(r);out.push({a:cu2[0],x:e.x,ts:ts})}else{var a=ord[j%ord.length];out.push({a:a,x:natura(e.x,p.k+'c'+j,a),ts:ts})}});
 return out}
function reazioni(k,t,ms,SQ,xt){var r=prng('rz'+k),age=(ms-t)/60000;if(age<1)return{ap:0,ril:0,r:[]};
 var fa=2+Math.floor(r()*11),fr=Math.floor(r()*4),pr=Math.pow(Math.min(1,age/360),0.6),out=[];
 var nr=Math.floor(r()*3),rl=/^p\d/.test(k);if(rl&&nr<1)nr=1;var ord=shuffle(r,AUTORI);
 for(var i=0;i<nr;i++){var d=(i===0&&rl?6+r()*40:10+r()*240),tx=xt?risposta(r,xt,null,{sq:(SQ.filter(function(q){return xt.toLowerCase().indexOf(q.toLowerCase())>=0})[0])}):pick(r,RISP).replace('{sq}',pick(r,SQ)),a=ord[i];if(r()<0.5){var cu=comune(r);if(age>=d)out.push({a:cu[0],x:xt?crep(r,xt):pick(r,CREP),ts:t+d*60000});continue}if(age>=d)out.push({a:a,x:natura(tx,k+'z'+i,a),ts:t+d*60000})}
 return{ap:Math.floor(fa*pr),ril:Math.floor(fr*pr),r:out}}

/* Cori automatici del profilo ufficiale: se una squadra tace per due settimane */
var LANCIO=Date.UTC(2026,9,11),SILENZIO=14*864e5;
var UFF={
 vit:["Tre punti importanti contro {opp}: {sc}. Grande prova di tutto il gruppo. #Giornata{n}","{sc} a {opp}. La squadra risponde presente e il club ringrazia i tifosi. #Giornata{n}"],
 par:["Pareggio con {opp}, {sc}. Un punto che muove la classifica ma sappiamo di poter fare di più. #Giornata{n}","{sc} contro {opp}. Un punto a testa, il lavoro continua. #Giornata{n}"],
 sco:["Sconfitta con {opp}, {sc}. Ci rialziamo subito: il campionato è lungo. #Giornata{n}","{sc} contro {opp}. Analizziamo gli errori e guardiamo avanti. Forza ragazzi. #Giornata{n}"],
 gio:["Il nostro migliore finora? {gio}: {g} gol e media {mv}. Il club è orgoglioso.","Menzione speciale per {gio}: {g} gol e media {mv}. Continuiamo così."],
 sme:["Il club smentisce ufficialmente le voci su un nostro interesse per {altro}. Nessuna trattativa in corso. #Calciomercato","Circola una notizia su un presunto contatto per {altro}. È falsa. Nessun contatto, nessuna offerta. #Calciomercato","Smentiamo ufficialmente qualunque dissidio nello spogliatoio. L'ambiente è sereno. Chi diffonde queste voci si assuma le proprie responsabilità."],
 clt:["{pos}° in classifica con {pt} punti. Bel lavoro, ma non ci accontentiamo.","Siamo {pos}° con {pt} punti. Teniamo i piedi per terra e andiamo avanti."],
 cup:["Champions Cup: siamo {cp}° nel girone {gir} con {cpt} punti. Ci crediamo. #ChampionsCup","Nel girone {gir} di Champions Cup siamo {cp}° con {cpt} punti. Il cammino è lungo ma siamo in corsa. #ChampionsCup"],
 cla:["Siamo {pos}° in classifica con {pt} punti. Il campionato è ancora lunghissimo.","{pos}° posto per ora, con {pt} punti. Lavoriamo per salire."]
};
function ufficiale(D,SQ,ST,tsMap,ms){
 var out=[],NM=nomi(D);
 SQ.forEach(function(sq){
  var T=(tsMap[sq]||[]).slice().sort(function(a,b){return a-b}),cur=LANCIO,fire=[];
  T.forEach(function(t){if(t<=cur)return;while(cur+SILENZIO<t){cur+=SILENZIO;if(cur<=ms)fire.push(cur)}cur=t});
  while(cur+SILENZIO<=ms){cur+=SILENZIO;fire.push(cur)}
  fire.slice(-2).forEach(function(f0){
   var gg=Math.floor(f0/864e5),k='u:'+h32(sq)+':'+gg,r=prng(k),opts=[];
   var c={},pos=ST.cls.map(function(t){return t.n}).indexOf(sq);
   var t0=pos>=0?ST.cls[pos]:null;
   if(t0&&pos>=0){c.pos=pos+1;c.pt=t0.pt;opts.push('cla')}
   var mm=null,cupm=false;var cu2=cupUlt(D);if(ST.ult)ST.ult.m.forEach(function(m){if(m[0]===sq||m[3]===sq)mm=m});if(cu2&&(!ST.ult||(cu2.sa||0)>=(ST.ult.sa||0)))cu2.m.forEach(function(m){if(m[0]===sq||m[3]===sq){mm=m;cupm=true}});
   if(mm){var gc=mm[4].split('-').map(Number),casa=mm[0]===sq,a=casa?gc[0]:gc[1],b=casa?gc[1]:gc[0];c.opp=(casa?mm[3]:mm[0])+(cupm?' in Champions Cup':'');c.sc=a+'-'+b;c.n=ST.ult.n;opts.push(a>b?'vit':a===b?'par':'sco','cla')}
   var mio=null;(D.teams||[]).forEach(function(t){if(t.name===sq)(t.pl||[]).forEach(function(p){var s0=(D.ps||{})[p.id];if(s0&&D.P[p.id]&&(!mio||(s0.fmv||0)>mio.s.fmv))mio={n:D.P[p.id].n,s:s0}})});
   if(mio){c.gio=mio.n;c.g=mio.s.g||0;c.mv=String(mio.s.mv||mio.s.fmv).replace('.',',');opts.push('gio')}
   var ids=Object.keys(NM).filter(function(i){return NM[i].sq!==sq});
   if(ids.length){c.altro=NM[pick(r,ids)].n}
   if(ST.cup&&ST.cup[sq]&&ST.cup[sq].g){c.cp=ST.cup[sq].pos;c.cpt=ST.cup[sq].pt;c.gir=ST.cup[sq].gir;opts.push('cup')}opts.push('sme','sme');
   var tp=pick(r,opts);if(tp==='cla'&&c.pos<=3)tp='clt';var x=riempi(pick(r,UFF[tp]),c,null);
   var tx=gg*864e5+(8+Math.floor(r()*12))*36e5-72e5;out.push({k:k,team:sq,x:x,ts:tx<=ms?tx:f0,r:[]});
  })});
 return out}
function ultimo(D,ms){var SQ=(D.teams||[]).map(function(t){return t.name}),L=(D.cal&&D.cal.lega)||[],u=null;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});
 var p=genera(D,SQ,{cls:SQ.map(function(n){return{n:n}}),ult:u,next:null},ms);return p.length?p[0].ts:0}
var NOMI={il_complottista:'Il Complottista',il_romantico_del_pallone:'Il Romantico del Pallone',ing_stadi:'L\'Ingegnere degli Stadi',il_super_tifoso:'Il Super Tifoso',il_barista:'Il Barista',il_mago_cabala:'Il Mago della Cabala',la_suocera:'La Suocera',il_tassista:'Il Tassista',fidanzata_stufa:'La Fidanzata Stufa',nonno_cesare:'Nonno Cesare',tifoso_arrabbiato:'Il Tifoso Arrabbiato',mister_divano:'Il Tecnico da Divano',radio_spogliatoio:'Radio Spogliatoio',mamma_di_capitan:'Mamma di Capitan Sfortuna',ex_ds_provincia:'Ex DS di Provincia',var_parlante:'VAR Parlante',fc27_ratings:'FC27 Ratings Italia',il_cugino_del_dt:'Il Cugino del DT',telecronista_stanco:'Il Telecronista Stanco',gufo_professionista:'Gufo Professionista',il_filosofo_del_pallone:'Il Filosofo del Pallone',bomber_da_bar:'Bomber da Bar',statistico_folle:'Lo Statistico Folle',arbitro_in_pensione:'Arbitro in Pensione',ciro_trattativa:'Ciro Trattativa',lega_ofantagirrr:'Lega O Fant A Girrr',giornale_girrr:'O Giornale del Girrr'};
function anteprima(D,ms,n){var SQ=(D.teams||[]).map(function(t){return t.name}),L=(D.cal&&D.cal.lega)||[],u=null;L.forEach(function(g){if(g.m.some(function(m){return m[4]!=='-'}))u=g});
 return genera(D,SQ,{cls:SQ.map(function(x){return{n:x}}),ult:u,next:null},ms).filter(function(p){return !p.tipo}).slice(0,n).map(function(p){return{a:p.a,n:NOMI[p.a]||p.a,x:p.x.replace(/\n[\s\S]*/,'')}})}
window.CVB={MISTER:MISTER,COMUNI:COMUNI,cupUlt:cupUlt,ufficiale:ufficiale,anteprima:anteprima,reazioni:reazioni,ultimo:ultimo,genera:genera,tendenze:tendenze,PERS:PERS,RISP:RISP,CIRO:CIRO,roma:roma,giorno:giorno,h32:h32};
})();
