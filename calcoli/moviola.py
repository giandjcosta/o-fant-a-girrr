#!/usr/bin/env python3
"""Moviola di Girrr Sport: sceglie e giudica gli episodi di ogni giornata giocata e li scrive una volta sola in calcoli/moviola.json.
La tab Moviola (Lab, Anteprima Lega e Stadio) legge quel file così com'è, senza ricalcolare niente.

Legge data.json (calendario in "cal.lega", voti con le voci "b", nomi in "P", rose in "teams") e formazioni.json del sito.
Uso:  python3 calcoli/moviola.py [data.json] [formazioni.json] [moviola.json] [--rigenera [N,M]]

Regole:
  - Episodi: rosso, rigore sbagliato, autogol, rigore parato, partita vinta per meno di 1 punto (i pareggi no).
    In più, solo quando hanno deciso la partita: gol (anche su rigore), assist e gol o assist di chi è entrato a partita
    in corso nella partita vera (titolo "Decisivo dalla panchina"). Una card sola per giocatore: gol e assist dello stesso
    giocatore si tolgono insieme. Chi segna e non cambia il risultato non è un episodio.
  - La squadra del giocatore viene solo dalla formazione di quella giornata (titolari e panchina). Se non si ricava,
    l'episodio non esce, finisce tra gli "scartati" e lo script lo scrive nell'output.
  - Ha deciso la partita: si toglie l'effetto dell'episodio dal punteggio della squadra, si ricalcolano i gol e si guarda
    se l'esito (vittoria, pareggio, sconfitta) cambia. Il valore di ogni voce e le soglie dei gol si ricavano dai dati.
    Vale solo per i titolari con voto: se il giocatore partiva dalla panchina, sapere se è entrato sarebbe una stima,
    e l'episodio resta Regolare (o Da rivedere se la partita è sul filo).
  - Verdetto: rosso → Rosso confermato; ha cambiato l'esito → Ha deciso la partita; partita decisa per meno di 1 punto
    → Da rivedere; altrimenti Regolare.
  - Ordine (al massimo 4, di cui al massimo 2 tra gol, assist e panchina, così restano posti per rigori e autogol): prima
    quelli che hanno deciso, poi per peso sul risultato (gol spostati, poi punti dell'effetto), poi rosso, panchina, gol,
    assist, rigore sbagliato, autogol, rigore parato, partita sul filo.
  - Testo scelto tra le varianti in modo stabile (stessa giornata, stesso tipo e stesso giocatore danno lo stesso testo).
  - Solo le giornate con tutti i risultati entrano. Una giornata già scritta non cambia più, anche se i voti vengono
    corretti dopo: --rigenera riscrive tutto, --rigenera 2,3 solo quelle. Il file si riscrive solo se cambia qualcosa.
  - Voci a mano (calcoli/moviola-manuale.json, vedi calcoli/LEGGIMI.md): se corrispondono a un episodio automatico
    (stessa giornata, giocatore e tipo) aggiungono solo i campi che mancano, per esempio il video; altrimenti sono episodi
    nuovi (rosso → Rosso confermato, testo dai modelli se non c'è). "nascondi" toglie un automatico sbagliato. Entrano sempre,
    prima del taglio a 4, e si riapplicano a ogni giro: valgono anche sulle giornate già scritte e dopo --rigenera.
    Per questo ogni giornata tiene anche "automatici" (tutti gli episodi trovati, senza taglio) e "episodi" è quello da mostrare.
  - Video: solo link https; il secondo di partenza vale per YouTube.
  - Squadra e avversario reali (Serie A) si salvano quando data.json li ha (fx e sa coprono solo le ultime giornate e le
    prossime) e non si perdono dopo, nemmeno con --rigenera.
  - Scrive anche moviola-video.html nella radice del repo: ricerca dei video su YouTube e righe pronte per il file a mano.
Non scrive nel database.
"""
import copy, html, json, re, sys, unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import parse_qsl, quote_plus, urlencode, urlsplit, urlunsplit

QUI = Path(__file__).resolve().parent
ARG, RIGENERA = [], None   # RIGENERA: None solo giornate nuove, True tutte, insieme di numeri solo quelle
_a = sys.argv[1:]
while _a:
    x = _a.pop(0)
    if x == "--rigenera":
        RIGENERA = {int(n) for n in _a.pop(0).split(",")} if _a and re.fullmatch(r"\d+(,\d+)*", _a[0]) else True
    else:
        ARG.append(x)
DATI = Path(ARG[0]) if len(ARG) > 0 else QUI.parent / "data.json"
FORM = Path(ARG[1]) if len(ARG) > 1 else QUI.parent / "formazioni.json"
USCITA = Path(ARG[2]) if len(ARG) > 2 else QUI / "moviola.json"
MANUALE = QUI / "moviola-manuale.json"
PAGINA = QUI.parent / "moviola-video.html"
MAX = 4
MAX_GOL = 2   # al massimo 2 episodi automatici tra gol, assist e panchina
GOLLIKE = {"gol", "assist", "panchina"}

