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
    return {'giornata': g['n'], 'serie_a': g['sa'], 'casa': ca, 'avversario': b if ca else a,
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
    gironi = sorted({p['gruppo'] for p in tutte if re.fullmatch(r'[A-Z]', p['gruppo'])})
    stato = 'Qualificazione ancora aperta' if tutte else MANCANTE
    posizione = None
    punti_girone = None
    if gironi:
        gruppo = gironi[-1]
        calendario = [(g, m) for g in d.get('cal', {}).get('cup', []) for m in g.get('m', []) if m[0] == gruppo]
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
        stato = ('Vincitrice della Champions Cup' if last['giornata'] == 13 else 'Passaggio del turno') if last['esito'] == 'V' else 'Eliminata' if last['esito'] == 'P' else MANCANTE
    return {**bilancio(periodo), 'partite': periodo, 'gironi': gironi, 'posizione_girone': posizione,
            'punti_girone': punti_girone, 'qualificazione': stato}


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
            'distacco_vetta': classifica[0]['pt']-r['pt'], 'margine_ultimo_posto': r['pt']-classifica[-1]['pt'],
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
            'campionato': {'capolista': rows[0]['squadra'] if rows else None,
                           'campione_inverno': rows[0]['squadra'] if nome=='andata' and a==ANDATA and rows else None,
                           'partite': sum(len(g['m']) for g in selezionate),
                           'gol': sum(v['bilancio']['gol_fatti'] for v in out.values()),
                           'sopra_le_attese': [t for t,v in out.items() if v['dirigenza']['giudizio']=='Sopra le attese'],
                           'sotto_le_attese': [t for t,v in out.items() if v['dirigenza']['giudizio']=='Sotto le attese'],
                           'miglior_attacco': [t for t,v in out.items() if v['bilancio']['gol_fatti']==max((x['bilancio']['gol_fatti'] for x in out.values()),default=0)],
                           'miglior_difesa': [t for t,v in out.items() if v['bilancio']['gol_subiti']==min((x['bilancio']['gol_subiti'] for x in out.values()),default=0)]}}


def calcola(d, fiducia=None, aspettative=None, derby=None, mvp=None, ora=None):
    ora = dt.datetime.now(dt.timezone.utc).timestamp() if ora is None else ora
    gs = giornate_pubblicate(d, ora);n = gs[-1]['n'] if gs else 0
    args = (fiducia or {}, aspettative or {}, derby, mvp, ora)
    periodi = {'finora': calcola_periodo(d, gs, 1, n, *args, 'finora')}
    if n>=ANDATA:periodi['andata'] = calcola_periodo(d, gs, 1, ANDATA, *args, 'andata')
    if n>ANDATA:periodi['ritorno'] = calcola_periodo(d, gs, ANDATA+1, n, *args, 'ritorno')
    core = {'schema': 1, 'stagione': (aspettative or {}).get('stagione', '2026/27'), 'ultima_pubblicata': n,
            'aggiornamento_risultati': d.get('updated'), 'periodi': periodi,
            'regole': {'girone_andata': ANDATA, 'zona_retrocessione': 'Ultimo posto, come nel Tabellone',
                       'parita': 'Punti, Fantapunti totali, differenza reti, gol fatti, ordine del Tabellone',
                       'derby': 'Registro disponibile; ufficialità storica non ricostruita', 'digiuno': 'Distinti senza vittorie e senza gol'}}
    core['fingerprint'] = hashlib.sha256(json.dumps(core, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()
    return core


def leggi(path, default=None):
    return json.loads(Path(path).read_text()) if Path(path).is_file() else default


def lettura_rpc(url, key, nome, stagione):
    req = urllib.request.Request(url.rstrip('/')+'/rest/v1/rpc/'+nome,
          json.dumps({'p_stagione': stagione}).encode(), {'apikey': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:return json.load(r)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('sito', type=Path);p.add_argument('--uscita', type=Path)
    p.add_argument('--aspettative', type=Path, default=Path(__file__).with_name('aspettative.json'))
    p.add_argument('--derby', type=Path);p.add_argument('--mvp', type=Path);p.add_argument('--leggi-pubblico', action='store_true')
    a=p.parse_args();dest=a.uscita or a.sito/'girrr/dati/giro-di-boa.json';exp=leggi(a.aspettative,{})
    derby=leggi(a.derby) if a.derby else None;mvp=leggi(a.mvp) if a.mvp else None
    if a.leggi_pubblico:
        config=leggi(a.sito/'girrr/v60/tifosi-config.json',{})
        url=config.get('url') or os.environ.get('CURVA_URL');key=config.get('publishableKey') or os.environ.get('CURVA_KEY')
        for nome in ('mvp_derby','mvp_stato'):
            try:
                if not url or not key:raise ValueError('Configurazione di lettura assente')
                value=lettura_rpc(url,key,nome,exp.get('stagione','2026/27'))
                if nome=='mvp_derby':derby=value
                else:mvp=value
            except Exception:
                print('Fonte non disponibile:',nome,'· Dato non conservato')
    out=calcola(leggi(a.sito/'data.json'),leggi(a.sito/'girrr/dati/fiducia.json',{}),exp,derby,mvp)
    old=leggi(dest,{})
    if old.get('fingerprint')==out['fingerprint']:print('Giro di boa invariato');return
    dest.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w',dir=dest.parent,delete=False,encoding='utf-8') as f:
        json.dump(out,f,ensure_ascii=False,allow_nan=False,separators=(',',':'));f.write('\n');tmp=f.name
    os.replace(tmp,dest);print('Giro di boa:',out['ultima_pubblicata'],'giornate pubblicate ·',dest)


if __name__=='__main__':main()
