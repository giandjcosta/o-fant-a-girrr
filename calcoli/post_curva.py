#!/usr/bin/env python3
"""Post automatici della Curva per gli eventi della 5.0 (sfide, Derby, promesse).

Legge:  calcoli/eventi.json  (esportato dal database: tabelle derby_sfida e conf_risposta), calcoli/nomi.json
        e calcoli/moviola.json (episodi della Moviola, scritti da calcoli/moviola.py)
Scrive: calcoli/post_curva.json  (lista di post da pubblicare)  -  poi li pubblica calcoli/pubblica_curva.py
Uso:    python3 calcoli/post_curva.py [eventi.json] [uscita.json] [moviola.json] [data.json del sito]

Formato di eventi.json: lista di oggetti con "tipo" e "k" (chiave unica dell'evento, evita doppioni):
  {"tipo":"sfida",   "k":"S12", "da":"Oranje VC", "a":"Grodah", "frase":"Quest'anno Grodah dovrà guardarmi dal basso."}
     (opzionali: "f" = numero 0-2 della frase, "testo" = frase vera scelta nell'app: esce nell'Intervista speciale di qualsiasi coppia)
  {"tipo":"conferenza","k":"C3-Apo team", "team":"Apo team", "giornata":3, "libera":"...", "promessa":"", "risposte":["...","..."]}   (conferenza pre partita, su Girrr Sport; opzionali "avversario" e "tono" 0-2: se ci sono, esce anche il commento di Ciro Trattativa)
  {"tipo":"rifiuto", "k":"S12", "da":"Oranje VC", "a":"Grodah"}                     (a ha rifiutato)
  {"tipo":"scaduta", "k":"S12", "da":"Oranje VC", "a":"Grodah"}                     (nessuna risposta in 3 giorni)
  {"tipo":"accettata","k":"S12", "da":"Oranje VC", "a":"Grodah"}                     (a ha accettato: il Derby nasce quando si accordano sul nome)
  {"tipo":"derby",   "k":"S12", "da":"Oranje VC", "a":"Grodah", "nome":"Il Derby della Rivincita"}
  {"tipo":"promessa","k":"C7-Apo", "team":"Apo team", "giornata":3, "promessa":"Vinciamo noi", "esito":"v"|"s"}   (v mantenuta, s tradita, p pareggio: come nel database)
Moviola: un post su Girrr Sport per l'ultima giornata di moviola.json con l'episodio principale (il primo di "episodi"),
  con titolo, testo e verdetto uguali alla tab; nella Curva rimanda alla tab Moviola ("Apri la Moviola"). Giornata senza episodi
  (o con soli scartati): nessun post. Chiave moviola:G<giornata>:0, quindi un solo post per giornata.
  Esce all'orario della SCALETTA dopo il post del Giornale nella Curva ("quando", passato a curva_adm_scrivi come p_quando).
Regole (decise da Gianluca): i post usano i nomi degli allenatori; i post ufficiali non parlano mai di scommesse; "Derby" sempre con la D maiuscola.
Ogni post è al massimo di 280 caratteri.
"""
import datetime, json, sys, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

QUI = Path(__file__).resolve().parent
EVENTI = Path(sys.argv[1]) if len(sys.argv) > 1 else QUI / "eventi.json"
USCITA = Path(sys.argv[2]) if len(sys.argv) > 2 else QUI / "post_curva.json"
MOVIOLA = Path(sys.argv[3]) if len(sys.argv) > 3 else QUI / "moviola.json"
DATI = Path(sys.argv[4]) if len(sys.argv) > 4 else None
SITO_DATI = "https://giandjcosta.github.io/o-fant-a-girrr/data.json"
# Ordine dei post di Girrr Sport dopo la giornata: minuti dopo il post del Giornale nella Curva.
# La Radio ha il suo posto ma oggi non ha ancora un post.
SCALETTA = {"giornale": 0, "radio": 5, "moviola": 10}
NOMI = json.loads((QUI / "nomi.json").read_text(encoding="utf-8"))
GS, LEGA, GIORNALE = "girrr_sport", "lega_ofantagirrr", "giornale_girrr"
CIRO_H = "ciro_trattativa"
# Tono della conferenza e commento di Ciro Trattativa, gli stessi dell'app (TONI e REP in girrr/app.html)
CIRO = [("Sicuro", "Parole da campione. Ora però servono i punti."), ("Umile", "Mi piace l'umiltà, ma in questa lega non basta."),
        ("Provocatorio", "Ha dichiarato guerra. Si prepari, perché non finisce qui.")]


# Frasi scritte a mano per le coppie con storia lunga (le stesse dell'app). {X} = il rivale.
FRASI = {("Oranje VC", "Apo team"): [
    "{X} c'è dal primo giorno e ha tre titoli: io sono andato e tornato, e il conto aperto lo chiudo io.",
    "{X} non si è mai mosso, io ho girato il mondo: vediamo chi arriva prima, andata e ritorno.",
    "Nel 2016/17 chiusi quarto a un passo dal podio: stavolta il podio lo voglio, e passo sopra {X}."]}


