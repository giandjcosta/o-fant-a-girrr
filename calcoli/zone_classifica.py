"""Lettura della storia di classifica per Curva, Giornale e Radio.
Solo dati delle giornate COMPLETE, nessuna chiamata di rete o scrittura.
Eventi selettivi: 3 giornate consecutive, poi ogni 4; sorpresa negativa
di una favorita soltanto se l'ultima posizione è già confermata.
"""
import re

ORDINE = ["The Blue brothers", "Apo team", "Mariana Coneja", "stif dc", "Real Madrink",
          "Atletico ma non troppo", "Oranje VC", "AFA SELECCION", "Grodah", "WOA"]

RIS = re.compile(r"^\d+-\d+$")

def _squadre(d):
    a = d.get("teams") or []
    return sorted({x["name"] if isinstance(x, dict) else x for x in a})

def _giornate(d):
    calendario = sorted((d.get("cal") or {}).get("lega") or [], key=lambda g: g["n"])
    validi, prossimo = [], 1
    for g in calendario:
        if g.get("n") != prossimo:
            break
        mm = g.get("m") or []
        teams = _squadre(d)
        presenti = [t for x in mm if len(x) == 5 for t in (x[0], x[3])]
        if (not mm or sorted(presenti) != teams or len(set(presenti)) != len(presenti)
                or not all(len(x) == 5 and RIS.fullmatch(str(x[4])) for x in mm)):
            break
        validi.append(g)
        prossimo += 1
    return validi

def storia(d):
    """Per ogni giornata: classifica e posizioni (ordine Pt, totale, DR, GF)."""
    squadre = _squadre(d)
    if len(squadre) < 2:
        return []
    tab = {t: {"t": t, "pt": 0, "fp": 0.0, "gf": 0, "gs": 0} for t in squadre}
    out = []
    for g in _giornate(d):
        for m in g["m"]:
            casa, pc, pf, ospite, ris = m
            if casa not in tab or ospite not in tab:
                return out
            a, b = map(int, ris.split("-"))
            for t, gol, presi, totale in ((casa, a, b, pc), (ospite, b, a, pf)):
                x = tab[t]
                x["pt"] += 3 if gol > presi else 1 if gol == presi else 0
                x["gf"] += gol
                x["gs"] += presi
                x["fp"] += float(totale)
        ordine = sorted(tab.values(), key=lambda x: (-x["pt"], -x["fp"], -(x["gf"]-x["gs"]), -x["gf"], ORDINE.index(x["t"]) if x["t"] in ORDINE else 99, x["t"]))
        out.append({"giornata": g["n"], "posizioni": {x["t"]: i+1 for i, x in enumerate(ordine)},
                    "classifica": [dict(x, pos=i+1) for i, x in enumerate(ordine)]})
    return out

