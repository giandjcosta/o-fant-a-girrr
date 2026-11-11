#!/usr/bin/env python3
"""Legge dal database le sfide e le promesse e scrive calcoli/eventi.json, che poi usa post_curva.py.

Usa solo funzioni di lettura libera (come il feed di Curva): derby_stato (sfide recenti) e conf_promesse (promesse con esito).
Servono CURVA_URL e CURVA_KEY (chiave publishable). Non scrive nel database.
Uso: python3 calcoli/leggi_eventi.py [uscita.json] [data.json del sito, per l'avversario delle conferenze]
Sfide: ogni sfida produce l'evento 'sfida'; se poi è rifiutata/scaduta/accettata con nome concordato, anche 'rifiuto'/'scaduta'/'derby'.
Il testo vero della frase scelta (frase_testo, da derby_stato) finisce nell'evento come "testo": serve all'Intervista speciale. Le sfide vecchie, senza testo, hanno solo il numero 0-2.
Conferenze: ogni conferenza pubblicata dell'ultima giornata (conf_pubbliche) produce l'evento 'conferenza';
ogni risposta del dopo partita dell'ultima giornata (conf_dopo_pubbliche, se c'è nel database) l'evento 'dopo'.
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


def partita(cal, team, giornata):
    """(casa, trasferta, risultato) della partita di campionato della squadra in quella giornata, nell'ordine del calendario;
    risultato '' se non ancora giocata. None se non si trova."""
    for g in cal or []:
        if g.get("n") == giornata:
            for m in g.get("m", []):
                if team in (m[0], m[3]):
                    return m[0], m[3], (m[4] if m[4] and m[4] != "-" else "")
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
        tono = tono_conferenza(c)
        out.append(dict(tipo="conferenza", k=f"C{c['giornata']}-{c['team']}", team=c["team"], giornata=c["giornata"],
                        avversario=avversario(cal, c["team"], c["giornata"]), tono=tono,
                        partita=" - ".join((partita(cal, c["team"], c["giornata"]) or ("", ""))[:2]).strip(" -"),
                        libera=(c.get("libera") or "").strip(), risposte=ris, promessa=(c.get("promessa") or "").strip()))
    return out


def rpc_facoltativa(nome):
    """Come rpc(), ma se la funzione non c'è ancora nel database (o non risponde) restituisce [] e si va avanti."""
    url, key = os.environ.get("CURVA_URL"), os.environ.get("CURVA_KEY")
    r = urllib.request.Request(f"{url}/rest/v1/rpc/{nome}", b"{}",
                               {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        x = json.loads(urllib.request.urlopen(r, timeout=30).read())
        return x if isinstance(x, list) else []
    except Exception as e:
        print(f"{nome} non disponibile ({e}): niente conferenze del dopo partita.")
        return []


def eventi_dopo(dopo, cal=None):
    """Un evento 'dopo' (conferenza del dopo partita) per ogni risposta dell'ultima giornata, con avversario e risultato visto dalla squadra."""
    if not dopo:
        return []
    ultima = max(c["giornata"] for c in dopo)
    out = []
    for c in sorted(dopo, key=lambda x: x["team"]):
        t = ((c.get("risposta") or {}).get("t") or "").strip()
        if c["giornata"] != ultima or not t:
            continue
        p = partita(cal, c["team"], c["giornata"])   # nell'ordine del calendario: «Oranje VC - Apo team 1-1»
        out.append(dict(tipo="dopo", k=f"D{c['giornata']}-{c['team']}", team=c["team"], giornata=c["giornata"],
                        avversario=avversario(cal, c["team"], c["giornata"]), partita=f"{p[0]} - {p[1]}" if p else "",
                        risultato=p[2] if p else "", risposta=t))
    return out


# ---------- 5.8 · Redazione di Girrr Sport (redazione/ISTRUZIONI.md nel registro) ----------
SITO_REDAZIONE = "https://giandjcosta.github.io/o-fant-a-girrr/girrr/dati/redazione.json"
NON_RIPORTATA = "…"   # al posto di una frase giudicata non pubblicabile, nei post e nei file pubblici


def redazione():
    """Il file della redazione (sul sito, o quello indicato in REDAZIONE). None se non c'è: tutto funziona come prima."""
    try:
        if os.environ.get("REDAZIONE"):
            r = json.loads(Path(os.environ["REDAZIONE"]).read_text(encoding="utf-8"))
        else:
            r = json.loads(urllib.request.urlopen(SITO_REDAZIONE, timeout=30).read())
        return r if r.get("controllato") else None
    except Exception as e:
        print("Redazione non letta (si va avanti come prima):", e)
        return None


def redazione_attiva(red, ore=24):
    """La redazione lavora se ha aggiornato il file nelle ultime 24 ore: solo allora le conferenze aspettano il suo giudizio."""
    import datetime
    try:
        t = datetime.datetime.fromisoformat(red["aggiornato"])
        return (datetime.datetime.now(datetime.timezone.utc) - t).total_seconds() < ore * 3600
    except Exception:
        return False


def applica_redazione(conf, prom, dopo, red):
    """Applica i giudizi della redazione alle risposte scritte a mano.
    - tono e promessa decisi dalla redazione al posto di quelli della regola automatica dell'app (contano per la fiducia);
    - una frase non pubblicabile non compare mai: «…» nei post, «Frase non riportata» nelle promesse;
    - finché la redazione lavora, le conferenze con risposte scritte a mano non ancora giudicate aspettano (non escono in Curva).
    Restituisce (conf, prom, dopo, chiavi in attesa)."""
    if not red:
        return conf, prom, dopo, set()
    G, attiva, attesa = red.get("giudizi") or {}, redazione_attiva(red), set()
    nuove, prom_da = [], {}
    for c in conf:
        c = json.loads(json.dumps(c))
        libere = [i for i, r in enumerate(c.get("risposte") or []) if r.get("a") == "free"]
        g = G.get(f"{c['team']}|{c['giornata']}")
        if libere and not g and attiva:
            attesa.add(f"C{c['giornata']}-{c['team']}")
        if g:
            for v in g.get("risposte", []):
                i = v.get("i")
                if i is not None and i < len(c["risposte"]):
                    r = c["risposte"][i]
                    r["k"], r["w"] = v.get("k", r.get("k")), v.get("w", r.get("w"))
                    if not v.get("pubblicabile", True):
                        r["nascosta"] = True
            prima = next((r for r in c["risposte"] if r.get("w")), None)
            c["promessa"] = (NON_RIPORTATA if prima.get("nascosta") else prima["t"]) if prima else ""
            c["pesa"] = max([2 if r.get("k") == 2 else 1 for r in c["risposte"] if r.get("w")] or [0])
            prom_da[(c["team"], c["giornata"])] = c
            for r in c["risposte"]:
                if r.pop("nascosta", False):
                    r["t"] = NON_RIPORTATA
        nuove.append(c)
    prom2 = []
    for p in prom:
        c = prom_da.get((p["team"], p["giornata"]))
        if c is not None:
            if not c["promessa"]:
                continue   # per la redazione non era una promessa
            p = dict(p, promessa="Frase non riportata" if c["promessa"] == NON_RIPORTATA else c["promessa"], pesa=c["pesa"])
        prom2.append(p)
    dopo2 = []
    for d in dopo or []:
        r = d.get("risposta") or {}
        g = G.get(f"{d['team']}|{d['giornata']}|dopo")
        if r.get("a") == "free" and not g and attiva:
            attesa.add(f"D{d['giornata']}-{d['team']}")
            continue
        if g and g.get("risposte") and not g["risposte"][0].get("pubblicabile", True):
            continue   # frase non pubblicabile: niente post
        dopo2.append(d)
    return nuove, prom2, dopo2, attesa


def tono_conferenza(c):
    """Tono della conferenza (0 Sicuro, 1 Umile, 2 Provocatorio), lo stesso calcolo dell'app; None se le risposte non sono tre."""
    righe = [r for r in (c.get("risposte") or []) if r.get("t")]
    return min(2, int(sum(int(r.get("k", 1)) for r in righe) / 3 + 0.5)) if len(righe) == 3 else None


def con_tono(prom, conf):
    """Aggiunge a ogni promessa il tono della sua conferenza (5.6.3/5.7: il tono conta per la fiducia, vedi fiducia.py)."""
    toni = {(c["team"], c["giornata"]): tono_conferenza(c) for c in conf or []}
    return [dict(p, tono=toni.get((p["team"], p["giornata"]))) for p in prom]


if __name__ == "__main__":
    prom = rpc("conf_promesse", {})
    conf = rpc("conf_pubbliche", {})
    dopo = rpc_facoltativa("conf_dopo_pubbliche")   # 5.7: c'è solo dopo rilascio/conferenze/dopo.sql
    conf, prom, dopo, attesa = applica_redazione(conf, prom, dopo, redazione())   # 5.8: giudizi della redazione
    cal = calendario_lega() if (conf or dopo) else None
    ev = eventi(rpc("derby_stato", {}), prom) + eventi_conferenza(conf, cal) + eventi_dopo(dopo, cal)
    if attesa:
        print("Aspettano il giudizio della redazione:", ", ".join(sorted(attesa)))
        ev = [e for e in ev if e.get("k") not in attesa]
    USCITA.write_text(json.dumps(ev, ensure_ascii=False, indent=1), encoding="utf-8")
    # le promesse grezze, con il tono della conferenza, servono a fiducia.py (che ricalcola l'esito dai risultati veri)
    (USCITA.parent / "conferenze.json").write_text(json.dumps(con_tono(prom, conf), ensure_ascii=False, indent=1), encoding="utf-8")
    print("eventi.json scritto:", len(ev), "eventi;", "conferenze.json:", len(prom), "promesse")
