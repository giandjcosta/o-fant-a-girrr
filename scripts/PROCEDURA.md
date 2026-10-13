# Come entra una nuova giornata (lo fa Claude, dal Chrome di Gianluca già loggato su Leghe)

1. **Giornata calcolata?** Su Leghe (campionato, competition 762521) il calendario mostra i punteggi della giornata
   (non più le icone di partita da giocare). Se non ci sono, la giornata non è ancora calcolata: si riprova dopo.
2. **Lettura.** `scripts/leghe_estrai.js` in una scheda di Leghe (campionato `.../762521/round/N`), poi si legge
   `window.__leghe` a pezzi da 900 caratteri. Stesso per la Coppa (`.../833624/round/M`) con `window.__soloIntestazioni=true`.
3. **Importazione.** Si compone `LETTURA.json` (`sa`, `n_lega`, `n_coppa`, `lega`, `coppa`, e `calcolata` = ora in cui la giornata
   risulta calcolata, UTC) e `python3 -I scripts/leghe_importa.py LETTURA.json`. Si blocca se i totali non tornano
   (somma fantavoti di chi ha giocato + modificatore difesa = totale Leghe) o se un giocatore non è in rosa.
4. **Uscite.** `calcTs[sa]` (calcolata su Leghe) e `votiTs[sa]` (voti completi, scritto dall'Action) fissano l'ora base: la più tarda.
   Un'ora dopo escono Giornale, post della Lega, tabellone e classifiche; la Coppa 5 minuti dopo; poi commenti e bot a catena
   (girrr/pub.js nasconde la giornata fino a quell'ora, curva-banca.js usa la stessa ora per i post).
5. **Giornale.** Si scrive `testi.json` (titolone, tabellini, pagelle, Coro, Bufala, panchina/Rimpianti), poi
   `python3 -I scripts/pdf_giornale.py testi.json`, `python3 -I scripts/archivio_giornale.py`,
   `python3 -I scripts/tabellone.py lega|coppa riepiloghi/tabellone-lega-NN.png` (e coppa), commit e push su gh-pages.
