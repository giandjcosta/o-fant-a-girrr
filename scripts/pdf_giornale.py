#!/usr/bin/env python3
"""PDF settimanale in stile giornale sportivo ("O Giornale del Girrr").

Uso:  python3 scripts/pdf_giornale.py [testi.json] [uscita.pdf]

Usa gli stessi dati e le stesse chiavi di testi.json di pdf_settimana.py, piu':
  occhiello, titolone, sommario, numero {valore, testo}, personaggio
Se una chiave manca, quella parte semplicemente non compare.
"""
import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_settimana import D, cap, classifica, esc, giocata, premi, pt  # noqa: E402
import toto_quote as _tq  # noqa: E402  (forza delle rose, per le pagelle)

ROOT = Path(__file__).resolve().parent.parent
GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
TEMI = {
    # nome: (carta, inchiostro, accento, grigio, fascia, testo fascia, font titoli, peso, font testata, peso testata, dimensione titolo, dimensione testata)
    "classico": ("#f3eee1", "#16130e", "#c8102e", "#6a6254", "#c8102e", "#ffffff", "'Inter Display','Inter',sans-serif", 900, "'DejaVu Serif',serif", 700, "35pt", "43pt"),
    "arancio": ("#fbf5ea", "#1c1a17", "#f26a0c", "#6f665a", "#1c1a17", "#ffffff", "'Poppins','Inter',sans-serif", 700, "'Poppins','Inter',sans-serif", 700, "30pt", "36pt"),
    "notte": ("#14171f", "#f1eee5", "#ffc933", "#9aa0ad", "#ffc933", "#14171f", "'Inter Display','Inter',sans-serif", 900, "'Inter Display','Inter',sans-serif", 900, "35pt", "40pt"),
    "verde": ("#eef2e4", "#0f2a1a", "#1f7a3d", "#5d6c5f", "#0f2a1a", "#eef2e4", "'DejaVu Serif','Inter',serif", 700, "'GFS Baskerville','DejaVu Serif',serif", 700, "30pt", "45pt"),
    "blu": ("#eef1f6", "#0d1b3a", "#1d5fd6", "#5a6784", "#1d5fd6", "#ffffff", "'Inter Display','Inter',sans-serif", 900, "'DejaVu Serif',serif", 700, "35pt", "43pt"),
}


def css_tema(nome):
    c = TEMI.get(nome, TEMI["classico"])
    return (f":root{{--paper:{c[0]};--ink:{c[1]};--rule:{c[1]};--red:{c[2]};--mute:{c[3]};--band:{c[4]};--bandink:{c[5]};"
            f"--hd:{c[6]};--hw:{c[7]};--mh:{c[8]};--mhw:{c[9]};--tz:{c[10]};--mz:{c[11]};--soft:{c[3]}66{";--ts:.15pt" if nome == "verde" else ""}}}")


RUOLO = {"P": "Portiere", "D": "Difensore", "C": "Centrocampista", "A": "Attaccante"}

import base64 as _b64
from pathlib import Path as _P

_ASSETS = _P(__file__).resolve().parent.parent / "assets" / "loghi"
SPONSOR = ["sponsor-birra-contropiede", "sponsor-pizzeria-fuorigioco", "sponsor-bomber-gym-club", "sponsor-amaro-del-mister",
           "sponsor-la-camiseta", "sponsor-turbo-werkstatt", "sponsor-banque-premier-but", "sponsor-tubarao-credito-facil", "sponsor-wegwezen-reizen", "sponsor-pixelbay-electronics", "sponsor-velox-sportswear"]
SPONSOR_MEDICO = "sponsor-ouchguard-injury-insurance"   # fisso sotto il bollettino medico, fuori dalla rotazione


def scegli_sponsor(n, quanti=2):
    """Sponsor del numero N: `quanti` diversi tra loro, scelti a caso e mai tra quelli del numero prima.
    Salvati in riepiloghi/sponsor.json come liste di indici (un vecchio valore singolo vale come lista di uno)."""
    import json
    import random
    f = _P(__file__).resolve().parent.parent / "riepiloghi" / "sponsor.json"
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        d = {}
    uno = lambda v: v if isinstance(v, list) else [v]
    if str(n) in d:
        return [SPONSOR[i] for i in uno(d[str(n)])]
    prev = set(uno(d.get(str(n - 1), [])))
    pool = [k for k in range(len(SPONSOR)) if k not in prev]
    if len(pool) < quanti:
        pool = list(range(len(SPONSOR)))
    scelti = random.sample(pool, quanti)
    d[str(n)] = scelti
    try:
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    except OSError:
        pass
    return [SPONSOR[i] for i in scelti]


