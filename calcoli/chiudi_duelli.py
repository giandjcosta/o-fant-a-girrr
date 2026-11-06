#!/usr/bin/env python3
"""Chiude le sfide 1 contro 1 di Totogirrr dopo una giornata.

Prende i fantapunti di ogni squadra in quella giornata da data.json e chiama duello_chiudi: chi ha fatto più punti prende il doppio della posta,
in caso di pareggio ognuno si riprende la sua. Si può rilanciare senza danni: il database chiude solo le sfide ancora "accettate".
Uso:  python3 calcoli/chiudi_duelli.py data.json NUMERO_GIORNATA           prova a vuoto: mostra i punti
      python3 calcoli/chiudi_duelli.py data.json NUMERO_GIORNATA --vai     scrive davvero (servono CURVA_URL, CURVA_KEY, CURVA_TEAM, CURVA_CODE)
"""
import json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from risolvi_conferenze import chiama

A = [a for a in sys.argv[1:] if not a.startswith("--")]
VAI = "--vai" in sys.argv


def punti(lega, g):
    out = {}
    for r in lega:
        if r["n"] != g:
            continue
        for casa, pc, pf, fuori, ris in r["m"]:
            if ris and ris != "-" and pc and pf:
                out[casa], out[fuori] = float(pc), float(pf)
    return out


def main():
    if len(A) < 2 or not A[1].isdigit():
        sys.exit("Serve data.json e il numero della giornata.")
    g = int(A[1])
    p = punti(json.loads(Path(A[0]).read_text(encoding="utf-8"))["cal"]["lega"], g)
    print(f"Giornata {g}: punti di {len(p)} squadre")
    if len(p) < 2:
        sys.exit("Giornata non ancora giocata: non chiudo niente.")
    for t, x in sorted(p.items(), key=lambda z: -z[1]):
        print(f"  {t}: {x}")
    if not VAI:
        print("(prova a vuoto: aggiungi --vai)")
        return
    t, c = os.environ.get("CURVA_TEAM"), os.environ.get("CURVA_CODE")
    if not (t and c):
        sys.exit("Mancano CURVA_TEAM o CURVA_CODE.")
    n = chiama("duello_chiudi", dict(p_team=t, p_code=c, p_giornata=g, p_punti=p))
    print(f"Sfide chiuse: {n}")


if __name__ == "__main__":
    main()
