#!/usr/bin/env python3
"""Chiude le promesse delle conferenze stampa dopo la partita.

Per ogni promessa senza esito, se la partita di quella giornata è stata giocata, calcola l'esito dal risultato vero:
  v = mantenuta (la squadra ha vinto)   p = pareggio   s = tradita (ha perso)
e lo scrive nel database con conf_risolvi (può farlo solo la squadra amministratrice).
Uso:  python3 calcoli/risolvi_conferenze.py [data.json]          prova a vuoto: mostra cosa farebbe
      python3 calcoli/risolvi_conferenze.py [data.json] --vai    scrive davvero
Servono CURVA_URL, CURVA_KEY e, con --vai, CURVA_TEAM e CURVA_CODE. Se il database non risponde ci si ferma.
"""
import json, os, sys, urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
DATI = Path(ARGS[0]) if ARGS else QUI.parent / "data.json"
VAI = "--vai" in sys.argv


def chiama(nome, corpo):
    url, key = os.environ.get("CURVA_URL"), os.environ.get("CURVA_KEY")
    if not (url and key):
        sys.exit("Mancano CURVA_URL o CURVA_KEY.")
    r = urllib.request.Request(f"{url}/rest/v1/rpc/{nome}", json.dumps(corpo).encode(),
                               {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        x = urllib.request.urlopen(r, timeout=30).read()
        return json.loads(x) if x else None
    except Exception as e:
        sys.exit(f"Il database non ha risposto su {nome} ({e}). Mi fermo.")


def esito_partita(lega, giornata, team):
    for r in lega:
        if r["n"] != giornata:
            continue
        for casa, pc, pf, fuori, ris in r["m"]:
            if team in (casa, fuori) and ris and ris != "-":
                a, b = map(int, ris.split("-"))
                if team == fuori:
                    a, b = b, a
                return "v" if a > b else "s" if a < b else "p"
    return None


def main():
    lega = json.loads(DATI.read_text(encoding="utf-8"))["cal"]["lega"]
    aperte = [p for p in chiama("conf_promesse", {}) if not p.get("esito")]
    fatte = 0
    for p in aperte:
        e = esito_partita(lega, p["giornata"], p["team"])
        if not e:
            continue
        nome = {"v": "mantenuta", "p": "pareggio", "s": "tradita"}[e]
        print(f"  {p['team']}, giornata {p['giornata']}: «{p['promessa']}» -> {nome}")
        if VAI:
            t, c = os.environ.get("CURVA_TEAM"), os.environ.get("CURVA_CODE")
            if not (t and c):
                sys.exit("Mancano CURVA_TEAM o CURVA_CODE.")
            chiama("conf_risolvi", dict(p_team=t, p_code=c, p_target=p["team"], p_giornata=p["giornata"], p_esito=e))
        fatte += 1
    print(f"Promesse da chiudere: {fatte}" + ("" if VAI else " (prova a vuoto: aggiungi --vai)"))


if __name__ == "__main__":
    main()
