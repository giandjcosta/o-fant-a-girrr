#!/usr/bin/env python3
"""Importa in data.json e formazioni.json quello che scripts/leghe_estrai.js ha letto da Leghe.

    python3 -I scripts/leghe_importa.py LETTURA.json            (campionato: partite con formazioni)
        LETTURA.json = {"sa": 6, "n_lega": 2, "n_coppa": 1, "calcolata": "2026-10-13T08:30:00Z" (facoltativo),
                        "lega": [ ...partite lette dalla pagina del campionato... ],
                        "coppa": [ ...partite lette dalla pagina della Champions Cup (bastano squadre, gol, fantapunti)... ]}

Controlli che bloccano l'importazione: per ogni squadra somma dei fantavoti di chi ha giocato + modificatore difesa = totale di
Leghe; ogni giocatore deve trovarsi nella rosa della squadra; le partite devono coincidere con il calendario.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(os.environ.get("GIRRR_ROOT") or Path(__file__).resolve().parent.parent)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    L = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    D = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
    fp_ = ROOT / "formazioni.json"
    F = json.loads(fp_.read_text(encoding="utf-8")) if fp_.exists() else {}
    sa, nl, nc = int(L["sa"]), int(L["n_lega"]), L.get("n_coppa")
    P = D["P"]
    rosa = {t["name"]: {} for t in D["teams"]}
    for t in D["teams"]:
        for p in t["pl"]:
            rosa[t["name"]].setdefault(P[str(p["id"])]["n"], str(p["id"]))
    errori = []
    F.setdefault(str(sa), {})
    F.setdefault("fv", {}).setdefault(str(sa), {})
    cal = D["cal"]
    gl = next(g for g in cal["lega"] if g["n"] == nl)
    nuove = []
    for m in L["lega"]:
        for lato in ("A", "B"):
            s = m[lato]
            nome = s["s"]
            if nome not in rosa:
                errori.append(f"squadra sconosciuta: {nome}")
                continue
            tit, pan, tot = [], [], 0.0
            for cat in ("tit", "pan"):
                for n, v, f, entrato in s[cat]:
                    i = rosa[nome].get(n)
                    if not i:
                        errori.append(f"{nome}: giocatore non in rosa: {n}")
                        continue
                    if f is not None:
                        F["fv"][str(sa)][i] = f
                    if entrato:
                        tit.append(int(i))
                        tot += f if f is not None else 0
                    else:
                        pan.append(int(i))
            tot = round(tot + (s.get("md") or 0), 2)
            if abs(tot - s["fp"]) > 0.01:
                errori.append(f"{nome}: somma fantavoti {tot} diversa dal totale Leghe {s['fp']}")
            if len(tit) != 11:
                errori.append(f"{nome}: {len(tit)} giocatori in formazione finale invece di 11")
            F[str(sa)][nome] = {"tit": tit, "pan": pan}
        nuove.append([m["A"]["s"], m["A"]["fp"], m["B"]["fp"], m["B"]["s"], f'{int(m["A"]["g"])}-{int(m["B"]["g"])}'])
    coppie = {frozenset((r[0], r[3])) for r in gl["m"]}
    if {frozenset((r[0], r[3])) for r in nuove} != coppie:
        errori.append("le partite lette non coincidono con il calendario del campionato")
    if errori:
        print("IMPORTAZIONE BLOCCATA:")
        for e in errori:
            print(" -", e)
        raise SystemExit(1)
    ordine = {frozenset((r[0], r[3])): k for k, r in enumerate(gl["m"])}
    gl["m"] = sorted(nuove, key=lambda r: ordine[frozenset((r[0], r[3]))])
    gl["sa"] = sa
    if nc and L.get("coppa"):
        gc = next(g for g in cal["cup"] if g["n"] == int(nc))
        girone = {frozenset((r[1], r[4])): r[0] for r in gc["m"]}
        nc_m = []
        for m in L["coppa"]:
            a, b = m["A"]["s"], m["B"]["s"]
            if frozenset((a, b)) not in girone:
                raise SystemExit(f"partita di Coppa non nel calendario: {a} - {b}")
            nc_m.append([girone[frozenset((a, b))], a, m["A"]["fp"], m["B"]["fp"], b, f'{int(m["A"]["g"])}-{int(m["B"]["g"])}'])
        gc["m"] = nc_m
        gc["sa"] = sa
    calc = L.get("calcolata") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    D.setdefault("calcTs", {})
    if str(sa) not in D["calcTs"]:
        D["calcTs"][str(sa)] = calc
    base = max(datetime.fromisoformat(x.replace("Z", "+00:00")) for x in
               [D["calcTs"][str(sa)]] + ([D.get("votiTs", {}).get(str(sa))] if D.get("votiTs", {}).get(str(sa)) else []))
    pub = base.astimezone(ZoneInfo("Europe/Rome"))
    D["cal"]["date"] = (pub + __import__("datetime").timedelta(hours=1)).date().isoformat()
    D["updated"] = D["cal"]["date"]
    D["round"] = sa
    (ROOT / "data.json").write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    fp_.write_text(json.dumps(F, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"importate la {nl}a di campionato (Serie A {sa}) e {len(L.get('coppa') or [])} partite di Coppa; calcolata alle {D['calcTs'][str(sa)]}")
    print("uscita prevista:", (base + __import__("datetime").timedelta(hours=1)).astimezone(ZoneInfo("Europe/Rome")).strftime("%d/%m %H:%M"), "(Coppa +5 minuti)")


if __name__ == "__main__":
    main()