def logo_uri(nome):
    f = _ASSETS / f"{nome}.png"
    return "data:image/png;base64," + _b64.b64encode(f.read_bytes()).decode() if f.exists() else ""


CSS = """
@page { size: A4; margin: 0 }
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#f3eee1;--ink:#16130e;--red:#c8102e;--mute:#6a6254;--rule:#16130e;--soft:var(--soft);--band:#c8102e;--bandink:#fff;--hd:'Inter Display','Inter',sans-serif;--hw:900;--mh:'DejaVu Serif',serif;--mhw:700;--tz:35pt;--tls:-.02em}
body{font-family:'Bitstream Charter','TeX Gyre Pagella','DejaVu Serif',serif;color:var(--ink);background:var(--paper);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:9mm 11mm 10mm;position:relative;overflow:hidden;page-break-after:always;background:var(--paper)}
.pg:last-child{page-break-after:auto}
.pg:before{content:"";position:absolute;inset:0;background:radial-gradient(rgba(0,0,0,.035) .35mm,transparent .4mm) 0 0/1.6mm 1.6mm;pointer-events:none}
.hn{font-family:var(--hd);font-weight:700;text-transform:uppercase}
.bar{display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:7.4pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-bottom:.3mm solid var(--rule);padding-bottom:1.4mm}
.mast{text-align:center;padding:2.2mm 0 1.2mm;border-bottom:1.1mm solid var(--rule);position:relative}
.mast h1{font-family:var(--mh);font-weight:var(--mhw);font-size:calc(var(--mz,43pt) * .8);letter-spacing:var(--mls,-.01em);line-height:1.02}
.mast h1 span{color:var(--red)}
.mast .lg{position:absolute;top:50%;transform:translateY(-50%);height:11.5mm}
.spb{display:flex;align-items:center;justify-content:center;gap:5mm;margin-top:4mm;padding:2.4mm 0;border-top:.3mm solid var(--rule);border-bottom:.3mm solid var(--rule);font-family:'Inter',sans-serif;font-size:7.4pt;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.spb img{height:14mm}
.tag{background:var(--band);color:var(--bandink);text-align:center;font-family:'Inter',sans-serif;font-size:7.8pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;padding:1.3mm 0;margin-top:1.4mm}
.mini{font-family:var(--hd);font-weight:700;text-transform:uppercase;font-size:8pt;letter-spacing:.14em;color:var(--red)}
.occ{margin-top:4.5mm}
.tit{font-family:var(--hd);font-weight:var(--hw);text-transform:uppercase;font-size:var(--tz);line-height:.96;letter-spacing:var(--tls);margin-top:1mm;-webkit-text-stroke:var(--ts,.6pt) currentColor}
.tit em{font-style:normal;color:var(--red)}
.som{font-style:italic;font-size:11.4pt;line-height:1.35;margin-top:2.4mm;color:var(--ink);opacity:.85;border-top:.3mm solid var(--rule);padding-top:2mm}
.g2{display:grid;grid-template-columns:1fr 56mm;gap:6mm;margin-top:3.5mm}
.txt{font-size:9.6pt;line-height:1.42;text-align:justify;hyphens:auto}
.txt:first-letter{float:left;font-family:'GFS Baskerville',serif;font-weight:700;font-size:34pt;line-height:.82;padding:.6mm 1.4mm 0 0;color:var(--red)}
.box{border-top:1.1mm solid var(--rule);border-bottom:.3mm solid var(--rule);padding:1.6mm 0 1.8mm;margin-bottom:3.4mm}
.box h3{font-family:var(--hd);font-weight:700;text-transform:uppercase;font-size:11.5pt;letter-spacing:.04em;margin-bottom:1.4mm}
.box h3 b{color:var(--red)}
.tab{border-top:1.1mm solid var(--rule);margin-top:4.2mm}
.tab h2{font-family:var(--hd);font-weight:700;text-transform:uppercase;font-size:17pt;letter-spacing:.01em;margin:1.6mm 0 1.4mm}
.tab h2 b{color:var(--red)}
.mt{display:grid;grid-template-columns:1fr 17mm 1fr;align-items:baseline;gap:1.5mm;padding:1.1mm 0 .2mm;border-top:.2mm solid var(--soft)}
.mt:first-of-type{border-top:0}
.mt .a{font-weight:700;font-size:10.4pt}
.mt .a.r{text-align:right}
.mt .a.l{color:var(--mute);font-weight:400}
.mt .s{text-align:center;font-family:var(--hd);font-weight:var(--hw);font-size:14pt;background:var(--ink);color:var(--paper);padding:0 0 .4mm;letter-spacing:.04em}
.mp{display:grid;grid-template-columns:1fr 17mm 1fr;font-size:7.4pt;color:var(--mute);font-family:'Inter',sans-serif}
.mp i{font-style:normal}.mp i:first-child{text-align:right}.mp i:last-child{text-align:left}
.cmm{font-style:italic;font-size:8.7pt;line-height:1.3;color:var(--ink);opacity:.85;margin:.6mm 0 1.2mm;padding-left:1mm;border-left:.7mm solid var(--red)}
.pal{list-style:none;font-size:8.6pt;line-height:1.28}
.pal li{padding:1mm 0;border-top:.2mm solid var(--soft)}
.pal li:first-child{border-top:0}
.pal b{display:block;font-family:var(--hd);text-transform:uppercase;font-size:7.8pt;letter-spacing:.1em;color:var(--red)}
.pal span{font-weight:700;font-size:9.4pt}
.big{-webkit-text-stroke:.8pt currentColor;font-family:var(--hd);font-weight:var(--hw);font-size:62pt;line-height:.9;color:var(--red);text-align:center;margin:1mm 0 1mm}
.bt{font-size:8.6pt;line-height:1.35;text-align:center}
.fig{margin:0 0 3.4mm}
.fig svg{width:100%;display:block;border:.3mm solid var(--rule)}
.fig p{font-size:7.2pt;color:var(--mute);margin-top:.8mm;font-style:italic}
table{width:100%;border-collapse:collapse;font-size:8.8pt}
th{font-family:'Inter',sans-serif;font-size:6.8pt;letter-spacing:.1em;text-transform:uppercase;text-align:center;padding:1mm .8mm;border-bottom:.5mm solid var(--rule);color:var(--red);font-weight:800}
td{padding:.95mm .8mm;border-bottom:.2mm solid var(--soft);text-align:center}
td:nth-child(2),th:nth-child(2){text-align:left}
td.p{font-family:var(--hd);font-weight:700;font-size:11pt}
td.pos{font-weight:700;color:var(--mute)}
tr.pod td:nth-child(2){font-weight:700}
tr.pod td.pos{color:var(--red)}
.tp{font-size:8.5pt;line-height:1.28;margin:.5mm 0}
.tp b{font-family:var(--hd);text-transform:uppercase;letter-spacing:.03em}
.tp i{color:var(--mute)}
.gm{display:grid;grid-template-columns:1fr 8mm 1fr;align-items:center;gap:1mm;font-size:9.6pt;font-weight:700;padding:1.1mm 0;border-bottom:.2mm solid var(--soft)}
.gm span:first-child{text-align:right}
.gm span:last-child{text-align:left}
.gm em{text-align:center}
.gm em{font-style:normal;font-family:'Inter',sans-serif;font-size:7.4pt;color:var(--red);font-weight:800;align-self:center}
.gr{font-family:var(--hd);font-weight:700;text-transform:uppercase;font-size:9pt;letter-spacing:.12em;color:var(--red);margin:1.8mm 0 .6mm}
.spm{display:flex;align-items:center;justify-content:flex-end;gap:3mm;margin-top:1.6mm;font-family:'Inter',sans-serif;font-size:6.6pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}.spm img{height:11mm}
.nt{font-size:7.6pt;color:var(--mute);margin-top:1.2mm;line-height:1.35;font-style:italic}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.st{font-family:'Inter',sans-serif;font-weight:800;font-size:6.8pt;letter-spacing:.06em;text-transform:uppercase;padding:.4mm 1.4mm;border:.3mm solid var(--rule)}
.st.s{background:var(--red);color:var(--paper);border-color:var(--red)}
.taglio{border:.5mm solid var(--rule);border-left:2.2mm solid var(--red);padding:3.2mm 4mm;margin-top:5mm;font-style:italic;font-size:10.8pt;line-height:1.4}
.taglio b{font-style:normal;font-family:var(--hd);text-transform:uppercase;font-size:8.2pt;letter-spacing:.14em;color:var(--red);display:block;margin-bottom:.8mm}
.foot{position:absolute;left:11mm;right:11mm;bottom:5mm;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:7pt;color:var(--mute);border-top:.3mm solid var(--rule);padding-top:1.4mm}
.fin{font-size:9pt;line-height:1.4;margin-top:3mm}

.pgl{width:100%;border-collapse:collapse}
.pgl td{padding:1.15mm .8mm;vertical-align:middle}
.pgl td.v{width:15mm;text-align:center;font-family:var(--hd);font-weight:var(--hw);font-size:17pt;color:var(--red);-webkit-text-stroke:.5pt currentColor;white-space:nowrap}
.pgl td.v small{font-size:8pt;font-family:'Inter',sans-serif;-webkit-text-stroke:0;margin-left:.6mm}
.pgl td.sq{font-weight:700;font-size:10.2pt;text-align:left;white-space:nowrap}
.pgl td.sq i{display:block;font-style:normal;font-family:'Inter',sans-serif;font-weight:400;font-size:6.8pt;color:var(--mute)}
.pgl td.cm{font-style:italic;font-size:8.6pt;line-height:1.28;text-align:left;opacity:.9}
.pgl tr.top td.sq{color:var(--red)}
.social{background:#0f1419;color:#e7e9ea;border-radius:4mm;padding:3.2mm 4mm 3mm;font-family:'Inter',sans-serif;margin-top:2mm}
.social .sh{display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;border-bottom:.25mm solid #2f3336}
.social .sl{font-weight:900;font-size:14pt;letter-spacing:-.02em;color:#fff;display:flex;align-items:center;gap:1.6mm}
.social .sl i{display:inline-block;width:5mm;height:5mm;border-radius:1.4mm;background:linear-gradient(135deg,#ff5a36,#c8102e);position:relative}
.social .sl i:after{content:"";position:absolute;left:1.15mm;top:1.15mm;width:2.7mm;height:2.7mm;border-radius:50%;border:.55mm solid #fff;border-right-color:transparent;transform:rotate(30deg)}
.social .sh span{font-size:6.8pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71767b}
.post{display:flex;gap:3mm;padding-top:2.6mm}
.av{flex:none;width:11mm;height:11mm;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10pt}
.pb{flex:1;min-width:0}
.pn{display:flex;align-items:center;gap:1.4mm;font-size:9.6pt}
.pn b{color:#fff;font-weight:800}.pn span{color:#71767b;font-size:8.8pt}
.pt{font-size:11pt;line-height:1.35;margin:1mm 0 1.6mm;color:#e7e9ea}
.pq{font-size:7.6pt;color:#71767b;padding-bottom:1.8mm;border-bottom:.25mm solid #2f3336}.pq b{color:#e7e9ea}
.pm{display:flex;justify-content:space-between;color:#71767b;font-size:8pt;padding:1.8mm 2mm 0 0;max-width:120mm}
.pm span{display:flex;align-items:center;gap:1.2mm}
.bufala{border:.5mm solid var(--rule);border-top:2.2mm solid var(--red);padding:2.6mm 4mm 3mm;margin-top:4mm;position:relative;background:rgba(200,16,46,.04)}
.bufala .bk{font-family:var(--hd);font-weight:700;text-transform:uppercase;font-size:8.2pt;letter-spacing:.16em;color:var(--red)}
.bufala .bh{font-family:var(--hd);font-weight:var(--hw);text-transform:uppercase;font-size:17pt;line-height:1;letter-spacing:-.01em;margin:1.2mm 0 1.6mm}
.bufala p{font-size:9.6pt;line-height:1.4;text-align:justify;hyphens:auto}
.bufala .bn{font-size:7pt;color:var(--mute);font-style:italic;margin-top:1.4mm;font-family:'Inter',sans-serif}
"""

