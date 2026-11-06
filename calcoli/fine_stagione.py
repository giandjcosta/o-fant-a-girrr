#!/usr/bin/env python3
"""Aggiornamento di fine stagione: Albo d'oro (titoli) e Albo di Latta.

Legge data.json della lega a stagione conclusa e scrive calcoli/fine_stagione.json con:
  - stag:   riga per l'Albo d'oro, stesso formato di STAG  [stagione, competizione, squadra, allenatore]
  - coppa:  riga per la Coppa Campioni, se indicata (conta come titolo)
  - latta:  classifica finale completa, stesso formato di LATTA  [stagione, [[allenatore, squadra], ... dalla prima all'ultima]]
  - flop / mazzate: quante volte ogni allenatore è stato "cucchiaio di legno" della giornata e quante mazzate ha preso
Uso:  python3 calcoli/fine_stagione.py "2026/27" "Nome della Coppa del campionato" [data.json] [--coppa "Squadra"] [--forza]
Se la stagione non è finita (tutte le giornate giocate) non scrive niente, a meno di --forza (utile per le prove).
Non modifica l'Albo: produce il file con i dati da aggiungere, da controllare e pubblicare.
"""
import json, sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))
import fiducia as F   # riuso della classifica

args = [a for a in sys.argv[1:] if not a.startswith("--")]
STAGIONE, COMP = args[0], args[1]
DATI = Path(args[2]) if len(args) > 2 else QUI.parent / "data.json"
COPPA = sys.argv[sys.argv.index("--coppa") + 1] if "--coppa" in sys.argv else None
NOMI = json.loads((QUI / "nomi.json").read_text(encoding="utf-8"))


def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    partite = F.giocate(d["cal"]["lega"])
    ultima = max([p[0] for p in partite] or [0])
    if ultima < F.NG and "--forza" not in sys.argv:
        sys.exit(f"Stagione non finita: giocate {ultima} giornate su {F.NG}. Non scrivo niente (usa --forza per una prova).")
    cl = F.classifica(partite, ultima)
    ordine = sorted(cl.values(), key=lambda r: r["pos"])
    campione = ordine[0]["t"]
    flop, mazzate = {}, {}
    for r in d["cal"]["lega"]:
        gioc = [m for m in r["m"] if F.esito_gol(m[4])]
        if len(gioc) < len(r["m"]):
            continue
        pt = [(m[1], m[0]) for m in gioc] + [(m[2], m[3]) for m in gioc]
        flop_t = min(pt)[1]; flop[NOMI.get(flop_t, flop_t)] = flop.get(NOMI.get(flop_t, flop_t), 0) + 1
        gm = max(gioc, key=lambda m: abs(m[1] - m[2]))
        perde = gm[3] if gm[1] > gm[2] else gm[0]
        mazzate[NOMI.get(perde, perde)] = mazzate.get(NOMI.get(perde, perde), 0) + 1
    out = dict(stagione=STAGIONE, giornate=ultima,
               stag=[STAGIONE, COMP, campione, NOMI.get(campione, campione)],
               coppa=([STAGIONE, "Coppa Campioni", COPPA, NOMI.get(COPPA, COPPA)] if COPPA else None),
               latta=[STAGIONE, [[NOMI.get(r["t"], r["t"]), r["t"]] for r in ordine]],
               ultimo=NOMI.get(ordine[-1]["t"], ordine[-1]["t"]), flop=flop, mazzate=mazzate)
    (QUI / "fine_stagione.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("fine_stagione.json scritto: campione", out["stag"][3], "- ultimo", out["ultimo"])


if __name__ == "__main__":
    main()
