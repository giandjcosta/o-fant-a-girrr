#!/usr/bin/env python3
"""Post automatici della Curva per gli eventi della 5.0 (sfide, Derby, promesse).

Legge:  calcoli/eventi.json  (esportato dal database: tabelle derby_sfida e conf_risposta) e calcoli/nomi.json
Scrive: calcoli/post_curva.json  (lista di post da pubblicare)  -  poi li pubblica calcoli/pubblica_curva.py
Uso:    python3 calcoli/post_curva.py [eventi.json] [uscita.json]

Formato di eventi.json: lista di oggetti con "tipo" e "k" (chiave unica dell'evento, evita doppioni):
  {"tipo":"sfida",   "k":"S12", "da":"Oranje VC", "a":"Grodah", "frase":"Quest'anno Grodah dovrà guardarmi dal basso."}
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


def m(t):
    return NOMI.get(t, t)


def post(e):
    t = e["tipo"]
    if t == "sfida":
        fr = f": «{e['frase']}»" if e.get("frase") else "."
        return [(GS, f"SFIDA LANCIATA\n{m(e['da'])} contro {m(e['a'])}{fr} Sta per nascere un nuovo Derby? #GirrrSport #Derby")]
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