def m(t):
    return NOMI.get(t, t)


def post(e):
    t = e["tipo"]
    if t == "sfida":
        fr = f": «{e['frase']}»" if e.get("frase") else "."
        out = [(GS, f"SFIDA LANCIATA\n{m(e['da'])} contro {m(e['a'])}{fr} Sta per nascere un nuovo Derby? #GirrrSport #Derby")]
        # le parole della sfida, come intervista a Girrr Sport (non sul profilo della squadra): il testo vero scelto nell'app,
        # per le sfide vecchie senza testo la tabella FRASI (solo Oranje VC-Apo)
        fz = FRASI.get((e["da"], e["a"]))
        frase = e.get("testo") or (fz[e["f"]].replace("{X}", m(e["a"])) if fz and e.get("f") in (0, 1, 2) else "")
        if frase:
            iv = f"INTERVISTA SPECIALE\n{m(e['da'])} lancia la sfida a {m(e['a'])}: «{frase}» #GirrrSport #Derby"
            if len(iv) > 280:   # frase troppo lunga: si accorcia per stare nei 280 caratteri
                avanzo = 280 - len(iv) + len(frase) - 1
                iv = f"INTERVISTA SPECIALE\n{m(e['da'])} lancia la sfida a {m(e['a'])}: «{frase[:avanzo].rstrip()}…» #GirrrSport #Derby"
            out.append((GS, iv))
        return out
    if t == "conferenza":
        # Stesso testo che si vede nell'app in "Come appare in Curva", con le risposte nell'ordine delle tre domande
        ris = [r for r in e.get("risposte", []) if r]
        if len(ris) != 3:   # conferenza vecchia o incompleta: formato corto
            ris = ([e["libera"]] if e.get("libera") else []) + ris
            if not ris:
                return []
            testa = f"CONFERENZA STAMPA · Giornata {e['giornata']}\n{m(e['team'])}: "
            return [(GS, (testa + " ".join(f"«{r}»" for r in ris))[:280])]
        me, opp = m(e["team"]), m(e["avversario"]) if e.get("avversario") else ""
        vigilia = f"alla vigilia di {me} - {opp}" if opp else f"alla vigilia della giornata {e['giornata']}"
        su = f" Su {opp}:" if opp else " Sulla partita:"

        def monta(r, coda):
            return f"CONFERENZA STAMPA · {me}, {vigilia}: «{r[0]}»{su} «{r[1]}» E alla dirigenza: «{r[2]}»{coda}"
        coda = " #ConferenzaStampa"
        testo = monta(ris, coda)
        if len(testo) > 280:
            testo = monta(ris, "")                      # prima si toglie l'hashtag
        while len(testo) > 280:                         # poi si accorcia la risposta più lunga, un po' alla volta
            k = max(range(3), key=lambda i: len(ris[i]))
            ris[k] = ris[k].rstrip(" …")[:-4].rstrip() + "…"
            testo = monta(ris, "")
        out = [(GS, testo)]
        if e.get("tono") in (0, 1, 2):   # nell'app c'è anche il tono e la risposta di Ciro Trattativa
            _, parola = CIRO[e["tono"]]
            out.append((CIRO_H, parola, 0))   # il commento di Ciro, tale e quale all'app: esce sotto il post della conferenza (indice 0)
        return out
    if t == "rifiuto":
        return [(GS, f"RIFIUTO CLAMOROSO\n{m(e['a'])} non considera {m(e['da'])} nemmeno degno di un Derby. La rivalità, intanto, sale. #GirrrSport")]
    if t == "scaduta":
        return [(GS, f"SILENZIO\n{m(e['a'])} non ha risposto alla sfida di {m(e['da'])}: la sfida decade, ma la rivalità resta più alta di prima. #GirrrSport")]
    if t == "accettata":
        return [(GS, f"SFIDA ACCETTATA\n{m(e['a'])} ha detto sì a {m(e['da'])}. Manca solo il nome: appena si accordano nasce il Derby. #GirrrSport #Derby")]
    if t == "derby":
        return [(GS, f"NASCE UN DERBY\n{m(e['da'])} e {m(e['a'])} hanno trovato l'accordo: da oggi è «{e['nome']}». #GirrrSport #Derby"),
                (LEGA, f"Novità dall'Albo d'oro: nasce «{e['nome']}», il Derby tra {m(e['da'])} e {m(e['a'])}. Entra nella storia della Lega. #Derby #AlboDoro")]
    if t == "moviola":   # l'episodio principale, con il testo intero della tab: se non sta nei 280 caratteri prima vanno via
        ep = e["episodi"][0]   # gli hashtag, e solo all'ultimo si accorcia il testo (intero resta nella tab, a cui il post rimanda)
        testa, x = f"MOVIOLA · Giornata {e['giornata']}\n{ep['titolo']}. ", ep["testo"]
        for coda in (" #GirrrSport #Moviola", " #Moviola", ""):
            coda = f" Verdetto: {ep['verdetto']}." + coda
            if len(testa + x + coda) <= 280:
                return [(GS, testa + x + coda)]
        return [(GS, testa + x[:280 - len(testa) - len(coda) - 1].rstrip() + "…" + coda)]
    if t == "promessa":
        if e["esito"] == "v":
            return [(GIORNALE, f"PAROLA MANTENUTA\n{m(e['team'])} l'aveva detto in conferenza stampa: «{e['promessa']}». Poi è andato in campo e l'ha fatto. #ConferenzaStampa")]
        if e["esito"] == "s":   # come nel database: v mantenuta, p pareggio (nessun post), s tradita
            return [(GIORNALE, f"PROMESSA TRADITA\n{m(e['team'])} in conferenza stampa: «{e['promessa']}». Il campo ha risposto altro, e la dirigenza ha preso nota. #ConferenzaStampa")]
    return []


