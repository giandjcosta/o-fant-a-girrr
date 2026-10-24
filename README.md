# O Fant A Girrr · O Girrr

App web della nostra lega di fantacalcio (Classic League e Champions Cup, stagione 2026/27). Si apre dal browser e si può installare come app su PC, Android e iPhone. È un progetto tra amici: i contenuti satirici, i personaggi e le notizie sono inventati.

**Apri il sito:** https://giandjcosta.github.io/o-fant-a-girrr/

Questo è il repository del **sito vero**. Le idee nuove si provano prima nel repository di prova [o-girrr-registro](https://github.com/giandjcosta/o-girrr-registro) (Laboratorio e Anteprima) e arrivano qui solo quando sono pronte.

## Le sezioni

| Sezione | Cosa fa | File |
|---|---|---|
| **Spogliatoio** | Rosa, Giornata, Calendario, Statistiche, Borsino, Chi scambiare, Mercato Scambi, Svincolati, Sostituzioni, Infortunati | `index.html` |
| **O Girrr** (home della Lega) | Ultimo Giornale, risultati, prossima giornata, link a tutte le sezioni e a Leghe | `girrr/index.html` |
| **App 5.0** | Le pagine nuove in un'unica app: Girrr Sport, Sfide, Carriera, Probabilità, Albo e storia della Lega | `girrr/app.html` |
| **Girrr Sport** | Giornale, Radio Girrr (puntata audio della giornata), Moviola (episodi decisivi della giornata) e Conferenze stampa | `girrr/app.html#sport` |
| **Sfide e Derby** | Sfide 1 contro 1 tra allenatori (lancia, ricevute, 72 ore per rispondere) e Derby ufficiali con nome e storia | `girrr/app.html`, `girrr/derby.html`, `girrr/rivalita.html` |
| **Carriera** | Gli allenatori, la fiducia del presidente, le promesse in conferenza, gli sponsor | `girrr/app.html#carriera` |
| **Probabilità** | Probabilità di scudetto, podio e ultimo posto dopo ogni giornata | `girrr/app.html` |
| **Giornale** | Il settimanale della lega in PDF, con archivio dei numeri | `girrr/giornale.html` |
| **Tabellone** | Risultati e classifiche di campionato e Champions Cup | `girrr/tabellone.html` |
| **Totogirrr** | Schedine con i fantacrediti, quote (anche dei Derby), multiple, prestiti tra giocatori | `girrr/totogirrr.html` |
| **Curva** | Il social della lega: personaggi, cori, sondaggi e post automatici di Lega, Giornale, Radio, Moviola e Sfide | `girrr/curva.html`, `girrr/curva-banca.js` |
| **Le squadre** | Rosa, risultati e forma di ogni squadra | `girrr/squadre.html` |
| **Albo d'oro** | Titoli, record, Albo di Latta, Derby e la storia di ogni allenatore dal 2016/17 | `girrr/albo.html`, `girrr/storia.js` |
| **Statistiche** | Aperture dell'app, visibili solo alla squadra che le gestisce | `girrr/statistiche.html` |

Le pagine della Lega esistono in due grafiche con gli stessi contenuti: quella attuale in `girrr/` e la grafica **Stadio** in `stadio/girrr/`.

## Da dove arrivano i dati

- **Leghe Fantacalcio** (`leghe.fantacalcio.it`): classifiche, risultati e fantavoti di lega e coppa. Si leggono dal browser già collegato (`scripts/leghe_estrai.js`) e si importano con `scripts/leghe_importa.py`, che si ferma se i totali non tornano.
- **Fantacalcio.it** (pagine pubbliche): statistiche di stagione, voti giornata per giornata, presenze e stato degli svincolati (`scripts/aggiorna_dati.py`).
- **Giornali sportivi** (Sky Sport, Fantacalcio.it e altri): infortuni e tempi di recupero.
- **Calendario Serie A**: date e orari di chiusura di schedine e giornate.
- **Supabase**: il database online per ciò che cambia in tempo reale: conti, schedine e prestiti di Totogirrr; cori, profili, reazioni e post della Curva; Sfide, Derby e Conferenze stampa. Le regole (vincite, prestiti, sfide) sono funzioni nel database; gli script SQL sono in `sql/`.
- **GoatCounter**: conteggio anonimo delle aperture, per la scheda Statistiche.

## I due rami

- **`gh-pages`**: le pagine del sito, pubblicate con GitHub Pages.
- **`main`**: i workflow di GitHub Actions e i calcoli automatici (`calcoli/`: fiducia, probabilità, Borsino, Moviola, post della Curva, fine stagione). I file che servono alle pagine vengono copiati in `girrr/dati/` su `gh-pages`.

## File principali (ramo `gh-pages`)

- `data.json`: tutti i dati della lega (rose, giornate, calendario, voti, stato degli scambi). È la fonte da cui si genera quasi tutto il resto.
- `toto-quote.json`: partite e quote di Totogirrr, lette anche da Curva per il profilo TotoGirrr.
- `testi.json`: testi del Giornale (titolone, tabellini, pagelle, Coro, Bufala).
- `formazioni.json`: formazioni delle squadre.
- `girrr/dati/`: file calcolati per le pagine nuove (`borsino.json`, `fiducia.json`, `probabilita.json`, `moviola.json`, `lab-dati.json`).
- `girrr/voci/`: puntate e voci della Radio Girrr.
- `riepiloghi/` e `RIEPILOGO.md` / `riepilogo.html`: riepilogo della giornata, numeri del Giornale e tabelloni, creati in automatico.
- `assets/`: loghi, icone dell'app, foto dell'Albo e immagini di Curva.
- `scripts/`: gli strumenti per aggiornare dati, Giornale, tabellone, riepilogo e quote. La procedura per far entrare una nuova giornata è in `scripts/PROCEDURA.md`.
- `sql/`: script per il database Supabase.
- `manifest.webmanifest`: permette di installare il sito come app.
- `prova/`: copia con dati finti (accessibile anche con `?demo` in alcune pagine).
- `lab/`: rimanda al Laboratorio, che ora vive nel repository di prova.

## Aggiornamenti automatici

Workflow in `.github/workflows` (ramo `main`, più `riepilogo.yml` su `gh-pages`):

- **Aggiorna statistiche e voti** (`aggiorna-dati.yml`): ogni giorno, e più spesso nelle 12 ore prima della prima partita, aggiorna voti, infortunati, quotazioni e probabili formazioni.
- **Calcoli dopo la giornata** (`dopo-giornata.yml`): quando una giornata si chiude chiude promesse e sfide, aggiorna fiducia, probabilità, Borsino e Moviola e prepara i post della Curva.
- **Curva** (`curva-subito.yml`, `curva-coda.yml`): pubblica i post automatici della Curva, una volta sola ciascuno.
- **Controllo fallimenti** (`controllo-fallimenti.yml`): ogni mattina apre una Issue se un workflow è fallito o se i dati sono fermi, e la chiude quando è tutto a posto.
- **Riepilogo della giornata** (`riepilogo.yml`): si rigenera a ogni aggiornamento di `data.json`.
- Risultati, Giornale, tabellone e quote entrano dopo ogni giornata calcolata, seguendo `scripts/PROCEDURA.md`.

Il registro di tutte le modifiche, giorno per giorno, è nel repository di prova [o-girrr-registro](https://github.com/giandjcosta/o-girrr-registro), che legge i commit di questo repository.

## Come si entra

Ogni squadra ha un codice personale. Chiedilo a Gianluca.

## Come installare l'app

- **PC (Chrome/Edge):** apri il sito e premi l'icona di installazione nella barra dell'indirizzo.
- **Android:** apri il sito dal browser, menu ⋮ → «Installa app» o «Aggiungi a schermata Home».
- **iPhone:** apri il sito da Safari, Condividi → «Aggiungi alla schermata Home».

Progetto personale, non collegato a Fantacalcio, FantaLab o Lega Serie A.
