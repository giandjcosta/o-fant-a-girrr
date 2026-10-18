#!/usr/bin/env python3
"""Fiducia del presidente e promesse, calcolate dai punteggi veri.

Legge:  data.json (della lega), calcoli/aspettative.json, calcoli/conferenze.json (promesse, opzionale)
Scrive: fiducia.json (da pubblicare accanto a data.json)

Uso:    python3 calcoli/fiducia.py [percorso/data.json] [percorso/fiducia.json]

Formula, uguale a quella del Laboratorio (funzione fidA):
    fiducia = 50 + (aspettativa - posizione) * 7 * peso + (vittorie - sconfitte) * 3 * peso
    peso    = 0,2 + 0,8 * min(1, giornate giocate / giornate totali)      (lo stesso risultato pesa di più a stagione avanzata)
    limiti: da 5 a 98.
In più, rispetto al Laboratorio:
    - Coppa: ogni risultato di Champions Cup conta come mezza vittoria o mezza sconfitta (peso minore del campionato).
    - Promesse in conferenza stampa: mantenuta +1,5, pareggio -1, tradita -4, moltiplicati per la "pesa" della promessa (1-3) e per il peso della stagione.
Non scrive nulla nel database: legge file e produce un file.
"""
import json, sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
DATI = Path(sys.argv[1]) if len(sys.argv) > 1 else RADICE / "data.json"
USCITA = Path(sys.argv[2]) if len(sys.argv) > 2 else RADICE / "fiducia.json"
ASP = json.loads((Path(__file__).resolve().parent / "aspettative.json").read_text(encoding="utf-8"))
NG = ASP["giornate_totali"]
CONF = Path(__file__).resolve().parent / "conferenze.json"

COMMENTI_TRADITA = [
    "La dirigenza ha preso nota: le promesse in conferenza stampa si mantengono, o non si fanno.",
    "Il presidente non l'ha presa bene: aveva promesso, e il campo ha risposto altrimenti.",
    "Parole forti in sala stampa, risultato debole in campo: la dirigenza non dimentica.",
]
COMMENTI_MANTENUTA = [
    "Parola mantenuta: alla dirigenza piace chi fa seguire i fatti alle parole.",
    "Aveva promesso e ha vinto: il presidente sorride.",
]


def peso(g):
    return 0.2 + 0.8 * min(1, g / NG)


def esito_gol(r):
    """'3-2' -> (3, 2); '-' -> None (partita non giocata)."""
    try:
        a, b = r.split("-")
        return int(a), int(b)
    except ValueError:
        return None


def giocate(cal_lega):
    """Partite di campionato giocate, in ordine di giornata: (giornata, casa, fp_casa, fp_trasf, trasf, gol_casa, gol_trasf)."""
    out = []
    for r in cal_lega:
        for casa, fc, ft, tras, ris in r["m"]:
            g = esito_gol(ris)
            if g:
                out.append((r["n"], casa, fc, ft, tras, g[0], g[1]))
    return out


def classifica(partite, fino_a):
    t = {}
    def riga(x):
        return t.setdefault(x, dict(t=x, g=0, v=0, n=0, p=0, gf=0, gs=0, fp=0.0, pts=0))
    for n, casa, fc, ft, tras, gc, gt in partite:
        if n > fino_a:
            continue
        for sq, f, gf, gs in ((casa, fc, gc, gt), (tras, ft, gt, gc)):
            r = riga(sq)
            r["g"] += 1; r["gf"] += gf; r["gs"] += gs; r["fp"] += f
            if gf > gs: r["v"] += 1; r["pts"] += 3
            elif gf == gs: r["n"] += 1; r["pts"] += 1
            else: r["p"] += 1
    ordine = sorted(t.values(), key=lambda r: (-r["pts"], -(r["gf"] - r["gs"]), -r["gf"], -r["fp"]))
    for i, r in enumerate(ordine):
        r["pos"] = i + 1
    return {r["t"]: r for r in ordine}