MGR = json.loads((QUI / "nomi.json").read_text(encoding="utf-8"))
PRIO = {"rosso": 0, "panchina": 1, "gol": 2, "assist": 3, "sbagliato": 4, "autogol": 5, "parato": 6, "altro": 7, "stretta": 8}
TIPI = {"rosso": "rosso", "rigore sbagliato": "sbagliato", "autogol": "autogol", "rigore parato": "parato", "altro": "altro",
        "gol": "gol", "assist": "assist", "dalla panchina": "panchina"}
POSITIVE = ("gol", "rigore segnato", "assist")   # voci che contano solo se decidono la partita   # come si scrivono a mano
NOME_TIPO = {v: k for k, v in TIPI.items()}

MVT = {
 "rosso": {"t": "Rosso diretto", "x": [
  "{G} lascia {S} in dieci: l'arbitro non ha dubbi e mostra il rosso. Le immagini confermano, per {A} un problema in più.",
  "Intervento in ritardo di {G} e cartellino rosso. Rivisto al rallentatore, l'episodio è netto: {S} resta in inferiorità.",
  "Espulsione per {G}: la squadra di {A} finisce la partita con un uomo in meno. Il replay dà ragione al direttore di gara."]},
 "sbagliato": {"t": "Rigore sbagliato", "x": [
  "{G} va sul dischetto e non trova la porta. Il rigore era netto, l'errore pure: sulla panchina di {A} nessuno ci crede.",
  "Rigore concesso a {S}, sul pallone va {G}. Tiro debole, l'occasione sfuma. Nessun dubbio sul fischio, tanti sull'esecuzione.",
  "Dal replay il contatto c'è: rigore giusto. Poi però {G} lo calcia male e {S} resta a bocca asciutta.",
  "Il dischetto tradisce {G}. Il fallo era evidente, il rigore anche, il gol no: dalle parti di {A} si mastica amaro."]},
 "autogol": {"t": "Autogol", "x": [
  "Cross teso in area, {G} prova a spazzare e la mette nella propria porta. Rivista l'azione, la deviazione è sua.",
  "Sfortuna per {G}: tocco decisivo nella sua porta. Nessun fallo prima, il gol è valido e {S} lo paga caro.",
  "La moviola non lascia scampo: l'ultimo tocco è di {G}. Autogol regolare, e sulla panchina di {A} cala il silenzio."]},
 "parato": {"t": "Rigore parato", "x": [
  "{G} intuisce, si allunga e para il rigore. Al replay i piedi sono sulla linea: tutto regolare, e che parata per {S}.",
  "Rigore contro {S}, ma {G} ci arriva. Nessun movimento in anticipo: la parata è buona e la panchina di {A} esulta.",
  "Dal dischetto parte il tiro, {G} lo respinge. Controllato il posizionamento: regolare. Una parata che vale come un gol."]},
 "altro": {"t": "Episodio da rivedere", "x": [
  "Episodio da rivedere per {G}: sulla panchina di {A} se ne parla ancora. Al replay qualche dubbio resta.",
  "Al centro della discussione c'è {G}. Immagini al rallentatore e opinioni diverse: {S} aspetta un chiarimento."]},
 "gol": {"t": "Gol decisivo", "x": [
  "{GL} di {G} per {S}. Rivista l'azione, nessun fallo e nessun fuorigioco: tutto regolare, e sulla panchina di {A} si esulta.",
  "Al replay il pallone di {G} è tutto dentro. Niente da segnalare: {gl} è regolare."]},
 "assist": {"t": "Assist decisivo", "x": [
  "Il passaggio giusto è di {G}: rivista l'azione, la posizione è regolare e il gol è valido.",
  "Assist di {G} e gol buono: al replay nessun fuorigioco a inizio azione."]},
 "panchina": {"t": "Decisivo dalla panchina", "x": [
  "{G} entra a partita in corso e lascia il segno. Rivista l'azione, tutto regolare: per {S} un cambio azzeccato.",
  "Dalla panchina al centro della scena: {G} entra e cambia la partita di {S}. Nessun dubbio al replay."]},
 "stretta": {"t": "Partita decisa sul filo", "x": [
  "{C} {R} {O}: finisce {P}, decisa da un soffio. Basta un episodio per cambiare tutto, e in studio se ne parlerà a lungo.",
  "Un dettaglio separa {C} e {O}: {R} e punteggio di {P}. Festa per {AC}, rabbia per {AO}: c'è chi chiede di rivedere tutto.",
  "La più tirata della giornata: {C}–{O} {R}, con un punteggio di {P}. Partita da rivedere azione per azione."]}}

