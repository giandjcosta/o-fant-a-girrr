# Calcoli automatici (versione 5.0)

Script che leggono `data.json` della lega e producono file pronti per il sito. Non scrivono nel database.
Quando la 5.0 esce, vanno copiati in `scripts/` del repo della lega e agganciati all'Action "Aggiorna statistiche e voti".

| Script | Cosa fa | Stato |
|---|---|---|
| `fiducia.py` | Fiducia del presidente dopo ogni giornata (campionato, Coppa a peso ridotto, promesse in conferenza). Scrive `fiducia.json`. | Fatto, uguale al Laboratorio su 9 squadre su 10 (la decima differisce di 1 per la Coppa) |
| `probabilita.py` | Probabilità di scudetto, podio e ultimo posto dopo ogni giornata, con il motore di Totogirrr (`scripts/toto_quote.py` del repo della lega). Scrive `probabilita.json`. | Fatto |
| `borsino.py` | Valore dei giocatori giornata per giornata: parte dalla quotazione e sale o scende col fantavoto rispetto alla media del ruolo. Scrive `borsino.json`. | Fatto, regola da confermare |
| `post_curva.py` | Post automatici della Curva: sfida lanciata, accettata, rifiutata, scaduta, nascita di un Derby, conferenze, promesse mantenute o tradite, e il post Moviola di Girrr Sport (episodio principale dell'ultima giornata di `moviola.json`, chiave `moviola:G<n>:0`, 10 minuti dopo il Giornale: `SCALETTA` Giornale 0, Radio 5, Moviola 10). Legge `eventi.json` (dal database), `moviola.json` e `data.json`, scrive `post_curva.json`. | Fatto |
| `pubblica_curva.py` | Pubblica i post nella Curva una volta sola ciascuno, con la funzione `curva_adm_scrivi`. Di default prova a vuoto; per pubblicare servono `--vai` e quattro segreti d'ambiente (mai nel repo). | Fatto, mai provato sul database vero |
| `fine_stagione.py` | A stagione finita: riga per l'Albo d'oro, riga per la Coppa Campioni, classifica completa per l'Albo di Latta, cucchiai di legno e mazzate. Scrive `fine_stagione.json`. | Fatto |
| `moviola.py` | Moviola di Girrr Sport: al massimo 3 episodi per giornata giocata (rosso, rigore sbagliato, autogol, rigore parato, partita vinta per meno di 1 punto) con verdetto e testo. Per i titolari con voto toglie l'effetto dell'episodio dal punteggio della squadra e guarda se l'esito cambia ("Ha deciso la partita"; valori delle voci e soglie dei gol ricavati dai dati). Legge `data.json` e `formazioni.json`, scrive `moviola.json`. Una giornata scritta non cambia più (`--rigenera [N,M]` per riscrivere); gli episodi senza squadra nella formazione vengono scartati e segnalati. Il workflow copia `moviola.json` in `girrr/dati/` di gh-pages, da dove la legge la tab del sito. | Fatto |
| `moviola-manuale.json` | Episodi della Moviola aggiunti o corretti a mano, con i video (vedi sotto). Lo script non lo scrive mai; quando cambia, "Calcoli dopo la giornata" rifà solo la Moviola. `moviola.py` scrive anche `moviola-video.html` nella radice del repo: per ogni episodio la ricerca su YouTube e la riga da completare. | Fatto |
| `aspettative.json` | Aspettative a inizio stagione (obiettivo del presidente, posto atteso). Fisse per tutta la stagione. | Generato dal Laboratorio |
| `conferenze.json` | Promesse fatte in conferenza stampa (squadra, giornata, testo, peso 1-3). Oggi vuoto: arriverà dalla tabella `conf_risposta` del database. | Da collegare |

Regola delle promesse (proposta, da confermare): mantenuta +1,5, pareggio -1, tradita -4, per il peso della promessa e per il peso della stagione.

## Moviola a mano (`moviola-manuale.json`)

Un elenco di voci. Ogni voce: `giornata` (della lega), `tipo` (`rosso`, `rigore sbagliato`, `autogol`, `rigore parato`, `altro`), `giocatore`, `squadra` (della lega), e se servono `testo`, `video` (`url` che comincia con `https://` e `secondo` di partenza) e `nascondi`.

```json
[
 {"giornata": 3, "tipo": "rigore sbagliato", "giocatore": "De Bruyne", "squadra": "Apo team",
  "video": {"url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "secondo": 95}},
 {"giornata": 3, "tipo": "rosso", "giocatore": "Pulisic", "squadra": "Oranje VC"},
 {"giornata": 2, "tipo": "altro", "giocatore": "Lautaro", "squadra": "Apo team", "testo": "Gol annullato per un fuorigioco di pochi centimetri."},
 {"giornata": 3, "tipo": "rigore parato", "giocatore": "Carnesecchi", "squadra": "The Blue brothers", "nascondi": true}
]
```

- Stessa giornata, giocatore e tipo di un episodio automatico: aggiunge solo quello che manca (per esempio il video). Testo e verdetto restano quelli calcolati.
- Altrimenti è un episodio nuovo: per `rosso` il verdetto è "Rosso confermato", per `altro` "Da rivedere", per gli altri "Regolare". Il testo è facoltativo: se manca viene dai modelli.
- `nascondi: true` toglie un episodio automatico sbagliato (il posto va al successivo).
- Le voci a mano entrano sempre: prendono il posto degli automatici meno importanti e, se sono più di 3, si vedono tutte. Valgono anche sulle giornate già scritte e restano con `--rigenera`. Link senza `https://`: il video si ignora con un avviso.
- Il giocatore si scrive come in `data.json` ("Ramos G.") o solo col cognome se nella giornata non ce ne sono due uguali.
- Come arrivano i link: Gianluca li manda in chat a Claude Code nel formato "Moviola giornata X: giocatore, tipo, link, secondo" e Claude Code aggiorna `moviola-manuale.json`, rilancia `python3 calcoli/moviola.py` e fa il push. Le righe pronte da completare sono in `moviola-video.html`.
