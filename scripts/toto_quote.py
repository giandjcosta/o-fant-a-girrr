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


def ratings(d, k=None):
    k = K if k is None else k
    tot, n = {}, {}
    for r in d["cal"]["lega"]:
        for casa, pc, pf, fuori, ris in r["m"]:
            if ris and ris != "-":
                for t, p in ((casa, pc), (fuori, pf)):
                    tot[t] = tot.get(t, 0) + p
                    n[t] = n.get(t, 0) + 1
    return {t["name"]: (tot.get(t["name"], 0) + PRIOR * k) / (n.get(t["name"], 0) + k) for t in d["teams"]}


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
    """Ritorna (p1, pX, p2, pOver4.5, extra) dove extra ha le probabilita' degli altri mercati."""
    rng = random.Random(seed)
    c1 = cx = c2 = co = 0
    o35 = o55 = gg = 0
    esatti = {}
    for _ in range(n):
        gc = poisson(rng, lam(rng.gauss(rc, SD)))
        gt = poisson(rng, lam(rng.gauss(rt, SD)))
        if gc > gt: c1 += 1
        elif gc == gt: cx += 1
        else: c2 += 1
        tot = gc + gt
        if tot >= 5: co += 1
        if tot >= 4: o35 += 1
        if tot >= 6: o55 += 1
        if gc >= 1 and gt >= 1: gg += 1
        esatti[(gc, gt)] = esatti.get((gc, gt), 0) + 1
    extra = {"o35": o35 / n, "o55": o55 / n, "gg": gg / n,
             "esatti": {k: v / n for k, v in esatti.items()}}
    return c1 / n, cx / n, c2 / n, co / n, extra


def quota(p):
    return round(min(20.0, max(1.15, 1.0 / (max(p, 0.02) * MARGINE))), 2)


def quota_x(p, margine=1.10, tetto=20.0):
    return round(min(tetto, max(1.10, 1.0 / (max(p, 0.01) * margine))), 2)


def mercati_extra(e):
    out = {"O35": quota_x(e["o35"]), "U35": quota_x(1 - e["o35"]),
           "O55": quota_x(e["o55"]), "U55": quota_x(1 - e["o55"]),
           "GG": quota_x(e["gg"]), "NG": quota_x(1 - e["gg"])}
    migliori = sorted(e["esatti"].items(), key=lambda kv: -kv[1])[:8]
    for (a, b), pr in migliori:
        if pr >= 0.02:
            out[f"E:{a}-{b}"] = quota_x(pr, 1.25, 60.0)
    return out


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
        p1, px, p2, po, ex = probabilita(rt[casa], rt[fuori])
        o = {"id": pid, "comp": comp, "giornata": g, "casa": casa, "trasf": fuori,
             "chiude": ch.isoformat(), "q1": quota(p1), "qx": quota(px), "q2": quota(p2),
             "qo": quota(po), "qu": quota(1 - po), "extra": mercati_extra(ex)}
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
    out.extend(vincenti(d, ratings(d, 8)))
    return out


ORDINE_COPPA = ["The Blue brothers", "Apo team", "Mariana Coneja", "stif dc", "Real Madrink",
                "Atletico ma non troppo", "Oranje VC", "AFA SELECCION", "Grodah", "WOA"]


def ordine_chiave(r):
    return (-r["pt"], -r["fp"], -(r["gf"] - r["gs"]), -r["gf"],
            ORDINE_COPPA.index(r["n"]) if r["n"] in ORDINE_COPPA else 99, r["n"])


def simula_classifica(partite_giocate, partite_da_fare, squadre, rt, sims, seed):
    """partite_*: liste (casa, pc, pf, fuori, "g-g"). Ritorna {squadra: probabilita' di chiudere prima}."""
    rng = random.Random(seed)
    base = {t: {"n": t, "pt": 0, "fp": 0.0, "gf": 0, "gs": 0} for t in squadre}
    for casa, pc, pf, fuori, ris in partite_giocate:
        a, b = map(int, ris.split("-"))
        for t, fp, gf, gs in ((casa, pc, a, b), (fuori, pf, b, a)):
            r = base[t]; r["fp"] += fp; r["gf"] += gf; r["gs"] += gs
            r["pt"] += 3 if gf > gs else (1 if gf == gs else 0)
    vinc = {t: 0 for t in squadre}
    for _ in range(sims):
        cur = {t: dict(r) for t, r in base.items()}
        for casa, _, _, fuori, _ in partite_da_fare:
            fc, ff = rng.gauss(rt[casa], SD), rng.gauss(rt[fuori], SD)
            a, b = poisson(rng, lam(fc)), poisson(rng, lam(ff))
            for t, fp, gf, gs in ((casa, fc, a, b), (fuori, ff, b, a)):
                r = cur[t]; r["fp"] += fp; r["gf"] += gf; r["gs"] += gs
                r["pt"] += 3 if gf > gs else (1 if gf == gs else 0)
        vinc[min(cur.values(), key=ordine_chiave)["n"]] += 1
    return {t: v / sims for t, v in vinc.items()}


