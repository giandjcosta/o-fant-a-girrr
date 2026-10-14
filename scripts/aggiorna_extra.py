#!/usr/bin/env python3
"""Rigoristi e specialisti dei calci piazzati (Fantacalcio.it, pagina pubblica /rigoristi-serie-a).

Salva in data.json:
  rg  {id giocatore: posizione tra i rigoristi della squadra (1 = primo)}
  cp  {id giocatore: posizione tra i tiratori di calci piazzati (1 = primo)}
Se la pagina non è completa (meno di 18 squadre) lascia i dati come sono.

Uso:  python3 scripts/aggiorna_extra.py [--da-file FILE.html]
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
URL = "https://www.fantacalcio.it/rigoristi-serie-a"
ROOT = Path(__file__).resolve().parent.parent


def leggi(h):
    rg, cp, squadre = {}, {}, 0
    for card in re.split(r'<div id="team-\d+" class="card team-card">', h)[1:]:
        squadre += 1
        for titolo, dest in (("Rigori", rg), ("Calci piazzati", cp)):
            m = re.search(r"<header[^>]*>\s*" + titolo + r"\s*</header>(.*?)(?=<header|$)", card, re.S)
            if not m:
                continue
            visti = []
            for i in re.findall(r'/serie-a/squadre/[^/"]+/[^/"]+/(\d+)"', m.group(1)):
                if i not in visti:
                    visti.append(i)
            for pos, i in enumerate(visti, 1):
                dest.setdefault(i, pos)
    return rg, cp, squadre


def main():
    if "--da-file" in sys.argv:
        h = Path(sys.argv[sys.argv.index("--da-file") + 1]).read_text(encoding="utf-8")
    else:
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                h = r.read().decode("utf-8", "replace")
        except Exception as e:
            print(f"rigoristi: pagina non letta ({e})")
            return
    rg, cp, squadre = leggi(h)
    if squadre < 18 or len(rg) < 20:
        print(f"rigoristi: lette {squadre} squadre e {len(rg)} rigoristi, non aggiorno")
        return
    fp = ROOT / "data.json"
    D = json.loads(fp.read_text(encoding="utf-8"))
    ignoti = [i for i in list(rg) + list(cp) if i not in D["P"]]
    if D.get("rg") == rg and D.get("cp") == cp:
        print("rigoristi: già aggiornati")
        return
    D["rg"], D["cp"] = rg, cp
    fp.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"rigoristi: {len(rg)} rigoristi e {len(cp)} specialisti di calci piazzati su {squadre} squadre"
          + (f"; {len(set(ignoti))} id non in rosa/lista" if ignoti else ""))


if __name__ == "__main__":
    main()
