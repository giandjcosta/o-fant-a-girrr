#!/usr/bin/env python3
"""Crea il PDF settimanale da postare nel gruppo.

Uso:  python3 scripts/pdf_settimana.py [testi.json] [uscita.pdf]

I numeri (risultati, premi, prossime partite, infortunati) arrivano da data.json.
I commenti e le battute arrivano da testi.json (li scrive Claude ogni settimana);
se un testo manca, quella riga semplicemente non compare.
"""
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))


def esc(x):
    return html.escape(str(x))


def cap(s):
    s = str(s)
    return s[:1].upper() + s[1:]


def pt(x):
    return f"{x:g}".replace(".", ",")


def giocata(g):
    return any(m[-1] != "-" for m in g["m"])


def premi(partite):
    righe = []
    for casa, pc, pf, fuori, _ in partite:
        righe.append((casa, pc, fuori, pf))
        righe.append((fuori, pf, casa, pc))
    vinte = [x for x in righe if x[1] > x[3]]
    perse = [x for x in righe if x[1] < x[3]]
    out = []
    m = max(righe, key=lambda x: x[1])
    out.append(("miglior", "🏆", "Miglior formazione", cap(m[0]), f"{pt(m[1])} punti"))
    p = min(righe, key=lambda x: x[1])
    out.append(("legno", "🥄", "Cucchiaio di legno", cap(p[0]), f"{pt(p[1])} punti"))
    if vinte:
        a = max(vinte, key=lambda x: x[1] - x[3])
        out.append(("larga", "💥", "Vittoria più larga", cap(a[0]), f"su {cap(a[2])} ({pt(a[1])} - {pt(a[3])})"))
        b = min(vinte, key=lambda x: x[1] - x[3])
        out.append(("sofferta", "😅", "Vittoria più sofferta", cap(b[0]), f"su {cap(b[2])} ({pt(b[1])} - {pt(b[3])})"))
        c = min(vinte, key=lambda x: x[1])
        out.append(("fortunato", "🍀", "Il più fortunato", cap(c[0]), f"ha vinto con soli {pt(c[1])} punti"))
    if perse:
        s = max(perse, key=lambda x: x[1])
        out.append(("sfortunato", "🌧️", "Il più sfortunato", cap(s[0]), f"ha perso con {pt(s[1])} punti"))
    return out


