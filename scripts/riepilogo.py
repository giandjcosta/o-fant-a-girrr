#!/usr/bin/env python3
"""Crea il riepilogo della giornata a partire da data.json.

Uso:
    python3 scripts/riepilogo.py                 riepilogo generale della lega
    python3 scripts/riepilogo.py "Oranje VC"     aggiunge la parte della tua squadra (solo a schermo)

Il riepilogo generale viene scritto in riepiloghi/giornata-NN.md, in RIEPILOGO.md e come
pagina da condividere in riepilogo.html.
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

    cal = D.get("cal")
    if cal:
        nomi = {"lega": "Classic League", "cup": "Champions Cup"}
        for comp in ("lega", "cup"):
            giocate = [x for x in cal[comp] if any(m[-1] != "-" for m in x["m"])]
            future = [x for x in cal[comp] if x["sa"] >= g and not any(m[-1] != "-" for m in x["m"])]
            if giocate:
                u = giocate[-1]
                r += [f"## {nomi[comp]}: ultima giornata ({u['n']}ª, G{u['sa']} di Serie A)", ""]
                for m in u["m"]:
                    if comp == "cup":
                        r.append(f"- Girone {m[0]}: {m[1]} {m[5].replace('-', ' - ')} {m[4]} (punteggi {m[2]} - {m[3]})")
                    else:
                        r.append(f"- {m[0]} {m[4].replace('-', ' - ')} {m[3]} (punteggi {m[1]} - {m[2]})")
                r.append("")
            if future:
                n = future[0]
                r += [f"## {nomi[comp]}: prossima giornata ({n['n']}ª, G{n['sa']} di Serie A)", ""]
                for m in n["m"]:
                    r.append(f"- Girone {m[0]}: {m[1]} - {m[4]}" if comp == "cup" else f"- {m[0]} - {m[3]}")
                for girone, squadra in n.get("rest", []):
                    r.append(f"- Girone {girone}: riposa {squadra}")
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
    for ruolo in ("P", "D", "C", "A"):
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
    rischio = sorted((p["id"] for p in squadra["pl"]), key=percentuale_scambio, reverse=True)[:5]
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


def in_html(md):
    """Trasforma il riepilogo in una pagina leggibile dal telefono, da condividere con un link."""
    import html
    righe, out, in_lista, in_tab = md.split("\n"), [], False, False

    def chiudi():
        nonlocal in_lista, in_tab
        if in_lista:
            out.append("</ul>")
            in_lista = False
        if in_tab:
            out.append("</tbody></table></div>")
            in_tab = False

    for riga in righe:
        t = html.escape(riga)
        if riga.startswith("|"):
            celle = [c.strip() for c in t.strip("|").split("|")]
            if set(riga.replace("|", "").strip()) <= {"-"}:
                continue
            if not in_tab:
                chiudi()
                out.append('<div class="tw"><table><thead><tr>' + "".join(f"<th>{c}</th>" for c in celle) + "</tr></thead><tbody>")
                in_tab = True
            else:
                out.append("<tr>" + "".join(f"<td>{c}</td>" for c in celle) + "</tr>")
        elif riga.startswith("- "):
            if not in_lista:
                chiudi()
                out.append("<ul>")
                in_lista = True
            out.append(f"<li>{t[2:]}</li>")
        elif riga.startswith("#"):
            chiudi()
            livello = len(riga) - len(riga.lstrip("#"))
            out.append(f"<h{livello}>{html.escape(riga[livello:].strip())}</h{livello}>")
        elif riga.strip():
            chiudi()
            out.append(f"<p>{t}</p>")
    chiudi()
    stile = ("body{margin:0;background:#0e0730;color:#f3efff;font:16px/1.5 system-ui,sans-serif}"
             "main{max-width:760px;margin:0 auto;padding:20px 16px 48px}"
             "h1{font-size:1.6rem;line-height:1.2}h2{font-size:1.2rem;margin-top:28px;color:#ffc63a}h3{font-size:1rem;margin-top:18px}"
             "p,li{color:#cfc6ee}a{color:#ffc63a}"
             ".tw{overflow-x:auto;border:1px solid #4a2bd6;border-radius:12px;margin:10px 0}"
             "table{border-collapse:collapse;width:100%;font-size:.9rem}"
             "th,td{padding:7px 9px;text-align:left;white-space:nowrap;border-bottom:1px solid #2c1873}"
             "th{color:#a99fd0;font-weight:600}tr:last-child td{border-bottom:0}")
    return ("<!doctype html>\n<html lang=\"it\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\">"
            f"<title>Riepilogo giornata {D['round']}</title><style>{stile}</style></head><body><main>"
            + "\n".join(out) + '<p><a href="./">Apri il sito della lega</a></p></main></body></html>\n')


if __name__ == "__main__":
    testo = riepilogo_generale()
    cartella = ROOT / "riepiloghi"
    cartella.mkdir(exist_ok=True)
    (cartella / f"giornata-{D['round']:02d}.md").write_text(testo, encoding="utf-8")
    (ROOT / "RIEPILOGO.md").write_text(testo, encoding="utf-8")
    pagina = in_html(testo)
    (ROOT / "riepilogo.html").write_text(pagina, encoding="utf-8")
    (cartella / f"giornata-{D['round']:02d}.html").write_text(pagina.replace('href="./"', 'href="../"'), encoding="utf-8")
    print(f"Scritto riepiloghi/giornata-{D['round']:02d}.md, RIEPILOGO.md e riepilogo.html")
    if len(sys.argv) > 1:
        print()
        print(riepilogo_squadra(" ".join(sys.argv[1:])))
