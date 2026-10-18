#!/usr/bin/env python3
"""Legge dal database le sfide e le promesse e scrive calcoli/eventi.json, che poi usa post_curva.py.

Usa solo funzioni di lettura libera (come il feed di Curva): derby_stato (sfide recenti) e conf_promesse (promesse con esito).
Servono CURVA_URL e CURVA_KEY (chiave publishable). Non scrive nel database.
Uso: python3 calcoli/leggi_eventi.py [uscita.json]
Sfide: ogni sfida produce l'evento 'sfida'; se poi è rifiutata/scaduta/accettata con nome concordato, anche 'rifiuto'/'scaduta'/'derby'.
Il testo della frase scelta non è nel database (solo il numero 0-2): il post della sfida non la cita.
"""
import json, os, sys, urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent
USCITA = Path(sys.argv[1]) if len(sys.argv) > 1 else QUI / "eventi.json"


def rpc(nome, corpo):
    url, key = os.environ.get("CURVA_URL"), os.environ.get("CURVA_KEY")
    if not (url and key):
        sys.exit("Mancano CURVA_URL o CURVA_KEY.")
    r = urllib.request.Request(f"{url}/rest/v1/rpc/{nome}", json.dumps(corpo).encode(),
                               {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(r, timeout=30).read())
    except Exception as e:
        sys.exit(f"Il database non risponde su {nome} ({e}). Non scrivo eventi.")


def eventi(stato, promesse):
    out = []
    for s in sorted(stato.get("sfide", []), key=lambda x: x["id"]):
        k = f"S{s['id']}"
        out.append(dict(tipo="sfida", k=k, da=s["da"], a=s["a"]))
        if s["stato"] == "rifiutata":
            out.append(dict(tipo="rifiuto", k=k, da=s["da"], a=s["a"]))
        elif s["stato"] == "scaduta":
            out.append(dict(tipo="scaduta", k=k, da=s["da"], a=s["a"]))
        elif s["stato"] == "accettata" and s.get("nome") and s.get("nome_ok"):
            out.append(dict(tipo="derby", k=k, da=s["da"], a=s["a"], nome=s["nome"]))
    for p in promesse:
        if p.get("esito") in ("v", "s") and p.get("promessa"):
            out.append(dict(tipo="promessa", k=f"C{p['giornata']}-{p['team']}", team=p["team"], giornata=p["giornata"],
                            promessa=p["promessa"], esito=p["esito"]))
    return out


if __name__ == "__main__":
    prom = rpc("conf_promesse", {})
    ev = eventi(rpc("derby_stato", {}), prom)
    USCITA.write_text(json.dumps(ev, ensure_ascii=False, indent=1), encoding="utf-8")
    # le promesse grezze servono a fiducia.py (che ricalcola l'esito dai risultati veri)
    (USCITA.parent / "conferenze.json").write_text(json.dumps(prom, ensure_ascii=False, indent=1), encoding="utf-8")
    print("eventi.json scritto:", len(ev), "eventi;", "conferenze.json:", len(prom), "promesse")
