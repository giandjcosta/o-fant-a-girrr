#!/usr/bin/env python3
"""Scambi nell'app (6.6, Claude, 24 novembre 2026, decisioni di Gianluca): dal database alle rose del sito, alla Curva e alla Radio.

Gira una volta al giorno nel workflow «Scambi dell'app» (scambi-giornata.yml, verso le 7:40 ora italiana;
Gianluca, 24 novembre 2026: «una volta al giorno è ok»). I post li pubblica poi «Curva, post quasi subito» con post_curva.py:
1. Conferma automatica: uno scambio «in attesa» le cui rose in data.json risultano già scambiate (importazione da Leghe)
   diventa ufficiale con scambio_srv_leghe. Vale la prima conferma, manuale o automatica.
2. Ogni scambio confermato e non ancora applicato:
   - nelle rose di data.json (gh-pages) i giocatori passano da una squadra all'altra, con il loro costo; se le rose sono già
     scambiate non cambia niente; se i giocatori non sono più nelle due rose lo scambio diventa «non valido»;
   - in calcoli/mercato-app.json (main) entrano il post della Lega con il commento di Ciro Trattativa (li pubblica
     post_curva.py una volta sola) e la notizia per Ciro alla Radio della giornata dopo (voci-src/prepara_dati.py).
3. Con --segna (dopo che i push sono andati a buon fine) scambio_srv_applicato segna come applicati gli scambi già scritti.
Senza le funzioni del database (sql/scambi-66.sql non ancora applicato) non fa niente ed esce senza errori.

Servono CURVA_URL e CURVA_KEY (lettura); con --vai o --segna anche CURVA_TEAM e CURVA_CODE (Oranje VC, come per le sfide).
Uso: python3 calcoli/scambi_app.py CARTELLA_GH_PAGES [--vai] [--segna] [--prova STATO.json]
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent
USCITA = QUI / "mercato-app.json"
MOSTRA = {"The Blue brothers": "The Blues Brothers"}   # come nomi.js: la chiave interna resta, cambia solo quello che si legge


class NonAttivo(Exception):
    pass


def rpc(nome, corpo):
    url, key = os.environ.get("CURVA_URL"), os.environ.get("CURVA_KEY")
    if not (url and key):
        sys.exit("Mancano CURVA_URL o CURVA_KEY.")
    r = urllib.request.Request(f"{url}/rest/v1/rpc/{nome}", json.dumps(corpo).encode(),
                               {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        x = urllib.request.urlopen(r, timeout=30).read()
        return json.loads(x) if x else None
    except urllib.error.HTTPError as e:
        corpo_err = e.read().decode("utf-8", "replace")
        if e.code == 404 or "Could not find the function" in corpo_err:
            raise NonAttivo(nome)
        raise SystemExit(f"Il database ha risposto {e.code} su {nome}: {corpo_err[:200]}")


def chi():
    t, c = os.environ.get("CURVA_TEAM"), os.environ.get("CURVA_CODE")
    if not (t and c):
        sys.exit("Mancano CURVA_TEAM o CURVA_CODE.")
    return t, c


def mostra(t):
    return MOSTRA.get(t, t)


def elenco(nomi):
    return nomi[0] if len(nomi) == 1 else ", ".join(nomi[:-1]) + " e " + nomi[-1]


def ultima_giornata(D):
    g = [x["n"] for x in D["cal"]["lega"] if x["m"] and all(m[4] and m[4] != "-" for m in x["m"])]
    return max(g) if g else 0


def dove(D):
    return {str(p["id"]): t["name"] for t in D["teams"] for p in t["pl"]}


def gia_scambiato(s, D):
    w = dove(D)
    return all(w.get(i) == s["a"] for i in s["dai"]) and all(w.get(i) == s["da"] for i in s["ricevi"])


def prima_dello_scambio(s, D):
    w = dove(D)
    return all(w.get(i) == s["da"] for i in s["dai"]) and all(w.get(i) == s["a"] for i in s["ricevi"])


def ruoli(ids, D):
    return sorted(D["P"].get(i, {}).get("r", "?") for i in ids)


def scambia(s, D):
    """Sposta i giocatori tra le due rose (con il loro costo). Restituisce un motivo se non si può."""
    if ruoli(s["dai"], D) != ruoli(s["ricevi"], D):
        return "I ruoli ceduti e ricevuti non coincidono"
    sq = {t["name"]: t for t in D["teams"]}
    if s["da"] not in sq or s["a"] not in sq:
        return "Squadra non trovata"
    A, B = sq[s["da"]], sq[s["a"]]
    va = [p for p in A["pl"] if str(p["id"]) in s["dai"]]
    vb = [p for p in B["pl"] if str(p["id"]) in s["ricevi"]]
    A["pl"] = [p for p in A["pl"] if str(p["id"]) not in s["dai"]] + vb
    B["pl"] = [p for p in B["pl"] if str(p["id"]) not in s["ricevi"]] + va
    return None


def cognome(n):
    """«Adams C.» → «Adams»: nel racconto basta il cognome (le iniziali servono solo a distinguere i giocatori nelle liste)."""
    return re.sub(r"(\s+(?:[A-ZÀ-Ý][a-zà-ý]{0,2}\.)+)+$", "", n).strip() or n


def nomi_di(ids, s, D):
    return [((s.get("nomi") or {}).get(i) or {}).get("n") or D["P"].get(i, {}).get("n") or "Giocatore" for i in ids]


QUANTI = {1: "Uno contro uno", 2: "Due contro due", 3: "Tre contro tre", 4: "Quattro contro quattro", 5: "Cinque contro cinque"}
CIRO = [
    "L'avevo sussurrato io al bar, eh. {k}: adesso tocca al campo dire chi ci ha guadagnato. #CiroTrattativa",
    "Telefoni bollenti fino all'ultimo, poi la stretta di mano. {k}, e tutti e due giurano di aver fatto l'affare. #CiroTrattativa",
    "Ve lo dicevo da giorni che qui si muoveva qualcosa. {k}, firme depositate: ora parlano le giornate. #CiroTrattativa",
]


def racconto(da, a, nd, nr):
    """La frase dello scambio, in italiano da giornale: chi arriva da chi e chi fa il percorso inverso.
    da = chi ha registrato lo scambio, nd = i giocatori che cede, nr = quelli che riceve. Senza articoli davanti
    ai nomi delle squadre («in casa Real Madrink»), così vale per tutte."""
    nd, nr = [cognome(x) for x in nd], [cognome(x) for x in nr]
    uno_r, uno_d = len(nr) == 1, len(nd) == 1
    casa = re.sub(r"^The ", "", da)   # «in casa Blues Brothers», come si dice «in casa Juve»
    return (f"affare fatto tra {da} e {a}: {elenco(nr)} {'approda' if uno_r else 'approdano'} in casa {casa}, "
            f"mentre {elenco(nd)} {'fa' if uno_d else 'fanno'} il percorso inverso, destinazione {a}")


def post_e_notizia(s, D, n):
    da, a = mostra(s["da"]), mostra(s["a"])
    nd, nr = nomi_di(s["dai"], s, D), nomi_di(s["ricevi"], s, D)
    frase = racconto(da, a, nd, nr)
    lega = f"MERCATO · Ufficiale\n{frase[0].upper() + frase[1:]}. #Mercato"
    ciro = CIRO[s["id"] % len(CIRO)].format(k=QUANTI.get(len(nd), f"{len(nd)} contro {len(nd)}"))
    return [["lega_ofantagirrr", lega[:280]], ["ciro_trattativa", ciro[:280]]], {"tipo": "ufficiale", "giornata": n + 1, "testo": frase}


def carica_uscita(f):
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    return {"_come_si_usa": "Scritto da calcoli/scambi_app.py: uno per scambio confermato nell'app. «post» li pubblica post_curva.py "
                            "(una volta sola), «radio» li legge la Radio della giornata indicata. Non si modifica a mano.",
            "scambi": []}


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("sito", type=Path)
    a.add_argument("--vai", action="store_true", help="scrive nel database (conferma automatica, scambi non validi)")
    a.add_argument("--segna", action="store_true", help="segna come applicati gli scambi già scritti in mercato-app.json")
    a.add_argument("--prova", type=Path, help="usa questo stato al posto del database (prove)")
    a.add_argument("--uscita", type=Path, default=USCITA, help="dove scrivere mercato-app.json (prove)")
    x = a.parse_args()
    try:
        st = json.loads(x.prova.read_text(encoding="utf-8")) if x.prova else rpc("scambio_stato", {})
    except NonAttivo:
        print("Scambi nell'app non ancora attivi nel database (sql/scambi-66.sql): niente da fare.")
        return
    scambi = sorted(st.get("scambi") or [], key=lambda s: s["id"])
    out = carica_uscita(x.uscita)
    fatti = {e["id"] for e in out["scambi"]}

    if x.segna:
        t, c = chi()
        for s in scambi:
            if s["stato"] == "confermato" and not s.get("applicato") and s["id"] in fatti:
                e = next(e for e in out["scambi"] if e["id"] == s["id"])
                rpc("scambio_srv_applicato", {"p_team": t, "p_code": c, "p_id": s["id"], "p_esito": e["esito"]})
                print(f"Scambio {s['id']} segnato come applicato.")
        return

    fd = x.sito / "data.json"
    D = json.loads(fd.read_text(encoding="utf-8"))
    cambiato = False
    n = ultima_giornata(D)
    # Per il riquadro «Mercato» del Giornale (scripts/pdf_giornale.py): gli scambi ufficiali, con la giornata dopo cui sono arrivati
    fm = x.sito / "girrr" / "dati" / "mercato.json"
    sito_m = json.loads(fm.read_text(encoding="utf-8")) if fm.exists() else {"scambi": []}
    prima_m = json.dumps(sito_m, sort_keys=True)
    for s in scambi:
        if s["stato"] == "attesa" and gia_scambiato(s, D):
            print(f"Scambio {s['id']}: le rose da Leghe sono già scambiate, conferma automatica.")
            if x.vai:
                t, c = chi()
                r = rpc("scambio_srv_leghe", {"p_team": t, "p_code": c, "p_id": s["id"]}) or {}
                if r.get("stato") == "confermato":
                    s.update(stato="confermato", conferma=r.get("conferma") or s.get("conferma") or "leghe",
                             chiuso=s.get("chiuso") or dt.datetime.now(dt.timezone.utc).isoformat())
        if s["stato"] != "confermato" or s.get("applicato"):
            continue
        if s["id"] in fatti:
            # già scritto: dopo un push fallito le rose potrebbero essere tornate quelle di prima, si rimettono a posto
            if prima_dello_scambio(s, D) and not scambia(s, D):
                cambiato = True
                print(f"Scambio {s['id']}: rose rimesse a posto.")
            continue
        if gia_scambiato(s, D):
            esito = "Rose già aggiornate da Leghe"
        elif prima_dello_scambio(s, D):
            motivo = scambia(s, D)
            if motivo:
                print(f"Scambio {s['id']} non valido: {motivo}.")
                if x.vai:
                    t, c = chi()
                    rpc("scambio_srv_applicato", {"p_team": t, "p_code": c, "p_id": s["id"], "p_esito": motivo, "p_stato": "non_valido"})
                continue
            esito, cambiato = "Applicato alle rose", True
        else:
            motivo = "I giocatori non sono più nelle due rose"
            print(f"Scambio {s['id']} non valido: {motivo}.")
            if x.vai:
                t, c = chi()
                rpc("scambio_srv_applicato", {"p_team": t, "p_code": c, "p_id": s["id"], "p_esito": motivo, "p_stato": "non_valido"})
            continue
        post, radio = post_e_notizia(s, D, n)
        out["scambi"].append({"k": f"app-{s['id']}", "id": s["id"], "quando": s.get("chiuso"), "giornata": n,
                              "da": s["da"], "a": s["a"], "da_cede": nomi_di(s["dai"], s, D), "a_cede": nomi_di(s["ricevi"], s, D),
                              "conferma": s.get("conferma"), "confermato_da": s.get("confermato_da"), "esito": esito,
                              "post": post, "radio": radio})
        fatti.add(s["id"])
        sito_m["scambi"].append({"id": s["id"], "dopo_giornata": n, "quando": s.get("chiuso"), "da": s["da"], "a": s["a"],
                                 "da_cede": nomi_di(s["dai"], s, D), "a_cede": nomi_di(s["ricevi"], s, D)})
        print(f"Scambio {s['id']} ufficiale: {esito}.")
    if json.dumps(sito_m, sort_keys=True) != prima_m:
        fm.parent.mkdir(parents=True, exist_ok=True)
        fm.write_text(json.dumps(sito_m, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if cambiato:
        fd.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print("data.json aggiornato.")
    x.uscita.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