def ora_giornale(D):
    """(giornata, istante in ms) del post del Giornale nella Curva per l'ultima giornata giocata, calcolato come curva-banca.js:
    _pub della giornata se c'è, altrimenti il martedì alle 14:30 (ora di Roma) della settimana di cal.date."""
    cal = (D or {}).get("cal") or {}
    giocate = [g for g in cal.get("lega") or [] if any(m[4] != "-" for m in g["m"])]
    if not giocate or not cal.get("date"):
        return None, None
    lu, n = giocate[-1], max(g["n"] for g in giocate)
    if lu.get("_pub"):
        return n, lu["_pub"]
    cup = [g for g in cal.get("cup") or [] if any(m[5] != "-" for m in g["m"])]
    sa = lu.get("sa") or 0
    sr0 = max(sa, (cup[-1].get("sa") or 0) if cup else 0)
    giorno = datetime.date.fromisoformat(cal["date"])
    wd = (giorno.weekday() + 1) % 7   # 0 domenica, come getUTCDay
    martedi = giorno - datetime.timedelta(days=(wd - 2 + 7) % 7) + datetime.timedelta(days=7 * ((sa or sr0) - sr0))
    t = datetime.datetime(martedi.year, martedi.month, martedi.day, 14, 30, tzinfo=ZoneInfo("Europe/Rome"))
    return n, int(t.timestamp() * 1000)


def leggi_dati():
    """data.json del sito: il file dato come quarto argomento (nei workflow, la copia di gh-pages), altrimenti la copia pubblica."""
    try:
        if DATI and DATI.exists():
            return json.loads(DATI.read_text(encoding="utf-8"))
        return json.loads(urllib.request.urlopen(SITO_DATI, timeout=30).read())
    except Exception as e:
        print("data.json non letto, la Moviola esce senza orario:", e)
        return None


def evento_moviola(mv, D):
    """Evento 'moviola' per l'ultima giornata di moviola.json (le vecchie non si ripostano). Nessun episodio: nessun evento.
    "quando" = post del Giornale + SCALETTA["moviola"] minuti (anche se è già passato: il post prende il suo posto nella Curva).
    Senza data.json, o se l'ultima giornata giocata non è quella della Moviola, esce subito (comunque dopo il Giornale)."""
    gg = (mv or {}).get("giornate") or {}
    if not gg:
        return []
    n = max(gg, key=int)
    if not gg[n].get("episodi"):
        return []
    ev = dict(tipo="moviola", k=f"G{n}", giornata=int(n), episodi=gg[n]["episodi"])
    g, t = ora_giornale(D)
    if g == int(n) and t is not None:
        ev["quando"] = datetime.datetime.fromtimestamp((t + SCALETTA["moviola"] * 60000) / 1000, datetime.timezone.utc).isoformat()
    return [ev]


def main():
    eventi = json.loads(EVENTI.read_text(encoding="utf-8")) if EVENTI.exists() else []
    mv = json.loads(MOVIOLA.read_text(encoding="utf-8")) if MOVIOLA.exists() else None
    if mv and (mv.get("giornate") or {}):
        eventi += evento_moviola(mv, leggi_dati())
    out = []
    for e in eventi:
        lista = post(e)
        for i, voce in enumerate(lista):
            h, body = voce[0], voce[1]
            assert len(body) <= 280, (e["k"], len(body))
            d = dict(chiave=f"{e['tipo']}:{e['k']}:{i}", h=h, body=body)
            if e.get("quando"):
                d["quando"] = e["quando"]
            if len(voce) > 2:   # è un commento sotto un altro post dello stesso evento
                padre = lista[voce[2]]
                d.update(re=f"{e['tipo']}:{e['k']}:{voce[2]}", re_h=padre[0], re_body=padre[1])
            out.append(d)
    USCITA.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("post_curva.json scritto:", len(out), "post")


if __name__ == "__main__":
    main()