PITCH = """<svg viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="62" fill="#2f6b3a"/>
<g fill="none" stroke="#e9f2e5" stroke-width=".7"><rect x="4" y="4" width="92" height="54"/><line x1="50" y1="4" x2="50" y2="58"/><circle cx="50" cy="31" r="8"/>
<rect x="4" y="19" width="13" height="24"/><rect x="83" y="19" width="13" height="24"/><rect x="4" y="25" width="5" height="12"/><rect x="91" y="25" width="5" height="12"/></g>
<g fill="#c8102e"><circle cx="24" cy="31" r="2.1"/><circle cx="35" cy="18" r="2.1"/><circle cx="35" cy="44" r="2.1"/><circle cx="52" cy="25" r="2.1"/><circle cx="52" cy="38" r="2.1"/><circle cx="66" cy="31" r="2.1"/></g>
<g fill="#f3eee1"><circle cx="76" cy="22" r="2.1"/><circle cx="76" cy="40" r="2.1"/><circle cx="86" cy="31" r="2.1"/></g>
<path d="M66 31 C72 28 78 30 88 31" stroke="#ffd166" stroke-width=".9" fill="none" stroke-dasharray="1.8 1.4"/><circle cx="88.6" cy="31" r="1.5" fill="#fff" stroke="#111" stroke-width=".4"/></svg>"""


