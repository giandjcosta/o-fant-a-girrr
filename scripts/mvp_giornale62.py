"""Rubrica MVP dei tifosi nel Giornale (ChatGPT; riscritta da Claude il 15 novembre 2026 su richiesta di Gianluca).

- La vincitrice della giornata precedente: una storia un po' più lunga, con Campionato e Champions Cup della stessa
  giornata messi insieme (se ha giocato tutte e due), e il motivo della redazione.
- Le tre candidate della giornata appena finita: una breve storia ciascuna sul perché sono candidate.
Solo risultati veri dal calendario (gol del risultato, mai Fantapunti). Il Coro della Curva non viene toccato.
"""
import copy


def nome(t):
    return (t or "").replace("The Blue brothers", "The Blues Brothers")


def maiuscola(s):
    return s[:1].upper() + s[1:] if s else s


def partite(D, team, giornata):
    """Le partite della squadra nella giornata: Campionato e, se c'è, Champions Cup della stessa giornata di Serie A."""
    out, sa = [], None
    for g in (D or {}).get("cal", {}).get("lega", []):
        if g.get("n") == giornata:
            sa = g.get("sa")
            for m in g.get("m", []):
                if team in (m[0], m[3]) and "-" in str(m[4]) and m[4] != "-":
                    a, b = (int(x) for x in m[4].split("-"))
                    casa = m[0] == team
                    out.append({"comp": "Campionato", "opp": m[3] if casa else m[0], "gf": a if casa else b, "gs": b if casa else a, "casa": casa})
    for g in (D or {}).get("cal", {}).get("cup", []):
        if sa is not None and g.get("sa") == sa:
            for m in g.get("m", []):
                if team in (m[1], m[4]) and "-" in str(m[5]) and m[5] != "-":
                    a, b = (int(x) for x in m[5].split("-"))
                    casa = m[1] == team
                    out.append({"comp": "Champions Cup", "opp": m[4] if casa else m[1], "gf": a if casa else b, "gs": b if casa else a, "casa": casa})
    return out


def racconta(p):
    o = nome(p["opp"])
    if p["gf"] > p["gs"]:
        return f"batte {o} {p['gf']}–{p['gs']}" + ("" if p["casa"] else " in trasferta")
    if p["gf"] == p["gs"]:
        return f"pareggia {p['gf']}–{p['gs']} con {o}"
    return f"cade {p['gf']}–{p['gs']} contro {o}"


def doppia(T, pp):
    """Stessa avversaria in Campionato e in Champions Cup nella stessa giornata: un fatto solo, non due frasi uguali."""
    if len(pp) != 2 or pp[0]["opp"] != pp[1]["opp"]:
        return None
    o, a, b = nome(pp[0]["opp"]), pp[0], pp[1]
    ris = f"in Campionato ({a['gf']}–{a['gs']}) e in Champions Cup ({b['gf']}–{b['gs']})"
    if a["gf"] > a["gs"] and b["gf"] > b["gs"]:
        return f"{T} batte {o} due volte nella stessa giornata, {ris}."
    if a["gf"] == a["gs"] and b["gf"] == b["gs"]:
        return f"{T} pareggia due volte con {o} nella stessa giornata, {ris}."
    if a["gf"] < a["gs"] and b["gf"] < b["gs"]:
        return f"{T} cade due volte contro {o} nella stessa giornata, {ris}."
    return f"{T} affronta {o} due volte nella stessa giornata, {ris}."


def motivo(w, team):
    return next((v.get("motivo") for v in (w or {}).get("redazione", []) if v.get("scelta") == team and v.get("motivo")), None)


def breve(D, w, c, giornata):
    """Storia breve della candidata: il motivo della redazione, più la Champions Cup se l'ha giocata nella stessa giornata."""
    team = c.get("team")
    pp = partite(D, team, giornata)
    lega = [p for p in pp if p["comp"] == "Campionato"]
    coppa = [p for p in pp if p["comp"] == "Champions Cup"]
    due = doppia(maiuscola(nome(team)), lega + coppa)
    if due:   # stessa avversaria due volte: un fatto solo al posto delle due frasi
        return due
    testo = motivo(w, team)
    if not testo and lega:
        testo = maiuscola(nome(team)) + " " + racconta(lega[0]) + " in Campionato."
    if not testo and all(k in c for k in ("gf", "gs", "op", "away")):
        testo = f"Il {c['gf']}–{c['gs']} {'in trasferta' if c['away'] else 'in casa'} contro {nome(c['op'])} vale la candidatura."
    if testo and coppa:
        testo += " In Champions Cup " + racconta(coppa[0]) + "."
    return testo


def lunga(D, a, team):
    """Storia della vincitrice: le partite della giornata, i gol complessivi se ha giocato due volte, il motivo della redazione."""
    g = a["giornata"]
    pp = partite(D, team, g)
    righe = [f"{maiuscola(nome(team))} è l’MVP dei tifosi della {g}ª giornata."]
    due = doppia("", pp)
    if due:
        due = maiuscola(due.strip())   # «Batte WOA due volte…»: il nome della squadra è già nella frase prima
        righe.append(due + (f" In tutto {pp[0]['gf'] + pp[1]['gf']} gol fatti." if pp[0]['gf'] + pp[1]['gf'] else ""))
    elif len(pp) == 2:
        v = sum(1 for p in pp if p["gf"] > p["gs"])
        righe.append(f"In Campionato {racconta(pp[0])}, in Champions Cup {racconta(pp[1])}: "
                     + ("due vittorie nella stessa giornata" if v == 2 else "una settimana piena") + f", con {pp[0]['gf'] + pp[1]['gf']} gol fatti.")
    elif pp:
        righe.append(f"In {pp[0]['comp']} {racconta(pp[0])}.")
    m = motivo(a, team)
    if m:
        righe.append(m)
    return " ".join(righe)


def integra(testi, dossier, giornata, ora=None, D=None):
    t = copy.deepcopy(testi)
    rubrica = {"titolo": "MVP dei tifosi", "verdetto": None, "giornata": None, "candidati": []}
    w = (dossier or {}).get("votazione") or {}
    if not w.get("chiusa") and w.get("giornata") == giornata and w.get("classifica"):
        rubrica["giornata"] = giornata
        for c in w["classifica"][:3]:
            testo = breve(D, w, c, giornata)
            if c.get("team") and testo:
                rubrica["candidati"].append({"squadra": nome(c["team"]), "testo": testo})
    # Verdetto dell'MVP già votato: solo la giornata precedente, solo se chiuso con una classifica vera.
    for a in sorted((dossier or {}).get("archivio") or [], key=lambda x: x.get("giornata", 0), reverse=True):
        if a.get("chiusa") and a.get("classifica") and a.get("giornata") == giornata - 1:
            v = a["classifica"][0]
            if v.get("team"):
                rubrica["verdetto"] = {"giornata": a["giornata"], "squadra": nome(v["team"]), "testo": lunga(D, a, v["team"])}
            break
    if rubrica["candidati"] or rubrica["verdetto"]:
        t["mvp_editoriale"] = rubrica
    return t
