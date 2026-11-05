#!/usr/bin/env python3
"""Controllo della giornata (sola lettura): dice cosa è già a posto e cosa manca, sempre nello stesso ordine.

Uso:  python3 -I scripts/controllo_giornata.py [N]      (senza N prende l'ultima giornata di campionato chiusa)
Da lanciare nella radice del ramo gh-pages. Non scrive niente. Esce con 1 se c'è almeno un ERRORE.
Le regole sui testi sono quelle di AGENTS.md (tre livelli di scrittura, maiuscole, Derby, niente scommesse né disclaimer).
"""
import json, re, subprocess, sys
from pathlib import Path

R = Path(".")
ERR, AVV, OK = [], [], []


def ok(m): OK.append(m)
def avv(m): AVV.append(m)
def err(m): ERR.append(m)


def chiuse(d):
    return [r for r in d["cal"]["lega"] if r["m"] and all(m[4] and m[4] != "-" for m in r["m"])]


def testo_pdf(p):
    try:
        return subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True, check=True).stdout
    except Exception:
        return None


def stringhe(x):
    if isinstance(x, str): yield x
    elif isinstance(x, dict):
        for v in x.values(): yield from stringhe(v)
    elif isinstance(x, list):
        for v in x: yield from stringhe(v)


d = json.loads((R / "data.json").read_text(encoding="utf-8"))
C = chiuse(d)
if not C:
    print("Nessuna giornata di campionato chiusa in data.json."); sys.exit(1)
arg = [a for a in sys.argv[1:] if a.isdigit()]
r = next((x for x in C if x["n"] == int(arg[0])), None) if arg else max(C, key=lambda x: x["n"])
if r is None:
    print("La giornata %s non risulta chiusa in data.json." % arg[0]); sys.exit(1)
n, sa = r["n"], str(r.get("sa"))
NN = "%02d" % n

# 1. Giornata calcolata e voti completi
for chiave in ("calcTs", "votiTs"):
    (ok if d.get(chiave, {}).get(sa) else err)("%s della giornata %d: %s" % (chiave, n, d.get(chiave, {}).get(sa, "MANCA")))

# 2. File del Giornale e del tabellone
for f in ("settimana-%s.pdf" % NN, "settimana-%s.json" % NN, "giornata-%s.md" % NN, "giornata-%s.html" % NN, "tabellone-lega-%s.png" % NN):
    (ok if (R / "riepiloghi" / f).exists() else err)("riepiloghi/%s" % f)
ind = R / "riepiloghi" / "indice.json"
if ind.exists():
    (ok if ('"%d"' % n in ind.read_text(encoding="utf-8") or re.search(r"\b%d\b" % n, ind.read_text(encoding="utf-8"))) else err)("Giornata %d nell'archivio (riepiloghi/indice.json)" % n)

# 3. Dati calcolati per le pagine (esistenza)
for f in ("moviola", "cronache", "fiducia", "probabilita", "borsino", "lab-dati"):
    (ok if (R / "girrr/dati" / (f + ".json")).exists() else err)("girrr/dati/%s.json" % f)

# 4. Testi del Giornale (testi.json): regole di AGENTS.md
t = json.loads((R / "testi.json").read_text(encoding="utf-8")) if (R / "testi.json").exists() else None
if t is None:
    err("testi.json non trovato")
else:
    tutto = list(stringhe(t))
    blocco = "\n".join(tutto)
    for pat, perche in ((r"scommess|schedin|\bquot[ae]\b|\bbet\b", "parla di scommesse"), (r"inventat|dati finti|notizia finta", "disclaimer su contenuti fittizi")):
        for m in re.finditer(pat, blocco, re.I): err("testi.json %s: «%s»" % (perche, m.group(0)))
    for m in re.finditer(r"\bderby\b", blocco): err("testi.json: «derby» con la d minuscola")
    for m in re.finditer(r"fantapunt\w*|fantamedi\w*|fantacalcio|fantacredit\w*|fantavot\w*", blocco, re.I):
        avv("testi.json cita «%s»: ammesso solo per vittorie decise da pochissimi fantapunti, Cucchiaio di legno, statistiche" % m.group(0))
    for s in tutto:
        for m in re.finditer(r"(?<![A-Z][a-z]\.\s)(?<=[.!?]\s)[a-zàèéìòù]", s):
            avv("testi.json: frase che inizia con la minuscola, vicino a «%s»" % s[max(0, m.start() - 25):m.start() + 20].replace("\n", " ")); break

# 5. PDF: 4 pagine e piede corretto
pdf = R / "riepiloghi" / ("settimana-%s.pdf" % NN)
if pdf.exists():
    tx = testo_pdf(pdf)
    if tx is None: avv("pdftotext non disponibile: PDF non controllato")
    else:
        pagine = tx.count("\f")
        (ok if pagine == 4 else err)("PDF di %d pagine (devono essere 4)" % pagine)
        if "Spogliatoio" in tx: err("Il PDF contiene «Spogliatoio» (piè di pagina vecchio)")
        for p in range(1, 5):
            if "Pag. %d di 4" % p not in tx: err("Piè di pagina «Pag. %d di 4» mancante nel PDF" % p)
        if "O Giornale del Girrr · O Fant A Girrr" not in tx: err("Piè di pagina «O Giornale del Girrr · O Fant A Girrr» mancante nel PDF")

print("CONTROLLO GIORNATA %d" % n)
for tag, L in (("OK    ", OK), ("AVVISO", AVV), ("ERRORE", ERR)):
    for m in L: print("%s %s" % (tag, m))
print("\nRisultato: %d ok, %d avvisi, %d errori" % (len(OK), len(AVV), len(ERR)))
sys.exit(1 if ERR else 0)