MODULI = {"3-4-3": (3, 4, 3), "3-5-2": (3, 5, 2), "4-3-3": (4, 3, 3), "4-4-2": (4, 4, 2), "4-5-1": (4, 5, 1), "5-3-2": (5, 3, 2), "5-4-1": (5, 4, 1)}


def maiuscole(x):
    """Prima lettera maiuscola a inizio testo e dopo ogni . ! ? (nei testi scritti a mano)."""
    if isinstance(x, str):
        x = re.sub(r"(^\s*|(?<!\s[A-Z])[.!?…]\s+)([a-zàèéìòù])", lambda m: m.group(1) + m.group(2).upper(), x)  # non dopo un'iniziale ("Martinez L. è")
        return x
    if isinstance(x, list):
        return [maiuscole(v) for v in x]
    if isinstance(x, dict):
        return {k: (v if k == "valore" else maiuscole(v)) for k, v in x.items()}
    return x


def voto_pagella(fp, atteso):
    """6 = in linea con la rosa; ogni 5 fantapunti sopra/sotto l'atteso vale un voto. Passi da mezzo punto."""
    v = 6 + (fp - atteso) / 5
    return max(3, min(10, round(v * 2) / 2))


def commento_pagella(delta):
    if delta >= 12:
        return "Serata da incorniciare: la rosa ha dato molto più del previsto."
    if delta >= 5:
        return "Sopra le attese, la rosa ha reso più di quanto si pensasse."
    if delta > -5:
        return "In linea con quello che prometteva la rosa."
    if delta > -12:
        return "Sotto le attese: la rosa poteva dare qualcosa in più."
    return "Giornata da dimenticare: la rosa valeva molto di più."


