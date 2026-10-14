#!/usr/bin/env python3
"""Aggiorna da solo, dalle pagine pubbliche di Fantacalcio.it, quello che serve allo Spogliatoio per la prossima giornata:

  inj   infortunati e squalificati (con il rientro previsto), da /indisponibili-serie-a
  st    stato di ogni giocatore per la prossima giornata (T titolare, B ballottaggio in vantaggio, R ballottaggio insidiato,
        D in dubbio, I fuori), da /probabili-formazioni-serie-a
  ps    percentuale di titolarita' dei ballottaggi (solo il campo pct)
  P     quotazione attuale (q) e fantavalore di mercato (f), da /quotazioni-fantacalcio, solo se cambiano
  nx    prossima giornata di Serie A

Regole di sicurezza: ogni parte si aggiorna solo se la pagina risulta letta per intero (numero minimo di squadre, partite e
giocatori); altrimenti quella parte resta com'era e lo script lo dice. Un giocatore guarito sparisce dall'elenco infortunati,
uno nuovo ci entra: la lista viene sempre sostituita per intero, mai "sommata".
Le formazioni (T, B, R) si applicano da 3 giorni prima della prima partita della giornata; prima, restano quelle precedenti
tranne chi risulta nel frattempo fuori o in dubbio.

Uso:  python3 scripts/aggiorna_prossima.py [--da-cartella DIR]   (DIR = pagine gia' scaricate, per le prove)
"""
import html
import json
import re
import sys
import unicodedata
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
BASE = "https://www.fantacalcio.it"
PAGINE = {
    "indisponibili": "/indisponibili-serie-a",
    "probabili": "/probabili-formazioni-serie-a",
    "quotazioni": "/quotazioni-fantacalcio",
}
ROMA = ZoneInfo("Europe/Rome")
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def scarica(nome, cartella):
    if cartella:
        return (Path(cartella) / f"girrr_{nome}.html").read_text(encoding="utf-8")
    req = urllib.request.Request(BASE + PAGINE[nome], headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def pulisci(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ").strip()


def norm(s):
    s = unicodedata.normalize("NFKD", html.unescape(s))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def slug(s):
    return norm(s).replace(" ", "-")


# ---------- quotazioni ----------
def leggi_quotazioni(h):
    """id -> dict(q=quotazione attuale classic, f=FVM classic, sq=squadra (slug), n=nome)"""
    out = {}
    for blocco in re.split(r'<tr class="player-row"', h)[1:]:
        m = re.search(r'/serie-a/squadre/([^/"]+)/[^/"]+/(\d+)"[^>]*>\s*<span>([^<]*)</span>', blocco)
        qa = re.search(r'data-col-key="c_qa">\s*([\d.,]+)\s*<', blocco)
        fv = re.search(r'data-col-key="c_fvm">\s*([\d.,]+)\s*<', blocco)
        if m and qa and fv:
            out[m.group(2)] = {"q": int(float(qa.group(1).replace(",", "."))), "f": int(float(fv.group(1).replace(",", "."))),
                               "sq": m.group(1), "n": html.unescape(m.group(3)).strip()}
    return out


# ---------- indisponibili ----------
def leggi_indisponibili(h):
    """Elenco di dict(sq=squadra, nome, testo, tipo) con tipo 'inj' (infortunato) o 'sq' (squalificato). I diffidati sono solo un avviso e non contano."""
    out, squadre = [], 0
    for c in re.split(r'class="card team-card"', h)[1:]:
        t = re.search(r'team-name">([^<]+)', c)
        if not t:
            continue
        squadre += 1
        sq = pulisci(t.group(1))
        colonne = re.split(r'<div class="col">', c)[1:]
        for col in colonne:
            if "label-danger" in col and "Squalificati" in col:
                tipo = "sq"
            elif "Infortunati" in col:
                tipo = "inj"
            else:
                continue  # diffidati
            for nome, testo in re.findall(r'item-name">([^<]+)</strong>\s*<(?:div|p) class="item-description">(.*?)</(?:div|p)>', col, re.S):
                out.append({"sq": sq, "nome": pulisci(nome), "testo": pulisci(testo), "tipo": tipo})
    return out, squadre


def rientro(testo, oggi):
    """Da una frase libera ricava (etichetta, data stimata ISO o None)."""
    t = testo.lower()
    mm = "|".join(MESI)
    # "dalla seconda meta' di ottobre", "da inizio novembre", "dalla fine di ottobre", "dalla meta' di novembre", "da marzo"
    for pat in (r"(?:rientro|rientrare|tornare|torna|tornerà|ritorno|recuperabile|rivedremo|riaverlo|arruolabile|convocabile|disposizione|tentativo)[^.]*?"
                r"(seconda met[àa]|prima met[àa]|met[àa]|inizio|fine|da)\s*(?:di\s+|del\s+)?(" + mm + r")",):
        m = re.search(pat, t)
        if m:
            parte, mese = m.group(1), m.group(2)
            giorno = {"seconda": 22, "prima": 8, "met": 15, "inizio": 4, "fine": 27, "da": 10}[
                "seconda" if parte.startswith("seconda") else "prima" if parte.startswith("prima") else "met" if parte.startswith("met") else parte]
            et = {"seconda": "Seconda metà di ", "prima": "Prima metà di ", "met": "Metà ", "inizio": "Inizio ", "fine": "Fine ", "da": "Da "}[
                "seconda" if parte.startswith("seconda") else "prima" if parte.startswith("prima") else "met" if parte.startswith("met") else parte]
            mi = MESI.index(mese) + 1
            anno = oggi.year + (1 if mi < oggi.month - 1 else 0)
            try:
                d = date(anno, mi, giorno)
            except ValueError:
                d = None
            return et + mese, d.isoformat() if d else None
    m = re.search(r"(\d+)\s*(?:-|/| o )?\s*(\d+)?\s*(settimane|mesi|giorni)", t)
    if m and ("stop di circa" in t or "per circa" in t):
        n = int(m.group(1))
        gg = n * (7 if m.group(3) == "settimane" else 30 if m.group(3) == "mesi" else 1)
        return f"Circa {n} {m.group(3)}", (oggi + timedelta(days=gg)).isoformat()
    if re.search(r"\b(out|forfait|di certo assente|sarà out|assente)\b", t):
        return "Prossimo turno", None
    return "Da valutare", None


def causa(testo):
    m = re.search(r"(lesione|distrazione|risentimento|frattura|rottura|operat\w+|sovraccarico|contusione|fastidio|problema|sindrome|infiammazione|noie|"
                  r"affaticamento|lussazione|fascite|appendicite|osteosintesi|intervento)([^.,;]*)", testo, re.I)
    if not m:
        return "Infortunio"
    s = (m.group(1) + m.group(2)).strip()
    s = " ".join(s.split()[:7])
    return s[0].upper() + s[1:]


def e_dubbio(testo):
    t = testo.lower()
    incerto = re.search(r"a rischio|da valutare|andrà valutat|da monitorare|incert|condizioni da", t)
    certo = re.search(r"\b(out|forfait|di certo assente|sarà out|lungo stop|rottura|crociato|operat\w+|ai box|fermo)\b", t)
    return bool(incerto and not certo)


def costruisci_inj(voci, indice_nomi, oggi, giornata):
    inj = []
    for v in voci:
        sqs = slug(v["sq"])
        idg = indice_nomi.get((sqs, norm(v["nome"])))
        if idg is None:  # prova col solo cognome (senza iniziale) o con il nome che inizia uguale
            base = norm(re.sub(r"\s+[A-Z]\.?$", "", v["nome"]))
            cand = [i for (s, n), i in indice_nomi.items() if s == sqs and (n == base or n.startswith(base + " ") or base.startswith(n + " "))]
            idg = cand[0] if len(set(cand)) == 1 else None
        if v["tipo"] == "sq":
            m = re.search(r"(\d+)\s*a?\s*giornat", v["testo"])
            w, k = "Squalificato", "sì"
            b = f"Rientra dalla {int(m.group(1)) + 1}ª giornata" if m else "Squalificato"
            d = None
        else:
            b, d = rientro(v["testo"], oggi)
            w = causa(v["testo"])
            k = "in dubbio" if e_dubbio(v["testo"]) else "sì"
        e = {"n": v["nome"], "t": v["sq"], "w": w, "b": b, "k": k}
        if d:
            e["d"] = d
        if idg is not None:
            e["id"] = int(idg)
        inj.append(e)
    return inj


# ---------- probabili ----------
def leggi_probabili(h):
    """Elenco partite: dict(sa, titolari, ballottaggi [(id, pct)], squal, inj, dubbio)"""
    out = []
    pezzi = re.split(r'<li class="match match-item[^>]*id="match-\d+"', h)[1:]
    for p in pezzi:
        mw = re.search(r'class="matchweek">\s*(\d+)', p)
        idr = re.compile(r"squadre/[^/\"]+/[^/\"]+/(\d+)\"")
        tit = []
        for ul in re.findall(r'<ul class="team-lineup".*?</ul>', p, re.S):
            tit += idr.findall(ul)
        ball = []
        sec = re.search(r'<section class="ballots">(.*?)</section>', p, re.S)
        if sec:
            for blocco in re.split(r'<div class="ballot">', sec.group(1))[1:]:
                ball.append([(i, int(pc)) for i, pc in re.findall(r'squadre/[^/"]+/[^/"]+/(\d+)"[^>]*>\s*<span>[^<]*</span>\s*</a>\s*<strong class="percentage">(\d+)%', blocco)])

        def sezione(cls):
            m = re.search(r'<section class="' + cls + r'">(.*?)</section>', p, re.S)
            return idr.findall(m.group(1)) if m else []

        out.append({"sa": int(mw.group(1)) if mw else None, "tit": tit, "ball": ball,
                    "squal": sezione("suspendeds"), "inj": sezione("injureds"), "dub": sezione("dubts")})
    return out


def primo_calcio(D, nx):
    best = None
    parti = (D.get("fx") or {}).get(str(nx)) or (D.get("sa") or {}).get(str(nx)) or []
    for part in parti:
        m = re.search(r"(\d{1,2})/(\d{1,2})\s+(\d{1,2}):(\d{2})", part[2])
        if m:
            g, mese, hh, mi = map(int, m.groups())
            anno = datetime.now(ROMA).year
            try:
                t = datetime(anno, mese, g, hh, mi, tzinfo=ROMA)
            except ValueError:
                continue
            if best is None or t < best:
                best = t
    return best


def main():
    cartella = None
    if "--da-cartella" in sys.argv:
        cartella = sys.argv[sys.argv.index("--da-cartella") + 1]
    fp = ROOT / "data.json"
    D = json.loads(fp.read_text(encoding="utf-8"))
    oggi = datetime.now(ROMA).date()
    ora = datetime.now(ROMA)
    cambi = []
    pagina = {}
    for k in PAGINE:
        try:
            pagina[k] = scarica(k, cartella)
        except Exception as e:  # una pagina che non risponde non blocca le altre
            print(f"{k}: non letta ({e})")

    # --- quotazioni ---
    quo = {}
    if "quotazioni" in pagina:
        quo = leggi_quotazioni(pagina["quotazioni"])
        if len(quo) >= 500:
            n = 0
            for i, p in D["P"].items():
                x = quo.get(i)
                if x and (p.get("q") != x["q"] or p.get("f") != x["f"]):
                    p["q"], p["f"] = x["q"], x["f"]
                    n += 1
            cambi.append(f"quotazioni: {n} giocatori cambiati su {len(D['P'])}")
        else:
            print(f"quotazioni: lette solo {len(quo)} righe, non aggiorno")

    # indice (squadra-slug, nome normalizzato) -> id, dalle quotazioni
    indice = {(v["sq"], norm(v["n"])): i for i, v in quo.items()}

    # --- infortunati e squalificati ---
    if "indisponibili" in pagina:
        voci, squadre = leggi_indisponibili(pagina["indisponibili"])
        if squadre >= 18 and len(voci) >= 25:
            inj = costruisci_inj(voci, indice, oggi, D.get("nx") or D.get("round"))
            D["inj"] = inj
            senza = [e["n"] for e in inj if "id" not in e]
            cambi.append(f"infortunati e squalificati: {len(inj)} ({sum(1 for e in inj if e['k']=='in dubbio')} in dubbio, "
                         f"{sum(1 for e in inj if e['w']=='Squalificato')} squalificati)" + (f"; senza id: {', '.join(senza)}" if senza else ""))
        else:
            print(f"indisponibili: lette {squadre} squadre e {len(voci)} voci, non aggiorno")

    # --- probabili formazioni ---
    if "probabili" in pagina:
        partite = leggi_probabili(pagina["probabili"])
        buone = [m for m in partite if len(m["tit"]) >= 20]
        sa = next((m["sa"] for m in partite if m["sa"]), None)
        if len(partite) >= 8 and len(buone) >= 6 and sa:
            D["nx"] = sa
            presenti = set(D["P"].keys())
            fuori, dubbio = {}, {}
            for m in partite:
                for i in m["squal"]:
                    fuori[i] = "Squalificato"
                for i in m["inj"]:
                    fuori.setdefault(i, "Infortunato")
                for i in m["dub"]:
                    dubbio[i] = "In dubbio"
            inizio = primo_calcio(D, sa)
            applica = (inizio is None) or (ora >= inizio - timedelta(hours=72))
            vecchio = D.get("st") or {}
            nuovo = {}
            if applica:
                for m in partite:
                    for i in m["tit"]:
                        if i in presenti:
                            nuovo[i] = {"s": "T"}
                for m in partite:
                    for blocco in m["ball"]:
                        for i, pc in blocco:
                            if i not in presenti:
                                continue
                            altri = [j for j, _ in blocco if j != i]
                            nome_altro = D["P"][altri[0]]["n"] if altri and altri[0] in D["P"] else ""
                            nuovo[i] = {"s": "B" if pc >= 50 else "R", "n": (("In vantaggio su " if pc >= 50 else "Insidia ") + nome_altro).strip()}
                            D["ps"].setdefault(i, {})["pct"] = pc
                # chi non e' piu' in ballottaggio perde la vecchia percentuale
                inball = {i for m in partite for b in m["ball"] for i, _ in b}
                for i, s in D["ps"].items():
                    if "pct" in s and i not in inball:
                        del s["pct"]
            else:
                nuovo = {i: v for i, v in vecchio.items() if v.get("s") in ("T", "B", "R")}
            # un infortunato solo "a rischio" e' in dubbio, non fuori; il resto di infortunati e squalificati e' fuori
            for e in D.get("inj", []):
                if e.get("id") is not None and e["k"] == "in dubbio" and str(e["id"]) in fuori and fuori[str(e["id"])] == "Infortunato":
                    del fuori[str(e["id"])]
                    dubbio[str(e["id"])] = "In dubbio: " + e["w"].lower()
            for i, motivo in fuori.items():
                if i in presenti:
                    nuovo[i] = {"s": "I", "n": motivo}
            for i, motivo in dubbio.items():
                if i in presenti and i not in fuori:
                    nuovo[i] = {"s": "D", "n": motivo}
            D["st"] = nuovo
            cambi.append(f"probabili formazioni della {sa}ª: {sum(1 for v in nuovo.values() if v['s']=='T')} titolari, "
                         f"{sum(1 for v in nuovo.values() if v['s'] in ('B','R'))} ballottaggi, "
                         f"{sum(1 for v in nuovo.values() if v['s']=='I')} fuori, {sum(1 for v in nuovo.values() if v['s']=='D')} in dubbio; "
                         + ("formazioni applicate" if applica else f"formazioni in attesa (si applicano da 3 giorni prima di {inizio:%d/%m %H:%M})"))
        else:
            print(f"probabili: lette {len(partite)} partite ({len(buone)} con formazione), non aggiorno")

    if cambi:
        D["updated"] = datetime.now(timezone.utc).astimezone(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
    fp.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for c in cambi:
        print(c)


if __name__ == "__main__":
    main()