CSS = """
@page { size: A4; margin: 0 }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;color:#10231a;background:#f4f7f2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:0 0 12mm;position:relative;overflow:hidden;page-break-after:always;background:#f4f7f2}
.pg:last-child{page-break-after:auto}
.top{background:linear-gradient(135deg,#0b3d2a 0%,#0f5a3b 60%,#14733f 100%);color:#fff;padding:10mm 14mm 7mm;position:relative}
.top:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.045) 0 22mm,transparent 22mm 44mm)}
.top:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2.2mm;background:#ff7a1a}
.top>*{position:relative}
.kick{font-size:8.5pt;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#bff0a0}
h1{font-size:30pt;font-weight:900;letter-spacing:-.02em;line-height:1;margin-top:2.5mm}
h1 span{color:#ff9d4d}
.sub{font-size:10.5pt;margin-top:2.5mm;color:#d6efdf}
.in{padding:0 14mm}
.lead{margin-top:4.5mm;font-size:10pt;line-height:1.5;color:#1d3a2c;font-weight:500}
h2{font-size:12pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b3d2a;margin:4.5mm 0 2mm;display:flex;align-items:center;gap:2.5mm}
h2:before{content:"";width:3mm;height:3mm;border-radius:1mm;background:#ff7a1a;display:inline-block}
.m{background:#fff;border-radius:3mm;padding:2.2mm 4mm;margin-bottom:1.8mm;box-shadow:0 .4mm 1.2mm rgba(11,61,42,.12)}
.row{display:grid;grid-template-columns:1fr 24mm 1fr;align-items:center;gap:2mm}
.t{font-weight:700;font-size:10.5pt}
.t.r{text-align:right}
.t.w{color:#0b6b3a}
.t.l{color:#6b7c72;font-weight:600}
.sc{text-align:center;background:#0b3d2a;color:#fff;border-radius:2.2mm;padding:1.4mm 0;font-weight:900;font-size:14pt;letter-spacing:.02em}
.fp{display:grid;grid-template-columns:1fr 24mm 1fr;margin-top:.8mm;font-size:8pt;color:#6b7c72;font-weight:600}
.fp b{font-weight:600;text-align:center}
.fp i{font-style:normal}
.fp i:last-child{text-align:left}
.fp i:first-child{text-align:right}
.cm{margin-top:1.2mm;font-size:8.3pt;color:#33473b;line-height:1.35;border-top:.3mm dashed #cfdad2;padding-top:1.2mm}
.pr{display:grid;grid-template-columns:1fr 1fr;gap:1.8mm}
.pc{background:#fff;border-radius:3mm;padding:2mm 4mm;box-shadow:0 .4mm 1.2mm rgba(11,61,42,.12);display:flex;gap:3mm;align-items:center}
.pc .e{font-size:19pt}
.pc .k{font-size:7.6pt;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#ff7a1a}
.pc .n{font-weight:800;font-size:10.5pt;color:#0b3d2a}
.pc .d{font-size:8.5pt;color:#4a5f53}
.bat{margin-top:2mm;font-size:8.6pt;color:#33473b;line-height:1.45}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.gm{background:#fff;border-radius:2.6mm;padding:2.1mm 3.4mm;margin-bottom:1.8mm;font-size:9.4pt;font-weight:600;display:flex;justify-content:space-between;gap:2mm;box-shadow:0 .4mm 1.2mm rgba(11,61,42,.1)}
.gm em{font-style:normal;color:#ff7a1a;font-weight:800}
.gr{font-size:7.8pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#14733f;margin:2.4mm 0 1.4mm}
.rest{font-size:8.6pt;color:#6b7c72;margin:.5mm 0 0 1mm}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:3mm;overflow:hidden;box-shadow:0 .4mm 1.2mm rgba(11,61,42,.12);font-size:8.6pt}
th{background:#0b3d2a;color:#fff;text-align:left;padding:1.8mm 2.6mm;font-size:7.6pt;letter-spacing:.08em;text-transform:uppercase}
td{padding:1.5mm 2.6mm;border-top:.25mm solid #e5ece7}
.st{font-weight:800;font-size:7.8pt;padding:.7mm 2mm;border-radius:2mm;display:inline-block}
.st.s{background:#fde3d3;color:#b0420a}
.st.d{background:#fff0c9;color:#8a6200}
.foot{position:absolute;left:14mm;right:14mm;bottom:6mm;font-size:8pt;color:#6b7c72;display:flex;justify-content:space-between;border-top:.3mm solid #d7e1da;padding-top:2mm}
.end{margin-top:6mm;background:#0b3d2a;color:#fff;border-radius:3mm;padding:4mm 5mm;font-size:10pt;line-height:1.5;font-weight:500}
.end b{color:#ff9d4d}
"""


