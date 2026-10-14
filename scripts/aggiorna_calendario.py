#!/usr/bin/env python3
"""Calendario di Serie A completo (accoppiamenti di tutte le giornate) da Fantacalcio.it.

Legge le pagine pubbliche /serie-a/calendario/N e salva in data.json:
  sa   {giornata: [[casa, fuori, "gg/mm hh:mm"], ...]}   tutte le giornate dalla prossima in poi
       (gli orari delle giornate lontane sono provvisori: li assegna la Lega poche settimane prima)

Non tocca fx (orari ufficiali usati da schedine e riepilogo). Se la lettura non è completa
(meno di 5 giornate valide, o una giornata con un numero di partite diverso da 10) lascia i dati come sono.

Uso:  python3 scripts/aggiorna_calendario.py [--da-cartella DIR]   (DIR con girrr_cal<N>.html)
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
BASE = "https://www.fantacalcio.it/serie-a/calendario/"
RADICE = Path(__file__).resolve().parent.parent


def scarica(n):
    req = urllib.request.Request(BASE + str(n), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def partite(pagina, giornata):
    """Le partite della giornata richiesta (la pagina mostra anche quelle di un'altra giornata)."""
    out = []
    for blocco in re.split(r'itemtype="http://schema\.org/SportsEvent"', pagina)[1:]:
        gw = re.search(r'class="matchweek">\s*(\d+)', blocco)
        nomi = re.findall(r'itemprop="name"\s+content="([^"]+)"', blocco)
        dt = re.search(r'class="day">\s*(\d\d/\d\d)\s*</span>\s*<span class="hours">\s*(\d\d:\d\d)', blocco)
        if not gw or len(nomi) < 2 or int(gw.group(1)) != giornata:
            continue
        casa, fuori = html.unescape(nomi[0]).strip(), html.unescape(nomi[1]).strip()
        if any(p[0] == casa and p[1] == fuori for p in out):
            continue
        out.append([casa, fuori, (dt.group(1) + " " + dt.group(2)) if dt else ""])
    return out


def main():
    cartella = None
    if "--da-cartella" in sys.argv:
        cartella = Path(sys.argv[sys.argv.index("--da-cartella") + 1])
    fp = RADICE / "data.json"
    D = json.loads(fp.read_text(encoding="utf-8"))
    prima = int(D.get("nx") or D.get("round") or 1)
    sa = {}
    for g in range(prima, 39):
        try:
            pag = (cartella / f"girrr_cal{g}.html").read_text(encoding="utf-8") if cartella else scarica(g)
        except Exception as e:
            if cartella:
                continue
            print(f"calendario: giornata {g} non letta ({e})")
            continue
        p = partite(pag, g)
        if len(p) == 10:
            sa[str(g)] = p
        else:
            print(f"calendario: giornata {g} con {len(p)} partite, la salto")
    if len(sa) < (1 if cartella else 5):
        print("calendario: lettura incompleta, non aggiorno")
        return
    vecchio = D.get("sa") or {}
    nuovo = sa
    if nuovo == vecchio:
        print(f"calendario: già aggiornato ({len(nuovo)} giornate)")
        return
    D["sa"] = nuovo
    fp.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"calendario: salvate {len(nuovo)} giornate (dalla {min(map(int, nuovo))}ª alla {max(map(int, nuovo))}ª)")


if __name__ == "__main__":
    main()
