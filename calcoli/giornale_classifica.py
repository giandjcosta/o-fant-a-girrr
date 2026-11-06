#!/usr/bin/env python3
"""Arricchisce una COPIA di testi.json per scripts/pdf_giornale.py (gh-pages).

Il generatore esistente legge `classifiche` nella seconda pagina: nessuna patch
al sito è necessaria. Non modifica mai il file sorgente, né invia contenuti.
"""
import argparse
import copy
import json
from pathlib import Path
from zone_classifica import evento


def integra(testi, dati, aspettative=None):
    t = copy.deepcopy(testi)
    e = evento(dati, aspettative)
    if not e:
        return t
    # Doppio passaggio sulla stessa copia: una sola inclusione; il corpo resta verificabile.
    precedenti = t.get('_cronache_classifica', [])
    if e['chiave'] in precedenti:
        return t
    testo = e['titolo'].capitalize() + '. ' + e['testo']
    t['classifiche'] = '\n\n'.join(x for x in (t.get('classifiche', ''), testo) if x)
    t['_cronache_classifica'] = precedenti + [e['chiave']]
    t['_prove_cronaca'] = [e['prova']]
    return t


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('testi',type=Path)
    p.add_argument('dati',type=Path)
    p.add_argument('uscita',type=Path)
    p.add_argument('--aspettative',type=Path,default=Path(__file__).with_name('aspettative.json'))
    a = p.parse_args()
    if a.uscita.resolve() in (a.testi.resolve(),a.dati.resolve(),a.aspettative.resolve()):
        p.error('L’uscita deve essere una nuova copia, distinta dalle sorgenti.')
    a.uscita.write_text(json.dumps(integra(json.loads(a.testi.read_text()),json.loads(a.dati.read_text()),json.loads(a.aspettative.read_text())),ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
