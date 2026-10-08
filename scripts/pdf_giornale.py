#!/usr/bin/env python3
"""PDF settimanale in stile giornale sportivo ("Il Giornale del Girrr").

Uso:  python3 scripts/pdf_giornale.py [testi.json] [uscita.pdf]

Usa gli stessi dati e le stesse chiavi di testi.json di pdf_settimana.py, piu':
  occhiello, titolone, sommario, numero {valore, testo}, personaggio
Se una chiave manca, quella parte semplicemente non compare.
"""
import html
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_settimana import D, cap, classifica, esc, giocata, premi, pt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
RUOLO = {"P": "Portiere", "D": "Difensore", "C": "Centrocampista", "A": "Attaccante"}

CSS = """
@page { size: A4; margin: 0 }
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#f3eee1;--ink:#16130e;--red:#c8102e;--mute:#6a6254;--rule:#16130e}
body{font-family:'Bitstream Charter','TeX Gyre Pagella','DejaVu Serif',serif;color:var(--ink);background:var(--paper);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:9mm 11mm 10mm;position:relative;overflow:hidden;page-break-after:always;background:var(--paper)}
.pg:last-child{page-break-after:auto}
.pg:before{content:"";position:absolute;inset:0;background:radial-gradient(rgba(0,0,0,.035) .35mm,transparent .4mm) 0 0/1.6mm 1.6mm;pointer-events:none}
.hn{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase}
.bar{display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:7.4pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-bottom:.3mm solid var(--rule);padding-bottom:1.4mm}
.mast{text-align:center;padding:2.2mm 0 1.2mm;border-bottom:1.1mm solid var(--rule);position:relative}
.mast h1{font-family:'GFS Baskerville','DejaVu Serif',serif;font-weight:700;font-size:45pt;letter-spacing:-.01em;line-height:1}
.mast h1 span{color:var(--red)}
.tag{background:var(--red);color:#fff;text-align:center;font-family:'Inter',sans-serif;font-size:7.8pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;padding:1.3mm 0;margin-top:1.4mm}
.mini{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase;font-size:8pt;letter-spacing:.14em;color:var(--red)}
.occ{margin-top:4.5mm}
.tit{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase;font-size:40pt;line-height:.93;letter-spacing:-.005em;margin-top:1mm}
.tit em{font-style:normal;color:var(--red)}
.som{font-style:italic;font-size:11.4pt;line-height:1.35;margin-top:2.4mm;color:#2c261d;border-top:.3mm solid var(--rule);padding-top:2mm}
.g2{display:grid;grid-template-columns:1fr 56mm;gap:6mm;margin-top:3.5mm}
.txt{font-size:9.6pt;line-height:1.42;text-align:justify;hyphens:auto}
.txt:first-letter{float:left;font-family:'GFS Baskerville',serif;font-weight:700;font-size:34pt;line-height:.82;padding:.6mm 1.4mm 0 0;color:var(--red)}
.box{border-top:1.1mm solid var(--rule);border-bottom:.3mm solid var(--rule);padding:1.6mm 0 1.8mm;margin-bottom:3.4mm}
.box h3{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase;font-size:11.5pt;letter-spacing:.04em;margin-bottom:1.4mm}
.box h3 b{color:var(--red)}
.tab{border-top:1.1mm solid var(--rule);margin-top:4.2mm}
.tab h2{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase;font-size:17pt;letter-spacing:.01em;margin:1.6mm 0 1.4mm}
.tab h2 b{color:var(--red)}
.mt{display:grid;grid-template-columns:1fr 17mm 1fr;align-items:baseline;gap:1.5mm;padding:1.1mm 0 .2mm;border-top:.2mm solid #b9b09b}
.mt:first-of-type{border-top:0}
.mt .a{font-weight:700;font-size:10.4pt}
.mt .a.r{text-align:right}
.mt .a.l{color:var(--mute);font-weight:400}
.mt .s{text-align:center;font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;font-size:15pt;background:var(--ink);color:var(--paper);padding:0 0 .4mm;letter-spacing:.04em}
.mp{display:grid;grid-template-columns:1fr 17mm 1fr;font-size:7.4pt;color:var(--mute);font-family:'Inter',sans-serif}
.mp i{font-style:normal}.mp i:first-child{text-align:right}.mp i:last-child{text-align:left}
.cmm{font-style:italic;font-size:8.7pt;line-height:1.3;color:#3a3326;margin:.6mm 0 1.2mm;padding-left:1mm;border-left:.7mm solid var(--red)}
.pal{list-style:none;font-size:8.6pt;line-height:1.28}
.pal li{padding:1mm 0;border-top:.2mm solid #b9b09b}
.pal li:first-child{border-top:0}
.pal b{display:block;font-family:'TeX Gyre Heros Cn','Inter',sans-serif;text-transform:uppercase;font-size:7.8pt;letter-spacing:.1em;color:var(--red)}
.pal span{font-weight:700;font-size:9.4pt}
.big{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;font-size:62pt;line-height:.9;color:var(--red);text-align:center;margin:1mm 0 1mm}
.bt{font-size:8.6pt;line-height:1.35;text-align:center}
.fig{margin:0 0 3.4mm}
.fig svg{width:100%;display:block;border:.3mm solid var(--rule)}
.fig p{font-size:7.2pt;color:var(--mute);margin-top:.8mm;font-style:italic}
table{width:100%;border-collapse:collapse;font-size:8.8pt}
th{font-family:'Inter',sans-serif;font-size:6.8pt;letter-spacing:.1em;text-transform:uppercase;text-align:center;padding:1mm .8mm;border-bottom:.5mm solid var(--rule);color:var(--red);font-weight:800}
td{padding:.95mm .8mm;border-bottom:.2mm solid #b9b09b;text-align:center}
td:nth-child(2),th:nth-child(2){text-align:left}
td.p{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;font-size:11pt}
td.pos{font-weight:700;color:var(--mute)}
tr.pod td:nth-child(2){font-weight:700}
tr.pod td.pos{color:var(--red)}
.tp{font-size:8.5pt;line-height:1.28;margin:.5mm 0}
.tp b{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;text-transform:uppercase;letter-spacing:.03em}
.tp i{color:var(--mute)}
.gm{display:flex;justify-content:space-between;gap:2mm;font-size:9.6pt;font-weight:700;padding:1.1mm 0;border-bottom:.2mm solid #b9b09b}
.gm em{font-style:normal;font-family:'Inter',sans-serif;font-size:7.4pt;color:var(--red);font-weight:800;align-self:center}
.gr{font-family:'TeX Gyre Heros Cn','Inter',sans-serif;font-weight:700;text-transform:uppercase;font-size:9pt;letter-spacing:.12em;color:var(--red);margin:1.8mm 0 .6mm}
.nt{font-size:7.6pt;color:var(--mute);margin-top:1.2mm;line-height:1.35;font-style:italic}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.st{font-family:'Inter',sans-serif;font-weight:800;font-size:6.8pt;letter-spacing:.06em;text-transform:uppercase;padding:.4mm 1.4mm;border:.3mm solid var(--rule)}
.st.s{background:var(--red);color:#fff;border-color:var(--red)}
.taglio{border:.5mm solid var(--rule);border-left:2.2mm solid var(--red);padding:3.2mm 4mm;margin-top:5mm;font-style:italic;font-size:10.8pt;line-height:1.4}
.taglio b{font-style:normal;font-family:'TeX Gyre Heros Cn','Inter',sans-serif;text-transform:uppercase;font-size:8.2pt;letter-spacing:.14em;color:var(--red);display:block;margin-bottom:.8mm}
.foot{position:absolute;left:11mm;right:11mm;bottom:5mm;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:7pt;color:var(--mute);border-top:.3mm solid var(--rule);padding-top:1.4mm}
.fin{font-size:9pt;line-height:1.4;margin-top:3mm}
"""

