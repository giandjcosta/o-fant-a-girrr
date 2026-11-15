#!/usr/bin/env python3
"""Diagnosi (Claude, 15 novembre 2026): come la pagina dei voti di Fantacalcio.it segna ammonizioni ed espulsioni.
Non scrive niente nel sito: stampa nel log della prova i pezzi di HTML attorno ai cartellini."""
import re, sys, urllib.request, collections
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
g = sys.argv[1] if len(sys.argv) > 1 else "11"
url = f"https://www.fantacalcio.it/voti-fantacalcio-serie-a/2026-27/{g}"
h = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8", "replace")
print("pagina", url, len(h), "caratteri")
righe = re.findall(r"<tr>.*?</tr>", h, re.S)
print("righe <tr>:", len(righe))
cls = collections.Counter(re.findall(r'class="([^"]*)"', "".join(righe)))
print("\n== classi nelle righe dei giocatori ==")
for c, n in cls.most_common(80):
    print(f"{n:5d}  {c}")
tit = collections.Counter(re.findall(r'title="([^"]*)"', "".join(righe)))
print("\n== title nelle righe ==")
for c, n in tit.most_common(60):
    print(f"{n:5d}  {c}")
imgs = collections.Counter(re.findall(r'src="([^"]*icons[^"]*)"', h))
print("\n== icone ==")
for c, n in imgs.most_common(40):
    print(f"{n:5d}  {c}")
print("\n== parole chiave ==")
for k in ["ammon", "espul", "giall", "yellow", "red-card", "card", "cartell", "Amm", "Esp"]:
    for m in list(re.finditer(k, h))[:3]:
        print(f"[{k}] …{h[max(0, m.start()-220):m.end()+220]!r}…")
print("\n== prime 2 righe complete ==")
for r in righe[:2]:
    print(r[:3000])