def eventi(d, aspettative=None):
    """Riproduce la scelta editoriale: priorità, cooldown di 4 turni per tema/squadra.

    Una storia principale per giornata, disponibile a ogni redazione. I candidati
    stabili non scelti restano eleggibili: nessun fatto perso per rotazione di canale.
    """
    hist = storia(d)
    expected = (aspettative or {}).get("squadre") or {}
    scelti, ultimo = [], {}
    for idx, latest in enumerate(hist):
        n, pos = latest["giornata"], latest["posizioni"]
        if n < 2:
            continue
        prev = hist[idx-1]["posizioni"]
        candidati = []
        def durata(team, test, end=idx):
            count = 0
            for x in reversed(hist[:end+1]):
                if not test(x["posizioni"][team]): break
                count += 1
            return count
        def add(priorita, tipo, team, titolo, testo, serie=0, altri=None, contesto=None):
            gruppo = "fondo" if tipo in ("sorpresa", "retrocessione") else "podio" if tipo in ("podio", "rivelazione") else tipo
            k = (gruppo, team)
            if n - ultimo.get(k, -100) < 4: return
            candidati.append(dict(priorita=priorita, tipo=tipo, squadra=team, titolo=titolo,
                testo=testo, durata=serie, posizione=pos[team], gruppo=gruppo,
                prova={"giornata": n, "posizione_precedente": prev[team],
                       "posizione": pos[team], "attesa": expected.get(team, {}).get("attesa"),
                       "serie": serie, "altre_squadre": altri or [], **(contesto or {})}))
        for team, posto in pos.items():
            attesa = expected.get(team, {}).get("attesa")
            big = isinstance(attesa, (int, float)) and attesa <= 3
            fondo = durata(team, lambda p: p == len(pos))
            cima = durata(team, lambda p: p == 1)
            podio = durata(team, lambda p: p <= 3)
            if big and fondo >= 2:
                add(100,"sorpresa",team,"CRISI IMPREVISTA",f"{team}, attesa tra le prime {int(attesa)}, è ultima da {fondo} giornate consecutive. La favorita deve reagire.",fondo)
            elif fondo >= 3:
                add(72,"retrocessione",team,"ZONA RETROCESSIONE",f"{team} resta ultima da {fondo} giornate consecutive. Serve una svolta per lasciare il fondo della classifica.",fondo)
            # Una rimonta/caduta ampia si misura su tre turni, oltre il solo ultimo posto.
            # Serve un ulteriore passo nella stessa direzione nell'ultima giornata.
            if n >= 5:
                partenza = hist[idx-3]["posizioni"][team]
                variazione = partenza-posto
                contesto = {"giornata_inizio": n-3, "posizione_inizio": partenza,
                            "variazione": variazione}
                if variazione >= 4 and prev[team] > posto:
                    add(97,"rimonta",team,"GRANDE RIMONTA",
                        f"{team} risale dalla {partenza}ª alla {posto}ª posizione in tre giornate: quattro o più posti recuperati. La rimonta prende forma.",
                        serie=3,contesto=contesto)
                elif variazione <= -4 and prev[team] < posto and posto >= len(pos)-2:
                    add(98,"crollo",team,"CROLLO IN CLASSIFICA",
                        f"{team} scende dalla {partenza}ª alla {posto}ª posizione in tre giornate. La squadra precipita nella parte bassa della classifica.",
                        serie=3,contesto=contesto)
            if n >= 3 and prev[team] == len(pos) and posto < len(pos):
                serie = durata(team,lambda p:p==len(pos),idx-1)
                if serie >= 2:
                    add(94,"risalita",team,"LA RISALITA",f"{team} lascia l’ultimo posto dopo {serie} giornate in fondo: ora è {posto}ª. Un primo passo nella risalita.",serie)
            if n >= 4 and posto == 1 and prev[team] != 1:
                ex = next(t for t,p in prev.items() if p == 1)
                if durata(ex,lambda p:p==1,idx-1) >= 2:
                    add(96,"sorpasso",team,"CAMBIA LA VETTA",f"{team} sale al comando e supera {ex}. La corsa scudetto cambia protagonista.",altri=[ex])
            elif cima >= 3:
                add(68,"vetta",team,"LA VETTA DURA",f"{team} resta al comando da {cima} giornate consecutive. La vetta ha trovato continuità.",cima)
            if posto in (2,3) and podio >= 3:
                sorpresa = isinstance(attesa,(int,float)) and attesa >= 5
                add(82 if sorpresa else 62,"rivelazione" if sorpresa else "podio",team,
                    "LA RIVELAZIONE" if sorpresa else "PODIO CONQUISTATO",
                    f"{team} è sul podio da {podio} giornate consecutive." +
                    (f" Partiva con una posizione attesa di {int(attesa)}ª: ora è {posto}ª." if sorpresa else " La corsa ai primi posti trova una protagonista stabile."),podio)
            if n >= 4 and posto <= 3 < prev[team] and durata(team,lambda p:p>3,idx-1)>=2:
                add(86,"ingresso_podio",team,"IRRUZIONE SUL PODIO",f"{team} passa dalla {prev[team]}ª alla {posto}ª posizione ed entra sul podio.")
            if n >= 4 and prev[team] <= 3 < posto and durata(team,lambda p:p<=3,idx-1)>=3:
                add(85,"uscita_podio",team,"IL PODIO SFUGGE",f"{team} scende dalla {prev[team]}ª alla {posto}ª posizione e lascia il podio dopo una serie di almeno tre giornate.")
        rows = latest["classifica"]
        old = hist[idx-1]["classifica"]
        gap = rows[0]["pt"]-rows[1]["pt"]
        if n >= 4 and gap <= 3 and old[0]["pt"]-old[1]["pt"] > 3:
            a,b = rows[:2]
            add(90,"lotta_scudetto",a["t"],"SCUDETTO RIAPERTO",f"{b['t']} riporta il distacco dalla vetta a {gap} punti. {a['t']} resta davanti, ma la lotta scudetto si riapre.",altri=[b["t"]])
        if not candidati: continue
        # A parità di rilevanza favorisce il tema meno recente, senza scavalcare le crisi.
        candidati.sort(key=lambda c:(-c["priorita"],ultimo.get((c["gruppo"],c["squadra"]),-100),c["squadra"]))
        ev = candidati[0]
        ultimo[(ev.pop("gruppo"),ev["squadra"])] = n
        stagione = (aspettative or {}).get("stagione", "2026/27")
        ev.update(stagione=stagione, chiave=f"zona:{stagione}:G{n}:{ev['tipo']}:{ev['squadra']}",giornata=n,
                  canale="tutti",canali=["radio","girrr_sport","giornale","commenti","pdf"])
        ev["commento"] = f"Alla {n}ª giornata: {ev['squadra']} è {ev['posizione']}ª. Il prossimo turno dirà se questa svolta avrà seguito."
        scelti.append(ev)
    return scelti


def evento(d, aspettative=None):
    hist = storia(d)
    if not hist: return None
    return next((e for e in reversed(eventi(d,aspettative)) if e["giornata"]==hist[-1]["giornata"]),None)
