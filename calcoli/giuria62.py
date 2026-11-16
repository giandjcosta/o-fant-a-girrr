#!/usr/bin/env python3
"""Prepara la giuria «Quale sfida seguire» da un dossier editoriale verificato.

Senza --vai NON usa la rete. Con --vai richiede una copia di sito versione >=6.2
e credenziali solo del servizio; mai avviare automaticamente in produzione.
"""
import argparse
import json
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve()
ROOT = SOURCE.parents[3] if SOURCE.parent.name == 'server' else SOURCE.parents[1]


def valida(dossier, sito):
    if not isinstance(dossier, dict) or not isinstance(dossier.get("giornate"), dict):
        raise ValueError("Formato dossier giuria non valido")
    stagione = dossier.get("stagione")
    if not isinstance(stagione, str) or len(stagione) != 7 or stagione[4] != "/":
        raise ValueError("Stagione non valida")
    raw = json.loads((sito / "data.json").read_text(encoding="utf-8"))
    giorni = {g["n"]: g for g in raw["cal"]["lega"]}
    risultati = []
    for key, voti in sorted(dossier["giornate"].items(), key=lambda x: int(x[0])):
        numero = int(key)
        if numero not in giorni:
            raise ValueError(f"Giornata {numero} assente dal calendario")
        scelte = {m[0] + " – " + m[3] for m in giorni[numero]["m"]}
        if not isinstance(voti, list) or not 2 <= len(voti) <= 110:
            raise ValueError(f"Giuria assente o incompleta per {numero}")
        autori = set()
        tipi = set()
        for v in voti:
            if not isinstance(v, dict):
                raise ValueError(f"Voto non valido alla {numero}")
            tipo, autore, scelta, motivo = [v.get(k) for k in ("tipo", "autore", "scelta", "motivo")]
            if tipo not in ("redazione", "personaggio"):
                raise ValueError(f"Tipo giuria non valido alla {numero}")
            if not isinstance(autore, str) or not 2 <= len(autore.strip()) <= 100:
                raise ValueError("Autore non valido")
            if scelta not in scelte:
                raise ValueError(f"Partita {scelta!r} non presente alla {numero}")
            if not isinstance(motivo, str) or not 10 <= len(motivo.strip()) <= 600:
                raise ValueError("Motivazione editoriale non valida")
            if (tipo, autore) in autori:
                raise ValueError(f"Doppio voto {autore}")
            autori.add((tipo, autore))
            tipi.add(tipo)
        if tipi != {"redazione", "personaggio"}:
            raise ValueError(f"Servono entrambe le giurie alla {numero}")
        risultati.append((numero, voti))
    return stagione, risultati


def principale():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("sito", type=Path, help="Copia verificata di gh-pages")
    p.add_argument("dossier", type=Path, help="JSON della redazione, senza voti inventati")
    p.add_argument("--vai", action="store_true", help="Scrivi RPC solo se già autorizzato")
    a = p.parse_args()
    versione = json.loads((a.sito / "versioni.json").read_text(encoding="utf-8"))["versioni"][0]["v"]
    archivio = json.loads(a.dossier.read_text(encoding="utf-8"))
    stagione, righe = valida(archivio, a.sito)
    if not a.vai:
        print(json.dumps({"prova": True, "stagione": stagione, "giornate": [
            {"giornata": n, "redazione": sum(v["tipo"] == "redazione" for v in voti),
             "personaggi": sum(v["tipo"] == "personaggio" for v in voti)}
            for n, voti in righe]}, ensure_ascii=False, indent=2))
        return
    if tuple(int(x) for x in versione.split(".")[:2]) < (6, 2):
        raise SystemExit("Solo dalla versione ufficiale 6.2: nessuna scrittura")
    sys.path.insert(0, str(ROOT / "calcoli" / "tifosi"))
    from sincronizza import server_auth, call
    url, headers = server_auth()
    for n, voti in righe:
        call(url, headers, "v62_giuria_sfide_prepara",
             {"p_stagione": stagione, "p_giornata": n, "p_voti": voti})
    print(f"Giurie registrate: {len(righe)} giornate, nessun file del sito modificato")


if __name__ == "__main__":
    principale()