PITCH = """<svg viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="62" fill="#2f6b3a"/>
<g fill="none" stroke="#e9f2e5" stroke-width=".7"><rect x="4" y="4" width="92" height="54"/><line x1="50" y1="4" x2="50" y2="58"/><circle cx="50" cy="31" r="8"/>
<rect x="4" y="19" width="13" height="24"/><rect x="83" y="19" width="13" height="24"/><rect x="4" y="25" width="5" height="12"/><rect x="91" y="25" width="5" height="12"/></g>
<g fill="#c8102e"><circle cx="24" cy="31" r="2.1"/><circle cx="35" cy="18" r="2.1"/><circle cx="35" cy="44" r="2.1"/><circle cx="52" cy="25" r="2.1"/><circle cx="52" cy="38" r="2.1"/><circle cx="66" cy="31" r="2.1"/></g>
<g fill="#f3eee1"><circle cx="76" cy="22" r="2.1"/><circle cx="76" cy="40" r="2.1"/><circle cx="86" cy="31" r="2.1"/></g>
<path d="M66 31 C72 28 78 30 88 31" stroke="#ffd166" stroke-width=".9" fill="none" stroke-dasharray="1.8 1.4"/><circle cx="88.6" cy="31" r="1.5" fill="#fff" stroke="#111" stroke-width=".4"/></svg>"""


