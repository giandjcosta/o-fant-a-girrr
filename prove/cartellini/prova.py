#!/usr/bin/env python3
"""Prova (Claude, 15 novembre 2026): esegue scripts/aggiorna_dati.py con la lettura dei cartellini su una COPIA di data.json
presa dal sito, e controlla che nelle giornate già salvate cambino solo i cartellini aggiunti. Non scrive nel sito."""
import json, pathlib, shutil, subprocess, sys, tempfile, urllib.request, collections
QUI = pathlib.Path(__file__).resolve().parent
tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / "scripts").mkdir()
shutil.copy(QUI / "aggiorna_dati.py", tmp / "scripts" / "aggiorna_dati.py")
if (QUI / "ind_storico.json").exists():
    shutil.copy(QUI / "ind_storico.json", tmp / "scripts" / "ind_storico.json")
dati = urllib.request.urlopen("https://giandjcosta.github.io/o-fant-a-girrr/data.json", timeout=60).read()
(tmp / "data.json").write_bytes(dati)
prima = json.loads(dati)
subprocess.run([sys.executable, str(tmp / "scripts" / "aggiorna_dati.py")], check=True, cwd=tmp)
dopo = json.loads((tmp / "data.json").read_text(encoding="utf-8"))
conta, problemi, nuove = collections.Counter(), [], 0
for i, gs in prima.get("votes", {}).items():
    for g, x in gs.items():
        y = dopo["votes"][i][g]
        if (y["v"], y["f"]) != (x["v"], x["f"]):
            problemi.append((i, g, "voto cambiato"))
        agg = [b for b in y["b"] if b not in x["b"]]
        if y["b"][:len(x["b"])] != x["b"] or any(b not in ("ammonizione", "espulsione") for b in agg):
            problemi.append((i, g, x["b"], y["b"]))
        for b in agg:
            conta[(int(g), b)] += 1
for i, gs in dopo["votes"].items():
    for g in gs:
        if g not in prima.get("votes", {}).get(i, {}):
            nuove += 1
print("cartellini aggiunti alle giornate già salvate (giornata di Serie A, tipo, giocatori seguiti):")
for k in sorted(conta):
    print("  ", k, conta[k])
print("voti nuovi (giornate non ancora salvate):", nuove)
print("problemi:", len(problemi), problemi[:10])
esempio = [(prima["P"].get(i, {}).get("n"), g, y["b"]) for i, gs in dopo["votes"].items() for g, y in gs.items() if "espulsione" in y["b"]][:5]
print("esempi di espulsi:", esempio)
sys.path.insert(0, str(QUI.parents[1] / "calcoli"))
try:
    import moviola
    print("Moviola, valore stimato delle voci PRIMA:", moviola.valori_voci(prima["votes"]))
    print("Moviola, valore stimato delle voci DOPO :", moviola.valori_voci(dopo["votes"]))
except Exception as e:
    print("Moviola non provata:", e)
sys.exit(1 if problemi else 0)
