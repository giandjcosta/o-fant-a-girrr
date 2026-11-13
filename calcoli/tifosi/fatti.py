"""Fatti e scadenze condivisi; non modifica i dati della lega."""
import datetime as dt
import json,re,subprocess
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[2]

def context(site,derby,season='2026/27'):
    if not isinstance(derby,dict) or not isinstance(derby.get('coppie'),list):raise ValueError('Registro dei Derby non valido: serve un elenco di coppie ufficiali')
    raw=json.loads((site/'data.json').read_text())
    dossier_path=ROOT/'redazione/dossier.json'
    dossier=json.loads(dossier_path.read_text()) if dossier_path.exists() else {'ultima_giocata':0,'squadre':{}}
    nov=(site/'girrr/novita-dati.js').read_text()
    titles=json.loads(nov[nov.index('{'):nov.rindex('}')+1]).get('stag',[])
    payload={'data':raw,'options':{'stagione':season,'derby':derby,'dossier':dossier,'titoli':titles}}
    result=subprocess.run(['node',str(ROOT/'calcoli/tifosi/contesto.cjs')],input=json.dumps(payload),text=True,capture_output=True,check=True)
    return json.loads(result.stdout),raw


def deadline(raw,day,season):
    """Prima partita vera della giornata successiva, con anno della stagione e fuso di Roma."""
    next_round=next((g for g in raw['cal']['lega'] if g['n']==day+1),None)
    if not next_round:return None
    dates=raw.get('sa',{}).get(str(next_round['sa']),[])
    start=int(season[:4]);parsed=[]
    for match in dates:
        m=re.fullmatch(r'(\d{2})/(\d{2}) (\d{2}):(\d{2})',match[2])
        if not m:continue
        dd,mm,hh,mi=map(int,m.groups())
        parsed.append(dt.datetime(start if mm>=7 else start+1,mm,dd,hh,mi,tzinfo=ZoneInfo('Europe/Rome')))
    return min(parsed).astimezone(dt.timezone.utc).isoformat() if parsed else None
