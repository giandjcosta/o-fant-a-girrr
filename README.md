# O Fant A Girrr · O Girrr

App web della nostra lega di fantacalcio (Classic League e Champions Cup). Si apre dal browser e si può installare come app su PC, Android e iPhone. È un progetto tra amici: i contenuti satirici, i personaggi e le notizie sono inventati.

## Le sezioni

| Sezione | Cosa fa | File |
|---|---|---|
| **Spogliatoio** | Rosa, giornata, probabili formazioni, scambi, Mercato, svincolati e infortunati | `index.html` |
| **O Girrr** (home) | La casa di tutto: ultimo Giornale, sezioni, link a Leghe | `girrr/index.html` |
| **Giornale** | Il settimanale della lega in PDF, con archivio dei numeri | `girrr/giornale.html` |
| **Tabellone** | Risultati e classifiche di campionato e Champions Cup | `girrr/tabellone.html` |
| **Totogirrr** | Schedine con i fantacrediti, quote, multiple, prestiti tra giocatori | `girrr/totogirrr.html` |
| **Curva** | Il social della lega con personaggi, cori e notifiche | `girrr/curva.html`, `girrr/curva-banca.js` |
| **Le squadre** | Rosa, risultati e forma di ogni squadra | `girrr/squadre.html` |
| **Albo d'oro** | Titoli, record, storico e la storia di ogni allenatore | `girrr/albo.html` |
| **Statistiche** | Aperture dell'app, visibili solo alla squadra che le gestisce | `girrr/statistiche.html` |

## Da dove arrivano i dati

- **Leghe Fantacalcio** (`leghe.fantacalcio.it`): classifiche, risultati e fantavoti di lega e coppa. Si leggono dal browser già collegato (`scripts/leghe_estrai.js`) e si importano con `scripts/leghe_importa.py`, che si ferma se i totali non tornano.
- **Fantacalcio.it** (pagine pubbliche): statistiche di stagione, voti giornata per giornata, presenze e stato degli svincolati (`scripts/aggiorna_dati.py`).
- **Calendario Serie A**: date e orari di chiusura di schedine e giornate.
- **Supabase**: il database online per ciò che cambia in tempo reale, cioè i conti, le schedine e i prestiti di Totogirrr e i cori, i profili e le reazioni di Curva. Le regole (pagamento delle vincite, prestito del banco, prestiti tra giocatori) sono funzioni nel database; gli script SQL sono in `sql/`.
- **GoatCounter**: conteggio anonimo delle aperture, per la scheda Statistiche.

## File principali

- `data.json`: tutti i dati della lega (rose, giornate, calendario, voti, stato degli scambi). È la fonte da cui si genera quasi tutto il resto.
- `toto-quote.json`: partite e quote di Totogirrr, lette anche da Curva per il profilo TotoGirrr.
- `testi.json`: testi del Giornale (titolone, tabellini, pagelle, Coro, Bufala).
- `formazioni.json`: formazioni delle squadre.
- `riepiloghi/` e `RIEPILOGO.md` / `riepilogo.html`: riepilogo della giornata, creato in automatico.
- `assets/`: loghi, icone dell'app, foto dell'Albo e immagini di Curva.
- `scripts/`: gli strumenti per aggiornare dati, Giornale, tabellone, riepilogo e quote. La procedura per far entrare una nuova giornata è in `scripts/PROCEDURA.md`.
- `sql/`: script per il database Supabase (Curva e prestiti di Totogirrr).
- `manifest.webmanifest`: permette di installare il sito come app.
- `prova/`: copia di prova con dati finti (accessibile anche con `?demo` in alcune pagine).

## Aggiornamenti automatici

- Il riepilogo della giornata si rigenera a ogni aggiornamento di `data.json` (workflow `Riepilogo della giornata` in `.github/workflows`).
- Dati, Giornale, tabellone e quote entrano dopo ogni giornata calcolata, seguendo `scripts/PROCEDURA.md`.
- Un registro con tutte le modifiche, giorno per giorno, è nel sito separato [o-girrr-registro](https://github.com/giandjcosta/o-girrr-registro), che legge i commit di questo repository.

## Come installare l'app

- **PC (Chrome/Edge):** apri il sito e premi l'icona di installazione nella barra dell'indirizzo.
- **Android:** apri il sito dal browser, menu ⋮ → «Installa app» o «Aggiungi a schermata Home».
- **iPhone:** apri il sito da Safari, Condividi → «Aggiungi alla schermata Home».

## Pubblicazione

Il sito è pubblicato con GitHub Pages dal ramo `gh-pages`.
