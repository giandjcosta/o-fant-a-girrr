#!/usr/bin/env python3
"""Prepara lab-dati.json: i dati che le pagine nuove della 5.0 (Girrr Sport, Spogliatoio, Totogirrr, Carriera) leggono ogni giorno.

Senza questo file le pagine mostrano la fotografia incorporata al momento della costruzione. Con questo file mostrano i dati di oggi.
Legge data.json (della lega) e, se c'è, probabilita.json. Scrive lab-dati.json con: teams, tab (classifica), aw (premi di ogni giornata),
bors (valore dei giocatori per il Borsino), cal (giornate ancora da giocare), cup (Coppa Campioni), rank (Serie A), ros (la rosa di Oranje VC dalle carte), prob (probabilità).
Uso: python3 calcoli/dati_lab.py [data.json] [probabilita.json] [uscita.json] [cartella/scripts] [borsino.json] [fiducia.json]
"""
import importlib.util, json, sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
A = sys.argv[1:]
DATI = Path(A[0]) if len(A) > 0 else QUI.parent / "data.json"
PROB = Path(A[1]) if len(A) > 1 else QUI.parent / "probabilita.json"
USCITA = Path(A[2]) if len(A) > 2 else QUI.parent / "lab-dati.json"
BORS = Path(A[4]) if len(A) > 4 else QUI.parent / "borsino.json"
FID = Path(A[5]) if len(A) > 5 else QUI.parent / "fiducia.json"
SCRIPTS = Path(A[3]) if len(A) > 3 else (QUI.parent / "scripts" if (QUI.parent / "scripts" / "toto_quote.py").exists() else Path("/home/claude/o-fant-a-girrr/scripts"))
ME = "Oranje VC"
spec = importlib.util.spec_from_file_location("toto_quote", SCRIPTS / "toto_quote.py")
tq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tq)


def giocata(r):
    return r[4] and r[4] != "-"


def classifica(lega, squadre):
    gi = [m for x in lega for m in x["m"] if giocata(m)]
    base = tq._base(gi, squadre)
    rows = {t: dict(t=t, g=0, v=0, n=0, p=0, gf=0, gs=0, fp=0.0, pts=0) for t in squadre}
    for casa, pc, pf, fuori, ris in gi:
        a, b = map(int, ris.split("-"))
        for t, x, y in ((casa, a, b), (fuori, b, a)):
            r = rows[t]; r["g"] += 1; r["gf"] += x; r["gs"] += y
            r["v"] += x > y; r["n"] += x == y; r["p"] += x < y
    for t, b in base.items():
        rows[t]["fp"] = b["fp"]; rows[t]["pts"] = b["pt"]
    ordine = sorted(base.values(), key=tq.ordine_chiave)
    out = []
    for i, b in enumerate(ordine, 1):
        r = rows[b["n"]]; r["pos"] = i; out.append(r)
    return out


def premi(lega):
    out = []
    for x in lega:
        if not x["m"] or not all(giocata(m) for m in x["m"]):
            continue
        righe = sorted([(c, pc) for c, pc, pf, f, r in x["m"]] + [(f, pf) for c, pc, pf, f, r in x["m"]], key=lambda z: -z[1])
        vinc = []
        marg = None
        for c, pc, pf, f, r in x["m"]:
            a, b = map(int, r.split("-"))
            for (w, pw, l, pl_, gw, gl) in ((c, pc, f, pf, a, b), (f, pf, c, pc, b, a)):
                if gw > gl: vinc.append((w, pw, l))
            if pc != pf:
                w, pw, l, pl_ = (c, pc, f, pf) if pc > pf else (f, pf, c, pc)
                if marg is None or pw - pl_ > marg[2]: marg = (l, pl_, round(pw - pl_, 1), w)
        # vincitrice con il punteggio più basso: la più fortunata
        luck = min(vinc, key=lambda z: z[1]) if vinc else None
        out.append(dict(n=x["n"], sa=x["sa"], mvp=list(righe[0]), flop=list(righe[-1]), maz=list(marg) if marg else None,
                        luck=list(luck) if luck else None, rows=[list(z) for z in righe]))
    return out


def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    squadre = [t["name"] for t in d["teams"]]
    lega = d["cal"]["lega"]
    rosters = {}
    for t in d["teams"]:
        lst = []
        for p0 in t["pl"]:
            p = d["P"].get(str(p0["id"]))
            if p:
                lst.append(dict(id=p0["id"], n=p["n"], t=p["t"], r=p["r"], q=p["q"], f=p["f"]))
        rosters[t["name"]] = sorted(lst, key=lambda p: -p["f"])[:14]
    ros = rosters.get(ME, [])
    fid = {}
    if FID.exists():   # fiducia di ogni squadra, da fiducia.py (con le promesse)
        fid = {t: v["fiducia"] for t, v in json.loads(FID.read_text(encoding="utf-8")).get("squadre", {}).items()}
    prob = {}
    if PROB.exists():
        prob = {t: v for t, v in json.loads(PROB.read_text(encoding="utf-8")).get("squadre", {}).items()}
    bors = {}
    if BORS.exists():   # valore giornata per giornata di ogni giocatore, da borsino.py
        for sq in json.loads(BORS.read_text(encoding="utf-8")).get("squadre", {}).values():
            for g in sq:
                bors[str(g["id"])] = g["serie"]
    cup = [dict(n=c["n"], m=[m for m in c["m"] if m[5] and m[5] != "-"]) for c in d["cal"].get("cup", [])]
    cup = [c for c in cup if c["m"]]
    out = dict(aggiornato=d.get("updated"), teams=squadre, tab=classifica(lega, squadre), aw=premi(lega),
               cal=[dict(n=x["n"], sa=x["sa"], m=[[c, f] for c, pc, pf, f, r in x["m"]]) for x in lega if not all(giocata(m) for m in x["m"])][:4],   # le prossime quattro giornate
               cup=cup, rank=d["rank"], ros=ros, rosters=rosters, fid=fid, prob=prob, bors=bors)
    USCITA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("lab-dati.json scritto:", USCITA, "-", len(out["tab"]), "squadre,", len(out["aw"]), "giornate giocate,", len(out["cal"]), "da giocare")


if __name__ == "__main__":
    main()
