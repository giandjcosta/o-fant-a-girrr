#!/usr/bin/env python3
"""Tabelloni grafici (PNG 1600x900) con i colori ufficiali della lega.

Uso: python3 -I scripts/tabellone.py lega|coppa USCITA.png
- lega: risultati dell'ultima giornata giocata di campionato (rosso e navy) + classifica.
- coppa: risultati dell'ultima giornata di Champions Cup giocata, oppure la prossima se non si è ancora giocato (azzurro e navy) + gironi.
Esce con codice 2 se non c'è niente da mostrare.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_settimana import D, cap, classifica, esc, pt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LOGHI = ROOT / "assets" / "loghi"
SPONSOR = ["sponsor-birra-contropiede", "sponsor-pizzeria-fuorigioco", "sponsor-bomber-gym-club", "sponsor-amaro-del-mister"]

TEMI = {
    "lega": dict(acc="#d62839", bg="#1d2a52", bg2="#2c3f7c", bg3="#141d3d", chiaro="#fbf6ec", hi="#ffd166", sub="#bfe3ff",
                 logo="logo-lega-o-fant-a-girrr", tv="logo-tv-girrr-sport-live", kick="#ffd166"),
    "coppa": dict(acc="#3d93d6", bg="#12305c", bg2="#1f4a85", bg3="#0b2142", chiaro="#f7fbff", hi="#bfe3ff", sub="#bfe3ff",
                  logo="logo-cup-champions-cup", tv="logo-tv-cup-girrr-live", kick="#12305c"),
}


def uri(nome):
    return (LOGHI / f"{nome}.png").as_uri()


def righe_match(partite, coppa, giocata):
    out = []
    for m in partite:
        if coppa:
            gir, casa, pc, pf, fuori, ris = m
        else:
            casa, pc, pf, fuori, ris = m
            gir = ""
        if giocata:
            gc, gf = [int(x) for x in ris.split("-")]
            wc = "w" if gc > gf else ("l" if gc < gf else "")
            wf = "w" if gf > gc else ("l" if gf < gc else "")
            sc = f"<b>{gc}</b><i></i><b>{gf}</b>"
            fc, ff = f"<small>{pt(pc)}</small>", f"<small>{pt(pf)}</small>"
        else:
            wc = wf = "w"
            sc = "<b>–</b><i></i><b>–</b>"
            fc = ff = ""
        g = f'<div class="g">{esc(gir)}</div>' if coppa else ""
        out.append(f'<div class="m {"cp" if coppa else ""}">{g}<div class="t home {wc}"><span>{esc(cap(casa))}</span>{fc}</div>'
                   f'<div class="sc">{sc}</div><div class="t away {wf}"><span>{esc(cap(fuori))}</span>{ff}</div></div>')
    return "".join(out)


def tabella(righe, titolo, fantapunti):
    h = [f"<h3>{titolo}</h3><table>"]
    if fantapunti:
        h.append("<tr><th></th><th>SQUADRA</th><th>G</th><th>PT</th><th>FANTAPUNTI</th></tr>")
    for k, r in enumerate(righe, 1):
        fp = f'<td class="fp">{pt(r["fp"])}</td>' if fantapunti else ""
        h.append(f'<tr class="{"top" if k <= (3 if fantapunti else 2) else ""}"><td class="p">{k}</td><td class="n">{esc(cap(r["n"]))}</td>'
                 f'<td>{r["g"]}</td><td class="pt">{r["pt"]}</td>{fp}</tr>')
    h.append("</table>")
    return "".join(h)


def costruisci(quale):
    coppa = quale == "coppa"
    t = TEMI[quale]
    cal = D["cal"]["cup" if coppa else "lega"]
    idx = 5 if coppa else 4
    giocate = [g for g in cal if any(m[idx] != "-" for m in g["m"])]
    if giocate:
        g, giocata = giocate[-1], True
    elif coppa:
        g, giocata = next((x for x in cal if all(m[idx] == "-" for m in x["m"])), None), False
    else:
        g, giocata = None, False
    if g is None:
        return None
    n = g["n"]
    cl = classifica(cal if coppa else giocate, coppa=coppa)
    corpo = righe_match(g["m"], coppa, giocata)
    riposo = ""
    if coppa and g.get("rest"):
        riposo = '<div class="rip">Riposano: ' + " · ".join(f'{esc(cap(s))} (gir. {gg})' for gg, s in g["rest"]) + "</div>"
    if coppa:
        lato = tabella([r for r in cl if r["gir"] == "A"], "GIRONE A", False) + tabella([r for r in cl if r["gir"] == "B"], "GIRONE B", False)
        nome = "Champions Cup"
        sopra = "RISULTATI" if giocata else "PROSSIMA"
        titolo = f"Champions Cup, {n}ª giornata"
        kick = "CHAMPIONS CUP · 2026/27"
    else:
        lato = tabella(cl, "CLASSIFICA", True)
        sopra = "RISULTATI"
        titolo = f"I risultati della {n}ª giornata"
        kick = "CLASSIC LEAGUE · 2026/27"
    sp = SPONSOR[(n - 1) % 4:] + SPONSOR[:(n - 1) % 4]
    css = f"""
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:1600px;height:900px;font-family:"Inter Display","Inter",sans-serif;color:{t['chiaro']};background:{t['bg']};position:relative;overflow:hidden}}
.bg{{position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.04) 0 36px,transparent 36px 72px),radial-gradient(1200px 700px at 80% -10%,{t['bg2']} 0,{t['bg']} 55%,{t['bg3']} 100%)}}
.side{{position:absolute;left:0;top:0;width:360px;height:900px;background:{t['acc']};clip-path:polygon(0 0,100% 0,78% 100%,0 100%)}}
.shield{{position:absolute;left:52px;top:44px;height:330px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35))}}
.kick{{position:absolute;left:44px;top:400px;width:250px;font-weight:900;font-size:26px;letter-spacing:5px;line-height:1.25}}
.kick b{{display:block;font-size:64px;letter-spacing:0;line-height:1;margin-top:6px}}
.kick small{{display:block;margin-top:14px;font-size:15px;letter-spacing:4px;color:{t['kick']};font-weight:900}}
.tv{{position:absolute;right:46px;top:30px;height:92px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}}
.hd{{position:absolute;left:410px;top:40px;font-weight:900;font-size:22px;letter-spacing:8px;color:{t['hi']}}}
.hd2{{position:absolute;left:410px;top:72px;font-weight:900;font-size:50px}}
.board{{position:absolute;left:410px;top:150px;width:690px}}
.m{{display:grid;grid-template-columns:1fr 150px 1fr;column-gap:22px;align-items:center;height:112px;margin-bottom:14px;background:rgba(255,255,255,.07);border-left:8px solid {t['acc']};border-radius:4px 14px 14px 4px;padding:0 12px 0 18px}}
.m.cp{{grid-template-columns:48px 1fr 150px 1fr;column-gap:18px;height:128px;margin-bottom:16px;padding-left:14px}}
.g{{font-weight:900;font-size:34px;width:48px;height:48px;line-height:48px;text-align:center;border-radius:50%;background:{t['hi']};color:{t['bg']}}}
.t{{display:flex;flex-direction:column;gap:2px;font-weight:800;font-size:23px;text-transform:uppercase;letter-spacing:.5px;opacity:.62}}
.t.w{{opacity:1}} .t.home{{align-items:flex-end;text-align:right}}
.t small{{font-size:17px;font-weight:600;color:{t['sub']};letter-spacing:1px}}
.sc{{display:flex;justify-content:center;align-items:center;gap:8px;font-size:60px;font-weight:900}}
.sc b{{display:block;width:62px;height:78px;line-height:76px;text-align:center;background:{t['chiaro']};color:{t['bg']};border-radius:8px}}
.sc i{{display:block;width:10px;height:6px;background:{t['hi']}}}
.rip{{margin-top:4px;font-size:17px;letter-spacing:2px;font-weight:700;color:{t['sub']};text-transform:uppercase}}
.lato{{position:absolute;left:1150px;top:150px;width:404px}}
.lato h3{{font-weight:900;font-size:19px;letter-spacing:6px;color:{t['hi']};margin:0 0 8px}} .lato table+h3{{margin-top:26px}}
table{{width:100%;border-collapse:collapse;font-size:20px;font-weight:700}}
th{{font-size:13px;letter-spacing:2px;color:{t['sub']};text-align:right;padding:0 6px 6px;font-weight:800}} th:nth-child(2){{text-align:left}}
td{{padding:9px 6px;text-align:right;border-bottom:1px solid rgba(255,255,255,.15)}}
td.p{{text-align:center;width:36px;font-weight:900;color:{t['hi']}}} td.n{{text-align:left;text-transform:uppercase;font-size:17px;letter-spacing:.3px;font-weight:800}}
td.pt{{font-weight:900;font-size:23px}} td.fp{{font-size:15px;color:{t['sub']};font-weight:600}}
tr.top td.p{{background:{t['acc']};color:{t['chiaro']}}}
.sp{{position:absolute;left:0;bottom:0;width:1600px;height:118px;background:{t['chiaro']};display:flex;align-items:center;gap:26px;padding:0 30px 0 400px}}
.sp span{{font-weight:900;font-size:13px;letter-spacing:1px;color:{t['bg']};text-align:center;line-height:1.25;max-width:110px}}
.sp img{{height:78px}}"""
    html = (f'<html><head><meta charset="utf-8"><style>{css}</style></head><body><div class="bg"></div><div class="side"></div>'
            f'<img class="shield" src="{uri(t["logo"])}"><div class="kick">{sopra}<b>{n}ª</b>GIORNATA<small>{kick}</small></div>'
            f'<img class="tv" src="{uri(t["tv"])}"><div class="hd">TABELLONE</div><div class="hd2">{esc(titolo)}</div>'
            f'<div class="board">{corpo}{riposo}</div><div class="lato">{lato}</div>'
            f'<div class="sp"><span>Gentilmente offerto da</span>{"".join(f"<img src={chr(34)}{uri(s)}{chr(34)}>" for s in sp)}</div></body></html>')
    return html


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in TEMI:
        sys.exit(__doc__)
    html = costruisci(sys.argv[1])
    if html is None:
        print("Niente da mostrare")
        sys.exit(2)
    from playwright.sync_api import sync_playwright
    tmp = Path(sys.argv[2]).with_suffix(".html")
    tmp.write_text(html, encoding="utf-8")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 900})
        pg.goto(tmp.resolve().as_uri())
        pg.wait_for_timeout(500)
        pg.screenshot(path=sys.argv[2])
        b.close()
    tmp.unlink()
    print(sys.argv[2])


if __name__ == "__main__":
    main()
