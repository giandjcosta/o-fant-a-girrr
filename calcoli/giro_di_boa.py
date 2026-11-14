#!/usr/bin/env python3
"""Unico calcolo del Giro di boa per pagina, album e Radio.

Il workflow Calcoli dopo la giornata produce girrr/dati/giro-di-boa.json.
Le prove usano --uscita in una cartella separata; nessuna funzione scrive sul DB.
"""
import argparse
import copy
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import tempfile
import urllib.request

from zone_classifica import _giornate, storia

MANCANTE = 'Dato non conservato'
ANDATA = 17
SCARTO_MINIMO_FP = 1.0


def numero(x):
    return isinstance(x, (float, int)) and not isinstance(x, bool) and math.isfinite(x)


def timestamp(value):
    if not value:
        return None
    try:
        t = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return t.replace(tzinfo=dt.timezone.utc).timestamp() if t.tzinfo is None else t.timestamp()
    except ValueError:
        return None


def pubblicata(d, g, ora):
    presenti = [v for v in (d.get('votiTs', {}).get(str(g['sa'])), d.get('calcTs', {}).get(str(g['sa']))) if v]
    if not presenti:
        return True
    times = [timestamp(v) for v in presenti]
    return all(t is not None for t in times) and ora >= max(times) + 3600


def giornate_pubblicate(d, ora):
    out = []
    for g in _giornate(d):
        if not pubblicata(d, g, ora):
            break
        if not all(numero(fp) for m in g['m'] for fp in (m[1], m[2])):
            raise ValueError('Fantapunti non conservati: impossibile certificare l’ordine del Tabellone')
        out.append(g)
    return out


def bilancio(partite):
    return {'giocate': len(partite), 'vittorie': sum(p['esito'] == 'V' for p in partite),
            'pareggi': sum(p['esito'] == 'N' for p in partite), 'sconfitte': sum(p['esito'] == 'P' for p in partite),
            'gol_fatti': sum(p['gol_fatti'] for p in partite), 'gol_subiti': sum(p['gol_subiti'] for p in partite),
            'punti': sum(3 if p['esito'] == 'V' else 1 if p['esito'] == 'N' else 0 for p in partite)}


def serie(partite, predicate):
    best, run = [], []
    for p in partite:
        run = run + [p] if predicate(p) else []
        if len(run) > len(best):
            best = run[:]
    return {'partite': len(best), 'dalla': best[0]['giornata'] if best else None,
            'alla': best[-1]['giornata'] if best else None}


def partita(g, m, squadra, coppa=False):
    a, b, fc, ft, risultato = (m[1], m[4], m[2], m[3], m[5]) if coppa else (m[0], m[3], m[1], m[2], m[4])
    ca = a == squadra
    gol = list(map(int, risultato.split('-')))
    gf, gs = gol if ca else reversed(gol)
    fp, opp_fp = (fc, ft) if ca else (ft, fc)
    return {'giornata': g['n'], 'serie_a': g['sa'], 'casa': ca, 'competizione':'coppa' if coppa else 'campionato', 'avversario': b if ca else a,
            'gol_fatti': gf, 'gol_subiti': gs, 'esito': 'V' if gf > gs else 'N' if gf == gs else 'P',
            'fantapunti': fp if numero(fp) else None, 'fantapunti_avversario': opp_fp if numero(opp_fp) else None,
            'risultato': f'{gol[0]}-{gol[1]}', 'squadra_casa': a, 'squadra_trasferta': b}


def estremo(partite, vittoria):
    validi = [p for p in partite if p['esito'] == ('V' if vittoria else 'P')]
    if not validi:
        return None
    key = lambda p: (abs(p['gol_fatti'] - p['gol_subiti']), p['gol_fatti'] if vittoria else p['gol_subiti'])
    massimo = max(map(key, validi))
    records = [p for p in validi if key(p) == massimo]
    return {'partita': records[0], 'ex_aequo': records[1:]}


