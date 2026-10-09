#!/usr/bin/env python3
"""Archivio del Giornale: crea le copertine (pagina 1 di ogni PDF) e riepiloghi/indice.json per il sito.

Uso: python3 -I scripts/archivio_giornale.py   (dalla radice del repository)
Per ogni riepiloghi/settimana-NN.pdf usa la scheda settimana-NN.json (scritta da pdf_giornale.py) se c'è.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RIE = ROOT / "riepiloghi"


def main():
    cop = RIE / "copertine"
    cop.mkdir(parents=True, exist_ok=True)
    voci = []
    for pdf in sorted(RIE.glob("settimana-*.pdf")):
        m = re.match(r"settimana-(\d+)\.pdf$", pdf.name)
        if not m:
            continue
        n = int(m.group(1))
        png = cop / f"settimana-{n:02d}.png"
        base = cop / f"settimana-{n:02d}"
        if not png.exists() or png.stat().st_mtime < pdf.stat().st_mtime:
            subprocess.run(["pdftoppm", "-r", "80", "-f", "1", "-l", "1", "-png", "-singlefile", str(pdf), str(base)], check=True,
                           stderr=subprocess.DEVNULL)
        scheda = {}
        sj = pdf.with_suffix(".json")
        if sj.exists():
            scheda = json.loads(sj.read_text(encoding="utf-8"))
        voci.append({"n": n, "pdf": f"riepiloghi/{pdf.name}", "copertina": f"riepiloghi/copertine/{png.name}",
                     "data": scheda.get("data", ""), "iso": scheda.get("iso", ""), "occhiello": scheda.get("occhiello", ""),
                     "titolone": scheda.get("titolone", ""), "sommario": scheda.get("sommario", "")})
    voci.sort(key=lambda v: -v["n"])
    (RIE / "indice.json").write_text(json.dumps(voci, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(voci)} numeri in archivio")


if __name__ == "__main__":
    main()
