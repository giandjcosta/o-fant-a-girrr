#!/usr/bin/env python3
"""Aggiorna da solo, dalle pagine pubbliche di Fantacalcio.it, tre parti di data.json:

  ps     statistiche di stagione dei giocatori (presenze, media voto, fantamedia, gol, assist)
  votes  voto, fantavoto e bonus giornata per giornata
  log    presenze (titolare / subentrato / panchina) dei giocatori delle rose
  fas    stato recente degli svincolati

Non tocca nient'altro. Non serve alcun accesso: le pagine sono pubbliche.
Uso:  python3 scripts/aggiorna_dati.py [--da-cartella DIR]   (DIR = pagine gia' scaricate, per le prove)
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
STAGIONE = "2026-27"
URL_STAT = "https://www.fantacalcio.it/statistiche-serie-a"
URL_VOTI = "https://www.fantacalcio.it/voti-fantacalcio-serie-a/" + STAGIONE + "/{g}"


def scarica(url, cartella=None, nome=None):
    if cartella:
        return (Path(cartella) / nome).read_text(encoding="utf-8")
    ultimo = None
    for _ in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(3)
    raise RuntimeError(f"pagina non raggiungibile: {url} ({ultimo})")


def num(t):
    t = (t or "").strip().replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def tondo(x):
    return None if x is None else (int(x) if float(x).is_integer() else x)


def leggi_statistiche(html):
    """id -> dict(pg, mv, fmv, g, as)"""
    out = {}
    for riga in re.findall(r'<tr class="player-row".*?</tr>', html, re.S):
        m = re.search(r'player-link[^>]*href="[^"]*/(\d+)"', riga)
        if not m:
            continue

        def col(k):
            c = re.search(r'data-col-key="%s">\s*([^<]*?)\s*<' % k, riga, re.S)
            return c.group(1) if c else ""
        pg = int(num(col("pg")) or 0)
        out[m.group(1)] = {"pg": pg, "mv": num(col("mv")) if pg else None,
                           "fmv": num(col("mfv")) if pg else None,
                           "g": int(num(col("gol")) or 0), "as": int(num(col("ass")) or 0)}
    return out


def plurale(n, uno, molti):
    return f"{n} {uno if n == 1 else molti}"


def bonus_da(titolo, n):
    t = titolo.strip().lower()
    if t == "gol segnati":
        return plurale(n, "gol", "gol")
    if t == "gol subiti":
        return plurale(n, "gol subito", "gol subiti")
    if t == "autoreti":
        return plurale(n, "autogol", "autogol")
    if t == "rigori segnati":
        return plurale(n, "rigore segnato", "rigori segnati")
    if t == "rigori sbagliati":
        return plurale(n, "rigore sbagliato", "rigori sbagliati")
    if t == "rigori parati":
        return plurale(n, "rigore parato", "rigori parati")
    if t == "assist":
        return plurale(n, "assist", "assist")
    if t == "player of the match":
        return "migliore in campo"
    return f"{n} {t}"


def leggi_voti(html):
    """id -> dict(v, f, sub, b)  (solo i giocatori che compaiono nella pagina)"""
    out = {}
    for riga in re.findall(r"<tr>.*?</tr>", html, re.S):
        m = re.search(r'player-link[^>]*href="[^"]*/(\d+)"', riga)
        if not m:
            continue
        pill = re.search(r'<span class="player-grade[^"]*" data-value="([^"]*)"></span>\s*'
                         r'<span class="player-fanta-grade[^"]*" data-value="([^"]*)"', riga)
        v, f = (num(pill.group(1)), num(pill.group(2))) if pill else (None, None)
        if v == 55:  # 55 e' il segnaposto di "senza voto"
            v, f = None, None
        sub = "in.webp" in riga
        b = []
        for val, tit in re.findall(r'class="player-bonus cell (?:bonus|malus)" data-value="([^"]*)" title="([^"]*)"', riga):
            n = int(num(val) or 0)
            if n > 0:
                b.append(bonus_da(tit, n))
        if sub:
            b.append("subentrato")
        if v is None:
            b.append("senza voto")
        out[m.group(1)] = {"v": v, "f": f, "sub": sub, "b": b}
    return out


def main():
    cartella = None
    if "--da-cartella" in sys.argv:
        cartella = sys.argv[sys.argv.index("--da-cartella") + 1]
    percorso = ROOT / "data.json"
    D = json.loads(percorso.read_text(encoding="utf-8"))
    prima = json.dumps({k: D.get(k) for k in ("ps", "votes", "log", "fas")}, sort_keys=True)
    P = D["P"]
    in_rosa = {str(p["id"]) for t in D["teams"] for p in t["pl"]}
    svinc = {str(i) for i in D["fa"]}
    seguiti = in_rosa | svinc
    avvisi = []

    # ---- statistiche
    stat = leggi_statistiche(scarica(URL_STAT, cartella, "stats.html"))
    if len(stat) < 400:
        raise SystemExit(f"statistiche incomplete ({len(stat)} righe): non scrivo niente")
    ps = D.get("ps", {})
    for i in seguiti:
        if i in stat:
            nuovo = dict(stat[i])
            if "pct" in ps.get(i, {}):
                nuovo["pct"] = ps[i]["pct"]
            ps[i] = nuovo
        elif i not in ps:
            avvisi.append(f"{P.get(i, {}).get('n', i)}: non compare nelle statistiche")
    D["ps"] = ps

    # ---- voti, giornata per giornata (si ferma alla prima giornata senza voti)
    voti_g = {}
    g = 1
    while g < 60:
        pagina = leggi_voti(scarica(URL_VOTI.format(g=g), cartella, f"voti{g}.html"))
        if not pagina:
            break
        voti_g[g] = pagina
        g += 1
        if not cartella:
            time.sleep(1)
    if not voti_g:
        raise SystemExit("nessuna pagina con i voti: non scrivo niente")

    votes = D.setdefault("votes", {})
    for g, pagina in voti_g.items():
        for i, x in pagina.items():
            if i in seguiti:
                scheda = votes.setdefault(i, {})
                if str(g) not in scheda:
                    scheda[str(g)] = {"v": x["v"], "f": x["f"], "b": x["b"]}

    # ---- presenze dei giocatori delle rose
    log = D.setdefault("log", {})
    for g, pagina in voti_g.items():
        squadre = {P[i]["t"] for i in pagina if i in P}
        for i in in_rosa:
            if i not in P:
                continue
            scheda = log.setdefault(i, {})
            if str(g) in scheda:
                continue
            if i in pagina:
                scheda[str(g)] = "S" if pagina[i]["sub"] else "T"
            elif P[i]["t"] in squadre:
                scheda[str(g)] = "P"

    # ---- svincolati: stato recente e titolarita'
    ultime = sorted(voti_g)
    giocate = {}
    for g in ultime:
        for i in voti_g[g]:
            if i in P:
                giocate.setdefault(P[i]["t"], set()).add(g)
    fas = D.setdefault("fas", {})
    for i in svinc:
        if i not in P:
            continue
        sq = P[i]["t"]
        gs = sorted(giocate.get(sq, []))
        st = "".join(("S" if voti_g[g][i]["sub"] else "T") if i in voti_g[g] else "-" for g in gs[-5:])
        st = st.rjust(5, "-") if st else "-----"
        tit = sum(1 for g in gs if i in voti_g[g] and not voti_g[g][i]["sub"])
        fvs = [voti_g[g][i]["f"] for g in gs if i in voti_g[g] and voti_g[g][i]["f"] is not None]
        fas[i] = {"tit": round(10 * tit / len(gs)) if gs else 0,
                  "fm": round(sum(fvs) / len(fvs), 2) if fvs else None, "h": st}
    dopo = json.dumps({k: D.get(k) for k in ("ps", "votes", "log", "fas")}, sort_keys=True)
    if dopo == prima:
        print("niente di nuovo: data.json resta com'e'")
        return
    D["psDate"] = time.strftime("%Y-%m-%d")

    if "--solo-prova" in sys.argv:
        D["_avvisi"] = avvisi
    percorso.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"statistiche: {len(stat)} righe; voti: giornate {ultime[0]}-{ultime[-1]}; avvisi: {len(avvisi)}")
    for a in avvisi[:20]:
        print(" -", a)


if __name__ == "__main__":
    main()