def migliori(n=4):
    voti = D.get("votes", {})
    in_rosa = {str(p["id"]) for t in D["teams"] for p in t["pl"]}
    giornate = sorted({int(g) for s in voti.values() for g in s})
    if not giornate:
        return None, [], []
    g = str(giornate[-1])
    righe = []
    for i in in_rosa:
        x = voti.get(i, {}).get(g)
        pl = D["P"].get(i)
        if x and x.get("f") is not None and pl:
            righe.append((x["f"], pl["n"], pl["t"], pl["r"], x.get("v"), [b for b in x.get("b", []) if b not in ("subentrato", "senza voto")]))
    righe.sort(key=lambda r: (-r[0], r[1]))
    return int(g), righe[:n], list(reversed(righe[-3:])) if len(righe) > 8 else []


def tab_cl(righe, completa=True):
    h = ["<table><tr><th>#</th><th>Squadra</th><th>G</th>"]
    if completa:
        h.append("<th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th>")
    h.append("<th>Pt</th>" + ("<th>Fantapunti</th>" if completa else "") + "</tr>")
    for k, r in enumerate(righe, 1):
        h.append(f'<tr class="{"pod" if k <= 3 and completa else ""}"><td class="pos">{k}</td><td>{esc(cap(r["n"]))}</td><td>{r["g"]}</td>')
        if completa:
            h.append(f'<td>{r["v"]}</td><td>{r["x"]}</td><td>{r["p"]}</td><td>{r["gf"]}</td><td>{r["gs"]}</td>')
        h.append(f'<td class="p">{r["pt"]}</td>' + (f'<td>{pt(r["fp"])}</td>' if completa else "") + "</tr>")
    h.append("</table>")
    return "".join(h)


