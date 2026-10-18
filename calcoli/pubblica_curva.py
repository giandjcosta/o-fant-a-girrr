#!/usr/bin/env python3
"""Pubblica nella Curva i post di calcoli/post_curva.json, una sola volta ciascuno.

Due modi di lavorare, scelti in automatico da calcoli/curva_config.json:
  CODA  - i post nuovi NON escono: finiscono in calcoli/coda_curva.json e aspettano il tuo "ok".
  AUTO  - i post nuovi escono subito.
Si parte in CODA e si passa ad AUTO da soli dopo "giorni_coda" giorni dalla data "rilascio" (default 14).
Finché "rilascio" è vuoto, resta sempre CODA (è la scelta prudente).

Comandi (da cartella del repo):
  python3 calcoli/pubblica_curva.py                    legge i post nuovi e li mette in coda (o li pubblica, in AUTO) - prova a vuoto senza --vai
  python3 calcoli/pubblica_curva.py --elenco           mostra la coda
  python3 calcoli/pubblica_curva.py --approva 1,3 --vai   pubblica i post n. 1 e 3 della coda   (oppure --approva tutti)
  python3 calcoli/pubblica_curva.py --scarta 2         toglie il post n. 2 dalla coda senza pubblicarlo   (oppure --scarta tutti)

Per pubblicare davvero servono --vai e quattro segreti d'ambiente (mai nel repo):
  CURVA_URL indirizzo del database      CURVA_KEY chiave publishable
  CURVA_TEAM squadra amministratrice    CURVA_CODE codice della squadra amministratrice
Usa la funzione curva_adm_scrivi del database. Se il database non risponde ci si ferma subito, senza riprovare e senza segnare niente come pubblicato.
File di lavoro: pubblicati.json (post già usciti), coda_curva.json (in attesa o scartati).
"""
import datetime, json, os, sys, urllib.request
from pathlib import Path

QUI = Path(__file__).resolve().parent
POST, FATTI, CODA, CONF = (QUI / n for n in ("post_curva.json", "pubblicati.json", "coda_curva.json", "curva_config.json"))


def leggi(p, vuoto):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else vuoto


def scrivi(p, dati):
    p.write_text(json.dumps(dati, indent=1, ensure_ascii=False), encoding="utf-8")


def modo(oggi=None):
    """'coda' oppure 'auto'. CURVA_MODO nell'ambiente vince su tutto (per prove)."""
    forzato = os.environ.get("CURVA_MODO")
    if forzato in ("coda", "auto"):
        return forzato
    c = leggi(CONF, {})
    if not c.get("rilascio"):
        return "coda"
    oggi = oggi or datetime.date.today()
    fine = datetime.date.fromisoformat(c["rilascio"]) + datetime.timedelta(days=int(c.get("giorni_coda", 14)))
    return "auto" if oggi >= fine else "coda"


def breve(p, n=110):
    return f"[{p['h']}] {p['body'][:n].replace(chr(10), ' ')}" + ("…" if len(p["body"]) > n else "")


def riepilogo(testo):
    """Se gira dentro GitHub Actions, scrive anche nella pagina riepilogo dell'esecuzione."""
    print(testo)
    f = os.environ.get("GITHUB_STEP_SUMMARY")
    if f:
        with open(f, "a", encoding="utf-8") as fh:
            fh.write(testo + "\n")


