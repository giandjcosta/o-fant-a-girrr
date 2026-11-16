"""Prepara catalogo e dossier nello stesso giro ordinario MVP. Nessun TTS o post.
Senza --vai stampa soltanto il piano, senza rete e senza scrivere nel sito.
"""
import argparse,datetime as dt,importlib.util,json,re,sys
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'calcoli/tifosi'))
from sincronizza import server_auth,call

def inizio(raw,g,stagione):
    righe=raw.get('sa',{}).get(str(g['sa'])) or raw.get('fx',{}).get(str(g['sa'])) or []
    dates=[]
    for x in righe:
        m=re.fullmatch(r'(\d{1,2})/(\d{1,2}) (\d{1,2}):(\d{2})',str(x[2]))
        if m:
            dd,mm,hh,mi=map(int,m.groups());dates.append(dt.datetime(int(stagione[:4])+(mm<7),mm,dd,hh,mi,tzinfo=ZoneInfo('Europe/Rome')))
    return min(dates).astimezone(dt.timezone.utc) if dates else None

def piano(raw,stagione,vecchi,ora):
    noti={x['id']:x for x in vecchi};out=[]
    for g in raw['cal']['lega']:
        fine=inizio(raw,g,stagione)
        if fine is None:continue
        key=f'sfida:{stagione}:{g["n"]}';old=noti.get(key)
        aperto=old['aperto'] if old else (ora.isoformat() if fine>ora else None)
        out.append({'p_id':key,'p_stagione':stagione,'p_origine':'sfida','p_fonte':str(g['n']),'p_giornata':g['n'],'p_titolo':'Quale sfida seguirai con più attenzione?','p_scelte':[m[0]+' – '+m[3] for m in g['m']],'p_aperto':aperto,'p_chiude':old['chiude'] if old else fine.isoformat()})
        # Non aprire sondaggi per turni futuri oltre il primo ancora da iniziare.
        if fine>ora:break
    return out

def esegui(sito,stagione,vai=False,prima_del_rilascio=False):
    raw=json.loads((sito/'data.json').read_text());ora=dt.datetime.now(dt.timezone.utc)
    if not vai:return {'prova':True,'catalogo':piano(raw,stagione,[],ora)}
    v=json.loads((sito/'versioni.json').read_text())['versioni'][0]['v']
    # Prima del rilascio le pagine sono ancora alla 6.1: consentire il catalogo
    # soltanto su comando esplicito e già autorizzato, non ai workflow ordinari.
    if tuple(map(int,v.split('.')[:2]))<(6,2) and not prima_del_rilascio:return {'attivo':False}
    if prima_del_rilascio and tuple(map(int,v.split('.')[:2]))!=(6,1):
        raise ValueError('Preparazione anticipata permessa solo sulla copia ufficiale 6.1')
    url,headers=server_auth();rpc=lambda n,a:call(url,headers,n,a)
    vecchi=rpc('v62_catalogo_server',{'p_stagione':stagione})
    catalogo=piano(raw,stagione,vecchi,ora)
    for x in catalogo:rpc('v62_prepara',x)
    prossima=next((x for x in catalogo if dt.datetime.fromisoformat(x['p_chiude'])>ora),None)
    if prossima:
        rpc('v62_finestre_prepara',{'p_stagione':stagione,'p_tipo':'vigilia','p_giornata':prossima['p_giornata'],'p_aperto':prossima['p_aperto'],'p_chiude':prossima['p_chiude']})
    prima=rpc('v62_finestre',{'p_stagione':stagione}).get('prima_giornata') or (prossima['p_giornata'] if prossima else None)
    if prima is not None:
        for g in raw['cal']['lega']:
            if g['n']<prima:continue
            sa=str(g['sa']);ts=[raw.get(k,{}).get(sa) for k in ('votiTs','calcTs')];ts=[dt.datetime.fromisoformat(x.replace('Z','+00:00')) for x in ts if x]
            if not ts or any(m[4]=='-' for m in g['m']):continue
            pubblicato=max(ts)+dt.timedelta(hours=1)
            rpc('v62_finestre_prepara',{'p_stagione':stagione,'p_tipo':'dopo','p_giornata':g['n'],'p_aperto':pubblicato.isoformat(),'p_chiude':(pubblicato+dt.timedelta(hours=48)).isoformat()})
    dossier=rpc('mvp_stato',{'p_stagione':stagione});dossier.pop('server_ora',None)
    # Fonte editoriale esplicita: nessuna citazione ricostruita automaticamente.
    citazione=sito/'girrr/dati/mvp-commento.json'
    if citazione.exists():dossier['commento']=json.loads(citazione.read_text())
    storico=sito/'girrr/dati/mvp-giornale-annunciati.json'
    if storico.exists():dossier['giornale_annunciati']=json.loads(storico.read_text())
    destinazione=sito/'girrr/dati/mvp-editoriale.json';testo=json.dumps(dossier,ensure_ascii=False,sort_keys=True,indent=2)+'\n'
    if not destinazione.exists() or destinazione.read_text()!=testo:destinazione.write_text(testo)
    return {'attivo':True,'sondaggi':len(catalogo)}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('sito',type=Path);p.add_argument('--stagione',default='2026/27');p.add_argument('--vai',action='store_true');p.add_argument('--prima-del-rilascio',action='store_true',help='prepara il catalogo su copia 6.1 SOLO con --vai e autorizzazione');a=p.parse_args();
    if a.prima_del_rilascio and not a.vai:raise SystemExit('La preparazione anticipata richiede --vai e autorizzazione specifica')
    print(json.dumps(esegui(a.sito,a.stagione,a.vai,a.prima_del_rilascio),ensure_ascii=False,indent=2))