def costruisci(t):
    cal = D["cal"]
    gioc = [x for x in cal["lega"] if giocata(x)]
    ult = gioc[-1] if gioc else None
    pross = next((x for x in cal["lega"] if not giocata(x)), None)
    coppa = next((x for x in cal["cup"] if not giocata(x)), None)
    n = ult["n"] if ult else 0
    ora = datetime.now(ZoneInfo("Europe/Rome"))
    data = f"{GIORNI[ora.weekday()]} {ora.day} {MESI[ora.month - 1]} {ora.year}"

    def testata(num):
        return (f'<div class="bar"><span>{esc(data)}</span><span>N° {n}</span><span>Prezzo: 1 fantagol</span></div>'
                if num == 1 else
                f'<div class="bar"><span>Il Giornale del Girrr</span><span>{esc(data)}</span><span>N° {n}</span></div>')

    def piede(p):
        return f'<div class="foot"><span>Il Giornale del Girrr · O Fant A Girrr · Lo Spogliatoio</span><span>Pag. {p} di 3</span></div>'

    h = [f"<style>{CSS}</style>"]
    # ---------- prima pagina
    h.append(f'<section class="pg">{testata(1)}<div class="mast"><h1>Il Giornale del <span>Girrr</span></h1></div>'
             '<div class="tag">Il settimanale sportivo della lega O Fant A Girrr</div>')
    h.append(f'<div class="mini occ">{esc(t.get("occhiello") or f"Campionato · {n}ª giornata")}</div>')
    h.append(f'<div class="tit">{esc(t.get("titolone") or t.get("titolo") or "Si comincia")}</div>')
    if t.get("sommario"):
        h.append(f'<div class="som">{esc(t["sommario"])}</div>')
    h.append('<div class="g2"><div>')
    if t.get("apertura"):
        h.append(f'<p class="txt">{esc(t["apertura"])}</p>')
    if ult:
        h.append(f'<div class="tab"><h2>I tabellini · <b>{n}ª giornata</b></h2>')
        com = t.get("commenti") or []
        for k, (casa, pc, pf, fuori, ris) in enumerate(ult["m"]):
            gc, gf = ris.split("-")
            h.append(f'<div class="mt"><div class="a r {"" if pc > pf else "l"}">{esc(cap(casa))}</div><div class="s">{gc} - {gf}</div>'
                     f'<div class="a {"" if pf > pc else "l"}">{esc(cap(fuori))}</div></div>'
                     f'<div class="mp"><i>{pt(pc)}</i><i style="text-align:center">fantapunti</i><i>{pt(pf)}</i></div>')
            if k < len(com) and com[k]:
                h.append(f'<div class="cmm">{esc(com[k])}</div>')
        h.append("</div>")
    if t.get("premi"):
        h.append(f'<div class="taglio" style="margin-top:4mm"><b>Il commento</b>{esc(t["premi"])}</div>')
    h.append("</div><div>")
    h.append(f'<div class="fig">{PITCH}<p>La lavagna della settimana.</p></div>')
    if t.get("numero"):
        nm = t["numero"]
        h.append(f'<div class="box"><h3>Il numero <b>della settimana</b></h3><div class="big">{esc(nm.get("valore", ""))}</div><div class="bt">{esc(nm.get("testo", ""))}</div></div>')
    if ult:
        h.append('<div class="box"><h3>Il <b>palmarès</b></h3><ul class="pal">')
        for ch, ico, tit, chi, dett in premi(ult["m"]):
            h.append(f'<li><b>{esc(tit)}</b><span>{esc(chi)}</span><br>{esc(dett)}</li>')
        h.append("</ul>")
        h.append("</div>")
    h.append("</div></div>")
    h.append(f"{piede(1)}</section>")

    # ---------- pagina 2: classifiche e migliori
    h.append(f'<section class="pg">{testata(2)}<div class="mini occ">Dopo la {n}ª giornata</div><div class="tit" style="font-size:30pt">Le classifiche</div>')
    h.append('<div class="tab"><h2>Campionato · <b>la classifica</b></h2>' + tab_cl(classifica(gioc)) +
             '<p class="nt">Vittoria 3 punti, pareggio 1. A parità di punti conta il totale dei fantapunti, come nella classifica di Leghe.</p></div>')
    giocate_cup = [x for x in cal["cup"] if giocata(x)]
    cc = classifica(cal["cup"] if giocate_cup else cal["cup"][:1], coppa=True)
    h.append('<div class="tab"><h2>Champions Cup · <b>i gironi</b></h2>')
    if not giocate_cup:
        h.append('<p class="nt" style="margin:-.6mm 0 1mm">Si parte con la prossima giornata: tutte a zero, ordine provvisorio.</p>')
    h.append('<div class="cols">')
    for g in ("A", "B"):
        h.append(f'<div><div class="gr">Girone {g}</div>{tab_cl([r for r in cc if r["gir"] == g], False)}</div>')
    h.append("</div></div>")
    if t.get("classifiche"):
        h.append(f'<div class="taglio" style="margin-top:3.4mm;padding:2.4mm 4mm"><b>Il commento</b>{esc(t["classifiche"])}</div>')
    g, top, flop = migliori()
    if top:
        h.append(f'<div class="tab"><h2>Serie A, {g}ª giornata · <b>i migliori delle rose</b></h2><div class="cols"><div>')
        for fv, nome, club, r, v, b in top:
            extra = (" · " + ", ".join(b)) if b else ""
            h.append(f'<div class="tp"><b>{esc(nome)}</b> <i>{esc(club)} · {RUOLO.get(r, "")}</i><br>Fantavoto {pt(fv)}{esc(extra)}</div>')
        h.append("</div><div>")
        if flop:
            h.append('<div class="gr" style="margin-top:0">I flop</div>')
            for fv, nome, club, r, v, b in flop:
                h.append(f'<div class="tp"><b>{esc(nome)}</b> <i>{esc(club)} · {RUOLO.get(r, "")}</i><br>Fantavoto {pt(fv)}</div>')
        h.append("</div></div></div>")
    h.append(piede(2) + "</section>")

    # ---------- pagina 3: programma e infermeria
    h.append(f'<section class="pg">{testata(3)}<div class="mini occ">Cosa ci aspetta</div><div class="tit" style="font-size:30pt">Il prossimo turno</div><div class="cols" style="margin-top:2mm">')
    h.append('<div class="tab"><h2>Campionato</h2>')
    if pross:
        h.append(f'<div class="gr" style="margin-top:0">{pross["n"]}ª giornata · Serie A G{pross["sa"]}</div>')
        for casa, _, _, fuori, _ in pross["m"]:
            h.append(f'<div class="gm"><span>{esc(cap(casa))}</span><em>VS</em><span>{esc(cap(fuori))}</span></div>')
    if t.get("prossima"):
        h.append(f'<p class="nt">{esc(t["prossima"])}</p>')
    h.append('</div><div class="tab"><h2>Champions Cup</h2>')
    if coppa:
        h.append(f'<div class="gr" style="margin-top:0">{coppa["n"]}ª giornata · Serie A G{coppa["sa"]}</div>')
        for gname in ("A", "B"):
            h.append(f'<div class="gr" style="color:#16130e">Girone {gname}</div>')
            for gir, casa, _, _, fuori, _ in coppa["m"]:
                if gir == gname:
                    h.append(f'<div class="gm"><span>{esc(cap(casa))}</span><em>VS</em><span>{esc(cap(fuori))}</span></div>')
            for gir, sq in coppa.get("rest", []):
                if gir == gname:
                    h.append(f'<p class="nt" style="margin:.6mm 0 0">Riposa: {esc(cap(sq))}</p>')
    if t.get("coppa"):
        h.append(f'<p class="nt">{esc(t["coppa"])}</p>')
    h.append("</div></div>")
    in_rosa = {p["id"] for tt in D["teams"] for p in tt["pl"]}
    inf = [e for e in D.get("inj", []) if e.get("id") in in_rosa]
    inf.sort(key=lambda e: {"sì": 0, "in dubbio": 1}.get(e.get("k"), 2))
    h.append('<div class="tab"><h2>Il bollettino <b>medico</b></h2>')
    if inf:
        h.append("<table><tr><th style='text-align:left'>Giocatore</th><th style='text-align:left'>Squadra</th><th style='text-align:left'>Problema</th><th style='text-align:left'>Rientro</th><th>Turno</th></tr>")
        for e in inf[:13]:
            salta = e.get("k") == "sì"
            h.append(f'<tr><td style="text-align:left"><b>{esc(e["n"])}</b></td><td style="text-align:left">{esc(e["t"])}</td><td style="text-align:left">{esc(e["w"])}</td>'
                     f'<td style="text-align:left">{esc(e["b"])}</td><td><span class="st {"s" if salta else ""}">{"Salta" if salta else "Dubbio"}</span></td></tr>')
        h.append("</table>")
    if t.get("infortunati"):
        h.append(f'<p class="nt">{esc(t["infortunati"])} Notizie pubbliche: non indicano di chi sono i giocatori.</p>')
    h.append("</div>")
    if t.get("chiusura"):
        h.append(f'<div class="taglio"><b>Taglio basso</b>{esc(t["chiusura"])}</div>')
    h.append(piede(3) + "</section>")
    return "<!doctype html><html lang='it'><head><meta charset='utf-8'><title>Il Giornale del Girrr</title></head><body>" + "".join(h) + "</body></html>", n


def main():
    t = {}
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        t = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    pagina, n = costruisci(t)
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
