#!/usr/bin/env python3
"""Apre le votazioni MVP e conserva i verdetti. Senza --vai non chiama il database.

Richiede la 6.0 già pubblicata, la SQL installata e la chiave server già usata dai premi.
Non modifica gh-pages, versioni.json, crediti o reputazione.
"""
import argparse
import datetime as dt
import importlib.util
import json
from pathlib import Path
import urllib.error
import urllib.request
from fatti import context,deadline

ROOT=Path(__file__).resolve().parents[2]


def server_auth():
    spec=importlib.util.spec_from_file_location('premi_auth',ROOT/'calcoli/premi/registra_premi.py')
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    key=m.chiave_server()
    return m.PROGETTO,m.intestazioni(key)


def call(url,headers,name,args):
    req=urllib.request.Request(url+'/rest/v1/rpc/'+name,json.dumps(args).encode(),headers,method='POST')
    try:
        with urllib.request.urlopen(req,timeout=40) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{name}: risposta HTTP {e.code}. Nessun segreto viene incluso nel messaggio.') from None


def payload(ctx,raw,edition,now=None):
    now=now or dt.datetime.now(dt.timezone.utc)
    week=next((g for g in ctx['giornate'] if g['giornata']==ctx['ultima']),None)
    entry=edition.get('giornate',{}).get(str(ctx['ultima']))
    if not week or not week['candidati']:return None,'Nessuna candidatura disponibile'
    if not week['coppaCompleta']:return None,'Risultati di Champions Cup ancora parziali'
    if edition.get('stagione')!=ctx['stagione'] or not entry or entry.get('firma')!=week['firma']:return None,'In attesa della redazione aggiornata ai risultati'
    close=deadline(raw,week['giornata'],ctx['stagione']) or entry.get('chiude')
    if not close:return None,'Serve una scadenza editoriale per l’ultima giornata'
    when=dt.datetime.fromisoformat(close.replace('Z','+00:00'))
    if when.tzinfo is None:raise ValueError('La scadenza deve avere un fuso orario')
    if when<=now:return None,'Nessuna votazione creata retroattivamente'
    if not entry.get('redazione'):return None,'Preferenza della redazione non disponibile'
    return {'p_stagione':ctx['stagione'],'p_giornata':week['giornata'],'p_chiude':close,
            'p_candidati':week['candidati'],'p_redazione':entry['redazione'],'p_personaggi':week['personaggi'],'p_firma':week['firma']},None


def run(site,season='2026/27',derby_path=None,vai=False):
    if vai:
        version=json.loads((site/'versioni.json').read_text())['versioni'][0]['v']
        if int(version.split('.')[0])<6:
            print('MVP non attivo: sul sito non è ancora pubblicata la 6.0.');return
        url,headers=server_auth()
        rpc=lambda name,args:call(url,headers,name,args)
        # La chiusura non aspetta né voti umani né un nuovo intervento della redazione.
        rpc('mvp_chiudi',{'p_stagione':season})
        derby=rpc('mvp_derby',{'p_stagione':season})
    else:
        if not derby_path:raise ValueError('Per la prova senza rete usare --derby FILE_JSON')
        derby=json.loads(derby_path.read_text())
    ctx,raw=context(site,derby,season)
    path=site/'girrr/dati/tifosi-settimane.json'
    edition=json.loads(path.read_text()) if path.exists() else {}
    plan,reason=payload(ctx,raw,edition)
    if not plan:print(reason);return
    if not vai:
        print(json.dumps({'prova':True,'votazione':plan},ensure_ascii=False,indent=2));return
    result=rpc('mvp_prepara',plan)
    print('Votazione verificata per la giornata',result['votazione']['giornata'])


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('sito',type=Path);p.add_argument('--stagione',default='2026/27');p.add_argument('--derby',type=Path);p.add_argument('--vai',action='store_true');a=p.parse_args();run(a.sito,a.stagione,a.derby,a.vai)