def costruisci(testi):
    cal = D["cal"]
    gioc = [x for x in cal["lega"] if giocata(x)]
    ult = gioc[-1] if gioc else None
    pross = next((x for x in cal["lega"] if not giocata(x)), None)
    coppa = next((x for x in cal["cup"] if not giocata(x)), None)
    n = ult["n"] if ult else 0
    mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    try:
        a, mm, gg = D.get("updated", "").split("-")
        quando = f"{int(gg)} {mesi[int(mm) - 1]} {a}"
    except Exception:  # noqa: BLE001
        quando = D.get("updated", "")
    h = [f"<style>{CSS}</style>"]

    # --- pagina 1
    h.append('<section class="pg"><div class="top"><div class="kick">Il riepilogo della settimana</div>'
             f'<h1>O Fant <span>a Girrr</span></h1><div class="sub">{esc(testi.get("titolo") or "")}'
             f'{" · " if testi.get("titolo") else ""}Giornata {n} di campionato · Dati al {esc(quando)}</div></div><div class="in">')
    if testi.get("apertura"):
        h.append(f'<p class="lead">{esc(testi["apertura"])}</p>')
    if ult:
        h.append(f'<h2>Com\'è andata · {n}ª giornata</h2>')
        com = testi.get("commenti") or []
        for k, (casa, pc, pf, fuori, ris) in enumerate(ult["m"]):
            gc, gf = ris.split("-")
            wc, wf = pc > pf, pf > pc
            h.append('<div class="m"><div class="row">'
                     f'<div class="t r {"w" if wc else "l"}">{esc(cap(casa))}</div>'
                     f'<div class="sc">{esc(gc)} - {esc(gf)}</div>'
                     f'<div class="t {"w" if wf else "l"}">{esc(cap(fuori))}</div></div>'
                     f'<div class="fp"><i>{pt(pc)}</i><b>fantapunti</b><i>{pt(pf)}</i></div>')
            if k < len(com) and com[k]:
                h.append(f'<div class="cm">{esc(com[k])}</div>')
            h.append("</div>")
        h.append('<h2>I premi della giornata</h2><div class="pr">')
        for ch, ico, tit, chi, dett in premi([m for m in ult["m"]]):
            h.append(f'<div class="pc"><div class="e">{ico}</div><div><div class="k">{esc(tit)}</div>'
                     f'<div class="n">{esc(chi)}</div><div class="d">{esc(dett)}</div></div></div>')
        h.append("</div>")
        pb = testi.get("premi")
        if pb:
            h.append(f'<p class="bat">{esc(pb)}</p>')
    h.append("</div>" f'<div class="foot"><span>O Fant A Girrr · Lo Spogliatoio</span><span>1 / 2</span></div></section>')

    # --- pagina 2
    h.append('<section class="pg"><div class="top" style="padding-bottom:7mm"><div class="kick">Cosa ci aspetta</div>'
             f'<h1 style="font-size:22pt">Prossima <span>giornata</span></h1></div><div class="in"><div class="cols">')
    h.append('<div><h2>Campionato</h2>')
    if pross:
        h.append(f'<div class="gr">{pross["n"]}ª giornata · Serie A G{pross["sa"]}</div>')
        for casa, _, _, fuori, _ in pross["m"]:
            h.append(f'<div class="gm"><span>{esc(cap(casa))}</span><em>vs</em><span>{esc(cap(fuori))}</span></div>')
    if testi.get("prossima"):
        h.append(f'<p class="bat">{esc(testi["prossima"])}</p>')
    h.append("</div><div><h2>Champions Cup</h2>")
    if coppa:
        h.append(f'<div class="gr">{coppa["n"]}ª giornata · Serie A G{coppa["sa"]}</div>')
        for g in ("A", "B"):
            h.append(f'<div class="gr" style="color:#ff7a1a">Girone {g}</div>')
            for gir, casa, _, _, fuori, _ in coppa["m"]:
                if gir == g:
                    h.append(f'<div class="gm"><span>{esc(cap(casa))}</span><em>vs</em><span>{esc(cap(fuori))}</span></div>')
            for gir, sq in coppa.get("rest", []):
                if gir == g:
                    h.append(f'<div class="rest">Riposa: {esc(cap(sq))}</div>')
    if testi.get("coppa"):
        h.append(f'<p class="bat">{esc(testi["coppa"])}</p>')
    h.append("</div></div>")

    in_rosa = {p["id"] for t in D["teams"] for p in t["pl"]}
    inf = [e for e in D.get("inj", []) if e.get("id") in in_rosa]
    inf.sort(key=lambda e: {"sì": 0, "in dubbio": 1}.get(e.get("k"), 2))
    h.append("<h2>Infermeria</h2>")
    if inf:
        h.append("<table><tr><th>Giocatore</th><th>Squadra</th><th>Problema</th><th>Rientro</th><th>Giornata</th></tr>")
        for e in inf[:14]:
            salta = e.get("k") == "sì"
            h.append(f'<tr><td><b>{esc(e["n"])}</b></td><td>{esc(e["t"])}</td><td>{esc(e["w"])}</td><td>{esc(e["b"])}</td>'
                     f'<td><span class="st {"s" if salta else "d"}">{"Salta" if salta else "In dubbio"}</span></td></tr>')
        h.append("</table>")
    if testi.get("infortunati"):
        h.append(f'<p class="bat">{esc(testi["infortunati"])}</p>')
    if testi.get("chiusura"):
        h.append(f'<div class="end">{esc(testi["chiusura"])}</div>')
    h.append("</div>" '<div class="foot"><span>Notizie pubbliche: non indicano di chi sono i giocatori</span><span>2 / 2</span></div></section>')
    return "<!doctype html><html lang='it'><head><meta charset='utf-8'><title>Riepilogo O Fant A Girrr</title></head><body>" + "".join(h) + "</body></html>", n


def main():
    testi = {}
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        testi = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    pagina, n = costruisci(testi)
    uscita = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "riepiloghi" / f"settimana-{n:02d}.pdf"
    uscita.parent.mkdir(parents=True, exist_ok=True)
    tmp = uscita.with_suffix(".html")
    tmp.write_text(pagina, encoding="utf-8")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(tmp.resolve().as_uri())
        pg.pdf(path=str(uscita), width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
        b.close()
    tmp.unlink()
    print(uscita)


if __name__ == "__main__":
    main()
