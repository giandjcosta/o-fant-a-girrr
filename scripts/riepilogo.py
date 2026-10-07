#!/usr/bin/env python3
"""Crea il riepilogo della giornata a partire da data.json.

Uso:
    python3 scripts/riepilogo.py                 riepilogo generale della lega
    python3 scripts/riepilogo.py "Oranje VC"     aggiunge la parte della tua squadra (solo a schermo)

Il riepilogo generale viene scritto in riepiloghi/giornata-NN.md e in RIEPILOGO.md.
La parte di una singola squadra viene solo stampata, cosi' non finisce nel repository pubblico.
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))

RUOLI = {"P": "Portieri", "D": "Difensori", "C": "Centrocampisti", "A": "Attaccanti"}
STATI = {"T": "Titolare", "B": "Titolare, ballottaggio", "R": "Riserva, ballottaggio",
         "D": "In dubbio", "P": "Panchina", "I": "Fuori"}


def giocatore(pid):
    return D["P"].get(str(pid), {"n": "?", "t": "", "r": "C", "f": 0, "q": 0})


def stato(pid):
    return D.get("st", {}).get(str(pid), {"s": "P"})


def percentuale_scambio(pid):
    """Stessa formula della pagina: valore del giocatore, ultime 6 giornate, stato."""
    pid = str(pid)
    fvm = giocatore(pid).get("f") or 0
    base = round(min(45, max(3, 50 - 12 * math.log(1 + fvm))))
    log = D.get("log", {}).get(pid, {})
    tenuto = int(pid) in D.get("keep", [])
    giornate = sorted((int(g) for g in log if log[g]), reverse=True)[:6]
    somma, peso = 0.0, 1.0
    for g in giornate:
        esito = log[str(g)]
        punti = D["w"].get(esito, 0)
        if tenuto and esito == "I":
            punti = 0
        somma += punti * peso
        peso *= D.get("decay", 0.85)
    s = stato(pid)["s"]
    extra = {"I": 0 if tenuto else 10, "P": 6, "R": 3, "D": 3, "B": 0, "T": -3}.get(s, 0)
    return round(min(97, max(3, base + somma + extra)))


def max_fvm(ruolo):
    return max([giocatore(i).get("f") or 0 for i in D["fa"] if giocatore(i)["r"] == ruolo] + [1])


def punteggio_svincolato(pid):
    g = giocatore(pid)
    st = D.get("fas", {}).get(str(pid), {})
    if st.get("tit") is not None:
        fm = st.get("fm")
        bonus = max(0, min(30, (fm - 5.5) * 12)) if fm is not None else 15
        return max(0, round(st["tit"] * 7 + bonus))
    extra = {"T": 18, "B": 10, "R": 2, "D": -6, "P": -4, "I": -25}.get(stato(pid)["s"], 0)
    return max(0, round((g.get("f") or 0) / max_fvm(g["r"]) * 50 + extra))


def partita(squadra, giornata):
    for casa, fuori, quando in D.get("fx", {}).get(str(giornata), []):
        if casa == squadra:
            return f"{fuori} (c)"
        if fuori == squadra:
            return f"{casa} (t)"
    return "-"


def riepilogo_generale():
    g = D["round"]
    r = [f"# Riepilogo giornata {g} di Serie A", "",
         f"Lega {D['league']}. Dati aggiornati al {D['updated']}.", ""]

    r += ["## Partite della giornata", ""]
    for casa, fuori, quando in D.get("fx", {}).get(str(g), []):
        r.append(f"- {casa} - {fuori} ({quando})")
    r.append("")

    lg = D.get("lg")
    if lg:
        r += [f"## Classifica della lega (al {lg['date']})", "",
              "| # | Squadra | Pt | G | V | N | P | GF | GS | Pt totali |", "|---|---|---|---|---|---|---|---|---|---|"]
        for i, t in enumerate(lg["table"], 1):
            r.append(f"| {i} | {t['t']} | {t['pt']} | {t['g']} | {t['v']} | {t['n']} | {t['p']} | {t['gf']} | {t['gs']} | {t['tot']} |")
        r.append("")
        if lg.get("last"):
            r += [f"### Ultima giornata di lega ({lg['last']['n']}ª)", ""]
            for m in lg["last"]["m"]:
                r.append(f"- {m[0]} {m[1]} - {m[4]} {m[3]} (punteggi {m[2]} - {m[5]})")
            r.append("")
        if lg.get("next"):
            r += [f"### Prossima giornata di lega ({lg['next']['n']}ª)", ""]
            for m in lg["next"]["m"]:
                r.append(f"- {m[0]} - {m[1]}")
            r.append("")

    in_rosa = {p["id"] for t in D["teams"] for p in t["pl"]}
    inf = [e for e in D.get("inj", []) if e.get("id") in in_rosa]
    r += ["## Infortunati tra i giocatori delle rose", "",
          "Notizie pubbliche, senza indicare di chi e' ogni giocatore.", ""]
    if inf:
        r += ["| Giocatore | Squadra | Motivo | Rientro | Giornata |", "|---|---|---|---|---|"]
        for e in sorted(inf, key=lambda e: e["t"]):
            salta = "Salta" if e["k"] == "sì" else "In dubbio"
            r.append(f"| {giocatore(e['id'])['n']} | {e['t']} | {e['w']} | {e['b']} | {salta} |")
    else:
        r.append("Nessuno.")
    r.append("")

    r += ["## Migliori svincolati", "",
          "Punteggio: piu' e' alto, piu' conviene. Unisce valore e probabilita' di giocare.", ""]
    for ruolo in ("D", "C", "A"):
        liberi = sorted((i for i in D["fa"] if giocatore(i)["r"] == ruolo),
                        key=punteggio_svincolato, reverse=True)[:5]
        r += [f"### {RUOLI[ruolo]}", "", "| Giocatore | Squadra | Stato | Avversario | Punteggio |", "|---|---|---|---|---|"]
        for i in liberi:
            p = giocatore(i)
            r.append(f"| {p['n']} | {p['t']} | {STATI[stato(i)['s']]} | {partita(p['t'], g)} | {punteggio_svincolato(i)} |")
        r.append("")

    aperte = D.get("manual", [])
    r += ["## Correzioni da controllare", ""]
    r += [f"- {x}" for x in aperte] if aperte else ["Nessuna."]
    r.append("")
    return "\n".join(r)


def riepilogo_squadra(nome):
    squadra = next((t for t in D["teams"] if t["name"].lower() == nome.lower()), None)
    if not squadra:
        return f"Squadra '{nome}' non trovata. Nomi validi: " + ", ".join(t["name"] for t in D["teams"])
    g = D["round"]
    r = [f"# {squadra['name']}: giornata {g}", ""]
    ordine = {"T": 0, "B": 1, "R": 2, "D": 3, "P": 4, "I": 5}
    for ruolo in ("P", "D", "C", "A"):
        r += [f"## {RUOLI[ruolo]}", "", "| Giocatore | Squadra | Stato | Avversario | Scambio |", "|---|---|---|---|---|"]
        rosa = [p["id"] for p in squadra["pl"] if giocatore(p["id"])["r"] == ruolo]
        for i in sorted(rosa, key=lambda i: ordine[stato(i)["s"]]):
            p = giocatore(i)
            r.append(f"| {p['n']} | {p['t']} | {STATI[stato(i)['s']]} | {partita(p['t'], g)} | {percentuale_scambio(i)}% |")
        r.append("")
    rischio = sorted((p["id"] for p in squadra["pl"] if giocatore(p["id"])["r"] != "P"),
                     key=percentuale_scambio, reverse=True)[:5]
    r += ["## Da tenere d'occhio per gennaio", ""]
    usati = set()
    for i in rischio:
        p = giocatore(i)
        liberi = sorted((x for x in D["fa"] if giocatore(x)["r"] == p["r"] and x not in usati),
                        key=punteggio_svincolato, reverse=True)
        cambio = liberi[0] if liberi else None
        if cambio:
            usati.add(cambio)
        testo = f"- {p['n']} ({percentuale_scambio(i)}%)"
        if cambio:
            testo += f": possibile cambio {giocatore(cambio)['n']} ({giocatore(cambio)['t']})"
        r.append(testo)
    r.append("")
    return "\n".join(r)


if __name__ == "__main__":
    testo = riepilogo_generale()
    cartella = ROOT / "riepiloghi"
    cartella.mkdir(exist_ok=True)
    (cartella / f"giornata-{D['round']:02d}.md").write_text(testo, encoding="utf-8")
    (ROOT / "RIEPILOGO.md").write_text(testo, encoding="utf-8")
    print(f"Scritto riepiloghi/giornata-{D['round']:02d}.md e RIEPILOGO.md")
    if len(sys.argv) > 1:
        print()
        print(riepilogo_squadra(" ".join(sys.argv[1:])))
