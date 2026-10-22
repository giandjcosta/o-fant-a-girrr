#!/usr/bin/env python3
"""Legge dal database le sfide e le promesse e scrive calcoli/eventi.json, che poi usa post_curva.py.

Usa solo funzioni di lettura libera (come il feed di Curva): derby_stato (sfide recenti) e conf_promesse (promesse con esito).
Servono CURVA_URL e CURVA_KEY (chiave publishable). Non scrive nel database.
Uso: python3 calcoli/leggi_eventi.py [uscita.json] [data.json del sito, per l'avversario delle conferenze]
Sfide: ogni sfida produce l'evento 'sfida'; se poi è rifiutata/scaduta/accettata con nome concordato, anche 'rifiuto'/'scaduta'/'derby'.
Il testo vero della frase scelta (frase_testo, da derby_stato) finisce nell'evento come "testo": serve all'Intervista speciale. Le sfide vecchie, senza testo, hanno solo il numero 0-2.
Conferenze: ogni conferenza pubblicata dell'ultima giornata (conf_pubbliche) produce l'evento 'conferenza'.
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


ULTIMA_SENZA_ACCETTATA = 5   # sfide già accettate al 22 ottobre 2026


def eventi(stato, promesse):
    out = []
    for s in sorted(stato.get("sfide", []), key=lambda x: x["id"]):
        k = f"S{s['id']}"
        ev = dict(tipo="sfida", k=k, da=s["da"], a=s["a"], f=s.get("frase"))
        if (s.get("frase_testo") or "").strip():
            ev["testo"] = s["frase_testo"].strip()
        out.append(ev)
        if s["stato"] == "rifiutata":
            out.append(dict(tipo="rifiuto", k=k, da=s["da"], a=s["a"]))
        elif s["stato"] == "scaduta":
            out.append(dict(tipo="scaduta", k=k, da=s["da"], a=s["a"]))
        elif s["stato"] == "accettata":
            # le sfide 1-5 sono nate prima di questo post: niente post d'accettazione retroattivi
            if s["id"] > ULTIMA_SENZA_ACCETTATA:
                out.append(dict(tipo="accettata", k=k, da=s["da"], a=s["a"]))
            if s.get("nome") and s.get("nome_ok"):
                out.append(dict(tipo="derby", k=k, da=s["da"], a=s["a"], nome=s["nome"]))
    for p in promesse:
        if p.get("esito") in ("v", "s") and p.get("promessa"):
            out.append(dict(tipo="promessa", k=f"C{p['giornata']}-{p['team']}", team=p["team"], giornata=p["giornata"],
                            promessa=p["promessa"], esito=p["esito"]))
    return out


SITO_DATI = "https://giandjcosta.github.io/o-fant-a-girrr/data.json"


def calendario_lega():
    """Calendario del campionato dal sito (data.json): serve a sapere chi è l'avversario della conferenza.
    Si usa il file dato come terzo argomento (nei workflow, la copia di gh-pages), altrimenti la copia pubblica del sito.
    Se non si riesce a leggerlo, restituisce None: la conferenza esce lo stesso, senza il nome dell'avversario."""
    try:
        if len(sys.argv) > 2 and Path(sys.argv[2]).exists():
            return json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))["cal"]["lega"]
        return json.loads(urllib.request.urlopen(SITO_DATI, timeout=30).read())["cal"]["lega"]
    except Exception as e:
        print("Calendario non letto, le conferenze escono senza avversario:", e)
        return None


def avversario(cal, team, giornata):
    for g in cal or []:
        if g.get("n") == giornata:
            for m in g.get("m", []):          # [casa, punti casa, punti trasferta, trasferta, risultato]
                if m[0] == team:
                    return m[3]
                if m[3] == team:
                    return m[0]
    return ""


def eventi_conferenza(conf, cal=None):
    """Un evento 'conferenza' per ogni conferenza pubblicata dell'ultima giornata (le vecchie non si ripostano).
    Porta le tre risposte nell'ordine dell'app (anche quella scritta a mano), il tono e l'avversario."""
    if not conf:
        return []
    ultima = max(c["giornata"] for c in conf)
    out = []
    for c in sorted(conf, key=lambda x: x["team"]):
        if c["giornata"] != ultima:
            continue
        righe = [r for r in (c.get("risposte") or []) if r.get("t")]
        ris = [r["t"].strip() for r in righe]
        # stesso calcolo dell'app: tono 0 Sicuro, 1 Umile, 2 Provocatorio = media dei toni delle tre risposte, arrotondata per eccesso a .5
        tono = min(2, int(sum(int(r.get("k", 1)) for r in righe) / 3 + 0.5)) if len(righe) == 3 else None
        out.append(dict(tipo="conferenza", k=f"C{c['giornata']}-{c['team']}", team=c["team"], giornata=c["giornata"],
                        avversario=avversario(cal, c["team"], c["giornata"]), tono=tono,
                        libera=(c.get("libera") or "").strip(), risposte=ris, promessa=(c.get("promessa") or "").strip()))
    return out


if __name__ == "__main__":
    prom = rpc("conf_promesse", {})
    ev = eventi(rpc("derby_stato", {}), prom) + (lambda c: eventi_conferenza(c, calendario_lega() if c else None))(rpc("conf_pubbliche", {}))
    USCITA.write_text(json.dumps(ev, ensure_ascii=False, indent=1), encoding="utf-8")
    # le promesse grezze servono a fiducia.py (che ricalcola l'esito dai risultati veri)
    (USCITA.parent / "conferenze.json").write_text(json.dumps(prom, ensure_ascii=False, indent=1), encoding="utf-8")
    print("eventi.json scritto:", len(ev), "eventi;", "conferenze.json:", len(prom), "promesse")