# Verdetto "Ha deciso la partita": {M} è la partita col risultato, {E} cosa sarebbe successo a {S} senza l'episodio
DECISO = {
 "rosso": [
  "Il rosso a {G} cambia la partita: {S} resta in dieci e la gara gira. Finisce {M}, e con undici uomini fino alla fine {S} {E}.",
  "Espulsione netta per {G}, e da lì è un'altra partita: {M}. Per {A} è un rosso che costa il risultato.",
  "Il replay conferma il rosso a {G}, ed è l'episodio chiave di {M}. Senza quell'espulsione {S} {E}: sulla panchina di {A} lo sanno bene."],
 "sbagliato": [
  "{G} va sul dischetto e sbaglia: è l'episodio che decide {M}. Con quel pallone in rete {S} {E}, e sulla panchina di {A} resta solo il rimpianto.",
  "Il rigore era netto, l'esecuzione no. {G} si fa ipnotizzare e {S} paga tutto: finisce {M}. Con quel gol {S} {E}.",
  "Dal replay nessun dubbio sul fischio, ma il risultato lo cambia l'errore di {G}: {M}. Per {A} è il rigore che pesa di più in classifica.",
  "Partita decisa da undici metri. {G} calcia, il pallone non entra e {M} prende un'altra strada: dalle parti di {AO} si brinda, per {A} è una notte lunga."],
 "autogol": [
  "Un tocco sfortunato e la partita prende un'altra strada: l'autogol di {G} decide {M}. Senza quella deviazione {S} {E}.",
  "La moviola conferma: ultimo tocco di {G}, gol valido e risultato cambiato. Finisce {M}, e sulla panchina di {A} si riguarda il replay in silenzio.",
  "Il pallone carambola su {G} e finisce in rete: è il gol che decide {M}. Per {A} una beffa che pesa in classifica, perché senza quell'autogol {S} {E}."],
 "parato": [
  "{G} para il rigore e si prende la copertina: {M}. Senza quella parata {S} {E}, e sulla panchina di {A} lo sanno bene.",
  "Il rigore che decide la partita è quello che non entra. {G} vola, respinge e consegna il risultato a {S}: finisce {M}.",
  "Piedi sulla linea, tuffo giusto, pallone fuori: al replay la parata di {G} è regolare ed è quella che decide {M}. Per {A} vale quanto un gol.",
  "Dal dischetto parte il tiro, {G} lo respinge e cambia la giornata di {S}. Finisce {M}: senza quella parata {S} {E}, invece è festa per {A}."],
 "gol": [
  "{GL} di {G} decide {M}. Rivista l'azione, nessun fallo e nessun fuorigioco: tutto regolare. Senza {gl} {S} {E}.",
  "Al replay è tutto pulito: {gl} di {G} decide {M}. Senza, {S} {E}, e sulla panchina di {A} lo sanno bene.",
  "Tutto gira intorno a {G}: {gl} decide {M}. Nessun dubbio dalla moviola, e senza {gl} {S} {E}.",
  "La moviola dice gol regolare, il tabellone dice {M}. {GL} di {G} vale il risultato: senza, {S} {E}."],
 "assist": [
  "Il pallone giusto lo mette {G}: è l'assist che decide {M}. Al replay posizione regolare. Senza quel passaggio {S} {E}.",
  "Rivista l'azione, l'assist di {G} è pulito ed è quello che decide {M}. Per {A} un passaggio che vale il risultato.",
  "Non segna, ma decide: il passaggio di {G} cambia {M}. Senza quell'assist {S} {E}."],
 "panchina": [
  "{G} entra a partita in corso e la decide: finisce {M}. Senza il suo ingresso {S} {E}, e sulla panchina di {A} si parla di cambio perfetto.",
  "Il cambio che vale il risultato: {G} parte dalla panchina e decide {M}. Al replay tutto regolare. Senza di lui {S} {E}.",
  "Seduto in panchina all'inizio, decisivo alla fine. {G} entra, lascia il segno e consegna {M} a {S}: senza, {S} {E}."]}
CONTRO = {1: "avrebbe vinto", 0: "avrebbe pareggiato", -1: "avrebbe perso"}
GOLN = {1: "Il gol", 2: "La doppietta", 3: "La tripletta"}


def h(s):   # lo stesso hash del Lab: stessa giornata e stesso giocatore danno sempre lo stesso testo
    x = 0
    for ch in s:
        x = (x * 31 + ord(ch)) & 0xFFFFFFFF
    return x


def pick(a, k):
    return a[h(k) % len(a)]


def allenatori(t):
    return [n.strip() for n in MGR.get(t, t).split("&")]


def voci(v):
    """Le voci di `b` come {voce: quante}; "gol subiti" e "gol subito" sono la stessa voce."""
    c = defaultdict(int)
    for b in v.get("b") or []:
        m = re.match(r"(\d+) (.*)", b)
        n, k = (int(m.group(1)), m.group(2)) if m else (1, b)
        k = "gol subito" if k == "gol subiti" else k
        c[k] += n
    return c