def coppa(d, squadra, da_sa, fino_sa, ora):
    tutte = []
    valide = [g for g in d.get('cal', {}).get('cup', []) if g['sa'] <= fino_sa and g.get('m') and all(len(m) >= 6 and re.fullmatch(r'\d+-\d+', str(m[5])) for m in g['m']) and pubblicata(d, g, ora)]
    for g in d.get('cal', {}).get('cup', []):
        if g not in valide:
            continue
        for m in g['m']:
            if squadra in (m[1], m[4]):
                tutte.append(dict(partita(g, m, squadra, True), gruppo=m[0]))
    periodo = [p for p in tutte if p['serie_a'] >= da_sa]
    gruppi_avviati = {m[0] for g in valide if g['n']<=10 for m in g['m']}
    gironi = sorted({m[0] for g in d.get('cal',{}).get('cup',[]) if g['n']<=10 for m in g.get('m',[]) if squadra in (m[1],m[4]) and m[0] in gruppi_avviati and re.fullmatch(r'[A-Z]',m[0])})
    stato = 'Qualificazione ancora aperta' if tutte else MANCANTE
    posizione = None
    punti_girone = None
    riga_girone = None
    if gironi:
        gruppo = gironi[-1]
        calendario = [(g, m) for g in d.get('cal', {}).get('cup', []) for m in g.get('m', []) if g['n']<=10 and m[0] == gruppo]
        teams = {t for _, m in calendario for t in (m[1], m[4])}
        tab = {t: {'t': t, 'pt': 0, 'fp': 0.0, 'gf': 0, 'gs': 0, 'g': 0, 'tot': sum(t in (m[1], m[4]) for _, m in calendario)} for t in teams}
        for g, m in calendario:
            if g not in valide:
                continue
            a, b = map(int, m[5].split('-'))
            for t, gf, gs, fp in ((m[1], a, b, m[2]), (m[4], b, a, m[3])):
                r = tab[t];r['g'] += 1;r['gf'] += gf;r['gs'] += gs;r['fp'] += float(fp) if numero(fp) else 0
                r['pt'] += 3 if gf > gs else 1 if gf == gs else 0
        ordine = sorted(tab.values(), key=lambda r: (-r['pt'], -r['fp'], -(r['gf']-r['gs']), -r['gf'], r['t']))
        posizione = next(i+1 for i, r in enumerate(ordine) if r['t'] == squadra)
        own = tab[squadra];punti_girone = own['pt']
        riga_girone={'squadra':squadra,'posizione':posizione,'punti':own['pt'],'gol_fatti':own['gf'],'gol_subiti':own['gs'],'giocate':own['g']}
        # Solo certezza matematica: in parità i Fantapunti futuri non sono noti.
        possibili = sum(r['pt'] + 3*(r['tot']-r['g']) >= own['pt'] for r in ordine if r['t'] != squadra)
        irraggiungibili = sum(r['pt'] > own['pt'] + 3*(own['tot']-own['g']) for r in ordine if r['t'] != squadra)
        if all(r['g'] == r['tot'] for r in ordine):
            stato = 'Qualificata ai quarti' if posizione <= 4 else 'Eliminata nel girone'
        elif possibili <= 3:
            stato = 'Qualificata matematicamente ai quarti'
        elif irraggiungibili >= 4:
            stato = 'Eliminata matematicamente dal girone'
    eliminazione = [p for p in tutte if p['giornata'] >= 11]
    if eliminazione:
        last = eliminazione[-1]
        vincenti={11:'Qualificata alle semifinali',12:'Qualificata in finale',13:'Vincitrice della Champions Cup'}
        perdenti={11:'Eliminata ai quarti',12:'Eliminata in semifinale',13:'Finalista'}
        stato = vincenti.get(last['giornata'],MANCANTE) if last['esito']=='V' else perdenti.get(last['giornata'],MANCANTE) if last['esito']=='P' else MANCANTE
    return {**bilancio(periodo), 'partite': periodo, 'gironi': gironi, 'posizione_girone': posizione,
            'punti_girone': punti_girone, 'riga_girone':riga_girone, 'qualificazione': stato}