def coppa(cal_cup, fino_a_sa):
    """Saldo di coppa per squadra: +1 per vittoria, -1 per sconfitta (pareggi 0), fino alla giornata di Serie A indicata."""
    s = {}
    for r in cal_cup:
        if r["sa"] > fino_a_sa:
            continue
        for gir, casa, fc, ft, tras, ris in r["m"]:
            g = esito_gol(ris)
            if not g:
                continue
            for sq, a, b in ((casa, g[0], g[1]), (tras, g[1], g[0])):
                s[sq] = s.get(sq, 0) + (1 if a > b else -1 if a < b else 0)
    return s


def promesse(conf, partite):
    """Per ogni promessa: esito dal risultato della partita di quella giornata (v = vinta, p = persa, s = pari)."""
    out = {}
    for c in conf:
        if not c.get("pesa") or not c.get("promessa"):
            continue
        esito = None
        for n, casa, fc, ft, tras, gc, gt in partite:
            if n == c["giornata"] and c["team"] in (casa, tras):
                a, b = (gc, gt) if c["team"] == casa else (gt, gc)
                esito = "v" if a > b else "p" if a < b else "s"
        out.setdefault(c["team"], []).append(dict(giornata=c["giornata"], promessa=c["promessa"], pesa=c["pesa"], esito=esito))
    return out


def fiducia(t, g, cl, saldo_coppa, prom_t):
    r = cl[t]
    m = peso(g)
    asp = ASP["squadre"][t]["attesa"]
    x = 50 + (asp - r["pos"]) * 7 * m + (r["v"] - r["p"]) * 3 * m + 0.5 * saldo_coppa.get(t, 0) * 3 * m
    for p in prom_t:
        if p["esito"] and p["giornata"] <= g:
            x += (1.5 if p["esito"] == "v" else -4 if p["esito"] == "p" else -1) * p["pesa"] * m
    return max(5, min(98, round(x)))


def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    partite = giocate(d["cal"]["lega"])
    ultima = max([p[0] for p in partite] or [0])
    sa_di = {r["n"]: r["sa"] for r in d["cal"]["lega"]}
    conf = json.loads(CONF.read_text(encoding="utf-8")) if CONF.exists() else []
    prom = promesse(conf, partite)
    squadre = {}
    for t in ASP["squadre"]:
        storico = []
        for g in range(1, ultima + 1):
            cl = classifica(partite, g)
            if t not in cl:
                continue
            # la coppa conta fino alla stessa giornata di Serie A del campionato
            storico.append(dict(giornata=g, posizione=cl[t]["pos"], fiducia=fiducia(t, g, cl, coppa(d["cal"].get("cup", []), sa_di.get(g, 0)), prom.get(t, []))))
        if not storico:
            continue
        cl = classifica(partite, ultima)
        ultimo = storico[-1]
        tradite = [p for p in prom.get(t, []) if p["esito"] == "p"]
        squadre[t] = dict(
            posizione=cl[t]["pos"], giornate=cl[t]["g"], punti=cl[t]["pts"],
            fiducia=ultimo["fiducia"], aspettativa=ASP["squadre"][t]["attesa"],
            obiettivo=ASP["squadre"][t]["obiettivo"], storico=storico,
            promesse=[dict(p, commento=(COMMENTI_TRADITA[p["giornata"] % len(COMMENTI_TRADITA)] if p["esito"] == "p" else COMMENTI_MANTENUTA[p["giornata"] % len(COMMENTI_MANTENUTA)] if p["esito"] == "v" else "")) for p in prom.get(t, [])],
            promesse_tradite=len(tradite),
        )
    USCITA.write_text(json.dumps(dict(aggiornato=d.get("updated"), giornata=ultima, squadre=squadre), ensure_ascii=False, indent=1), encoding="utf-8")
    print("fiducia.json scritto:", USCITA, "- giornata", ultima, "-", len(squadre), "squadre")


if __name__ == "__main__":
    main()