def pagelle(ult, gioc):
    """[(squadra, fantapunti, atteso, voto, freccia)] ordinate per voto. La freccia confronta con la giornata prima."""
    pri = _tq.prior_squadre(D)
    def per_giornata(g):
        out = {}
        for casa, pc, pf, fuori, _ in g["m"]:
            out[casa] = pc
            out[fuori] = pf
        return out
    ora = per_giornata(ult)
    prec = per_giornata(gioc[-2]) if len(gioc) > 1 else {}
    righe = []
    for sq, fp in ora.items():
        att = pri.get(sq, 72.0)
        v = voto_pagella(fp, att)
        fr = ""
        if sq in prec:
            vp = voto_pagella(prec[sq], att)
            fr = "su" if v > vp else "giu" if v < vp else "uguale"
        righe.append((sq, fp, att, v, fr))
    righe.sort(key=lambda r: (-r[3], -(r[1] - r[2])))
    return righe


def colore_squadra(nome):
    h = 0
    for ch in nome:
        h = (h * 31 + ord(ch)) % 360
    return f"hsl({h} 55% 42%)"


def sigla(nome):
    parole = [w for w in re.split(r"\s+", nome.strip()) if w]
    return (parole[0][0] + (parole[1][0] if len(parole) > 1 else parole[0][1:2])).upper()


def cifra(n):
    return f"{n/1000:.1f}".replace(".", ",") + " mila" if n >= 1000 else str(n)


