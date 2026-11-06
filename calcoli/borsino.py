#!/usr/bin/env python3
"""Borsino dei giocatori: valore di ogni giocatore delle rose, giornata per giornata.

Legge data.json (voti per giornata in "votes", quotazioni in "P", rose in "teams"). Scrive borsino.json.
Uso:  python3 calcoli/borsino.py [percorso/data.json] [percorso/borsino.json]

Regola (semplice e spiegabile, da confermare):
  - Il valore parte dalla quotazione del giocatore (campo q).
  - Dopo ogni giornata in cui ha giocato, cambia in proporzione a quanto il fantavoto supera (o resta sotto) la media del suo ruolo
    in tutta la lega: valore = valore * (1 + 0,06 * (fantavoto - media del ruolo)).
  - Se non gioca il valore resta fermo. Non scende sotto metà né sale oltre il doppio della quotazione iniziale.
  - Consiglio: "tieni" se le ultime 3 giornate sono in crescita o stabili, "valuta di venderlo" se calano, "compra" per i liberi in forte salita.
Non scrive nel database.
"""
import json, sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
DATI = Path(sys.argv[1]) if len(sys.argv) > 1 else QUI.parent / "data.json"
USCITA = Path(sys.argv[2]) if len(sys.argv) > 2 else QUI.parent / "borsino.json"
K = 0.06


def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    P, V = d["P"], d["votes"]
    giornate = sorted({int(g) for v in V.values() for g in v})
    # media del fantavoto per ruolo, su tutta la lega
    tot, n = {}, {}
    for pid, gg in V.items():
        r = P.get(pid, {}).get("r")
        for g, x in gg.items():
            if x.get("f") is not None and r:
                tot[r] = tot.get(r, 0) + x["f"]; n[r] = n.get(r, 0) + 1
    media = {r: tot[r] / n[r] for r in tot}

    def serie(pid):
        p = P[pid]; r = p.get("r"); v0 = float(p.get("q") or 1); v = v0; s = [round(v, 1)]
        for g in giornate:
            x = V.get(pid, {}).get(str(g))
            if x and x.get("f") is not None and r in media:
                v = min(2 * v0, max(0.5 * v0, v * (1 + K * (x["f"] - media[r]))))
            s.append(round(v, 1))
        return s

    def consiglio(s):
        if len(s) < 4:
            return "Pochi dati: aspetta qualche giornata."
        return "Tieni: il valore è in crescita." if s[-1] >= s[-4] else "Valuta di venderlo: il valore cala da qualche giornata."

    squadre = {}
    for t in d["teams"]:
        rosa = []
        for x in t["pl"]:
            pid = str(x["id"])
            if pid not in P:
                continue
            s = serie(pid)
            rosa.append(dict(id=x["id"], nome=P[pid]["n"], club=P[pid]["t"], ruolo=P[pid]["r"], pagato=x["c"], valore=s[-1],
                             variazione=round(s[-1] - s[0], 1), serie=s, consiglio=consiglio(s)))
        rosa.sort(key=lambda z: -abs(z["variazione"]))
        squadre[t["name"]] = rosa
    USCITA.write_text(json.dumps(dict(aggiornato=d.get("updated"), giornate=giornate, media_ruolo={r: round(m, 2) for r, m in media.items()},
                                      squadre=squadre), ensure_ascii=False, indent=1), encoding="utf-8")
    print("borsino.json scritto:", USCITA, "-", sum(len(v) for v in squadre.values()), "giocatori,", len(giornate), "giornate")


if __name__ == "__main__":
    main()
