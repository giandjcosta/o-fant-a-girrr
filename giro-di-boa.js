/* O Girrr · Bilanci della stagione 6.1. Pagina e album leggono il calcolo del workflow.
   Qui si impaginano fatti già calcolati: nessuna classifica ricostruita nel browser. */
(function () {
  'use strict';
  if (window.GirrrBoa) return;
  const script = document.currentScript;
  const ROOT = new URL('./', script.src).href;
  const viste = new Map();
  const scelte = new Map(); // Conserva la scelta anche se Carriera si ridisegna dopo una lettura.
  const ND = 'Dato non conservato', E = s => String(s == null ? ND : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N = v => v == null ? ND : Number(v).toLocaleString('it-IT', { maximumFractionDigits: 3 });
  const nome = t => t === 'The Blue brothers' ? 'The Blues Brothers' : t;
  const text = s => String(s).replace(/·\s*(\p{Ll})/gu, (_, c) => '· ' + c.toUpperCase());
  const pl = (n,uno,tanti) => `${n} ${n===1?uno:tanti}`;
  const B = b => `${pl(b.vittorie,'vittoria','vittorie')} · ${pl(b.pareggi,'pareggio','pareggi')} · ${pl(b.sconfitte,'sconfitta','sconfitte')}`;
  const match = p => `${p.competizione==='coppa'?'Champions Cup':'Campionato'} · ${p.giornata}ª: ${nome(p.squadra_casa)} ${p.risultato} ${nome(p.squadra_trasferta)}`;
  const serie = s => s.partite ? `${pl(s.partite,'partita','partite')} (${s.dalla===s.alla?'alla '+s.dalla+'ª':'dalla '+s.dalla+'ª alla '+s.alla+'ª'})` : 'Nessuna';
  const record = r => r ? match(r.partita) + (r.ex_aequo.length ? ` · Altre ${r.ex_aequo.length} a pari merito` : '') : 'Nessuna';
  function periodo(j,k) {const p=j.periodi[k];if(!p)throw Error('Questo periodo non è ancora sbloccato');return p;}
  function titolo(j,k) {return periodo(j,k).titolo||`Il punto dopo la ${periodo(j,k).alla_giornata}ª giornata`;}
  async function carica(root = ROOT) {
    const r = await fetch(/\.json$/.test(root) ? root : new URL('girrr/dati/giro-di-boa.json', root), {cache:'no-cache'});
    if (!r.ok) throw new Error('Il bilancio non è disponibile adesso. Riprova più tardi.');
    const j = await r.json();
    if (j.schema !== 1 || !j.periodi?.finora || !j.ultima_pubblicata) throw new Error('Nessuna giornata pubblicata per il bilancio.');
    return j;
  }
  function sezioni(s) {
    const f = s.dirigenza, c = s.coppa, d = s.derby, p = s.promesse, cup=s.competizione==='coppa',mix=s.competizione==='entrambe';
    return [
      cup?['Girone', `${c.gironi.join(', ')||ND} · ${s.posizione??ND}ª posizione · ${s.punti_classifica??ND} punti nel girone`]:['Classifica'+(mix?' di Campionato':''), `${s.posizione}ª posizione · ${s.punti_classifica} punti in classifica · ${s.distacco_vetta} punti dalla vetta`],
      [cup?'Qualificazione':'Zona retrocessione', cup?c.qualificazione:s.in_zona_retrocessione ? `Ultimo posto · ${s.distacco_penultimo} punti dal penultimo` : `${s.margine_ultimo_posto} punti di margine sull’ultimo posto`],
      ['Bilancio', `${s.bilancio.giocate} partite · ${B(s.bilancio)}${cup||mix?'':' · '+s.bilancio.punti+' punti nel periodo'}`],
      ['In casa', `${s.casa.giocate} partite · ${B(s.casa)}${cup||mix?'':' · '+s.casa.punti+' punti'}`],
      ['In trasferta', `${s.trasferta.giocate} partite · ${B(s.trasferta)}${cup||mix?'':' · '+s.trasferta.punti+' punti'}`],
      ['Gol del risultato', `${s.bilancio.gol_fatti} fatti · ${s.bilancio.gol_subiti} subiti · Differenza reti ${s.differenza_reti > 0 ? '+' : ''}${s.differenza_reti}`],
      ['Vittoria più larga', record(s.vittoria_piu_larga)], ['Sconfitta più pesante', record(s.sconfitta_piu_pesante)],
      ['Serie di vittorie'+(mix?' · Campionato':''), serie(s.serie.vittorie)], ['Imbattibilità'+(mix?' · Campionato':''), serie(s.serie.imbattibilita)],
      ['Digiuno di vittorie'+(mix?' · Campionato':''), serie(s.serie.senza_vittorie)], ['Digiuno di gol'+(mix?' · Campionato':''), serie(s.serie.senza_gol)],
      cup?['Obiettivo in Coppa',f.obiettivo]:['Presidente', `${f.giudizio} · Attesa ${f.attesa == null ? ND : f.attesa + 'ª'} · Fascia ${f.fascia} · ${f.obiettivo}`],
      ['Fiducia', `${f.fiducia == null ? ND : N(f.fiducia) + ' su 100'}${cup?' · Valutazione complessiva della stagione':' · Scostamento dall’attesa: '+(f.scostamento_posizioni == null ? ND : (f.scostamento_posizioni > 0 ? '+' : '') + f.scostamento_posizioni + ' posizioni')}`],
      ['Derby', d.disponibile ? `${d.giocate} giocati · ${B(d)}` : ND],
      cup||mix?['Champions Cup', `${c.gironi.length ? 'Girone ' + c.gironi.join(', ') : ND} · ${c.punti_girone == null ? ND : c.punti_girone + ' punti nel girone'} · ${c.qualificazione} · Nel periodo: ${B(c)}`]:['La corsa al podio',s.posizione<=3?'Sul podio':`${s.distacco_podio} punti dalla 3ª posizione`],
      ['Promesse in conferenza', p.disponibile ? `${p.mantenute} mantenute · ${p.pari} pari · ${p.tradite} tradite · ${p.da_valutare} da valutare` : ND],
      ['MVP dei tifosi', s.mvp.disponibile ? `${s.mvp.ricevuti} ricevuti${s.mvp.giornate.length ? ' · Giornate ' + s.mvp.giornate.join(', ') : ''}` : ND],
      ['Partite sul filo', `${s.sul_filo.length} partite decise sul filo · Un gol di differenza`]
    ].filter(([a])=>!cup||!['Promesse in conferenza','MVP dei tifosi'].includes(a)).map(([a,b]) => [a,text(b)]);
  }
  function andamento(s) {
    if (!s.andamento.length) return '<p>' + ND + '</p>';
    const a = s.andamento, x = i => 32 + i * 636 / Math.max(1,a.length-1), y = p => 22 + (p-1)*18;
    return `<svg class="gb-grafico" viewBox="0 0 700 210" role="img" aria-label="Posizione giornata per giornata"><path d="${a.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v.posizione)).join(' ')}" fill="none" stroke="currentColor" stroke-width="4"/>${a.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v.posizione)}" r="5"/><title>${v.giornata}ª giornata: ${v.posizione}ª posizione</title>`).join('')}</svg><div class="gb-storia">${a.map(v=>`<span><small>${v.giornata}ª giornata</small><b>${v.posizione}ª</b></span>`).join('')}</div>`;
  }
  function dettagli(s) {
    return `<h3>${E(nome(s.squadra))}</h3><div class="gb-fatti">${sezioni(s).map(([a,b])=>`<div><h4>${a}</h4><p>${E(b)}</p></div>`).join('')}</div>
      ${s.competizione==='coppa'?'':`<details><summary>Andamento in classifica${s.competizione==='entrambe'?' · Campionato':''}</summary>${andamento(s)}</details>`}
      <details><summary>${s.competizione==='coppa'?'Tutte le partite di Champions Cup':s.competizione==='entrambe'?'Tutte le partite delle due competizioni':'Tutte le partite di Campionato'}</summary><ul>${s.partite.map(p=>`<li>${E(match(p))} · ${p.casa?'In casa':'In trasferta'}</li>`).join('')}</ul></details>
      <details><summary>Risultati dei Derby</summary><p>${E(s.derby.criterio)}</p><ul>${s.derby.disponibile ? s.derby.partite.map(p=>`<li>${E(p.nome_derby)} · ${E(match(p))}</li>`).join('') || '<li>Nessun Derby giocato</li>' : '<li>'+ND+'</li>'}</ul></details>
      ${s.competizione?`<details><summary>Percorso in Champions Cup</summary><ul>${s.coppa.partite.map(p=>`<li>${E(match(p))} · ${E(p.gruppo)}</li>`).join('') || '<li>Nessuna partita nel periodo</li>'}</ul></details>`:''}
      ${s.competizione==='coppa'?'':`<details><summary>Le conferenze</summary><ul>${s.promesse.disponibile ? s.promesse.partite.map(p=>`<li>${p.giornata}ª giornata: ${E(p.promessa)} · ${{v:'Mantenuta',s:'Pari',p:'Tradita'}[p.esito]||'Da valutare'}</li>`).join('') || '<li>Nessuna promessa conservata nel periodo</li>' : '<li>'+ND+'</li>'}</ul></details>`}
      <details><summary>I numeri</summary><p>Totale: ${N(s.numeri.totali)} Fantapunti · Media: ${N(s.numeri.media)} Fantapunti<br>Sul filo: scarto in Fantapunti non superiore a ${N(s.numeri.soglia_sul_filo_fantapunti)}, con un gol di differenza.</p><ul>${s.sul_filo.map(p=>`<li>${E(match(p))} · ${N(p.fantapunti)} contro ${N(p.fantapunti_avversario)} Fantapunti</li>`).join('') || '<li>Nessuna partita entro la soglia</li>'}</ul></details>`;
  }
  const COLORI={V:'#61dbb2',N:'#c2cede',P:'#ff7b85'};
  const ESITI={V:'Vittoria',N:'Pareggio',P:'Sconfitta'};
  // Centra l'inchiostro della lettera, indipendentemente dalla linea di base del font.
  function centroLettera(ctx,lettera,x,y) {
    const m=ctx.measureText(lettera);
    return {x:x+(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,
      y:y+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2};
  }
  function lettera(es) {
    const ctx=document.createElement('canvas').getContext('2d');
    ctx.font='900 16px Inter,system-ui';ctx.textAlign='left';ctx.textBaseline='alphabetic';
    const c=centroLettera(ctx,es,16,16);
    return `<svg class="gb-lettera" viewBox="0 0 32 32" aria-hidden="true"><text x="${c.x}" y="${c.y}">${es}</text></svg>`;
  }
  function pallini(partite,limite=5) {
    return `<div class="gb-forma" aria-label="Ultimi risultati">${partite.slice(-limite).map(m=>`<span class="gb-esito gb-${m.esito}" title="${E(match(m))}" aria-label="${E(match(m))} · ${ESITI[m.esito]}">${lettera(m.esito)}</span>`).join('')}</div>`;
  }
  const legenda=()=>`<p class="gb-legenda"><span class="gb-V">${lettera('V')}</span> Vittoria <span class="gb-N">${lettera('N')}</span> Pareggio <span class="gb-P">${lettera('P')}</span> Sconfitta</p>`;
  function traccia(s) {
    if(!s.andamento.length)return '<p>'+ND+'</p>';
    const a=s.andamento,x=i=>36+i*628/Math.max(1,a.length-1),y=n=>24+(n-1)*15.5;
    return `<svg class="gb-grafico" viewBox="0 0 700 205" role="img" aria-label="Posizione dalla ${a[0].giornata}ª alla ${a.at(-1).giornata}ª giornata. ${a.map(v=>v.giornata+'ª: '+v.posizione+'ª').join('; ')}"><line x1="36" x2="664" y1="24" y2="24" stroke="#ffffff25"/><line x1="36" x2="664" y1="163.5" y2="163.5" stroke="#ffffff25"/><text x="2" y="29" fill="#bfe3ff" font-size="15">1ª</text><text x="0" y="169" fill="#bfe3ff" font-size="15">10ª</text><path d="${a.map((v,i)=>(i?'L':'M')+x(i)+' '+y(v.posizione)).join(' ')}" fill="none" stroke="#bfe3ff" stroke-width="3"/>${a.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v.posizione)}" r="${a.length>17?4:7}" style="fill:${COLORI[s.partite.find(m=>m.giornata===v.giornata)?.esito]||'#ffd166'}"><title>${v.giornata}ª giornata · ${v.posizione}ª posizione</title></circle>`).join('')}<text x="36" y="197" fill="#bfe3ff" font-size="15">${a[0].giornata}ª giornata</text><text x="664" y="197" text-anchor="end" fill="#bfe3ff" font-size="15">${a.at(-1).giornata}ª giornata</text></svg>`;
  }
  function voceHTML(v,curva=false) {
    return v?`<blockquote class="gb-voce ${curva?'gb-curva':''}"><small>${curva?'Dalla Curva'+(v.competizioni?.length?' · '+v.competizioni.map(c=>COMP[c]).join(' + '):''):'Girrr Sport · Redazione'}</small>${v.titolo?'<h4>'+E(v.titolo)+'</h4>':''}<p>${v.tipo==='bilancio'?E(v.testo):'«'+E(v.testo)+'»'}</p><cite>${E(nome(v.autore))}${v.giornata?' · '+v.giornata+'ª giornata':v.data?' · '+new Date(v.data).toLocaleDateString('it-IT',{day:'numeric',month:'long',timeZone:'Europe/Rome'}):''}</cite></blockquote>`:`<p class="gb-assente">${ND}</p>`;
  }
  function curvaHTML(v,comp='campionato') {
    const cit=v?.curva||[],coperti=new Set(cit.flatMap(c=>c.competizioni||[]));
    const mancanti=(comp==='entrambe'?['campionato','coppa']:[comp]).filter(c=>!coperti.has(c));
    return cit.map(c=>voceHTML(c,true)).join('')+mancanti.map(c=>`<p class="gb-assente">Dalla Curva · ${COMP[c]}: ${ND}</p>`).join('');
  }
  function vociSquadra(s) {
    const comp=s.competizione||'campionato',v=s.voci||{},cup=comp==='coppa';
    const valori=cup?[['Derby',s.derby.disponibile?s.derby.giocate:ND,'Giocati nel periodo'],['Vittorie',s.bilancio.vittorie,'In Champions Cup'],['Imbattibilità',s.serie.imbattibilita.partite,'Serie più lunga']]:[['Derby',s.derby.disponibile?s.derby.giocate:ND,'Giocati nel periodo'],['MVP dei tifosi',s.mvp.disponibile?s.mvp.ricevuti:ND,'Premi ricevuti'],['Fiducia del presidente',s.dirigenza.fiducia??'—','Su 100']];
    return `<div class="gb-voci">${voceHTML(v.redazione)}${curvaHTML(v,comp)}</div><div class="gb-mini">${valori.map(([n,val,u])=>`<div><small>${n}</small><strong>${val}</strong><span>${u}</span></div>`).join('')}</div>`;
  }
  function tavole(prima,seconda) {
    return `<div class="gb-viste" aria-label="Le due pagine del bilancio"><button type="button" data-gb-vista="0" aria-pressed="true">1 · Colpo d’occhio</button><button type="button" data-gb-vista="1" aria-pressed="false">2 · Voci e bilancio</button></div><section class="gb-tavola" data-gb-pagina="0">${prima}</section><section class="gb-tavola" data-gb-pagina="1" hidden>${seconda}</section>`;
  }
  function colpoSquadra(s) {
    const kpi=`<div class="gb-kpi"><div><strong>${s.posizione??'—'}<small>${s.posizione?'ª':''}</small></strong><span>${s.competizione==='coppa'?'Posizione nel girone '+s.coppa.gironi.join(', '):'Posizione'}</span></div><div><strong>${s.punti_classifica??'—'}</strong><span>${s.competizione==='coppa'?'Punti nel girone':'Punti in classifica'}</span></div><div><strong>${s.bilancio.gol_fatti}<small> : ${s.bilancio.gol_subiti}</small></strong><span>Gol fatti : Subiti</span></div></div>`;
    const casa=[['In casa',s.casa],['In trasferta',s.trasferta]].map(([n,b])=>`<div><span>${n}</span><strong>${s.competizione==='coppa'?b.vittorie+' vittorie':b.punti+' punti'}</strong><div class="gb-barra"><i style="width:${b.giocate?100*(s.competizione==='coppa'?b.vittorie/b.giocate:b.punti/(3*b.giocate)):0}%"></i></div><small>${b.giocate} partite</small></div>`).join('');
    return kpi+(s.competizione==='coppa'?risultatiCoppa(s):`<div class="gb-riquadro"><h4>La corsa in classifica</h4>${traccia(s)}${legenda()}</div>`)+`<div class="gb-riquadro"><h4>Le ultime partite</h4>${pallini(s.partite,7)}<p class="gb-bilancio"><b>${s.bilancio.vittorie}</b> Vittorie <b>${s.bilancio.pareggi}</b> Pareggi <b>${s.bilancio.sconfitte}</b> Sconfitte</p></div><div class="gb-casa">${casa}</div>`;
  }
  function scheda(s) {return `<h3>${E(nome(s.squadra))}</h3>${tavole(colpoSquadra(s),vociSquadra(s))}<details class="gb-dati"><summary>Tutti i dati della squadra</summary>${dettagli(s)}</details>`;}
  function classificaCampionato(p) {
    const c=p.campionato;
    return `<div class="gb-leader"><small>${c.campione_inverno?'Campione d’inverno':'In vetta'}</small><strong>${E(nome(c.campione_inverno||c.capolista))}</strong><span>${c.partite} partite · ${c.gol} gol nel periodo</span></div><div class="gb-classifica">${p.classifica.map(r=>`<div><b>${r.posizione}.</b><span>${E(nome(r.squadra))}<small class="gb-reti">${r.gol_fatti} gol fatti · ${r.gol_subiti} subiti</small><i class="gb-barra"><i style="width:${100*r.punti/Math.max(1,p.classifica[0].punti)}%"></i></i></span><strong>${r.punti}<small> punti</small></strong>${pallini(p.squadre[r.squadra].partite)}</div>`).join('')}</div>${legenda()}`;
  }

  function lega(p) {
    const c=p.campionato,prima=classificaCampionato(p);
    const v=p.voci||{},red=(v.redazione||[]).find(v=>v.squadra===c.capolista)||(v.redazione||[])[0];
    const seconda=`<div class="gb-voci">${voceHTML(red)}${curvaHTML(v)}</div><div class="gb-primati">${primato(p,'attacco')}${primato(p,'difesa')}</div>`;
    return `<h3>Il campionato</h3>${tavole(prima,seconda)}<div class="gb-tutte"><h4>Il dossier di ogni squadra</h4>${p.classifica.map(r=>`<details><summary>${E(nome(r.squadra))} · ${r.posizione}ª · ${r.punti} punti</summary>${dettagli(p.squadre[r.squadra])}</details>`).join('')}</div>`;
  }
  const COMP={campionato:'Campionato',coppa:'Champions Cup',entrambe:'Campionato + Champions Cup'};
  function vista(p,comp='campionato') {
    if(comp==='campionato')return p;
    const v=p.competizioni?.[comp];if(!v)throw Error('Il bilancio di questa competizione non è disponibile');return v;
  }
  const riepilogo=p=>p.campionato||p.riepilogo;
  const fasciaComp=comp=>`<div class="gb-comp-label">${comp!=='coppa'?'<span class="gb-comp-campionato">Campionato</span>':''}${comp!=='campionato'?'<span class="gb-comp-coppa">Champions Cup</span>':''}</div>`;
  function primato(p,tipo) {
    const r=riepilogo(p).primati?.[tipo];
    return `<div><small>${tipo==='attacco'?'Miglior attacco':'Miglior difesa'}</small><strong>${E((r?.squadre||[]).map(nome).join(', ')||ND)}</strong><span class="gb-primato-numero">${r?.gol==null?ND:N(r.gol)+' gol '+(tipo==='attacco'?'fatti':'subiti')}</span></div>`;
  }
  function risultatiCoppa(s) {
    const b=s.bilancio;
    return `<div class="gb-riquadro gb-cup-percorso"><h4>Il percorso in Champions Cup</h4><p class="gb-qualificazione">${E(s.coppa.qualificazione)}</p><div class="gb-bilancio-coppa">${[['vittorie','Vittorie','V'],['pareggi','Pareggi','N'],['sconfitte','Sconfitte','P']].map(([k,n,es])=>`<div><strong>${b[k]}</strong><span>${n}</span><i class="gb-barra"><i class="gb-${es}" style="width:${b.giocate?100*b[k]/b.giocate:0}%"></i></i></div>`).join('')}</div></div>`;
  }
  function squadreComp(p,t,comp) {
    if(comp!=='entrambe')return scheda(vista(p,comp).squadre[t]);
    const s=vista(p,comp).squadre[t];
    return `<h3>${E(nome(t))}</h3>${tavole(`<div class="gb-totale"><strong>${s.bilancio.gol_fatti} : ${s.bilancio.gol_subiti}</strong><span>Gol fatti : Subiti nelle due competizioni</span></div><div class="gb-due-competizioni"><section class="gb-sportivo" data-comp="campionato">${fasciaComp('campionato')}${colpoSquadra(p.squadre[t])}</section><section class="gb-sportivo" data-comp="coppa">${fasciaComp('coppa')}${colpoSquadra(vista(p,'coppa').squadre[t])}</section></div>`,vociSquadra(s))}<details class="gb-dati"><summary>Tutti i dati delle due competizioni</summary>${dettagli(s)}</details>`;
  }
  function tabellaCoppa(p) {
    const c=riepilogo(p);
    return `<div class="gb-leader"><small>Champions Cup</small><strong>${c.partite} partite · ${c.gol} gol</strong><span>Classifiche distinte per girone</span></div>${p.gironi.map(g=>`<section class="gb-girone"><h4>Girone ${E(g.nome)}</h4><div class="gb-classifica">${g.classifica.map(r=>`<div><b>${r.posizione}.</b><span>${E(nome(r.squadra))}<small class="gb-reti">${r.gol_fatti} gol fatti · ${r.gol_subiti} subiti</small></span><strong>${r.punti}<small> punti</small></strong>${pallini(p.squadre[r.squadra].partite)}</div>`).join('')}</div></section>`).join('')}${p.gironi.length?'':'<p>Nessuna partita di Coppa pubblicata in questo periodo.</p>'}<details><summary>Risultati e fase finale</summary><ul>${Object.values(p.squadre).flatMap(s=>s.partite.filter(m=>m.casa)).map(m=>`<li>${E(match(m))}</li>`).join('')||'<li>Nessuna partita nel periodo</li>'}</ul></details>${legenda()}`;
  }
  function legaComp(p,comp) {
    if(comp==='campionato')return lega(p);
    const v=vista(p,comp),c=riepilogo(v);
    if(comp==='entrambe')return `<h3>Le due competizioni</h3>${tavole(`<div class="gb-due-competizioni"><section class="gb-sportivo" data-comp="campionato">${fasciaComp('campionato')}${classificaCampionato(p)}</section><section class="gb-sportivo" data-comp="coppa">${fasciaComp('coppa')}${tabellaCoppa(vista(p,'coppa'))}</section></div>`,`<h4>Primati nelle due competizioni</h4><div class="gb-primati">${primato(v,'attacco')}${primato(v,'difesa')}</div><h4>Campionato</h4><div class="gb-primati">${primato(p,'attacco')}${primato(p,'difesa')}</div><h4>Champions Cup</h4><div class="gb-primati">${primato(vista(p,'coppa'),'attacco')}${primato(vista(p,'coppa'),'difesa')}</div>${voceHTML(v.voci?.redazione?.[0])}${curvaHTML(v.voci,'entrambe')}`)}<div class="gb-tutte">${p.classifica.map(r=>`<details><summary>${E(nome(r.squadra))}</summary>${dettagli(v.squadre[r.squadra])}</details>`).join('')}</div>`;
    const s=Object.values(v.squadre).find(s=>s.bilancio.giocate);
    return `<h3>La Champions Cup</h3>${tavole(tabellaCoppa(v),`${voceHTML(v.voci?.redazione?.[0])}${curvaHTML(v.voci,'coppa')}<div class="gb-primati">${primato(v,'attacco')}${primato(v,'difesa')}</div>`)}<div class="gb-tutte">${p.classifica.map(r=>`<details><summary>${E(nome(r.squadra))} · Champions Cup</summary>${dettagli(v.squadre[r.squadra])}</details>`).join('')}</div>`;
  }

  function stile() {
    if (document.getElementById('gb-stile')) return;
    const l = document.createElement('link'); l.id='gb-stile';l.rel='stylesheet';l.href=new URL('giro-di-boa.css?v=61-periodi1',ROOT);document.head.append(l);
  }
  function opzioni(j) {return Object.entries(j.periodi).map(([k,p])=>`<option value="${k}">${E(p.etichetta||k)}</option>`).join('');}
  function opzioniComp(){return Object.entries(COMP).map(([k,n])=>`<option value="${k}">${n}</option>`).join('');}
  async function monta(host, team, root = ROOT) {
    stile();host.classList.add('gb');host.classList.toggle('gb-stadio', /\/stadio\//.test(location.pathname));host.innerHTML='<p role="status">Preparo il bilancio…</p>';
    try {
      const j = await carica(root);
      if(document.fonts?.ready)await document.fonts.ready;
      if (!host.isConnected) return;
      host.innerHTML=`<header><small class="gb-versione">6.1 · Bilancio della stagione</small><h2 data-gb-tit></h2><p>La tua squadra o tutto il campionato. Gli stessi fatti nelle immagini e in Radio.</p></header><div class="gb-controlli"><label>Contenuto<select data-gb-ambito><option value="squadra">La squadra</option><option value="lega">Tutto il campionato</option></select></label><label data-gb-scelta>Squadra<select data-gb-squadra>${j.periodi.finora.classifica.map(r=>`<option value="${E(r.squadra)}"${r.squadra===team?' selected':''}>${E(nome(r.squadra))}</option>`).join('')}</select></label><label>Competizione<select data-gb-comp>${opzioniComp()}</select></label><label>Periodo<select data-gb-periodo>${opzioni(j)}</select></label></div><p class="gb-fonte">Tappe dalla 1ª giornata al termine scelto. La Coppa comprende i risultati pubblicati fino alla stessa data.${j.prossima_tappa?' Prossima tappa: '+E(j.prossima_tappa.etichetta)+'.':''}</p><div data-gb-label></div><button type="button" class="gb-bottone" data-gb-album>Prepara le foto</button><div data-gb-contenuto></div><p class="gb-fonte" data-gb-fonte>Dopo l’ultima giornata pubblicata. Posizione e punti sono quelli in classifica; i bilanci riguardano il periodo scelto. A pari punti valgono le regole del Tabellone. La zona retrocessione corrisponde all’ultimo posto.</p>`;
      const q = s=>host.querySelector(s);
      const precedente=scelte.get(team);
      if(precedente){for(const [sel,val] of Object.entries(precedente)){const el=q(sel);if([...el.options].some(o=>o.value===val))el.value=val;}}
      function aggiorna() {
        const k=q('[data-gb-periodo]').value,p=periodo(j,k),t=q('[data-gb-squadra]').value,comp=q('[data-gb-comp]').value,all=q('[data-gb-ambito]').value==='lega';
        q('[data-gb-tit]').textContent=titolo(j,k);q('[data-gb-scelta]').hidden=all;
        q('[data-gb-ambito] option[value=lega]').textContent=comp==='coppa'?'Tutta la Champions Cup':comp==='entrambe'?'La lega, nelle due competizioni':'Tutto il campionato';host.dataset.gbCompetizione=comp;q('[data-gb-fonte]').textContent=comp==='campionato'?'Classifica e punti del Campionato alla tappa scelta. I bilanci riguardano il periodo indicato.':comp==='coppa'?'Punti e posizioni restano quelli dei singoli gironi della Champions Cup. I risultati arrivano fino alla stessa data della tappa di Campionato.':'Classifiche del Campionato e dei gironi di Coppa distinte. I gol totali comprendono entrambe le competizioni; i punti non vengono sommati.';q('[data-gb-label]').innerHTML=fasciaComp(comp);q('[data-gb-contenuto]').innerHTML=all?legaComp(p,comp):squadreComp(p,t,comp);
        const vista=viste.get(team)||'0';q('[data-gb-vista="'+vista+'"]')?.click();
        scelte.set(team,{'[data-gb-periodo]':k,'[data-gb-squadra]':t,'[data-gb-ambito]':all?'lega':'squadra','[data-gb-comp]':comp});
      }
      host.addEventListener('click',e=>{const b=e.target.closest('[data-gb-vista]');if(!b)return;const scope=b.closest('[data-gb-contenuto]');viste.set(team,b.dataset.gbVista);scope.querySelectorAll('[data-gb-vista]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));scope.querySelectorAll('[data-gb-pagina]').forEach(v=>v.hidden=v.dataset.gbPagina!==b.dataset.gbVista);});
      host.querySelectorAll('select').forEach(s=>s.addEventListener('change',aggiorna));aggiorna();
      q('[data-gb-album]').onclick=()=>apri({j,root,squadra:q('[data-gb-squadra]').value,ambito:q('[data-gb-ambito]').value,k:q('[data-gb-periodo]').value,competizione:q('[data-gb-comp]').value});
      host.dataset.pronto='1';
    } catch(e) { host.innerHTML=`<p role="status">${E(e.message)}</p><button type="button" class="gb-bottone">Riprova</button>`;host.querySelector('button').onclick=()=>monta(host,team,root); }
  }
  function linee(ctx, s, max) {
    const words=text(s).split(/\s+/),out=[];let line='';
    words.forEach(w=>{if(ctx.measureText((line?line+' ':'')+w).width>max&&line){out.push(line);line=w;}else line+=(line?' ':'')+w;});if(line)out.push(line);return out;
  }
  async function album(j,{k='finora',ambito='squadra',squadra,competizione='campionato',stadio=/\/stadio\//.test(location.pathname)||document.documentElement.dataset.skin==='stadio'}={}) {
    if(document.fonts?.ready)await document.fonts.ready;
    const base=periodo(j,k),files=[],pagine=competizione==='entrambe'?[['campionato',0],['coppa',0],['entrambe',1]]:[[competizione,0],[competizione,1]];
    for(let idx=0;idx<pagine.length;idx++){
      const [comp,tavola]=pagine[idx],p=vista(base,comp),s=p.squadre[squadra],c=riepilogo(p);
      if(ambito!=='lega'&&!s)throw Error('Squadra non disponibile nel bilancio');
      const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;
      const ctx=cv.getContext('2d'),accent=comp==='coppa'?'#3d93d6':competizione==='entrambe'?'#d62839':stadio?'#ffd166':'#d62839',titoli=comp==='coppa'?'#a6dcff':stadio?'#b4eee2':'#a6dcff',editoriale=stadio?'#c5ddff':'#a6dcff',coloreCurva='#a2edcd',ink='#fbf6ec',mute='#b8cae6';
      const grad=ctx.createLinearGradient(0,0,1080,1350);grad.addColorStop(0,stadio?'#163d47':'#253b70');grad.addColorStop(1,'#111d35');ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
      // Motivo da campo, volutamente tenue dietro ai contenuti.
      ctx.strokeStyle='#ffffff08';ctx.lineWidth=2;ctx.strokeRect(780,60,240,220);ctx.beginPath();ctx.arc(900,170,55,0,Math.PI*2);ctx.stroke();
      function txt(t,x,y,size=28,col=ink,weight=600,max=960){ctx.textBaseline='top';ctx.fillStyle=col;ctx.font=`${weight} ${size}px Inter,system-ui,sans-serif`;ctx.fillText(text(t),x,y,max);}
      function wrap(t,x,y,width,size=30,col=ink,limit=8){ctx.font=`600 ${size}px Inter,system-ui,sans-serif`;const a=linee(ctx,t,width);if(a.length>limit)throw Error('Testo troppo lungo per la tavola');a.forEach((l,i)=>txt(l,x,y+i*(size+12),size,col,600,width));return y+a.length*(size+12);}
      function box(x,y,w,h){ctx.fillStyle='#ffffff0a';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,stadio?24:[5,20,20,5]);else ctx.rect(x,y,w,h);ctx.fill();if(comp==='entrambe'){ctx.fillStyle='#d62839';ctx.fillRect(x,y,stadio?6:8,h/2);ctx.fillStyle='#3d93d6';ctx.fillRect(x,y+h/2,stadio?6:8,h/2);}else{ctx.fillStyle=accent;ctx.fillRect(x,y,stadio?6:8,h);}}
      function dot(es,x,y,r=20){
        ctx.save();ctx.fillStyle=COLORI[es];ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        ctx.font=`900 ${r+3}px Inter,system-ui`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
        const c=centroLettera(ctx,es,x,y);ctx.fillStyle='#11243a';ctx.fillText(es,c.x,c.y);ctx.restore();
      }
      function legend(y){[['V','Vittoria'],['N','Pareggio'],['P','Sconfitta']].forEach(([es,n],i)=>{dot(es,80+i*310,y+16,16);txt(n,110+i*310,y,23,mute);});}
      function quote(v,y,curva=false){
        const h=curva?315:355;box(60,y,960,h);txt(curva?'DALLA CURVA · '+(v?.competizioni||[comp]).map(c=>COMP[c]).join(' + '):'GIRRR SPORT · REDAZIONE',90,y+25,23,curva?coloreCurva:editoriale,800);let at=y+70;
        if(!v){txt(ND,90,at,31,mute);return;}
        if(v.titolo&&v.tipo!=='bilancio')at=wrap(v.titolo,90,at,900,28,ink,3)+10;
        const testo=v.tipo==='bilancio'?v.testo:'«'+v.testo+'»';let size=31;
        for(;size>20;size--){ctx.font=`600 ${size}px Inter,system-ui`;if(linee(ctx,testo,900).length*(size+12)<=y+h-62-at)break;}
        ctx.font=`600 ${size}px Inter,system-ui`;if(linee(ctx,testo,900).length*(size+12)>y+h-62-at)throw Error('Il commento richiede un’altra tavola');
        wrap(testo,90,at,900,size,ink,12);
        txt(nome(v.autore)+(v.giornata?' · '+v.giornata+'ª giornata':v.data?' · '+new Date(v.data).toLocaleDateString('it-IT',{day:'numeric',month:'long',timeZone:'Europe/Rome'}):''),90,y+h-50,22,mute,600,890);
      }
      function primatiFoto(){
        [['attacco','MIGLIOR ATTACCO','fatti'],['difesa','MIGLIOR DIFESA','subiti']].forEach(([key,label,unita],i)=>{
          const r=c.primati?.[key],xx=60+i*500,nomeTeam=(r?.squadre||[]).slice(0,2).map(nome).join(', ');
          txt(label,xx,1080,21,titoli,800);txt(r?.gol==null?ND:r.gol+' gol '+unita,xx,1120,r?.gol==null?25:36,ink,900,450);
          wrap(nomeTeam||ND,xx,1170,450,22,mute,3);
          if(r?.squadre.length>2)txt('Altre '+(r.squadre.length-2)+' a pari merito',xx,1250,18,mute);
        });
      }
      function overviewCoppa(){
        box(60,320,960,100);txt('CHAMPIONS CUP',85,340,20,titoli,800);txt(c.partite+' partite · '+c.gol+' gol',85,372,31,ink,900,900);
        const ff=p.fase_finale||[];
        if(ff.length){let yy=460,ultima=0;for(const m of ff){if(m.giornata!==ultima){txt(({11:'QUARTI',12:'SEMIFINALI',13:'FINALE'})[m.giornata]||'FASE FINALE',60,yy,24,titoli,800);yy+=38;ultima=m.giornata;}yy=wrap(nome(m.squadra_casa)+' '+m.risultato+' '+nome(m.squadra_trasferta),60,yy,960,25,ink,2)+22;if(yy>1240)throw Error('La fase finale richiede un’altra tavola');}return;}
        if(!p.gironi.length){txt('La Coppa non è ancora iniziata a questa tappa.',60,520,30,mute);return;}
        let yy=455;for(const g of p.gironi){txt('GIRONE '+g.nome,60,yy,24,titoli,900);txt('PUNTI',700,yy,19,mute,800);txt('GF',835,yy,19,mute,800);txt('GS',945,yy,19,mute,800);yy+=48;
          for(const r of g.classifica){txt(r.posizione+'.',60,yy,25,mute,800);txt(nome(r.squadra),105,yy,25,ink,800,560);txt(r.punti,720,yy,28,ink,900,80);txt(r.gol_fatti,845,yy,26,ink,700,70);txt(r.gol_subiti,955,yy,26,ink,700,65);yy+=52;}yy+=40;}
        legend(1200);
      }
      txt('O FANT A GIRRR · '+COMP[comp],60,44,20,titoli,900,820);ctx.textAlign='right';txt(j.stagione,1020,44,24,mute,700);ctx.textAlign='left';
      txt(titolo(j,k),60,98,30,mute,700);
      const team=ambito==='lega'?(comp==='coppa'?'Tutta la Champions Cup':comp==='entrambe'?'La stagione della lega':'Tutto il campionato'):nome(squadra);
      let titleSize=stadio?52:48,lines;do{ctx.font=stadio?titleSize+'px Lobster,cursive':'900 '+titleSize+'px Inter,system-ui';lines=linee(ctx,team,960);if(lines.length<=2)break;titleSize-=2;}while(titleSize>=28);if(lines.length>2)throw Error('Nome della squadra troppo lungo');ctx.fillStyle=ink;ctx.textBaseline='top';lines.forEach((v,i)=>ctx.fillText(v,60,152+i*53,960));
      txt((idx+1)+' / '+(tavola===0?'IL COLPO D’OCCHIO':'VOCI E BILANCIO'),60,266,23,titoli,800);
      if(tavola===0&&ambito==='squadra'){
        [[s.posizione==null?'—':s.posizione+'ª',comp==='coppa'?'Posizione nel girone':'Posizione'],[s.punti_classifica==null?'—':String(s.punti_classifica),comp==='coppa'?'Punti nel girone':'Punti in classifica'],[s.bilancio.gol_fatti+' : '+s.bilancio.gol_subiti,'Gol fatti : Subiti']].forEach(([v,n],i)=>{box(60+i*330,320,300,165);txt(v,84+i*330,340,v.length>5?63:85,ink,900,252);txt(n,84+i*330,442,21,mute,700,255);});
        if(comp==='coppa'){txt('IL PERCORSO IN CHAMPIONS CUP',60,532,23,titoli,800);wrap(s.coppa.qualificazione,60,590,960,38,ink,3);txt(s.bilancio.vittorie+' vittorie · '+s.bilancio.pareggi+' pareggi · '+s.bilancio.sconfitte+' sconfitte',60,755,26,mute);}else{
        txt('LA CORSA IN CLASSIFICA',60,532,23,mute,800);
        const a=s.andamento,x=i=>105+i*875/Math.max(1,a.length-1),y=pos=>605+(pos-1)*18;
        [1,5,10].forEach(pos=>{ctx.strokeStyle='#ffffff14';ctx.beginPath();ctx.moveTo(105,y(pos));ctx.lineTo(980,y(pos));ctx.stroke();txt(pos+'ª',60,y(pos)-12,20,mute);});
        ctx.beginPath();a.forEach((v,i)=>{if(i)ctx.lineTo(x(i),y(v.posizione));else ctx.moveTo(x(i),y(v.posizione));});ctx.strokeStyle='#c0dbed';ctx.lineWidth=4;ctx.stroke();
        a.forEach((v,i)=>{ctx.fillStyle=COLORI[s.partite.find(m=>m.giornata===v.giornata)?.esito]||accent;ctx.beginPath();ctx.arc(x(i),y(v.posizione),a.length>17?6:10,0,Math.PI*2);ctx.fill();});
        txt(a[0]?.giornata+'ª giornata',105,795,21,mute);ctx.textAlign='right';txt(a.at(-1)?.giornata+'ª giornata',980,795,21,mute);ctx.textAlign='left';
        }
        txt('LE ULTIME CINQUE',60,858,23,mute,800);
        const recent=s.partite.slice(-5),ww=960/recent.length;
        recent.forEach((m,i)=>{const xx=60+i*ww;dot(m.esito,xx+24,933,23);txt(m.gol_fatti+'–'+m.gol_subiti,xx+60,910,38,ink,900,ww-64);txt(m.giornata+'ª · '+(m.casa?'Casa':'Fuori'),xx,976,20,mute,600,ww-12);});
        legend(1030);
        [['IN CASA',s.casa],['IN TRASFERTA',s.trasferta]].forEach(([n,b],i)=>{const xx=60+i*500;txt(n,xx,1110,22,mute,800);txt(comp==='coppa'?b.vittorie+' vittorie':b.punti+' punti',xx,1149,40,ink,800);txt(b.giocate+' partite',xx+230,1164,22,mute);ctx.fillStyle='#ffffff14';ctx.fillRect(xx,1215,460,10);ctx.fillStyle=accent;ctx.fillRect(xx,1215,b.giocate?460*(comp==='coppa'?b.vittorie/b.giocate:b.punti/(3*b.giocate)):0,10);});
      }else if(tavola===0&&comp==='coppa'){overviewCoppa();
      }else if(tavola===0){
        box(60,320,960,100);txt(c.campione_inverno?'CAMPIONE D’INVERNO':'IN VETTA',85,340,20,titoli,800);txt(nome(c.campione_inverno||c.capolista),85,372,31,ink,900,900);
        txt('SQUADRA',105,449,20,mute,800);txt('PUNTI',595,449,20,mute,800);txt('GF',685,449,20,mute,800);txt('GS',755,449,20,mute,800);txt('ULTIME 5',865,449,20,mute,800);
        p.classifica.forEach((r,i)=>{const yy=494+i*67;txt(r.posizione+'.',60,yy,26,mute,800);txt(nome(r.squadra),105,yy,28,ink,800,450);txt(r.punti,610,yy,30,ink,900,60);txt(r.gol_fatti,685,yy,26,ink,700,65);txt(r.gol_subiti,755,yy,26,ink,700,65);ctx.fillStyle='#ffffff12';ctx.fillRect(105,yy+40,450,4);ctx.fillStyle=accent;ctx.fillRect(105,yy+40,450*r.punti/Math.max(1,p.classifica[0].punti),4);p.squadre[r.squadra].partite.slice(-5).forEach((m,i)=>dot(m.esito,867+i*33,yy+15,13));});
        legend(1200);
      }else{
        const v=ambito==='lega'?p.voci||{}:s.voci||{},red=ambito==='lega'?(v.redazione||[]).find(v=>v.squadra===c.capolista)||(v.redazione||[])[0]:v.redazione;
        quote(red,320);
        const cc=v.curva||[],coperti=new Set(cc.flatMap(c=>c.competizioni||[]));
        if(comp==='entrambe'&&cc.length>1){box(60,710,960,315);txt('DALLA CURVA',90,735,23,coloreCurva,800);cc.slice(0,2).forEach((z,i)=>{let breve=z.testo;if(breve.length>110)breve=breve.slice(0,107).replace(/\s+\S*$/,'')+'…';wrap('«'+breve+'»',90,780+i*110,900,24,ink,3);txt(z.competizioni.map(c=>COMP[c]).join(' + ')+' · '+nome(z.autore)+' · '+new Date(z.data).toLocaleDateString('it-IT',{day:'numeric',month:'short',timeZone:'Europe/Rome'}),90,855+i*110,19,mute,600,900);});}
        else{quote(cc[0],710,true);if(comp==='entrambe'&&cc.length)for(const co of ['campionato','coppa'])if(!coperti.has(co))txt('Curva · '+COMP[co]+': '+ND,90,1042,19,mute,600,900);}

        if(ambito==='lega'){primatiFoto();
        }else{
          (comp==='coppa'?[['DERBY',s.derby.disponibile?s.derby.giocate:'—','Giocati'],['VITTORIE',s.bilancio.vittorie,'In Champions Cup'],['IMBATTIBILITÀ',s.serie.imbattibilita.partite,'Serie più lunga']]:[['DERBY',s.derby.disponibile?s.derby.giocate:'—','Giocati'],['MVP DEI TIFOSI',s.mvp.disponibile?s.mvp.ricevuti:'—','Premi ricevuti'],['FIDUCIA',s.dirigenza.fiducia??'—','Su 100']]).forEach(([n,val,unita],i)=>{txt(n,60+i*330,1080,21,titoli,800);txt(val,60+i*330,1122,64,ink,900);txt(unita,60+i*330,1201,22,mute);});
        }
      }
      ctx.strokeStyle='#ffffff25';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,1275);ctx.lineTo(1020,1275);ctx.stroke();txt((comp==='campionato'?'Campionato · Giornate '+p.dalla_giornata+'–'+p.alla_giornata:COMP[comp]+' · Alla '+p.alla_giornata+'ª di Campionato'),60,1300,21,mute);ctx.textAlign='right';txt((idx+1)+' / '+pagine.length,1020,1300,21,mute);ctx.textAlign='left';
      const blob=await new Promise(ok=>cv.toBlob(ok,'image/png'));if(!blob)throw Error('Impossibile preparare la foto');
      const slug=(ambito==='lega'?'campionato':squadra).toLowerCase().replace(/[^a-z0-9]+/g,'-');files.push({file:new File([blob],`o-girrr-${slug}-${k}-${competizione}-${idx+1}.png`,{type:'image/png'}),url:URL.createObjectURL(blob),canvas:cv});
    }
    return files;
  }
  async function apri(o={}) {
    stile();const focus=document.activeElement,d=document.createElement('dialog');d.className='gb gb-dialogo'+(/\/stadio\//.test(location.pathname)?' gb-stadio':'');d.setAttribute('aria-label','Condividi il bilancio');
    d.innerHTML='<button class="gb-bottone gb-chiudi" type="button">Chiudi ×</button><h2>Le due foto per il gruppo</h2><p role="status">Preparo l’album…</p>';document.body.append(d);d.showModal();
    let files=[];const clean=()=>{files.forEach(v=>URL.revokeObjectURL(v.url));d.remove();focus?.focus();};d.addEventListener('close',clean);d.querySelector('button').onclick=()=>d.close();
    try {
      const j=o.j||await carica(o.root||ROOT),k=o.k||'finora',sq=o.squadra||j.periodi.finora.classifica[0].squadra;
      const area=document.createElement('div');area.innerHTML=`<div class="gb-controlli"><label>Contenuto<select data-gb-a><option value="squadra">La squadra</option><option value="lega">Tutto il campionato</option></select></label><label>Competizione<select data-gb-c>${opzioniComp()}</select></label><label>Periodo<select data-gb-k>${opzioni(j)}</select></label></div><div class="gb-album"></div><div class="gb-azioni"></div>`;d.append(area);area.querySelector('[data-gb-a]').value=o.ambito||'squadra';area.querySelector('[data-gb-k]').value=k;area.querySelector('[data-gb-c]').value=o.competizione||'campionato';
      let seq=0;
      async function aggiorna() {
        const current=++seq,status=d.querySelector('[role=status]'),az=area.querySelector('.gb-azioni');az.innerHTML='';status.textContent='Preparo l’album…';
        const nuovi=await album(j,{k:area.querySelector('[data-gb-k]').value,ambito:area.querySelector('[data-gb-a]').value,squadra:sq,competizione:area.querySelector('[data-gb-c]').value});
        if(!d.isConnected||current!==seq){nuovi.forEach(v=>URL.revokeObjectURL(v.url));return;}
        files.forEach(v=>URL.revokeObjectURL(v.url));files=nuovi;
        area.querySelector('.gb-album').innerHTML=files.map((v,i)=>`<figure><a href="${v.url}" target="_blank" rel="noopener" aria-label="Apri grande la foto ${i+1}"><img src="${v.url}" alt="Foto ${i+1} di ${files.length} del bilancio"></a><figcaption>Foto ${i+1} di ${files.length}</figcaption><a class="gb-bottone" href="${v.url}" download="${v.file.name}">Scarica foto ${i+1}</a></figure>`).join('');
        d.dataset.gbCompetizione=area.querySelector('[data-gb-c]').value;area.querySelector('[data-gb-a] option[value=lega]').textContent=d.dataset.gbCompetizione==='coppa'?'Tutta la Champions Cup':d.dataset.gbCompetizione==='entrambe'?'La lega, nelle due competizioni':'Tutto il campionato';d.querySelector('h2').textContent=files.length===3?'Le tre foto per il gruppo':'Le due foto per il gruppo';status.textContent=files.length+' foto insieme, senza testo aggiunto.';
        const condivisibili=files.map(v=>v.file);
        if(navigator.share&&navigator.canShare?.({files:condivisibili})) {
          const b=document.createElement('button');b.type='button';b.className='gb-bottone';b.textContent=files.length===3?'Condividi le tre foto':'Condividi le due foto';b.dataset.gbInvia='1';az.append(b);
          b.onclick=()=>navigator.share({files:condivisibili}).catch(e=>{if(e.name!=='AbortError')status.textContent='Condivisione non riuscita. Puoi scaricare le foto.';});
        } else status.textContent=files.length+' foto pronte. Su questo browser puoi scaricarle una per una.';
      }
      area.querySelectorAll('select').forEach(s=>s.onchange=()=>aggiorna().catch(e=>{d.querySelector('[role=status]').textContent=e.message;}));await aggiorna();
    }catch(e){if(d.isConnected)d.querySelector('[role=status]').textContent=e.message;}
  }
  window.GirrrBoa={carica,titolo,periodo,sezioni,scheda,lega,album,apri,monta};
  window.GirrrGiroDiBoa=t=>'<section class="gb" data-gb-host data-gb-team="'+E(t)+'"><p role="status">Preparo il bilancio…</p></section>';
  const mount=()=>document.querySelectorAll('[data-gb-host]:not([data-gb-montato])').forEach(h=>{h.dataset.gbMontato='1';monta(h,h.dataset.gbTeam);});
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});mount();
  if (new URLSearchParams(location.search).get('boa')==='1') document.querySelector('[data-ctab=boa]')?.click();
})();