def calcola_periodo(d, giornate, da, a, fiducia, aspettative, derby, mvp, ora, nome):
    source = copy.deepcopy(d);source['cal']['lega'] = [g for g in giornate if g['n'] <= a]
    hist = storia(source);by_n = {h['giornata']: h for h in hist}
    ultima = hist[-1] if hist else {'classifica': [], 'posizioni': {}}
    classifica = ultima['classifica'];out = {}
    selezionate = [g for g in giornate if da <= g['n'] <= a]
    sa_inizio = selezionate[0]['sa'] if selezionate else 0
    sa_fine = selezionate[-1]['sa'] if selezionate else 0
    coppie = {tuple(sorted((p['a'], p['b']))): p for p in (derby or {}).get('coppie', [])}
    for r in classifica:
        team = r['t'];pp = [partita(g, m, team) for g in selezionate for m in g['m'] if team in (m[0], m[3])]
        f = fiducia.get('squadre', {}).get(team, {});exp = aspettative.get('squadre', {}).get(team, {})
        attesa = exp.get('attesa', f.get('aspettativa'))
        fh = next((h for h in f.get('storico', []) if h.get('giornata') == a), {})
        trust = fh.get('fiducia', f.get('fiducia') if f.get('giornate', fiducia.get('giornata')) == a else None)
        promesse = [p for p in f.get('promesse', []) if da <= p.get('giornata', 0) <= a]
        def nome_derby(p):
            pair = coppie.get(tuple(sorted((team, p['avversario']))))
            # Le coppie dichiarate ufficiali oggi non provano quando lo fossero in passato.
            # Il resoconto dichiara esplicitamente l'ambito del registro consultato.
            return pair.get('n', 'Derby') if pair else None
        der = [dict(p, nome_derby=nome_derby(p)) for p in pp if nome_derby(p)]
        awards = [w for w in (mvp or {}).get('archivio', []) if da <= w.get('giornata', 0) <= a and w.get('classifica') and w['classifica'][0].get('team') == team]
        totals = [p['fantapunti'] for p in pp]
        close = [dict(p, scarto_fantapunti=round(abs(p['fantapunti']-p['fantapunti_avversario']),3)) for p in pp if abs(p['gol_fatti']-p['gol_subiti']) == 1 and numero(p['fantapunti']) and numero(p['fantapunti_avversario']) and abs(p['fantapunti']-p['fantapunti_avversario']) <= SCARTO_MINIMO_FP]
        delta = attesa-r['pos'] if numero(attesa) else None
        out[team] = {'squadra': team, 'posizione': r['pos'], 'punti_classifica': r['pt'],
            'distacco_vetta': classifica[0]['pt']-r['pt'], 'distacco_podio':max(0,classifica[min(2,len(classifica)-1)]['pt']-r['pt']), 'margine_ultimo_posto': r['pt']-classifica[-1]['pt'],
            'in_zona_retrocessione': r['pos'] == len(classifica),
            'distacco_penultimo': max(0, classifica[-2]['pt']-r['pt']) if len(classifica)>1 else None,
            'bilancio': bilancio(pp), 'casa': bilancio([p for p in pp if p['casa']]), 'trasferta': bilancio([p for p in pp if not p['casa']]),
            'differenza_reti': sum(p['gol_fatti']-p['gol_subiti'] for p in pp),
            'vittoria_piu_larga': estremo(pp, True), 'sconfitta_piu_pesante': estremo(pp, False),
            'serie': {'vittorie': serie(pp, lambda p:p['esito']=='V'), 'imbattibilita': serie(pp, lambda p:p['esito']!='P'),
                      'senza_vittorie': serie(pp, lambda p:p['esito']!='V'), 'senza_gol': serie(pp, lambda p:p['gol_fatti']==0)},
            'andamento': [{'giornata': g['n'], 'posizione': by_n[g['n']]['posizioni'][team]} for g in selezionate],
            'dirigenza': {'attesa': attesa, 'fascia': exp.get('fascia', MANCANTE), 'obiettivo': exp.get('obiettivo', f.get('obiettivo', MANCANTE)),
                         'fiducia': trust, 'scostamento_posizioni': delta, 'giudizio': MANCANTE if delta is None else 'Sopra le attese' if delta>=2 else 'Sotto le attese' if delta<=-2 else 'In linea con le attese'},
            'derby': {'disponibile': derby is not None, 'criterio': 'Coppie del registro disponibile; ufficialità storica: Dato non conservato', 'partite': der, **bilancio(der)},
            'coppa': coppa(d, team, sa_inizio, sa_fine, ora),
            'promesse': {'disponibile': 'promesse' in f, 'partite': promesse, 'mantenute': sum(p.get('esito')=='v' for p in promesse),
                         'pari': sum(p.get('esito')=='s' for p in promesse), 'tradite': sum(p.get('esito')=='p' for p in promesse),
                         'da_valutare': sum(not p.get('esito') for p in promesse)},
            'mvp': {'disponibile': mvp is not None, 'ricevuti': len(awards), 'giornate': [w['giornata'] for w in awards]},
            'sul_filo': close, 'partite': pp,
            'numeri': {'unita': 'Fantapunti', 'totali': round(sum(totals), 3) if all(numero(v) for v in totals) else None,
                       'media': round(sum(totals)/len(totals), 3) if totals and all(numero(v) for v in totals) else None,
                       'soglia_sul_filo_fantapunti': SCARTO_MINIMO_FP}}
    rows = [{'squadra': r['t'], 'posizione': r['pos'], 'punti': r['pt'], 'gol_fatti': r['gf'], 'gol_subiti': r['gs']} for r in classifica]
    return {'tipo': nome, 'dalla_giornata': da, 'alla_giornata': a, 'serie_a': sa_fine,
            'giornate_giocate': len(selezionate), 'completo': nome=='andata' and a==ANDATA,
            'classifica': rows, 'squadre': out,
            '_derby_coppie':{pair:p.get('n','Derby') for pair,p in coppie.items()},
            'campionato': {'capolista': rows[0]['squadra'] if rows else None,
                           'campione_inverno': rows[0]['squadra'] if nome=='andata' and a==ANDATA and rows else None,
                           'partite': sum(len(g['m']) for g in selezionate),
                           'gol': sum(v['bilancio']['gol_fatti'] for v in out.values()),
                           'sopra_le_attese': [t for t,v in out.items() if v['dirigenza']['giudizio']=='Sopra le attese'],
                           'sotto_le_attese': [t for t,v in out.items() if v['dirigenza']['giudizio']=='Sotto le attese'],
                           'miglior_attacco': [t for t,v in out.items() if v['bilancio']['gol_fatti']==max((x['bilancio']['gol_fatti'] for x in out.values()),default=0)],
                           'miglior_difesa': [t for t,v in out.items() if v['bilancio']['gol_subiti']==min((x['bilancio']['gol_subiti'] for x in out.values()),default=0)]}}



