"""Cronache della classifica per «Oggi al Girrr» (Home 5.5): scrive il file letto dalla Home.

Stesso calcolo dell'Anteprima (anteprima/build53.py): eventi di zone_classifica e la «firma» delle giornate complete,
che la Home confronta con il calendario per non mostrare cronache vecchie.
Uso: python3 calcoli/cronache_home.py data.json aspettative.json uscita.json
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from zone_classifica import eventi, _giornate


def numero_js(x):
    if isinstance(x, float) and x.is_integer():
        return int(x)
    if isinstance(x, list):
        return [numero_js(v) for v in x]
    if isinstance(x, dict):
        return {k: numero_js(v) for k, v in x.items()}
    return x


def main(dati_path, asp_path, out_path):
    dati = json.loads(Path(dati_path).read_text(encoding="utf-8"))
    att = json.loads(Path(asp_path).read_text(encoding="utf-8"))
    firma = json.dumps(numero_js([{'n': g['n'], 'm': g['m']} for g in _giornate(dati)]), ensure_ascii=False, separators=(',', ':'))
    out = {'firma': firma, 'eventi': eventi(dati, att), 'aggiornato': dati.get('updated')}
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("cronache:", len(out['eventi']), "→", out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])