def tipo(voce):
    if re.search(r"espuls|\brosso\b", voce, re.I):
        return "rosso"
    return {"rigore sbagliato": "sbagliato", "autogol": "autogol", "rigore parato": "parato"}.get(voce)


def valori_voci(votes):
    """Quanto vale ogni voce sul fantavoto, ricavato da fantavoto meno voto. Si parte dalle righe con una sola voce sconosciuta
    e si prende il valore più frequente (i gialli non sono tra le voci e tolgono mezzo punto a qualche riga: a parità vince il più alto)."""
    righe = []
    for vs in votes.values():
        for v in vs.values():
            if v.get("v") is None or v.get("f") is None:
                continue
            righe.append((voci(v), v["f"] - v["v"]))
    def stima(k, noto):   # il valore di k dalle righe dove tutte le altre voci sono già note
        cc = Counter(round((r - sum(noto[j] * n for j, n in c.items() if j != k)) / c[k] * 2) / 2
                     for c, r in righe if k in c and all(j in noto for j in c if j != k))
        return max(cc, key=lambda x: (cc[x], x)) if cc else None
    noto, tutte = {"senza voto": 0.0}, {k for c, _ in righe for k in c}
    while True:   # prima le voci che si ricavano da sole, poi quelle che dipendono da loro
        nuove = {k: stima(k, noto) for k in tutte - set(noto)}
        nuove = {k: x for k, x in nuove.items() if x is not None}
        if not nuove:
            break
        noto.update(nuove)
    return {k: (stima(k, noto) if k != "senza voto" else 0.0) for k in noto}   # ultimo giro con tutte le altre note