def invia(p):
    url, key, team, code = (os.environ.get(k) for k in ("CURVA_URL", "CURVA_KEY", "CURVA_TEAM", "CURVA_CODE"))
    if not all((url, key, team, code)):
        sys.exit("Mancano CURVA_URL, CURVA_KEY, CURVA_TEAM o CURVA_CODE: non pubblico niente.")
    if len(p["body"]) > 280:
        sys.exit("Post troppo lungo (oltre 280 caratteri), mi fermo: " + breve(p))
    corpo = json.dumps(dict(p_team=team, p_code=code, p_h=p["h"], p_body=p["body"])).encode()
    rich = urllib.request.Request(f"{url}/rest/v1/rpc/curva_adm_scrivi", corpo,
                                  {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        urllib.request.urlopen(rich, timeout=30).read()
    except Exception as e:  # database non raggiungibile o risposta di errore: ci si ferma qui
        sys.exit(f"Il database non ha accettato il post ({e}). Mi fermo senza segnare niente come pubblicato.")


def segna(fatti, chiave):
    fatti.add(chiave)
    scrivi(FATTI, sorted(fatti))


def scelta(arg, attese):
    """'tutti' oppure '1,3' -> lista di elementi della coda."""
    if arg.strip().lower() == "tutti":
        return list(attese)
    numeri = {int(x) for x in arg.replace(" ", "").split(",") if x}
    scelti = [q for q in attese if q["n"] in numeri]
    mancanti = numeri - {q["n"] for q in scelti}
    if mancanti:
        print("Numeri non trovati tra quelli in attesa:", sorted(mancanti))
    return scelti


def main():
    a = sys.argv[1:]
    vai = "--vai" in a
    fatti = set(leggi(FATTI, []))
    coda = leggi(CODA, [])
    attese = [q for q in coda if q["stato"] == "attesa"]

    if "--elenco" in a:
        riepilogo(f"Coda dei post della Curva: {len(attese)} in attesa del tuo ok." if attese else "Coda vuota.")
        for q in attese:
            riepilogo(f"  {q['n']}. {breve(q, 140)}")
        return

    if "--scarta" in a:
        for q in scelta(a[a.index("--scarta") + 1], attese):
            q["stato"] = "scartato"
        scrivi(CODA, coda)
        riepilogo("Scartati. Restano in attesa: " + str(len([q for q in coda if q["stato"] == "attesa"])))
        return

    if "--approva" in a:
        scelti = scelta(a[a.index("--approva") + 1], attese)
        riepilogo(f"Da pubblicare: {len(scelti)} post.")
        for q in scelti:
            riepilogo(f"  {q['n']}. {breve(q, 140)}")
        if not vai:
            print("Prova a vuoto: aggiungi --vai per pubblicare davvero.")
            return
        for q in scelti:
            invia(q)
            q["stato"] = "pubblicato"
            segna(fatti, q["chiave"])
            scrivi(CODA, coda)
        riepilogo(f"Pubblicati {len(scelti)} post.")
        return

    if "--segna-tutti" in a:
        # Solo registro: segna come già usciti i post attuali, senza inviare niente (per recuperare uno stato perso)
        for p in leggi(POST, []):
            fatti.add(p["chiave"])
        scrivi(FATTI, sorted(fatti))
        riepilogo(f"Segnati come già usciti {len(fatti)} post, senza inviare niente.")
        return

    # Giro normale: i post nuovi vanno in coda o escono, secondo il modo
    post = leggi(POST, [])
    visti = fatti | {q["chiave"] for q in coda}
    nuovi = [p for p in post if p["chiave"] not in visti]
    m = modo()
    riepilogo(f"Modo: {m.upper()}. {len(nuovi)} post nuovi, {len(post) - len(nuovi)} già visti.")
    if not nuovi:
        return
    if m == "coda":
        n = max([q["n"] for q in coda], default=0)
        for p in nuovi:
            n += 1
            coda.append(dict(p, n=n, stato="attesa"))
            riepilogo(f"  Nuovo in coda {n}. {breve(p, 140)}")
        if vai:
            scrivi(CODA, coda)
            riepilogo("Messi in coda. Per pubblicarli: pubblica_curva.py --approva <numeri|tutti> --vai")
        else:
            print("Prova a vuoto: aggiungi --vai per salvare la coda.")
        return
    for p in nuovi:
        riepilogo(f"  {breve(p, 140)}")
    if not vai:
        print("Prova a vuoto: aggiungi --vai per pubblicare davvero.")
        return
    for p in nuovi:
        invia(p)
        segna(fatti, p["chiave"])
    riepilogo(f"Pubblicati {len(nuovi)} post.")


if __name__ == "__main__":
    main()
