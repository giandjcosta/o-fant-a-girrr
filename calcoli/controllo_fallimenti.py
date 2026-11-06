#!/usr/bin/env python3
"""Controllo leggero dei fallimenti silenziosi.

Gira dentro le GitHub Actions (workflow "Controllo fallimenti"). Cerca:
 1. workflow del repo falliti o andati in timeout nelle ultime 26 ore;
 2. dati fermi: l'Action "Aggiorna statistiche e voti" non gira da piu' di 2 giorni, oppure una giornata di Serie A e' finita
    da piu' di 2 giorni ma non e' stata ancora importata da Leghe (e' il segno che la schedule del PC/di Claude non e' partita,
    per esempio per "limite di utilizzo raggiunto", cosa che le Actions non possono vedere direttamente).
Se trova qualcosa apre (o aggiorna) una Issue "Controllo fallimenti" nel repo: GitHub la notifica a chi segue il repo (mail e app).
Se non trova nulla chiude la Issue aperta. Esce con codice 1 se c'e' un problema, cosi' compare anche come workflow fallito.
Uso: python3 calcoli/controllo_fallimenti.py   (servono GITHUB_TOKEN e GITHUB_REPOSITORY)"""
import json, os, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

REPO = os.environ["GITHUB_REPOSITORY"]
TOK = os.environ["GITHUB_TOKEN"]
TITOLO = "Controllo fallimenti"
ORA = datetime.now(timezone.utc)


def api(path, metodo="GET", corpo=None):
    r = urllib.request.Request("https://api.github.com/repos/%s/%s" % (REPO, path), method=metodo,
                               data=json.dumps(corpo).encode() if corpo is not None else None,
                               headers={"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json", "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=30) as f:
        t = f.read()
    return json.loads(t) if t else {}


def dt(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


problemi = []
# 1) workflow falliti nelle ultime 26 ore
da = (ORA - timedelta(hours=26)).strftime("%Y-%m-%dT%H:%M:%SZ")
runs = api("actions/runs?per_page=100&created=>=" + da)["workflow_runs"]
for r in runs:
    if r["name"] != TITOLO and r["conclusion"] in ("failure", "timed_out", "startup_failure"):
        problemi.append("Workflow fallito: %s (%s) %s" % (r["name"], r["conclusion"], r["html_url"]))
# 2a) l'Action dei voti deve aver girato con successo negli ultimi 2 giorni
ok = [r for r in api("actions/runs?per_page=100&status=success")["workflow_runs"] if "statistiche e voti" in r["name"].lower() and "prima prova" not in r["name"].lower()]
if not ok or ORA - dt(ok[0]["created_at"]) > timedelta(days=2):
    problemi.append("L'Action \"Aggiorna statistiche e voti\" non gira con successo da piu' di 2 giorni.")
# 2b) giornata finita da piu' di 2 giorni e non importata
try:
    raw = urllib.request.urlopen("https://raw.githubusercontent.com/%s/gh-pages/data.json" % REPO, timeout=30).read()
    D = json.loads(raw)
    imp = {str(g["sa"]) for g in D["cal"]["lega"] if any(m[-1] != "-" for m in g["m"])}
    for sa, partite in (D.get("fx") or {}).items():
        if str(sa) in imp or not partite:
            continue
        ultima = None
        for p in partite:
            m = re.search(r"(\d{1,2})/(\d{1,2})", p[2])
            if m:
                d = datetime(ORA.year, int(m.group(2)), int(m.group(1)), tzinfo=timezone.utc)
                ultima = d if ultima is None or d > ultima else ultima
        if ultima and ORA - ultima > timedelta(days=2) and ORA > ultima:
            problemi.append("Giornata di Serie A %s finita da piu' di 2 giorni ma non importata da Leghe (la schedule dei risultati non e' partita?)." % sa)
except Exception as e:
    problemi.append("data.json non leggibile: %s" % e)

aperta = [i for i in api("issues?state=open&per_page=50") if i["title"] == TITOLO and "pull_request" not in i]
testo = "\n".join("- " + p for p in problemi)
sommario = os.environ.get("GITHUB_STEP_SUMMARY")
if sommario:
    open(sommario, "a").write("## Controllo fallimenti\n" + (testo or "Tutto regolare.") + "\n")
if problemi:
    corpo = "Controllo del %s UTC:\n\n%s\n" % (ORA.strftime("%d/%m %H:%M"), testo)
    if aperta:
        api("issues/%d/comments" % aperta[0]["number"], "POST", {"body": corpo})
    else:
        api("issues", "POST", {"title": TITOLO, "body": corpo})
    print(testo)
    sys.exit(1)
for i in aperta:
    api("issues/%d" % i["number"], "PATCH", {"state": "closed"})
print("Tutto regolare.")