def quote_vincente(prob):
    # margine piu' alto sui mercati lunghi; tetto 60 e minimo 1,20
    return {f"T:{t}": round(min(60.0, max(1.20, 1.0 / (max(p, 0.01) * 1.15))), 2) for t, p in prob.items()}


def vincenti(d, rt):
    ch = chiusura(d, 8)
    if ch is None:
        return []
    out = []
    # campionato
    gi = [(c, pc, pf, f, r) for g in d["cal"]["lega"] for c, pc, pf, f, r in g["m"] if r and r != "-"]
    da = [(c, pc, pf, f, r) for g in d["cal"]["lega"] for c, pc, pf, f, r in g["m"] if not r or r == "-"]
    sq = [t["name"] for t in d["teams"]]
    if da:
        out.append({"id": "V-LEGA", "comp": "vinc", "giornata": 0, "casa": "Chi vince il campionato", "trasf": "",
                    "chiude": ch.isoformat(), "q1": 1, "qx": 1, "q2": 1, "qo": 1, "qu": 1,
                    "extra": quote_vincente(simula_classifica(gi, da, sq, rt, 3000, 11))})
    # gironi di coppa
    gruppi = {}
    for g in d["cal"]["cup"]:
        for gir, c, pc, pf, f, r in g["m"]:
            gruppi.setdefault(gir, []).append((c, pc, pf, f, r))
        for gir, t in g.get("rest", []):
            gruppi.setdefault(gir, [])
    for gir in sorted(gruppi):
        ms = gruppi[gir]
        squadre = sorted({x for m in ms for x in (m[0], m[3])} | {t for g in d["cal"]["cup"] for gg, t in g.get("rest", []) if gg == gir})
        gi = [m for m in ms if m[4] and m[4] != "-"]
        da = [m for m in ms if not m[4] or m[4] == "-"]
        if da and squadre:
            out.append({"id": f"V-G{gir}", "comp": "vinc", "giornata": 0, "casa": f"Chi vince il girone {gir} di coppa", "trasf": "",
                        "chiude": ch.isoformat(), "q1": 1, "qx": 1, "q2": 1, "qo": 1, "qu": 1,
                        "extra": quote_vincente(simula_classifica(gi, da, squadre, rt, 3000, 13))})
    return out


def vincitori_noti(d):
    """Mercati 'vincente' che si possono chiudere: ritorna {id: squadra}. Solo se TUTTE le partite sono giocate."""
    res = {}
    sq = [t["name"] for t in d["teams"]]
    ms = [(c, pc, pf, f, r) for g in d["cal"]["lega"] for c, pc, pf, f, r in g["m"]]
    if ms and all(r and r != "-" for *_, r in ms):
        rt = {t: 0 for t in sq}
        p = simula_classifica(ms, [], sq, rt, 1, 1)
        res["V-LEGA"] = max(p, key=p.get)
    gruppi = {}
    for g in d["cal"]["cup"]:
        for gir, c, pc, pf, f, r in g["m"]:
            gruppi.setdefault(gir, []).append((c, pc, pf, f, r))
    for gir, ms in gruppi.items():
        if ms and all(r and r != "-" for *_, r in ms):
            squadre = sorted({x for m in ms for x in (m[0], m[3])})
            p = simula_classifica(ms, [], squadre, {t: 0 for t in squadre}, 1, 1)
            res[f"V-G{gir}"] = max(p, key=p.get)
    return res


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
    for pid, vincitrice in vincitori_noti(d).items():
        print("Totogirrr: chiudo", pid, rpc("toto_chiudi_vincente", {"p_pw": pw, "p_id": pid, "p_team": vincitrice}))
    print("Totogirrr: partite", rpc("toto_upsert_partite", {"p_pw": pw, "p_json": daaprire}))
    # 2. risultati
    for p in ps:
        if "gc" in p:
            print("Totogirrr: chiudo", p["id"], rpc("toto_chiudi_partita", {"p_pw": pw, "p_id": p["id"], "p_gc": p["gc"], "p_gt": p["gt"]}))


if __name__ == "__main__":
    main()
