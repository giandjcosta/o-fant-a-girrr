#!/usr/bin/env python3
"""Classifica delle rose («3ª rosa su 10»): fotografia calcolata sul server.

Regola di Gianluca (24 novembre 2026):
- La «Forza della rosa» al completo (FZ della Carriera, tutti sani) resta ferma: è il dato con cui il presidente ha fissato le aspettative.
- La classifica delle rose invece si muove e si rifà dopo ogni giornata (e dopo uno scambio). Per ogni giocatore mette insieme:
  1. l'attesa di partenza: fantamedia dell'anno scorso, pesata con le presenze, e media del ruolo;
  2. i fantavoti veri di quest'anno, giornata per giornata;
  3. per le giornate che mancano, il voto atteso corretto da quanto ha reso finora rispetto all'attesa
     (più del previsto sale, meno del previsto scende). Le assenze non contano: conta quanto rende quando gioca.
  Poi per ogni squadra si prendono i migliori undici nel modulo che rende di più e si mettono in fila le dieci rose.

Uso: python3 calcoli/forza_rose.py CARTELLA_GH_PAGES [--uscita girrr/dati/forza-rose.json]
Scrive il file solo se cambia la classifica, le rose o la giornata. Non tocca il database.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
from pathlib import Path

G_TOT = 38  # giornate di Serie A in una stagione
MODULI = [(3, 4, 3), (3, 5, 2), (4, 4, 2), (4, 3, 3), (4, 5, 1), (5, 3, 2), (5, 4, 1)]
PESO_ATTESA = 10   # quante giornate «vale» la media del ruolo nell'attesa di partenza
PESO_RESA = 5      # quanto ci mette la resa di quest'anno a spostare l'attesa


def medie_ruolo(D):
    per = {}
    for pid, l in (D.get("ly") or {}).items():
        p = D["P"].get(pid)
        if p and l[0] >= 10:
            per.setdefault(p["r"], []).append(l[2])
    return {r: sum(v) / len(v) for r, v in per.items()}


def giornate_con_voti(D):
    return sorted(int(k) for k in (D.get("votiTs") or {}))


def valore(pid, D, base, giocate):
    p = D["P"].get(pid)
    if not p or p["r"] not in base:
        return None
    l = (D.get("ly") or {}).get(pid)
    pres, fm = (l[0], l[2]) if l else (0, base[p["r"]])
    attesa = (pres * fm + PESO_ATTESA * base[p["r"]]) / (pres + PESO_ATTESA)
    voti = [v["f"] for g, v in ((D.get("votes") or {}).get(pid) or {}).items() if v.get("f") is not None and int(g) in giocate]
    n = len(voti)
    resa = (sum(voti) / n - attesa) * n / (n + PESO_RESA) if n else 0.0
    # Voto medio della stagione per partita giocata: voti veri finora più le giornate che mancano al voto atteso
    # corretto dalla resa. Le assenze non abbassano il valore: conta quanto rende quando gioca.
    restano = max(0, G_TOT - len(giocate))
    return {"r": p["r"], "v": (sum(voti) + restano * (attesa + resa)) / (n + restano) if n + restano else attesa}


def forza(team, D, base, giocate):
    per = {"P": [], "D": [], "C": [], "A": []}
    for x in team["pl"]:
        e = valore(str(x["id"]), D, base, giocate)
        if e:
            per[e["r"]].append(e["v"])
    for r in per:
        per[r].sort(reverse=True)
    migliore = None
    for d, c, a in MODULI:
        rq = {"P": 1, "D": d, "C": c, "A": a}
        if any(len(per[r]) < k for r, k in rq.items()):
            continue
        s = sum(sum(per[r][:k]) for r, k in rq.items())
        migliore = s if migliore is None or s > migliore else migliore
    return migliore


def fissa(sito):
    """La forza al completo della Carriera (FZ in girrr/app.html): non cambia durante la stagione."""
    t = (sito / "girrr" / "app.html").read_text(encoding="utf-8")
    m = re.search(r"var FZ=(\{[^}]*\})", t)
    return json.loads(m.group(1)) if m else {}


def ultima_giornata_lega(D):
    g = [x["n"] for x in D["cal"]["lega"] if x["m"] and all(m[-1] != "-" for m in x["m"])]
    return max(g) if g else 0


def calcola(sito):
    D = json.loads((sito / "data.json").read_text(encoding="utf-8"))
    n = ultima_giornata_lega(D)
    sa = next((x["sa"] for x in D["cal"]["lega"] if x["n"] == n), 0)
    # Solo le giornate di Serie A fino all'ultima giornata di Campionato chiusa: a metà turno la fotografia non si muove.
    base, giocate = medie_ruolo(D), [g for g in giornate_con_voti(D) if g <= sa]
    righe = [{"squadra": t["name"], "valore": forza(t, D, base, giocate)} for t in D["teams"]]
    righe = [r for r in righe if r["valore"] is not None]
    righe.sort(key=lambda r: -r["valore"])
    fz = fissa(sito)
    for i, r in enumerate(righe, 1):
        r["pos"] = i
        r["valore"] = round(r["valore"], 2)
        r["completa"] = fz.get(r["squadra"])
    rose = hashlib.sha256(json.dumps([[t["name"], sorted(x["id"] for x in t["pl"])] for t in D["teams"]]).encode()).hexdigest()[:16]
    return {"schema": 1, "stagione": "2026/27", "giornata": n, "serie_a": sa, "rose": rose, "classifica": righe}


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("sito", type=Path)
    a.add_argument("--uscita", default="girrr/dati/forza-rose.json")
    x = a.parse_args()
    nuovo = calcola(x.sito)
    f = x.sito / x.uscita
    vecchio = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    chiave = lambda d: (d.get("giornata"), d.get("serie_a"), d.get("rose"), [(r["squadra"], r["pos"]) for r in d.get("classifica", [])])
    if vecchio and chiave(vecchio) == chiave(nuovo):
        print("Classifica delle rose invariata: niente da scrivere.")
        return
    nuovo["aggiornato"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(nuovo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("Classifica delle rose dopo la %dª giornata:" % nuovo["giornata"])
    for r in nuovo["classifica"]:
        print("  %2dª %-24s %.2f  (al completo %s)" % (r["pos"], r["squadra"], r["valore"], r["completa"]))


if __name__ == "__main__":
    main()