def post_social(coro, n):
    """Il "coro della settimana": un post in stile social (inventato: la piattaforma si chiama Curva)."""
    import random
    r = random.Random(n * 7919)
    sq = coro.get("squadra", "")
    nome = cap(sq)
    handle = "@" + re.sub(r"[^a-z0-9]+", "_", sq.lower()).strip("_")
    risposte = r.randint(12, 140)
    rilanci = r.randint(30, 600)
    applausi = rilanci * r.randint(3, 6) + r.randint(0, 99)
    viste = applausi * r.randint(9, 14)
    ora = f"{r.randint(9, 23)}:{r.randint(0, 59):02d}"
    ico = lambda d: f'<svg viewBox="0 0 24 24" width="3.6mm" height="3.6mm" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{d}</svg>'
    bolla = ico('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.3A8 8 0 1 1 21 12z"/>')
    giro = ico('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>')
    cuore = ico('<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 5 6.2 5c1.9 0 3.2 1 3.8 2 .6-1 1.9-2 3.8-2C17 5 19.1 8.2 17.6 11.7 15.5 16.4 12 21 12 21z"/>')
    barre = ico('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>')
    testo = esc(coro.get("testo", "")).replace("\n", "<br>")
    return (
        '<div class="social"><div class="sh"><div class="sl"><i></i>Curva</div><span>Il coro della settimana</span></div>'
        f'<div class="post"><div class="av" style="background:{colore_squadra(sq)}">{esc(sigla(sq))}</div><div class="pb">'
        f'<div class="pn"><b>{esc(nome)}</b><svg class="ver" viewBox="0 0 24 24" width="3.5mm" height="3.5mm"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        f'<span>{esc(handle)}</span></div><div class="pt">{testo}</div>'
        f'<div class="pq">{ora} · Curva per smartphone · <b>{cifra(viste)}</b> visualizzazioni</div>'
        f'<div class="pm"><span>{bolla}{risposte}</span><span>{giro}{rilanci}</span><span>{cuore}{cifra(applausi)}</span><span>{barre}{cifra(viste)}</span></div>'
        '</div></div></div>'
    )


def formazione():
    """Miglior undici della giornata di Serie A piu' recente fra i giocatori delle rose, per fantavoto."""
    voti = D.get("votes", {})
    in_rosa = {str(p["id"]) for t in D["teams"] for p in t["pl"]}
    giornate = sorted({int(g) for s in voti.values() for g in s})
    if not giornate:
        return None
    g = str(giornate[-1])
    per_ruolo = {"P": [], "D": [], "C": [], "A": []}
    for i in in_rosa:
        x = voti.get(i, {}).get(g)
        pl = D["P"].get(i)
        if x and x.get("f") is not None and pl and pl["r"] in per_ruolo:
            per_ruolo[pl["r"]].append((x["f"], pl["n"]))
    for r in per_ruolo:
        per_ruolo[r].sort(key=lambda z: (-z[0], z[1]))
    if not per_ruolo["P"]:
        return None
    best = None
    for nome, (d, c, a) in MODULI.items():
        if len(per_ruolo["D"]) < d or len(per_ruolo["C"]) < c or len(per_ruolo["A"]) < a:
            continue
        sel = {"P": per_ruolo["P"][:1], "D": per_ruolo["D"][:d], "C": per_ruolo["C"][:c], "A": per_ruolo["A"][:a]}
        tot = sum(z[0] for r in sel.values() for z in r)
        if best is None or tot > best[0]:
            best = (tot, nome, sel)
    if not best:
        return None
    return int(g), best[1], best[2], best[0]


def svg_formazione(sel):
    """Campo orizzontale: portiere a sinistra, attacco a destra."""
    cols = [("P", 11), ("D", 30), ("C", 53), ("A", 78)]
    out = ['<svg viewBox="0 0 100 58" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="58" fill="#2f6b3a"/>'
           '<g fill="none" stroke="#fff" stroke-width=".5"><rect x="2" y="2" width="96" height="54"/><line x1="50" y1="2" x2="50" y2="56"/><circle cx="50" cy="29" r="8"/>'
           '<rect x="2" y="15" width="13" height="28"/><rect x="85" y="15" width="13" height="28"/></g>']
    for ruolo, x in cols:
        gioc = sel[ruolo]
        for k, (fv, nome) in enumerate(gioc):
            y = 58 * (k + 1) / (len(gioc) + 1)
            cognome = nome.split(" ")[0] if len(nome) > 11 else nome
            out.append(f'<rect x="{x - 4.4}" y="{y - 2.5:.1f}" width="8.8" height="5" rx="2.5" fill="#fff" stroke="var(--red)" stroke-width=".9"/>'
                       f'<text x="{x}" y="{y + 1.15:.1f}" font-family="Inter,sans-serif" font-weight="900" font-size="3.1" text-anchor="middle" fill="#16130e">{html.escape(pt(fv))}</text>'
                       f'<rect x="{x - (len(cognome) * 0.92 + 1.4):.1f}" y="{y + 3.9:.1f}" width="{len(cognome) * 1.84 + 2.8:.1f}" height="3.7" rx="1.8" fill="#000" fill-opacity=".62"/>'
                       f'<text x="{x}" y="{y + 6.4:.1f}" font-family="Inter,sans-serif" font-weight="800" font-size="2.9" text-anchor="middle" fill="#fff">{html.escape(cognome)}</text>')
    out.append("</svg>")
    return "".join(out)


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


