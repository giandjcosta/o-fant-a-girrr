#!/usr/bin/env python3
"""Totogirrr: calcola partite e quote dal data.json e le manda a Supabase.

Uso:
  python3 -I scripts/toto_quote.py json            -> stampa le partite (id, quote, chiusura) in JSON
  python3 -I scripts/toto_quote.py sync            -> aggiorna partite e chiude quelle giocate (serve TOTO_ADMIN)
Variabili: TOTO_ADMIN (password admin, segreto del repo), TOTO_URL, TOTO_KEY (chiave publishable).
Senza TOTO_ADMIN lo script esce senza errori (cosi' il flusso giornaliero non si rompe).
"""
import json
import math
import os
import random
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get("TOTO_URL", "https://qmjqfgmvimsuxvghetgi.supabase.co")
KEY = os.environ.get("TOTO_KEY", "sb_publishable_qPhimkrF4iUvIad7JPoH8A_i-eOqG7n")
ROMA = ZoneInfo("Europe/Rome")
MARGINE = 1.10   # 10% di aggressività del banco
PRIOR, K = 73.0, 2.0   # media di partenza e peso (in giornate) della media di lega
SD = 8.5         # variabilità del punteggio di una squadra in una giornata


def carica():
    return json.loads((ROOT / "data.json").read_text(encoding="utf-8"))


def ratings(d):
    tot, n = {}, {}
    for r in d["cal"]["lega"]:
        for casa, pc, pf, fuori, ris in r["m"]:
            if ris and ris != "-":
                for t, p in ((casa, pc), (fuori, pf)):
                    tot[t] = tot.get(t, 0) + p
                    n[t] = n.get(t, 0) + 1
    return {t["name"]: (tot.get(t["name"], 0) + PRIOR * K) / (n.get(t["name"], 0) + K) for t in d["teams"]}


def lam(fp):
    return min(7.0, max(0.35, (fp - 58.0) / 6.2))


def poisson(rng, l):
    L, k, p = math.exp(-l), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L:
            return k
        k += 1


def probabilita(rc, rt, n=40000, seed=7):
    rng = random.Random(seed)
    c1 = cx = c2 = co = 0
    for _ in range(n):
        gc = poisson(rng, lam(rng.gauss(rc, SD)))
        gt = poisson(rng, lam(rng.gauss(rt, SD)))
        if gc > gt: c1 += 1
        elif gc == gt: cx += 1
        else: c2 += 1
        if gc + gt >= 5: co += 1
    return c1 / n, cx / n, c2 / n, co / n


def quota(p):
    return round(min(20.0, max(1.15, 1.0 / (max(p, 0.02) * MARGINE))), 2)


def chiusura(d, sa):
    """Primo calcio d'inizio della giornata di Serie A `sa`, o None se non e' ancora noto."""
    fx = d["fx"].get(str(sa))
    if not fx:
        return None
    best = None
    for _, _, quando in fx:
        try:
            _, dm, hm = quando.split()
            g, m = map(int, dm.split("/"))
            hh, mm = map(int, hm.split(":"))
        except ValueError:
            continue
        anno = 2026 if m >= 7 else 2027
        dt = datetime(anno, m, g, hh, mm, tzinfo=ROMA)
        if best is None or dt < best:
            best = dt
    return best


def partite(d):
    rt = ratings(d)
    out = []

    def aggiungi(pid, comp, g, sa, casa, fuori, ris):
        ch = chiusura(d, sa)
        if ch is None:
            return
        p1, px, p2, po = probabilita(rt[casa], rt[fuori])
        o = {"id": pid, "comp": comp, "giornata": g, "casa": casa, "trasf": fuori,
             "chiude": ch.isoformat(), "q1": quota(p1), "qx": quota(px), "q2": quota(p2),
             "qo": quota(po), "qu": quota(1 - po)}
        if ris and ris != "-":
            gc, gt = map(int, ris.split("-"))
            o["gc"], o["gt"] = gc, gt
        out.append(o)

    for r in d["cal"]["lega"]:
        for i, (casa, pc, pf, fuori, ris) in enumerate(r["m"]):
            aggiungi(f"L{r['n']}-{i+1}", "lega", r["n"], r["sa"], casa, fuori, ris)
    for r in d["cal"]["cup"]:
        for i, (gir, casa, pc, pf, fuori, ris) in enumerate(r["m"]):
            aggiungi(f"C{r['n']}-{i+1}", "coppa", r["n"], r["sa"], casa, fuori, ris)
    return out


def rpc(nome, corpo):
    req = urllib.request.Request(f"{URL}/rest/v1/rpc/{nome}", data=json.dumps(corpo).encode(),
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode()


def main():
    d = carica()
    ps = partite(d)
    if len(sys.argv) > 1 and sys.argv[1] == "json":
        print(json.dumps(ps, ensure_ascii=False, indent=1))
        return
    pw = os.environ.get("TOTO_ADMIN", "")
    try:
        rpc("toto_ping", {})
    except Exception as e:  # il ping tiene sveglio il progetto; se fallisce non blocco il resto
        print("Totogirrr: ping fallito:", e)
    if not pw:
        print("Totogirrr: TOTO_ADMIN non impostata, salto la sincronizzazione.")
        return
    # 1. partite e quote (solo quelle non ancora chiuse lato server)
    daaprire = [{k: v for k, v in p.items() if k not in ("gc", "gt")} for p in ps]
    print("Totogirrr: partite", rpc("toto_upsert_partite", {"p_pw": pw, "p_json": daaprire}))
    # 2. risultati
    for p in ps:
        if "gc" in p:
            print("Totogirrr: chiudo", p["id"], rpc("toto_chiudi_partita", {"p_pw": pw, "p_id": p["id"], "p_gc": p["gc"], "p_gt": p["gt"]}))


if __name__ == "__main__":
    main()
