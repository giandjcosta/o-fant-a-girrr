#!/usr/bin/env python3
"""Post automatici della Curva per gli eventi della 5.0 (sfide, Derby, promesse).

Legge:  calcoli/eventi.json  (esportato dal database: tabelle derby_sfida e conf_risposta) e calcoli/nomi.json
Scrive: calcoli/post_curva.json  (lista di post da pubblicare)  -  poi li pubblica calcoli/pubblica_curva.py
Uso:    python3 calcoli/post_curva.py [eventi.json] [uscita.json]

Formato di eventi.json: lista di oggetti con "tipo" e "k" (chiave unica dell'evento, evita doppioni):
  {"tipo":"sfida",   "k":"S12", "da":"Oranje VC", "a":"Grodah", "frase":"Quest'anno Grodah dovrà guardarmi dal basso."}
     (opzionali: "f" = numero 0-2 della frase, "testo" = frase vera scelta nell'app: esce nell'Intervista speciale di qualsiasi coppia)
  {"tipo":"conferenza","k":"C3-Apo team", "team":"Apo team", "giornata":3, "libera":"...", "promessa":"", "risposte":["...","..."]}   (conferenza pre partita, su Girrr Sport)
  {"tipo":"rifiuto", "k":"S12", "da":"Oranje VC", "a":"Grodah"}                     (a ha rifiutato)
  {"tipo":"scaduta", "k":"S12", "da":"Oranje VC", "a":"Grodah"}                     (nessuna risposta in 3 giorni)
  {"tipo":"derby",   "k":"S12", "da":"Oranje VC", "a":"Grodah", "nome":"Il Derby della Rivincita"}
  {"tipo":"promessa","k":"C7-Apo", "team":"Apo team", "giornata":3, "promessa":"Vinciamo noi", "esito":"v"|"s"}   (v mantenuta, s tradita, p pareggio: come nel database)
Regole (decise da Gianluca): i post usano i nomi degli allenatori; i post ufficiali non parlano mai di scommesse; "Derby" sempre con la D maiuscola.
Ogni post è al massimo di 280 caratteri.
"""
import json, sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
EVENTI = Path(sys.argv[1]) if len(sys.argv) > 1 else QUI / "eventi.json"
USCITA = Path(sys.argv[2]) if len(sys.argv) > 2 else QUI / "post_curva.json"
NOMI = json.loads((QUI / "nomi.json").read_text(encoding="utf-8"))
GS, LEGA, GIORNALE = "girrr_sport", "lega_ofantagirrr", "giornale_girrr"


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
        testa = f"CONFERENZA PRE PARTITA · Giornata {e['giornata']}\n{m(e['team'])}: "
        coda = " #ConferenzaStampa"
        pezzi = []
        if e.get("libera"):
            pezzi.append(f"«{e['libera']}»")
        if e.get("promessa"):
            pezzi.append(f"Promessa: «{e['promessa']}»")
        pezzi += [f"«{r}»" for r in e.get("risposte", [])]
        testo = ""
        for p in pezzi:   # si aggiungono le risposte finché stanno nei 280 caratteri
            prova = (testo + " " + p).strip()
            if len(testa + prova + coda) > 280:
                if not testo:   # la prima è già troppo lunga: la si accorcia
                    prova = p[:280 - len(testa) - len(coda) - 2] + "…»"
                else:
                    continue
            testo = prova
        return [(GS, testa + testo + coda)] if testo else []
    if t == "rifiuto":
        return [(GS, f"RIFIUTO CLAMOROSO\n{m(e['a'])} non considera {m(e['da'])} nemmeno degno di un Derby. La rivalità, intanto, sale. #GirrrSport")]
    if t == "scaduta":
        return [(GS, f"SILENZIO\n{m(e['a'])} non ha risposto alla sfida di {m(e['da'])}: la sfida decade, ma la rivalità resta più alta di prima. #GirrrSport")]
    if t == "derby":
        return [(GS, f"NASCE UN DERBY\n{m(e['da'])} e {m(e['a'])} hanno trovato l'accordo: da oggi è «{e['nome']}». #GirrrSport #Derby"),
                (LEGA, f"Novità dall'Albo d'oro: nasce «{e['nome']}», il Derby tra {m(e['da'])} e {m(e['a'])}. Entra nella storia della Lega. #Derby #AlboDoro")]
    if t == "promessa":
        if e["esito"] == "v":
            return [(GIORNALE, f"PAROLA MANTENUTA\n{m(e['team'])} l'aveva detto in conferenza stampa: «{e['promessa']}». Poi è andato in campo e l'ha fatto. #ConferenzaStampa")]
        if e["esito"] == "s":   # come nel database: v mantenuta, p pareggio (nessun post), s tradita
            return [(GIORNALE, f"PROMESSA TRADITA\n{m(e['team'])} in conferenza stampa: «{e['promessa']}». Il campo ha risposto altro, e la dirigenza ha preso nota. #ConferenzaStampa")]
    return []


def main():
    eventi = json.loads(EVENTI.read_text(encoding="utf-8")) if EVENTI.exists() else []
    out = []
    for e in eventi:
        for i, (h, body) in enumerate(post(e)):
            assert len(body) <= 280, (e["k"], len(body))
            out.append(dict(chiave=f"{e['tipo']}:{e['k']}:{i}", h=h, body=body))
    USCITA.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("post_curva.json scritto:", len(out), "post")


if __name__ == "__main__":
    main()