def costruisci(t, tema="classico"):
    t = maiuscole(t)
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
                f'<div class="bar"><span>O Giornale del Girrr</span><span>{esc(data)}</span><span>N° {n}</span></div>')

    def piede(p):
        return f'<div class="foot"><span>O Giornale del Girrr · O Fant A Girrr · Lo Spogliatoio</span><span>Pag. {p} di 4</span></div>'

    h = [f"<style>{CSS}{css_tema(tema)}</style>"]
    # ---------- prima pagina
    h.append(f'<section class="pg">{testata(1)}<div class="mast"><img class="lg" style="left:0" src="{logo_uri("logo-lega-o-fant-a-girrr")}"><img class="lg" style="right:0" src="{logo_uri("logo-lega-o-fant-a-girrr")}"><h1>O Giornale del <span>Girrr</span></h1></div>'
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
    fz = formazione()
    if fz:
        gg, modulo, sel, tot = fz
        h.append(f'<div class="tab" style="margin-top:2.6mm"><h2>L\'undici <b>della settimana</b></h2>'
                 f'<div class="fig" style="margin:0;width:100mm">{svg_formazione(sel)}<p>Modulo {modulo} · I migliori fantavoti della {gg}ª di Serie A tra le rose</p></div></div>')
    h.append("</div><div>")
    if t.get("numero"):
        nm = t["numero"]
        h.append(f'<div class="box"><h3>Il numero <b>della settimana</b></h3><div class="big">{esc(nm.get("valore", ""))}</div><div class="bt">{esc(nm.get("testo", ""))}</div></div>')
    if ult:
        h.append('<div class="box"><h3>Il <b>palmarès</b></h3><ul class="pal">')
        for ch, ico, tit, chi, dett in premi(ult["m"]):
            h.append(f'<li><b>{esc(tit)}</b><span>{esc(chi)}</span><br>{esc(dett)}</li>')
        h.append("</ul>")
        h.append("</div>")
    if t.get("premi"):
        h.append(f'<div class="taglio" style="margin-top:3mm;padding:2.4mm 3mm;font-size:9.6pt"><b>Il commento</b>{esc(t["premi"])}</div>')
    h.append("</div></div>")
    h.append(f"{piede(1)}</section>")

    # ---------- pagina 2: classifiche e migliori
    h.append(f'<section class="pg">{testata(2)}<div class="mini occ">Dopo la {n}ª giornata</div><div class="tit" style="font-size:30pt">Le classifiche</div>')
    h.append('<div class="tab"><h2>Campionato · <b>la classifica</b></h2>' + tab_cl(classifica(gioc)) +
             '<p class="nt">Vittoria 3 punti, pareggio 1. A parità di punti conta il totale dei fantapunti. Fonte: classifica Leghe Fantacalcio.</p></div>')
    giocate_cup = [x for x in cal["cup"] if giocata(x)]
    cc = classifica(cal["cup"] if giocate_cup else cal["cup"][:1], coppa=True)
    h.append('<div class="tab"><h2>Champions Cup · <b>i gironi</b></h2>')
    if not giocate_cup:
        h.append('<p class="nt" style="margin:-.6mm 0 1mm">Si parte con la prossima giornata: tutte a zero.</p>')
    h.append('<div class="cols">')
    for g in ("A", "B"):
        h.append(f'<div><div class="gr">Girone {g}</div>{tab_cl([r for r in cc if r["gir"] == g], False)}</div>')
    h.append("</div></div>")
    if t.get("classifiche"):
        h.append(f'<div class="taglio" style="margin-top:3.4mm;padding:2.4mm 4mm"><b>Il commento</b>{esc(t["classifiche"])}</div>')
    g, top, flop = migliori()
    if top:
        h.append(f'<div class="tab"><h2>Serie A, {g}ª giornata · <b>il meglio e il peggio delle rose</b></h2><div class="cols"><div>')
        h.append('<div class="gr" style="margin-top:0">I top</div>')
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

    # ---------- pagina 3: pagelle, coro della settimana, bufala di mercato
    if ult:
        h.append(f'<section class="pg">{testata(3)}<div class="mini occ">Dopo la {n}ª giornata</div><div class="tit" style="font-size:30pt">Le pagelle</div>')
        com = t.get("pagelle") or {}
        com = {k.lower(): v for k, v in com.items()} if isinstance(com, dict) else {}
        h.append('<div class="tab" style="margin-top:2.4mm"><h2>Squadra per squadra · <b>il voto della settimana</b></h2><table class="pgl">')
        for k, (sq, fp, att, v, fr) in enumerate(pagelle(ult, gioc)):
            frec = {"su": ' <small style="color:#1f7a3d">▲</small>', "giu": ' <small>▼</small>', "uguale": ' <small style="color:var(--mute)">=</small>'}.get(fr, "")
            testo = com.get(sq.lower()) or commento_pagella(fp - att)
            h.append(f'<tr class="{"top" if k < 3 else ""}"><td class="sq">{esc(cap(sq))}<i>{pt(fp)} fantapunti · Attesi {att:.0f}</i></td>'
                     f'<td class="v">{pt(v)}{frec}</td><td class="cm">{esc(testo)}</td></tr>')
        h.append('</table><p class="nt">Il voto confronta i fantapunti della giornata con quelli che ci si aspettava dalla rosa (voti di quest\'anno e della scorsa stagione). Il 6 è «in linea con la rosa»: ogni 5 fantapunti in più o in meno vale un voto.</p></div>')
        if t.get("coro"):
            h.append('<div class="tab"><h2>Il coro <b>della settimana</b></h2>' + post_social(t["coro"], n) + '</div>')
        if t.get("bufala"):
            b = t["bufala"]
            h.append(f'<div class="bufala"><div class="bk">Bufala di mercato</div><div class="bh">{esc(b.get("titolo", ""))}</div><p>{esc(b.get("testo", ""))}</p></div>')
        h.append(piede(3) + "</section>")

    # ---------- pagina 4: programma e infermeria
    h.append(f'<section class="pg">{testata(4)}<div class="mini occ">Cosa ci aspetta</div><div class="tit" style="font-size:30pt">Il prossimo turno</div><div class="cols" style="margin-top:2mm">')
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
            h.append(f'<div class="gr" style="color:var(--ink)">Girone {gname}</div>')
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
        h.append(f'<p class="nt">{esc(t["infortunati"])}</p>')
    h.append(f'<div class="spm"><span>Il bollettino medico è offerto da</span><img src="{logo_uri(SPONSOR_MEDICO)}"></div>')
    h.append("</div>")
    if t.get("chiusura"):
        h.append(f'<div class="taglio"><b>Taglio basso</b>{esc(t["chiusura"])}</div>')
    h.append('<div class="spb"><span>Questo numero è gentilmente offerto da</span>' + "".join(f'<img src="{logo_uri(x)}">' for x in scegli_sponsor(n)) + '</div>')
    h.append(piede(4) + "</section>")
    return "<!doctype html><html lang='it'><head><meta charset='utf-8'><title>O Giornale del Girrr</title></head><body>" + "".join(h) + "</body></html>", n


def main():
    tema = "classico"
    if "--tema" in sys.argv:
        k = sys.argv.index("--tema")
        tema = sys.argv[k + 1]
        del sys.argv[k:k + 2]
    t = {}
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        t = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    pagina, n = costruisci(t, tema)
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
    # scheda dell'uscita per l'archivio del sito (numero, data, titolo)
    ora = datetime.now(ZoneInfo("Europe/Rome"))
    scheda = {"n": n, "data": f"{GIORNI[ora.weekday()]} {ora.day} {MESI[ora.month - 1]} {ora.year}", "iso": ora.date().isoformat(),
              "occhiello": t.get("occhiello", ""), "titolone": t.get("titolone") or t.get("titolo", ""), "sommario": t.get("sommario", "")}
    uscita.with_suffix(".json").write_text(json.dumps(scheda, ensure_ascii=False, indent=1), encoding="utf-8")
    print(uscita)


if __name__ == "__main__":
    main()
