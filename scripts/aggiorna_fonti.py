#!/usr/bin/env python3
"""Seconda fonte per le probabili formazioni (Gazzetta dello Sport) e media pesata delle fonti.

Gira DOPO aggiorna_prossima.py (che legge Fantacalcio.it e scrive st, ps.pct).
Per ogni giocatore calcola la probabilità di giocare da titolare secondo ogni fonte e fa la media pesata.

Pesi (dal più affidabile):
  Lega Serie A (formazioni ufficiali, quando saranno disponibili)   1.0   [non ancora letta]
  Fantacalcio.it                                                    0.8
  Gazzetta dello Sport                                              0.7
  conferenze stampa degli allenatori                                0.5   [non lette in automatico]
  altre testate                                                     0.3   [non lette]

Per ogni fonte:  nell'undici 0.95 · ballottaggio = percentuale della fonte · panchina 0.15 · non citato 0.05.
Stato finale: >= 0.80 titolare (T) · 0.50-0.79 ballottaggio vantaggio (B) · 0.20-0.49 ballottaggio insidia (R) · sotto 0.20 nessuno stato.
Infortunati e squalificati (I) restano fuori; se la Gazzetta mette in campo un infortunato per Fantacalcio diventa "in dubbio" (D).
Le formazioni si applicano solo da 3 giorni prima della prima partita, come per Fantacalcio.

Uso:  python3 scripts/aggiorna_fonti.py [--da-file FILE.html]
"""
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aggiorna_prossima import ROMA, norm, primo_calcio  # noqa: E402

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
URL = "https://www.gazzetta.it/Calcio/prob_form/"
ROOT = Path(__file__).resolve().parent.parent
PESO = {"fantacalcio": 0.8, "gazzetta": 0.7}


def pulisci(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s)).replace("\xa0", " ").strip()


def leggi_gazzetta(h):
    """Lista di partite: {casa, fuori, tit:{casa:[nomi],fuori:[nomi]}, pan:{...}, ball:{casa:[(a,b,pa)], fuori:[...]}}"""
    out = []
    # ogni partita ha le due squadre in testa e poi i due elenchi
    parti = re.split(r'class="details-team is--home"', h)[1:]
    for p in parti:
        nomi = re.findall(r'class="details-team__name"[^>]*>\s*([^<]+?)\s*<', p)
        if len(nomi) < 2:
            continue
        casa, fuori = html.unescape(nomi[0]).strip(), html.unescape(nomi[1]).strip()
        liste = re.findall(r'<ul class="lineup-team__lineup-list">(.*?)</ul>', p, re.S)
        if len(liste) < 2:
            continue
        tit = [[pulisci(x) for x in re.findall(r'class="lineup-team__name">(.*?)</span>', l, re.S)] for l in liste[:2]]
        pan, ball = [[], []], [[], []]
        for lato, cls in ((0, "is--home"), (1, "is--away")):
            m = re.search(r'<p class="' + cls + r'">\s*<strong>Panchina:\s*</strong>(.*?)</p>', p, re.S)
            if m:
                pan[lato] = [re.sub(r"^\d+\s+", "", x.strip()) for x in pulisci(m.group(1)).split(",") if x.strip()]
            m = re.search(r'<p class="' + cls + r'">\s*<strong>Ballottaggio:\s*</strong>(.*?)</p>', p, re.S)
            if m:
                for a, b, pa in re.findall(r"([^,\-]+?)\s*-\s*([^,]+?)\s+(\d+)\s*-\s*\d+\s*%", pulisci(m.group(1))):
                    ball[lato].append((a.strip(), b.strip(), int(pa)))
        if len(tit[0]) >= 9 and len(tit[1]) >= 9:
            out.append({"sq": (casa, fuori), "tit": tit, "pan": pan, "ball": ball})
    return out


def trova_id(D, squadra, nome, indice):
    """Cerca il giocatore della squadra dal nome scritto dalla Gazzetta (cognome, nome o soprannome)."""
    g = norm(nome)
    if not g:
        return None
    gt = g.split()
    giocatori = [(i, D["P"][i]["_n"].split()) for i in indice.get(squadra, [])]

    def cognome(tok):  # toglie le iniziali finali (es. "perez k" -> ["perez"], "esposito se" -> ["esposito"])
        s = list(tok)
        while len(s) > 1 and len(s[-1]) <= 2:
            s.pop()
        return s

    # 1) il nome coincide con il cognome (con o senza iniziale)
    c1 = [i for i, tok in giocatori if " ".join(cognome(tok)) == g or " ".join(tok) == g or " ".join(tok).startswith(g + " ")]
    if len(set(c1)) == 1:
        return c1[0]
    if c1:
        return None
    # 2) cognome contenuto nel nome della Gazzetta ("Kike Perez", "J. Martinez") e iniziale compatibile
    c2 = []
    for i, tok in giocatori:
        cg = cognome(tok)
        if all(t in gt for t in cg):
            ini = tok[len(cg):]
            altri = [t for t in gt if t not in cg]
            if not ini or not altri or any(a.startswith(x) or x.startswith(a) for a in altri for x in ini):
                c2.append(i)
    if len(set(c2)) == 1:
        return c2[0]
    if c2:
        return None
    # 3) solo il nome di battesimo ("Lautaro"): unico giocatore della squadra con quell'iniziale
    if len(gt) == 1:
        c3 = [i for i, tok in giocatori if len(tok) > 1 and len(tok[-1]) <= 2 and tok[-1][0] == g[0]]
        if len(set(c3)) == 1:
            return c3[0]
    return None