def gol(p, base, passo):
    return 0 if p < base else int((p - base) // passo) + 1


def soglie(lega):
    """Soglia del primo gol e punti per ogni gol in più, ricavati dai risultati giocati: la coppia (a mezzo punto) che li spiega tutti.
    Se ce ne sono più di una si sceglie quella con i numeri più tondi; se nessuna li spiega, None (e nessun episodio "decide")."""
    gi = [(p, int(g)) for x in lega for m in x["m"] if m[4] and m[4] != "-"
          for p, g in ((m[1], m[4].split("-")[0]), (m[2], m[4].split("-")[1]))]
    ok = []
    for b2 in range(100, 181):
        for s2 in range(2, 21):
            b, s = b2 / 2, s2 / 2
            if all(gol(p, b, s) == g for p, g in gi):
                ok.append((b % 1 != 0, s % 1 != 0, b, s))
    return min(ok)[2:] if ok else None


def ris(r):   # "2-2" con il trattino che non va a capo
    return r.replace("-", "\u2011")


def esito(a, b):
    return (a > b) - (a < b)


def episodi(G, d, F, val, sg):
    sa = str(G["sa"])
    V, P = d.get("votes") or {}, d.get("P") or {}
    chi = {}   # giocatore → (squadra, titolare con voto)
    for t, x in (F or {}).items():
        for i in x.get("tit") or []:
            v = (V.get(str(i)) or {}).get(sa)
            chi[str(i)] = (t, bool(v) and v.get("v") is not None)
        for i in x.get("pan") or []:
            chi[str(i)] = (t, False)
    rosa = {str(p["id"]) for t in d.get("teams") or [] for p in t.get("pl") or []} | set(chi)   # i giocatori della lega
    partite = [m for m in G["m"] if m[4] and m[4] != "-"]
    def partita(t):
        for m in partite:
            if t in (m[0], m[3]):
                return m
    ep, scartati = [], []
    for pid, gg in V.items():
        v = gg.get(sa)
        if not v or pid not in P or pid not in rosa:
            continue
        for voce, n in voci(v).items():
            k = tipo(voce)
            if not k:
                continue
            if pid not in chi:
                scartati.append({"tipo": k, "giocatore": P[pid]["n"], "id": pid, "motivo": "squadra non ricavabile dalla formazione"})
                continue
            sq, titolare = chi[pid]
            e = dict(k=k, g=P[pid]["n"], s=sq, id=pid, deciso=False, peso=0.0, gol=0, reale=reale(d, sa, P[pid].get("t")))
            m = partita(sq)
            if m:
                casa = m[0] == sq
                mio = m[1] if casa else m[2]
                gm, gs = map(int, m[4].split("-")) if casa else map(int, m[4].split("-")[::-1])
                e.update(o=m[3] if casa else m[0], m=m, sul_filo=gm != gs and abs(m[1] - m[2]) < 1)
                eff = val.get(voce)
                if titolare and eff and sg:   # dalla panchina sarebbe una stima: niente effetto, niente "decide"
                    senza = gol(mio - eff * n, *sg)
                    e["peso"], e["gol"] = abs(eff * n), abs(gm - senza)
                    if esito(senza, gs) != esito(gm, gs):
                        e.update(deciso=True, contro=esito(senza, gs))
            ep.append(e)
        # gol, rigori segnati e assist: entrano solo se decidono la partita (sempre un titolare con voto)
        c = voci(v)
        pos = {k: c[k] for k in POSITIVE if c.get(k)}
        if not pos or pid not in chi or not sg:
            continue
        sq, titolare = chi[pid]
        m = partita(sq)
        eff = sum((val.get(k) or 0) * n for k, n in pos.items())
        if not titolare or not m or eff <= 0:
            continue
        casa = m[0] == sq
        mio = m[1] if casa else m[2]
        gm, gs = map(int, m[4].split("-")) if casa else map(int, m[4].split("-")[::-1])
        senza = gol(mio - eff, *sg)
        if esito(senza, gs) == esito(gm, gs):
            continue
        ng = pos.get("gol", 0) + pos.get("rigore segnato", 0)
        k = "panchina" if c.get("subentrato") else "gol" if ng else "assist"
        ep.append(dict(k=k, g=P[pid]["n"], s=sq, id=pid, deciso=True, contro=esito(senza, gs), peso=eff, gol=abs(gm - senza),
                       ng=ng, o=m[3] if casa else m[0], m=m, sul_filo=gm != gs and abs(m[1] - m[2]) < 1,
                       reale=reale(d, sa, P[pid].get("t"))))
    for m in partite:
        r = m[4].split("-")
        if r[0] != r[1] and abs(m[1] - m[2]) < 1:
            ep.append(dict(k="stretta", c=m[0], o=m[3], r=m[4], id=m[0] + m[3], deciso=False, peso=0.0, gol=0, sul_filo=True,
                           p=f"{m[1]:g} a {m[2]:g}".replace(".", ",")))
    ep.sort(key=lambda e: (not e["deciso"], -e["gol"], -e["peso"], PRIO[e["k"]], (e.get("g") or e.get("c")).casefold()))
    tutti = [scheda(G["n"], e) for e in ep]
    return {"sa": G["sa"], "scritta": date.today().isoformat(), "episodi": taglia(tutti), "scartati": scartati, "automatici": tutti}


def taglia(eps, posti=MAX, ngol=0):
    """I primi episodi fino a riempire i posti, con al massimo MAX_GOL tra gol, assist e panchina (ngol: quelli già dentro)."""
    r = []
    for e in eps:
        if len(r) >= posti:
            break
        if e["tipo"] in GOLLIKE:
            if ngol >= MAX_GOL:
                continue
            ngol += 1
        r.append(e)
    return r


def scheda(n, e):
    """L'episodio come lo legge il Lab: titolo, verdetto e testo scelto in modo stabile, più i dati reali se ci sono."""
    k, chiave = e["k"], f"{n}:{e['k']}:{e['id']}"
    if k == "rosso":
        ver = "Rosso confermato"
    elif e["deciso"]:
        ver = "Ha deciso la partita"
    elif e.get("sul_filo") or k == "altro":
        ver = "Da rivedere"
    else:
        ver = "Regolare"
    x = e.get("testo") or (pick(DECISO[k], chiave) if e["deciso"] else pick(MVT[k]["x"], chiave))
    m = e.get("m")
    rep = {"G": e.get("g", ""), "S": e.get("s", ""), "A": " e ".join(allenatori(e["s"])) if e.get("s") else "",
           "C": e.get("c", ""), "O": e.get("o", ""), "R": ris(e.get("r", "")), "P": e.get("p", ""),
           "AC": " e ".join(allenatori(e["c"])) if e.get("c") else "", "AO": " e ".join(allenatori(e["o"])) if e.get("o") else "",
           "M": f"{m[0]}–{m[3]} {ris(m[4])}" if m else "", "E": CONTRO.get(e.get("contro"), ""),
           "GL": GOLN.get(e.get("ng") or 1, f"I {e.get('ng')} gol")}
    rep["gl"] = rep["GL"][0].lower() + rep["GL"][1:]   # {GL} a inizio frase, {gl} a metà
    if not e.get("testo"):
        x = re.sub(r"\{(\w+)\}", lambda z: rep[z.group(1)], x)
    r = {"tipo": k, "titolo": MVT[k]["t"], "verdetto": ver, "testo": x}
    if k == "stretta":
        r.update(casa=e["c"], ospite=e["o"], allenatori_casa=allenatori(e["c"]), allenatori_ospite=allenatori(e["o"]))
    else:
        r.update(giocatore=e["g"], squadra=e["s"], allenatori=allenatori(e["s"]), id=e["id"], **(e.get("reale") or {}))
    return r


def reale(d, sa, club):
    """Squadra reale del giocatore (il club di oggi in data.json) e, se data.json conosce quella giornata di Serie A,
    avversario, casa o trasferta e data della partita."""
    if not club:
        return {}
    r = {"squadra_reale": club}
    for fonte in (d.get("fx") or {}, d.get("sa") or {}):
        for casa, fuori, quando in fonte.get(str(sa), []):
            if club in (casa, fuori):
                r.update(avversario_reale=fuori if club == casa else casa, in_casa=club == casa, data_partita=quando)
                return r
    return r


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def trova(nome, elenco):
    """Il giocatore scritto a mano tra le coppie (chiave, nome): prima il nome uguale, poi l'unico che comincia così ("Ramos" → "Ramos G.")."""
    n = norm(nome)
    if not n:
        return None
    for x in elenco:
        if norm(x[1]) == n:
            return x
    inizio = [x for x in elenco if norm(x[1]).split(" ")[0] == n or norm(x[1]).startswith(n + " ")]
    return inizio[0] if len(inizio) == 1 else None


def video(v, avvisi, dove):
    """Il link del video, con il secondo di partenza se è YouTube. Solo https: il resto si ignora con un avviso."""
    if not isinstance(v, dict):
        v = {"url": v}
    url = str(v.get("url") or "").strip()
    if not url:
        return None
    if not url.lower().startswith("https://"):
        avvisi.append(f"{dove}: video ignorato, il link deve cominciare con https://")
        return None
    sec = v.get("secondo")
    if sec in (None, ""):
        return url
    try:
        sec = int(sec)
        assert sec >= 0
    except (ValueError, TypeError, AssertionError):
        avvisi.append(f"{dove}: secondo di partenza non valido, uso il link senza")
        return url
    p = urlsplit(url)
    host = (p.hostname or "").lower()
    if host in ("youtu.be", "youtube.com") or host.endswith(".youtube.com"):
        q = [(a, b) for a, b in parse_qsl(p.query, keep_blank_values=True) if a not in ("t", "start")] + [("t", f"{sec}s")]
        return urlunsplit((p.scheme, p.netloc, p.path, urlencode(q), p.fragment))
    return url


def applica_manuale(gg, voci_mano, d, avvisi):
    """Rifà "episodi" di ogni giornata dagli automatici e dalle voci a mano. Le voci a mano entrano sempre;
    gli automatici riempiono i posti rimasti fino a 4 (al massimo 2 tra gol, assist e panchina), nel loro ordine."""
    P = d.get("P") or {}
    giocatori = [(i, p["n"]) for i, p in P.items()]
    squadre = {t["name"] for t in d.get("teams") or []}
    for n, x in gg.items():
        auto = [copy.deepcopy(e) for e in x["automatici"]]
        tenuti, nascosti, nuovi = set(), set(), []
        for j, v in enumerate(voci_mano):
            if str(v.get("giornata")) != n:
                continue
            dove = f"Voce {j + 1} (giornata {n}, {v.get('giocatore') or '?'})"
            k = TIPI.get(norm(v.get("tipo")))
            if not k:
                avvisi.append(f"{dove}: tipo sconosciuto, ignorata")
                continue
            m = trova(v.get("giocatore"), [(i, e["giocatore"]) for i, e in enumerate(auto) if e["tipo"] == k and e.get("giocatore")])
            if v.get("nascondi") is True:
                if m:
                    nascosti.add(m[0])
                else:
                    avvisi.append(f"{dove}: da nascondere, ma non c'è un episodio automatico così")
                continue
            vid = video(v.get("video"), avvisi, dove)
            if m:   # stesso episodio: si aggiunge solo quello che manca
                e = auto[m[0]]
                if vid and not e.get("video"):
                    e["video"] = vid
                e["manuale"] = True
                tenuti.add(m[0])
                continue
            sq = v.get("squadra") or ""
            if not v.get("giocatore") or not sq:
                avvisi.append(f"{dove}: servono giocatore e squadra, ignorata")
                continue
            if sq not in squadre:
                avvisi.append(f"{dove}: la squadra \"{sq}\" non è della lega")
            pg = trova(v["giocatore"], giocatori)
            e = scheda(n, dict(k=k, id=pg[0] if pg else v["giocatore"], g=P[pg[0]]["n"] if pg else v["giocatore"], s=sq,
                               deciso=False, testo=str(v.get("testo") or "").strip(),
                               reale=reale(d, x["sa"], P[pg[0]].get("t")) if pg else {}))
            if vid:
                e["video"] = vid
            e["manuale"] = True
            nuovi.append(e)
        dentro = [i for i in range(len(auto)) if i in tenuti and i not in nascosti]
        liberi = [i for i in range(len(auto)) if i not in tenuti and i not in nascosti]
        scelti = taglia([auto[i] for i in liberi], MAX - len(dentro) - len(nuovi), sum(1 for i in dentro if auto[i]["tipo"] in GOLLIKE))
        dentro += [i for i in liberi if any(auto[i] is e for e in scelti)]
        dentro.sort()
        # prima gli automatici che hanno deciso la partita, poi quelli a mano (rosso, rigori, autogol, altro), poi gli altri automatici
        decisi = [auto[i] for i in dentro if auto[i]["verdetto"] == "Ha deciso la partita"]
        x["episodi"] = decisi + sorted(nuovi, key=lambda e: PRIO[e["tipo"]]) + [auto[i] for i in dentro if auto[i] not in decisi]
    for j, v in enumerate(voci_mano):
        if str(v.get("giornata")) not in gg:
            avvisi.append(f"Voce {j + 1}: la giornata {v.get('giornata')} non è ancora scritta, la applico quando arriva")


def ricerca(e, sa):
    parole = [e.get("giocatore"), e.get("squadra_reale"), e.get("avversario_reale"), "Serie A", f"giornata {sa}", "highlights"]
    return "https://www.youtube.com/results?search_query=" + quote_plus(" ".join(p for p in parole if p))


def pagina(gg):
    blocchi = []
    for n in sorted(gg, key=int, reverse=True):
        x = gg[n]
        eps = [e for e in x["episodi"] if e.get("giocatore")]
        b = [f'<section><h2>Giornata {n} <small>Serie A, giornata {x["sa"]}</small></h2>']
        if not eps:
            b.append('<p class="mut">Nessun episodio con un giocatore in questa giornata.</p>')
        for e in eps:
            riga = json.dumps({"giornata": int(n), "tipo": NOME_TIPO[e["tipo"]], "giocatore": e["giocatore"], "squadra": e["squadra"],
                               "video": {"url": "", "secondo": ""}}, ensure_ascii=False)
            club, avv = e.get("squadra_reale"), e.get("avversario_reale")
            partita = (f"{club} – {avv}" if e.get("in_casa") else f"{avv} – {club}") if avv else ""
            info = [t for t in (club and f"Squadra reale: {club}", partita and f"Partita: {partita}",
                                e.get("data_partita") and f"Quando: {e['data_partita']}") if t]
            manca = [t for t, ok in (("squadra reale", club), ("avversario", avv)) if not ok]
            b.append('<article>'
                     f'<span class="tag">{html.escape(e["titolo"])}</span>'
                     f'<h3>{html.escape(e["giocatore"])}</h3>'
                     f'<p class="mut">{html.escape(e["squadra"])} · Giornata {n}</p>'
                     + "".join(f'<p class="sm">{html.escape(t)}</p>' for t in info)
                     + (f'<p class="sm mut">Mancano nei dati: {", ".join(manca)}. La ricerca usa quello che c\'è.</p>' if manca else "")
                     + f'<a class="btn" href="{html.escape(ricerca(e, x["sa"]))}" target="_blank" rel="noopener">Cerca su YouTube</a>'
                     + (f'<p class="sm ok">Video già inserito: <a href="{html.escape(e["video"])}" target="_blank" rel="noopener">Apri il video</a></p>' if e.get("video") else "")
                     + '<p class="lab">Riga per moviola-manuale.json</p>'
                     f'<pre>{html.escape(riga)}</pre><button type="button" class="copia">Copia la riga</button>'
                     '</article>')
        b.append("</section>")
        blocchi.append("".join(b))
    return PAGINA_HTML.replace("{{BLOCCHI}}", "\n".join(blocchi) or '<p class="mut">Ancora nessuna giornata giocata.</p>')


PAGINA_HTML = """<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<link rel="icon" href="favicon-64.png"><title>Moviola, ricerca video</title>
<style>
:root{--bg:#141d3d;--ink:#fbf6ec;--mute:#bfe3ff;--gold:#ffd166;--ok:#7be495;--line:rgba(255,255,255,.22);--glass:rgba(255,255,255,.08);color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink)}
body{font-family:Inter,system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.45;padding:16px;max-width:760px;margin:0 auto;-webkit-text-size-adjust:100%}
h1{font-size:24px;margin-bottom:6px}
h2{font-size:19px;margin:22px 0 10px}
h2 small{display:block;font-size:13px;font-weight:600;color:var(--mute)}
h3{font-size:18px;margin:8px 0 2px;overflow-wrap:anywhere}
p{overflow-wrap:anywhere}
.mut{color:var(--mute)}.sm{font-size:13.5px;margin-top:4px}.ok,.ok a{color:var(--ok)}
article{background:var(--glass);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px;min-width:0}
.tag{display:inline-block;background:var(--gold);color:#141d3d;font-weight:800;font-size:11px;letter-spacing:.06em;padding:4px 10px;border-radius:99px;text-transform:uppercase}
.btn,.copia{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin-top:12px;border-radius:12px;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}
.btn{background:#d62839;color:#fff;border:0}
.copia{background:transparent;color:var(--ink);border:1px solid var(--line);margin-top:8px}
.lab{font-size:12px;font-weight:800;color:var(--mute);margin-top:14px}
pre{margin-top:6px;padding:10px;border-radius:10px;background:rgba(0,0,0,.35);font-size:12.5px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;-webkit-user-select:all;user-select:all}
</style></head><body>
<h1>Moviola, ricerca video</h1>
<p class="mut">Pagina di servizio, non collegata all'app. Per ogni episodio: il link di ricerca su YouTube e la riga da completare con il link e il secondo di partenza.</p>
<p class="sm mut">Come mandarli: in chat a Claude Code, "Moviola giornata X: giocatore, tipo, link, secondo".</p>
{{BLOCCHI}}
<script>
document.addEventListener('click',function(e){var b=e.target.closest('.copia');if(!b)return;var el=b.previousElementSibling;
 function ok(){b.textContent='Copiata';setTimeout(function(){b.textContent='Copia la riga'},1600)}
 function sel(){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selezionata: copiala'}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(el.textContent).then(ok,sel);else sel()});
</script>
</body></html>
"""

def main():
    d = json.loads(DATI.read_text(encoding="utf-8"))
    form = json.loads(FORM.read_text(encoding="utf-8")) if FORM.exists() else {}
    lega = (d.get("cal") or {}).get("lega") or []
    val = valori_voci(d.get("votes") or {})
    sg = soglie(lega)
    print("Valori ricavati:", {k: val[k] for k in ("rigore sbagliato", "autogol", "rigore parato") if k in val}, "· soglie dei gol:", sg)
    vecchio = json.loads(USCITA.read_text(encoding="utf-8")) if USCITA.exists() else {}
    prima = {} if RIGENERA is True else vecchio
    gg = dict(prima.get("giornate") or {})
    voci_mano = json.loads(MANUALE.read_text(encoding="utf-8")) if MANUALE.exists() else []
    giocate = [g for g in lega if g["m"] and all(m[4] and m[4] != "-" for m in g["m"])]
    for G in giocate:
        n = str(G["n"])
        if n in gg and not (isinstance(RIGENERA, set) and G["n"] in RIGENERA):
            print("Giornata %s: già scritta il %s, non cambia" % (n, gg[n]["scritta"]))
            continue
        gg[n] = x = episodi(G, d, form.get(str(G["sa"])), val, sg)
        print("Giornata %s: %d episodi%s" % (n, len(x["episodi"]), "".join("\n  - %s: %s → %s" % (e["titolo"], e.get("giocatore") or e["casa"] + "–" + e["ospite"], e["verdetto"]) for e in x["episodi"])))
        for s in x["scartati"]:
            print("  ! SCARTATO %s di %s (giornata %s): %s" % (MVT[s["tipo"]]["t"].lower(), s["giocatore"], n, s["motivo"]))
    P = d.get("P") or {}
    for n, x in gg.items():
        if "automatici" not in x:   # giornata scritta prima delle voci a mano: gli automatici sono gli episodi di allora
            x["automatici"] = [copy.deepcopy(e) for e in x["episodi"] if not e.get("manuale")]
        prec = ((vecchio.get("giornate") or {}).get(n) or {}).get("automatici") or []
        for e in x["automatici"]:
            if not e.get("giocatore"):
                continue
            # dati reali: quelli salvati la prima volta restano, quelli che mancano si aggiungono se data.json ora li ha
            v = next((y for y in prec if y.get("tipo") == e["tipo"] and y.get("giocatore") == e["giocatore"]), {})
            pid = e.get("id") or next((i for i, q in P.items() if q["n"] == e["giocatore"]), None)
            ora = reale(d, x["sa"], (P.get(pid) or {}).get("t")) if pid else {}
            for c in ("squadra_reale", "avversario_reale", "in_casa", "data_partita"):
                if e.get(c) in (None, ""):
                    if v.get(c) not in (None, ""):
                        e[c] = v[c]
                    elif ora.get(c) not in (None, ""):
                        e[c] = ora[c]
    avvisi = []
    applica_manuale(gg, voci_mano, d, avvisi)
    for a in avvisi:
        print("  ! " + a)
    pag = pagina(gg)
    if not PAGINA.exists() or PAGINA.read_text(encoding="utf-8") != pag:
        PAGINA.write_text(pag, encoding="utf-8")
        print("scritto", PAGINA)
    nuovo = {"giocate": [g["n"] for g in giocate], "giornate": {k: gg[k] for k in sorted(gg, key=int)}}
    testo = json.dumps(nuovo, ensure_ascii=False, indent=1) + "\n"
    if USCITA.exists() and USCITA.read_text(encoding="utf-8") == testo:
        print("moviola.json invariato")
        return
    USCITA.write_text(testo, encoding="utf-8")
    print("scritto", USCITA)


if __name__ == "__main__":
    main()
