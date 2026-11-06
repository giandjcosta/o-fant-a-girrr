#!/usr/bin/env python3
"""Probabilità di scudetto, podio e ultimo posto, dopo ogni giornata.

Riusa il motore di Totogirrr (scripts/toto_quote.py del repo della lega): stesse forze delle squadre, stessa simulazione delle
giornate rimaste. Così le percentuali della pagina Probabilità e le quote di Totogirrr raccontano la stessa storia.

Uso:  python3 calcoli/probabilita.py [percorso/data.json] [percorso/probabilita.json] [percorso/cartella/scripts]
Scrive probabilita.json:  squadre -> { s, p, u: [percentuale dopo la giornata 1, percentuale adesso] }  e lo storico giornata per giornata.
Non scrive nel database.
"""
import importlib.util, json, sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
DATI = Path(sys.argv[1]) if len(sys.argv) > 1 else QUI.parent / "data.json"
USCITA = Path(sys.argv[2]) if len(sys.argv) > 2 else QUI.parent / "probabilita.json"
SCRIPTS = Path(sys.argv[3]) if len(sys.argv) > 3 else (QUI.parent / "scripts" if (QUI.parent / "scripts" / "toto_quote.py").exists() else Path("/home/claude/o-fant-a-girrr/scripts"))
SIMS = 8000

spec = importlib.util.spec_from_file_location("toto_quote", SCRIPTS / "toto_quote.py")
tq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tq)


def simula(base_partite, da_fare, squadre, rt, seed):
    import random
    rng = random.Random(seed)
    base = tq._base(base_partite, squadre)
    n = len(squadre)
    s = {t: 0 for t in squadre}; p = dict(s); u = dict(s)
    for _ in range(SIMS):
        tab = tq._tabella(base, da_fare, rt, rng)   # ordinata dalla prima all'ultima
        s[tab[0]["n"]] += 1
        for r in tab[:3]:
            p[r["n"]] += 1
        u[tab[-1]["n"]] += 1
    f = lambda x: {t: round(100.0 * v / SIMS, 1) for t, v in x.items()}
    return f(s), f(p), f(u)


def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    rt = tq.ratings(d)
    squadre = [t["name"] for t in d["teams"]]
    lega = d["cal"]["lega"]
    giocate = [r["n"] for r in lega if all(m[4] and m[4] != "-" for m in r["m"])]
    storico = []
    for g in giocate:
        gi = [(c, pc, pf, f, r) for x in lega if x["n"] <= g for c, pc, pf, f, r in x["m"]]
        da = [(c, pc, pf, f, "-") for x in lega if x["n"] > g for c, pc, pf, f, r in x["m"]]
        s, p, u = simula(gi, da, squadre, rt, 100 + g)
        storico.append(dict(giornata=g, s=s, p=p, u=u))
    if not storico:
        print("Nessuna giornata giocata: niente da calcolare."); return
    prima, ora = storico[0], storico[-1]
    out = {t: {k: [prima[k][t], ora[k][t]] for k in "spu"} for t in squadre}
    USCITA.write_text(json.dumps(dict(aggiornato=d.get("updated"), giornata=ora["giornata"], simulazioni=SIMS,
                                      nota="Percentuali dopo la giornata 1 e adesso. Le forze delle squadre sono quelle di oggi anche per le giornate passate.",
                                      squadre=out, storico=storico), ensure_ascii=False, indent=1), encoding="utf-8")
    print("probabilita.json scritto:", USCITA, "- giornata", ora["giornata"])


if __name__ == "__main__":
    main()