def main():
    if "--da-file" in sys.argv:
        h = Path(sys.argv[sys.argv.index("--da-file") + 1]).read_text(encoding="utf-8")
    else:
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                h = r.read().decode("utf-8", "replace")
        except Exception as e:
            print(f"gazzetta: pagina non letta ({e})")
            return
    partite = leggi_gazzetta(h)
    if len(partite) < 8:
        print(f"gazzetta: lette {len(partite)} partite, non aggiorno")
        return
    fp = ROOT / "data.json"
    D = json.loads(fp.read_text(encoding="utf-8"))
    ora = datetime.now(ROMA)
    nx = D.get("nx") or D.get("round")
    inizio = primo_calcio(D, nx)
    if inizio is not None and ora < inizio - timedelta(hours=72):
        print(f"gazzetta: lette {len(partite)} partite, formazioni in attesa (si applicano da 3 giorni prima di {inizio:%d/%m %H:%M})")
        return
    indice = {}
    for i, p in D["P"].items():
        p["_n"] = norm(p["n"])
        indice.setdefault(p["t"], []).append(i)

    pg, perse = {}, []  # id -> probabilità Gazzetta
    for m in partite:
        for lato in (0, 1):
            sq = m["sq"][lato]
            if sq not in indice:
                continue
            visti = set()
            nonriconosciuti = 0
            for nome in m["tit"][lato]:
                i = trova_id(D, sq, nome, indice)
                if i:
                    pg[i] = 0.95
                    visti.add(i)
                else:
                    perse.append(f"{sq}: {nome}")
                    nonriconosciuti += 1
            for a, b, pa in m["ball"][lato]:
                ia, ib = trova_id(D, sq, a, indice), trova_id(D, sq, b, indice)
                for i, pc in ((ia, pa / 100), (ib, 1 - pa / 100)):
                    if i:
                        pg[i] = pc
                        visti.add(i)
            for nome in m["pan"][lato]:
                i = trova_id(D, sq, nome, indice)
                if i and i not in visti:
                    pg[i] = 0.15
                    visti.add(i)
            if nonriconosciuti == 0:  # se un titolare non e' stato riconosciuto, "non citato" non e' affidabile
                for i in indice[sq]:
                    if i not in visti:
                        pg[i] = 0.05
    for p in D["P"].values():
        p.pop("_n", None)
    if len(pg) < 300:
        print(f"gazzetta: riconosciuti solo {len(pg)} giocatori, non aggiorno")
        return

    st = D.get("st") or {}
    ps = D.setdefault("ps", {})

    def prob_fanta(i):
        s = st.get(i, {}).get("s")
        if s == "T":
            return 0.95
        if s in ("B", "R"):
            return (ps.get(i, {}).get("pct") or 50) / 100
        return 0.05

    nuovo, discordi, cambi = dict(st), [], 0
    for i, pgz in pg.items():
        s0 = st.get(i, {}).get("s")
        pf = prob_fanta(i)
        if s0 == "I":
            if pgz >= 0.9:  # fonti discordanti su un infortunato
                nuovo[i] = {"s": "D", "n": "Fonti discordanti: Fantacalcio fuori, Gazzetta titolare"}
                cambi += 1
            continue
        p = (PESO["fantacalcio"] * pf + PESO["gazzetta"] * pgz) / (PESO["fantacalcio"] + PESO["gazzetta"])
        nota = None
        if abs(pf - pgz) >= 0.5:
            etich = lambda x: "titolare" if x >= 0.8 else "panchina" if x < 0.3 else "ballottaggio"
            nota = f"Fonti discordanti: Fantacalcio {etich(pf)}, Gazzetta {etich(pgz)}"
            discordi.append(D["P"][i]["n"])
        if s0 == "D":
            continue
        if p >= 0.8:
            nuovo[i] = {"s": "T"}
        elif p >= 0.2:
            nuovo[i] = {"s": "B" if p >= 0.5 else "R", "n": nota or st.get(i, {}).get("n", "")}
            if not nuovo[i]["n"]:
                nuovo[i].pop("n")
            ps.setdefault(i, {})["pct"] = round(p * 100)
        else:
            nuovo.pop(i, None)
            ps.get(i, {}).pop("pct", None)
        if nuovo.get(i) != st.get(i):
            cambi += 1
        if nota and i in nuovo and "n" not in nuovo[i]:
            nuovo[i]["n"] = nota
    D["st"] = nuovo
    D["updated"] = ora.strftime("%Y-%m-%d")
    fp.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gazzetta: {len(partite)} partite, {len(pg)} giocatori incrociati, {cambi} stati cambiati dopo il confronto con Fantacalcio"
          + (f"; fonti discordanti su {len(discordi)}: {', '.join(discordi[:8])}" if discordi else "")
          + (f"; nomi non riconosciuti: {len(perse)}" if perse else ""))


if __name__ == "__main__":
    main()
