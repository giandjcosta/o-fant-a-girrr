/* Uscite programmate: i risultati di una giornata compaiono 1 ora dopo che la giornata e' stata CALCOLATA su Leghe
   (e comunque non prima dell'ultimo voto di Serie A). Si prende il piu' tardivo fra "votiTs" e "calcTs".
   (Coppa: allo stesso orario del campionato). data.json ha "votiTs" (scritto dall'Action quando i voti sono completi) e "calcTs" (quando Leghe ha calcolato la giornata), chiave = giornata di Serie A.
   Prima di quell'ora la giornata e' nascosta (come se non fosse ancora stata giocata). Senza votiTs: nessun filtro. */
(function(){
window.CVPUB=function(d){
 try{
  var V=d.votiTs||{},now=Date.now();
  ['lega','cup'].forEach(function(k){((d.cal&&d.cal[k])||[]).forEach(function(g){
   var v=V[g.sa],c=(d.calcTs||{})[g.sa];if(!v&&!c)return;
   var t=Math.max(v?Date.parse(v):0,c?Date.parse(c):0)+60*60000;g._pub=t;
   if(now<t){g.m=g.m.map(function(m){m=m.slice();var n=m.length;m[n-1]='-';m[n-2]=m[n-2];if(k==='lega'){m[1]=0;m[2]=0}else{m[2]=0;m[3]=0}return m})}
  })});
 }catch(e){}
 return d};
})();