def firma_settimana(d, giornate, fino, stagione, ora):
    """Stessa serializzazione dei fatti pubblicati di tifosi/model.js."""
    sa=next(g['sa'] for g in giornate if g['n']==fino)
    def turno(g, cup=False):
        mm=[]
        for m in g.get('m',[]):
            r=m[:6 if cup else 5]
            if not pubblicata(d,g,ora):r[-1]='-'
            mm.append(r)
        return {'n':g['n'],'sa':g['sa'],'m':mm}
    facts={'stagione':stagione,'league':[turno(g) for g in giornate if g['n']<=fino],
           'cup':[turno(g,True) for g in d.get('cal',{}).get('cup',[]) if g['sa']<=sa]}
    def js(v):
        if isinstance(v,float) and v.is_integer():return int(v)
        if isinstance(v,list):return [js(x) for x in v]
        if isinstance(v,dict):return {k:js(x) for k,x in v.items()}
        return v
    return hashlib.sha256(json.dumps(js(facts),ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def aggiungi_voci(core,d,giornate,edizione,curva,ora):
    """Solo racconti firmati e parole realmente conservate. Nessuna citazione inventata."""
    stagione=core['stagione'];teams=list(core['periodi']['finora']['squadre'])
    def estratto(t,maxlen=180):
        t=re.sub(r'\s+',' ',str(t or '')).strip()
        t=re.sub(r'\bderby\b','Derby',t,flags=re.I)
        t=re.sub(r'·\s*([a-zà-ÿ])',lambda m:'· '+m[1].upper(),t)
        if len(t)<=maxlen:return t
        frasi=re.split(r'(?<=[.!?])\s+',t);out=''
        for frase in frasi:
            if len(out)+len(frase)+1>maxlen:break
            out+=(' ' if out else '')+frase
        return out or t[:maxlen].rsplit(' ',1)[0]+'…'
    posts={str(p.get('id')):p for p in (curva or {}).get('posts',[])}
    reactions={}
    for r in (curva or {}).get('react',[]):
        if r.get('kind')=='a':reactions[r.get('k')]=reactions.get(r.get('k'),0)+r.get('n',0)
    candidati=[dict(p,chiave='p'+str(p.get('id'))) for p in posts.values()]
    for p in (curva or {}).get('replies',[]):
        parent=posts.get(str(p.get('k',''))[1:]) if str(p.get('k','')).startswith('p') else None
        if parent:candidati.append(dict(p,chiave='r'+str(p.get('id')),contesto=parent.get('body',''),parent=parent.get('id')))
    inizio=dt.datetime(int(stagione[:4]),8,1,tzinfo=dt.timezone.utc).timestamp()
    for k,p in core['periodi'].items():
        n=p['alla_giornata'];voce_set=(edizione or {}).get('giornate',{}).get(str(n),{})
        valida=bool(n and (edizione or {}).get('stagione')==stagione and voce_set.get('firma')==firma_settimana(d,giornate,n,stagione,ora))
        last=next((g for g in giornate if g['n']==n),{})
        tempi=[timestamp(v) for v in (d.get('votiTs',{}).get(str(last.get('sa'))),d.get('calcTs',{}).get(str(last.get('sa')))) if timestamp(v) is not None]
        # Per un bilancio storico non attribuiamo commenti successivi alla chiusura.
        fine=ora if k in ('finora','ritorno') else max(tempi)+3600 if tempi else None
        if p['dalla_giornata']>1:
            prev=next(g for g in giornate if g['n']==p['dalla_giornata']-1)
            tt=[timestamp(v) for v in (d.get('votiTs',{}).get(str(prev['sa'])),d.get('calcTs',{}).get(str(prev['sa']))) if timestamp(v) is not None]
            dal=max(tt)+3600 if tt else None
        else:dal=inizio
        citazioni=[]
        for c in candidati:
            ts=c.get('ts');ts=ts/1000 if numero(ts) else timestamp(c.get('created'))
            body=c.get('body','')
            if dal is None or fine is None or not numero(ts) or not dal<=ts<=fine:continue
            if not re.search(r'paregg|vittori|sconfitt|partit|Derby|campionato|punti|classifica|coppa|champions|girone|europe',body,re.I):continue
            if not body or len(body)<45 or re.search(r'fantapunt|voto finale|bonus|malus|scommess|quota|puntat[ao]|\bDio\b',body,re.I):continue
            citazioni.append(dict(c,data_utc=dt.datetime.fromtimestamp(ts,dt.timezone.utc).isoformat(),gradimento=reactions.get(c['chiave'],0)))
        p['_curva_candidati']=citazioni
        def cita(c):return {'fonte':'Curva','id':c['chiave'],'autore':c.get('team',MANCANTE),'testo':estratto(c['body']),
                           'data':c['data_utc'],'post':c.get('parent',c.get('id'))}
        for team,sq in p['squadre'].items():
            aliases=[team.lower()]
            if team=='Oranje VC':aliases+=['orange vc','oranje','orange']
            if team=='The Blue brothers':aliases+=['blues brothers','blue brothers']
            def pertinente(c):
                contenuto=(c.get('body','')+' '+c.get('contesto','')).lower()
                # La sola appartenenza dell'autore non rende un commento pertinente alla squadra.
                return any(re.search(r'(?<!\w)'+re.escape(a)+r'(?!\w)',contenuto) for a in aliases)
            scelte=sorted((c for c in citazioni if pertinente(c)),key=lambda c:(c['data_utc'],c['gradimento']),reverse=True)
            week=voce_set.get('squadre',{}).get(team,{}) if valida else {}
            red={'fonte':'Girrr Sport','autore':'Redazione','giornata':n,'titolo':week.get('titolo'),
                 'testo':estratto((week.get('paragrafi') or [''])[0])} if week.get('paragrafi') else None
            sq['voci']={'redazione':red,'curva':[cita(c) for c in scelte[:2]]}
        p['voci']={'redazione':[sq['voci']['redazione']|{'squadra':t} for t,sq in p['squadre'].items() if sq['voci']['redazione']],
                    'curva':[cita(c) for c in sorted((c for c in citazioni if not c.get('parent')),key=lambda c:(c['gradimento'],c['data_utc']),reverse=True)[:2]]}


def statistiche_partite(pp):
    totali=[p['fantapunti'] for p in pp]
    close=[dict(p,scarto_fantapunti=round(abs(p['fantapunti']-p['fantapunti_avversario']),3)) for p in pp if abs(p['gol_fatti']-p['gol_subiti'])==1 and numero(p['fantapunti']) and numero(p['fantapunti_avversario']) and abs(p['fantapunti']-p['fantapunti_avversario'])<=SCARTO_MINIMO_FP]
    return {'bilancio':bilancio(pp),'casa':bilancio([p for p in pp if p['casa']]),'trasferta':bilancio([p for p in pp if not p['casa']]),
            'partite':pp,'differenza_reti':sum(p['gol_fatti']-p['gol_subiti'] for p in pp),
            'vittoria_piu_larga':estremo(pp,True),'sconfitta_piu_pesante':estremo(pp,False),
            'serie':{'vittorie':serie(pp,lambda p:p['esito']=='V'),'imbattibilita':serie(pp,lambda p:p['esito']!='P'),
                     'senza_vittorie':serie(pp,lambda p:p['esito']!='V'),'senza_gol':serie(pp,lambda p:p['gol_fatti']==0)},
            'sul_filo':close,'numeri':{'unita':'Fantapunti','totali':round(sum(totali),3) if all(numero(v) for v in totali) else None,
            'media':round(sum(totali)/len(totali),3) if totali and all(numero(v) for v in totali) else None,'soglia_sul_filo_fantapunti':SCARTO_MINIMO_FP}}


def primati(squadre):
    # Una squadra che riposa e non ha giocato non è la miglior difesa con zero gol.
    attive=[s for s in squadre.values() if s['bilancio']['giocate']]
    out={}
    for chiave,campo,op in [('attacco','gol_fatti',max),('difesa','gol_subiti',min)]:
        n=op((s['bilancio'][campo] for s in attive),default=None)
        out[chiave]={'gol':n,'squadre':[s['squadra'] for s in attive if s['bilancio'][campo]==n]}
    return out


def aggiungi_competizioni(p,aspettative):
    cup={};miste={};gironi={}
    for t,s in p['squadre'].items():
        cp=s['coppa'];pp=cp['partite'];row=cp.get('riga_girone')
        # Le coppie ufficiali possono non essersi ancora incontrate in Campionato.
        pairs=p.get('_derby_coppie',{})
        der_cup=[dict(m,nome_derby=pairs[tuple(sorted((t,m['avversario'])))]) for m in pp if tuple(sorted((t,m['avversario']))) in pairs]
        c=copy.deepcopy(s);c.update(statistiche_partite(pp));c.update(competizione='coppa',posizione=cp['posizione_girone'],punti_classifica=cp['punti_girone'],andamento=[],
            distacco_vetta=None,margine_ultimo_posto=None,in_zona_retrocessione=False,distacco_penultimo=None)
        for bil in ('bilancio','casa','trasferta'):c[bil]['punti']=None
        c['derby']={**s['derby'],'partite':der_cup,**bilancio(der_cup)}
        c['dirigenza']={**s['dirigenza'],'attesa':None,'scostamento_posizioni':None,'obiettivo':aspettative.get('squadre',{}).get(t,{}).get('coppa',MANCANTE),'giudizio':MANCANTE}
        c['promesse']={'disponibile':False,'partite':[],'mantenute':0,'pari':0,'tradite':0,'da_valutare':0}
        c['mvp']={'disponibile':False,'ricevuti':0,'giornate':[]}
        c['voci']={'redazione':None,'curva':[]}
        # Bilancio fattuale, senza attribuire una citazione a chi non l'ha pronunciata.
        if pp:
            b=c['bilancio'];c['voci']['redazione']={'tipo':'bilancio','titolo':'Il punto sulla Champions Cup','fonte':'Champions Cup','autore':'Girrr Sport',
                'giornata':None,'testo':f"{b['giocate']} partite: {b['vittorie']} vittorie, {b['pareggi']} pareggi e {b['sconfitte']} sconfitte. {b['gol_fatti']} gol fatti, {b['gol_subiti']} subiti. {cp['qualificazione']}."}
        cup[t]=c
        if row:
            for g in cp['gironi']:gironi.setdefault(g,[]).append(row)
        m=copy.deepcopy(s);m.update(statistiche_partite(s['partite']+pp));m['competizione']='entrambe'
        for bil in ('bilancio','casa','trasferta'):m[bil]['punti']=None
        # Nel turno possono esserci due gare senza orario conservato: nessuna serie mista inventata.
        m['serie']=copy.deepcopy(s['serie']);m['serie_coppa']=copy.deepcopy(c['serie'])
        der=s['derby']['partite']+der_cup;m['derby']={**s['derby'],'partite':der,**bilancio(der)}
        m['campionato']=s;m['solo_coppa']=c;miste[t]=m
    def riepilogo(squadre):
        pr=primati(squadre)
        return {'partite':sum(s['bilancio']['giocate'] for s in squadre.values())//2,'gol':sum(s['bilancio']['gol_fatti'] for s in squadre.values()),
                'primati':pr,'miglior_attacco':pr['attacco']['squadre'],'miglior_difesa':pr['difesa']['squadre']}
    meta={k:p[k] for k in ('tipo','dalla_giornata','alla_giornata','serie_a','giornate_giocate','completo','etichetta','titolo')}
    p['campionato']['primati']=primati(p['squadre'])
    p['competizioni']={'coppa':{**meta,'competizione':'coppa','squadre':cup,'classifica':[],
            'gironi':[{'nome':g,'classifica':sorted(rr,key=lambda r:r['posizione'])} for g,rr in sorted(gironi.items())],
            'riepilogo':riepilogo(cup),'fase_finale':sorted([m for s in cup.values() for m in s['partite'] if m['casa'] and m['giornata']>=11],key=lambda m:(m['giornata'],m['squadra_casa']))},
        'entrambe':{**meta,'competizione':'entrambe','squadre':miste,'classifica':p['classifica'],'riepilogo':riepilogo(miste)}}
    p.pop('_derby_coppie',None)



def editoriali_coerenti(core):
    """Ogni commento è costruito sui fatti della vista; le citazioni restano parole realmente pubblicate."""
    def alias(t):
        return [t.lower()]+({'Oranje VC':['oranje','orange vc'], 'The Blue brothers':['blues brothers','blue brothers']}.get(t,[]))
    def riferimenti(testo,teams):
        return {t for t in teams if any(re.search(r'(?<!\w)'+re.escape(a)+r'(?!\w)',testo,re.I) for a in alias(t))}
    def nome(t):return 'The Blues Brothers' if t=='The Blue brothers' else t
    def frase_leader(rows):
        if not rows:return 'Nessuna classifica disponibile.'
        a=rows[0]
        if len(rows)<2:return f"{nome(a['squadra'])} è prima con {a['punti']} punti."
        b=rows[1];gap=a['punti']-b['punti']
        return f"{nome(a['squadra'])} guida con {a['punti']} punti, a pari punti con {nome(b['squadra'])}." if gap==0 else f"{nome(a['squadra'])} guida con {a['punti']} punti, {gap} in più di {nome(b['squadra'])}."
    def generale_lega(p):
        rows=p['classifica'];out=[frase_leader(rows)]
        if len(rows)<2:return ' '.join(out)
        cluster=[]
        for i in range(1,len(rows)-1):
            for end in range(i+2,len(rows)):
                if rows[i]['punti']-rows[end]['punti']<=3 and end-i+1>len(cluster):cluster=rows[i:end+1]
        if cluster:out.append(f"Dal {cluster[0]['posizione']}° al {cluster[-1]['posizione']}° posto ci sono {cluster[0]['punti']-cluster[-1]['punti']} punti.")
        a,b=rows[-1],rows[-2];gap=b['punti']-a['punti']
        out.append(f"In coda {nome(a['squadra'])} ha {a['punti']} punti, {gap} in meno della penultima." if gap else f"In coda {nome(a['squadra'])} e {nome(b['squadra'])} sono a pari punti ({a['punti']}).")
        return ' '.join(out)
    def generale_coppa(p):
        finali=p.get('fase_finale',[])
        if finali:
            n=max(m['giornata'] for m in finali);mm=[m for m in finali if m['giornata']==n]
            if n==13 and len(mm)==1:
                m=mm[0];win=m['squadra_casa'] if m['gol_fatti']>m['gol_subiti'] else m['squadra_trasferta'] if m['gol_subiti']>m['gol_fatti'] else None
                return f"{win} vince la Champions Cup: {m['squadra_casa']} {m['risultato']} {m['squadra_trasferta']}." if win else 'Finale in parità: esito successivo Dato non conservato.'
            return 'Fase finale. '+ ' '.join(f"{m['squadra_casa']} {m['risultato']} {m['squadra_trasferta']}." for m in mm)
        return ' '.join('Girone '+g['nome']+': '+frase_leader(g['classifica']) for g in p['gironi']) or 'Nessuna partita di Champions Cup è ancora pubblicata per questa tappa.'
    def conta(n,uno,tanti):return str(n)+' '+(uno if n==1 else tanti)
    def squadra(s,comp):
        b=s['bilancio'];t=nome(s['squadra'])
        if comp=='campionato':
            testa=f"{t} è {s['posizione']}ª con {s['punti_classifica']} punti. "+('È in vetta.' if s['distacco_vetta']==0 else f"La vetta dista {conta(s['distacco_vetta'],'punto','punti')}.")
        elif comp=='coppa':
            cp=s['coppa'];testa=f"{t}: "+(f"{cp['punti_girone']} punti nel girone {', '.join(cp['gironi'])}. " if cp['punti_girone'] is not None else '')+cp['qualificazione']+'.'
        else:
            cl=s['campionato'];cp=s['solo_coppa']['coppa'];testa=f"{t}: {cl['posizione']}ª con {cl['punti_classifica']} punti in Campionato. In Champions Cup: "+(f"{cp['punti_girone']} punti nel girone. " if cp['punti_girone'] is not None else '')+cp['qualificazione']+'.'
        return testa+f" Bilancio: {conta(b['vittorie'],'vittoria','vittorie')}, {conta(b['pareggi'],'pareggio','pareggi')}, {conta(b['sconfitte'],'sconfitta','sconfitte')}; {b['gol_fatti']} gol fatti e {b['gol_subiti']} subiti."
    for p in core['periodi'].values():
        teams=list(p['squadre']);pool=p.pop('_curva_candidati',[])
        matches=[m for s in p['squadre'].values() for m in s['partite']]+[m for s in p['competizioni']['coppa']['squadre'].values() for m in s['partite']]
        def argomento(c):
            body=c.get('body','');cont=body+' '+c.get('contesto','');refs=riferimenti(cont,teams)
            if re.search(r'\b(abbiamo|nostr[ioa]|nostri|siamo|ci rifaremo)\b',body,re.I) and c.get('team') in teams and not c.get('parent'):refs.add(c['team'])
            co=set()
            if re.search(r'campionat|scudetto|retrocess|salvezza',cont,re.I) or re.search('classifica',cont,re.I) and not re.search(r'coppa|Champions|girone',cont,re.I):co.add('campionato')
            if re.search(r'Champions|coppa|europe[oa]|girone|quarti|semifinal',cont,re.I):co.add('coppa')
            esplicito=bool(co)
            if not co and len(refs)>=2:
                cand=[m for m in matches if m['squadra_casa'] in refs and m['squadra_trasferta'] in refs]
                if re.search('paregg',body,re.I):cand=[m for m in cand if m['esito']=='N']
                score=re.search(r'(\d+)\s*[-–]\s*(\d+)',body)
                if score:cand=[m for m in cand if m['risultato'] in (score[1]+'-'+score[2],score[2]+'-'+score[1])]
                co={m['competizione'] for m in cand}
            globale=bool(re.search(r'classifica|vetta|capolista|lotta|retrocess|salvezza|qualific|girone|quarti|semifinal|finale|primo posto|ultimo posto|campionato.*(?:apert|equilibr|combatt)',body,re.I)) and not re.search(r'\b(abbiamo|nostr[ioa]|siamo|trovarsi|ringraziamo)\b',body,re.I)
            return {**c,'riferimenti':refs,'competenze':co,'ambigua':len(co)>1 and not esplicito,'globale':globale}
        pool=[argomento(c) for c in pool]
        def citazioni(t,comp):
            valide=[c for c in pool if not c['ambigua'] and (t in c['riferimenti'] if t else c['globale'])]
            valide.sort(key=lambda c:(c['data_utc'],c['gradimento']),reverse=True)
            def cita(c):
                body=re.sub(r'\s+',' ',c['body']).strip();body=re.sub(r'\bderby\b','Derby',body,flags=re.I);body=re.sub(r'·\s*([a-zà-ÿ])',lambda m:'· '+m[1].upper(),body)
                if len(body)>200:body=body[:197].rsplit(' ',1)[0]+'…'
                return {'fonte':'Curva','id':c['chiave'],'autore':c.get('team',MANCANTE),'testo':body,'data':c['data_utc'],
                        'competizioni':sorted(c['competenze']),'post':c.get('parent',c.get('id'))}
            if comp!='entrambe':return [cita(c) for c in valide if c['competenze']=={comp}][:1]
            entrambe=next((c for c in valide if c['competenze']=={'campionato','coppa'}),None)
            if entrambe:return [cita(entrambe)]
            return [cita(next(c for c in valide if c['competenze']=={co})) for co in ('campionato','coppa') if any(c['competenze']=={co} for c in valide)]
        for comp,v in [('campionato',p),*p['competizioni'].items()]:
            generale=generale_lega(p) if comp=='campionato' else generale_coppa(v) if comp=='coppa' else 'Campionato: '+generale_lega(p)+' Champions Cup: '+generale_coppa(p['competizioni']['coppa'])
            title='La situazione del Campionato' if comp=='campionato' else 'La situazione della Champions Cup' if comp=='coppa' else 'La stagione nelle due competizioni'
            if comp=='campionato' and len(p['classifica'])>1:
                dist=p['classifica'][0]['punti']-p['classifica'][1]['punti'];title='Fuga in vetta' if dist>=6 else 'Testa a testa in vetta' if dist<=1 else 'Lotta aperta in classifica'
            red={'tipo':'bilancio','titolo':title,'fonte':'Redazione','autore':'Girrr Sport','testo':generale,'competizioni':[comp]}
            v['voci']={'redazione':[red],'curva':citazioni(None,comp)}
            for t,s in v['squadre'].items():
                originale=s.get('voci',{}).get('redazione');archivio=originale if originale and originale.get('tipo')!='bilancio' and comp=='campionato' else None
                s['voci']={'archivio_redazione':archivio,'redazione':{'tipo':'bilancio','titolo':'Il bilancio di '+t,'fonte':'Redazione','autore':'Girrr Sport','testo':squadra(s,comp),'competizioni':[comp]},'curva':citazioni(t,comp)}


def calcola(d, fiducia=None, aspettative=None, derby=None, mvp=None, ora=None, edizione=None, curva=None):
    ora=dt.datetime.now(dt.timezone.utc).timestamp() if ora is None else ora
    gs=giornate_pubblicate(d,ora);n=gs[-1]['n'] if gs else 0
    args=(fiducia or {},aspettative or {},derby,mvp,ora)
    # Stagione 2026/27: 34 giornate, girone d'andata fino alla 17ª.
    totale=ANDATA*2
    tappe={1:('inizio','Inizio campionato · 1ª giornata','L’inizio del campionato')}
    for x in range(5,totale,5):tappe[x]=('tappa_'+str(x),f'Dopo la {x}ª giornata',f'Il bilancio dopo la {x}ª giornata')
    tappe[ANDATA]=('andata',f'Metà campionato · {ANDATA}ª giornata','Giro di boa · Metà campionato')
    tappe[totale]=('fine',f'Fine campionato · {totale}ª giornata','Il bilancio di fine campionato')
    periodi={'finora':calcola_periodo(d,gs,1,n,*args,'finora')}
    periodi['finora'].update(etichetta='Fino ad ora',titolo=f'Il punto dopo la {n}ª giornata',fisso=False,sblocco=1)
    for g,(k,label,title) in sorted(tappe.items()):
        if g>n:continue
        periodi[k]=calcola_periodo(d,gs,1,g,*args,k)
        periodi[k].update(etichetta=label,titolo=title,fisso=True,sblocco=g)
    if n>ANDATA:
        periodi['ritorno']=calcola_periodo(d,gs,ANDATA+1,n,*args,'ritorno')
        periodi['ritorno'].update(etichetta='Girone di ritorno · Fino ad ora',titolo=f'Il ritorno dopo la {n}ª giornata',fisso=False,sblocco=ANDATA+1)
    prossima=next(({'giornata':g,'etichetta':v[1]} for g,v in sorted(tappe.items()) if g>n),None)
    core={'schema':1,'stagione':(aspettative or {}).get('stagione','2026/27'),'ultima_pubblicata':n,
        'aggiornamento_risultati':d.get('updated'),'periodi':periodi,'prossima_tappa':prossima,
        'regole':{'girone_andata':ANDATA,'giornate_totali':totale,'tappe':'Dalla 1ª alla giornata indicata; si sbloccano solo con risultati completi e pubblicati',
            'competizioni':'Le tappe seguono il Campionato; la Coppa è limitata alla stessa giornata di Serie A. Nessuna classifica unica tra Campionato e Coppa.',
            'zona_retrocessione':'Ultimo posto, come nel Tabellone','parita':'Punti, Fantapunti totali, differenza reti, gol fatti, ordine del Tabellone',
            'derby':'Registro disponibile; ufficialità storica non ricostruita','digiuno':'Distinti senza vittorie e senza gol'}}
    aggiungi_voci(core,d,gs,edizione,curva,ora)
    for pp in periodi.values():aggiungi_competizioni(pp,aspettative or {})
    editoriali_coerenti(core)
    core['fingerprint']=hashlib.sha256(json.dumps(core,sort_keys=True,ensure_ascii=False,allow_nan=False).encode()).hexdigest()
    return core


def leggi(path, default=None):
    return json.loads(Path(path).read_text()) if Path(path).is_file() else default


def lettura_rpc(url, key, nome, stagione):
    req = urllib.request.Request(url.rstrip('/')+'/rest/v1/rpc/'+nome,
          json.dumps({'p_team':None,'p_code':None,'p_limit':150} if nome=='curva_feed' else {'p_stagione': stagione}).encode(), {'apikey': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:return json.load(r)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('sito', type=Path);p.add_argument('--uscita', type=Path)
    p.add_argument('--aspettative', type=Path, default=Path(__file__).with_name('aspettative.json'))
    p.add_argument('--curva', type=Path);p.add_argument('--derby', type=Path);p.add_argument('--mvp', type=Path);p.add_argument('--leggi-pubblico', action='store_true')
    a=p.parse_args();dest=a.uscita or a.sito/'girrr/dati/giro-di-boa.json';exp=leggi(a.aspettative,{})
    curva=leggi(a.curva) if a.curva else None
    derby=leggi(a.derby) if a.derby else None;mvp=leggi(a.mvp) if a.mvp else None
    if a.leggi_pubblico:
        config=leggi(a.sito/'girrr/v60/tifosi-config.json',{})
        url=config.get('url') or os.environ.get('CURVA_URL');key=config.get('publishableKey') or os.environ.get('CURVA_KEY')
        for nome in ('mvp_derby','mvp_stato','curva_feed'):
            try:
                if not url or not key:raise ValueError('Configurazione di lettura assente')
                value=lettura_rpc(url,key,nome,exp.get('stagione','2026/27'))
                if nome=='mvp_derby':derby=value
                elif nome=='mvp_stato':mvp=value
                else:curva=value
            except Exception:
                print('Fonte non disponibile:',nome,'· Dato non conservato')
    out=calcola(leggi(a.sito/'data.json'),leggi(a.sito/'girrr/dati/fiducia.json',{}),exp,derby,mvp,edizione=leggi(a.sito/'girrr/dati/tifosi-settimane.json',{}),curva=curva)
    old=leggi(dest,{})
    if old.get('fingerprint')==out['fingerprint']:print('Giro di boa invariato');return
    dest.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w',dir=dest.parent,delete=False,encoding='utf-8') as f:
        json.dump(out,f,ensure_ascii=False,allow_nan=False,separators=(',',':'));f.write('\n');tmp=f.name
    os.replace(tmp,dest);print('Giro di boa:',out['ultima_pubblicata'],'giornate pubblicate ·',dest)


if __name__=='__main__':main()
