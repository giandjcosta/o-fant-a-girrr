# Come si lavora su O Fant A Girrr (sito della lega)

Lo stato aggiornato del progetto, cosa è online e cosa resta da fare sono in `STATO.md` del repository `giandjcosta/o-girrr-registro`: leggilo prima di iniziare.

## Come è fatto
- Ramo `gh-pages`: le pagine pubblicate su https://giandjcosta.github.io/o-fant-a-girrr/ (Lega in `girrr/`, Stadio in `stadio/girrr/`). Quello che arriva su `gh-pages` va online in un minuto.
- Ramo `main`: workflow (`.github/workflows/`) e calcoli (`calcoli/`). Non è pubblicato su Pages.
- Database: Supabase, progetto `qmjqfgmvimsuxvghetgi` (Curva, sfide, Derby, Totogirrr, conferenze).
- Le sorgenti delle pagine stanno nel registro (`o-girrr-registro`, cartella `ufficiale/src/sito/`). Se cambi una pagina su `gh-pages`, fai la stessa modifica anche lì, altrimenti il prossimo rilascio la cancella.

## Regole di questo repository
- I workflow scrivono su `main` e `gh-pages` da soli (Curva ogni 5-30 minuti, voti e calcoli dopo le giornate). Prima di ogni push: `git pull --rebase` sul ramo giusto. Mai push forzati.
- Non modificare a mano i file che scrivono i workflow: `data.json`, `formazioni.json`, `toto-quote.json`, `riepiloghi/`, `calcoli/*.json` (salvo `calcoli/moviola-manuale.json`, che è a mano), `calcoli/pubblicati.json`, `girrr/dati/`.
- Rilasci: prima `gh-pages`, poi controlla il sito vero (pagina aperta, console senza errori nuovi), solo dopo `main`. Tieni nota degli hash dei commit e di come tornare indietro (`git revert`).
- Le pagine Lega e Stadio sono due copie con grafica diversa: una modifica di solito va fatta in entrambe, attenzione ai percorsi relativi (da `stadio/girrr/` i dati della Lega sono in `../../girrr/`).

## Regole sui contenuti
- Storie come un campionato vero (giocatori, gol, squadre, allenatori). Niente riferimenti a fantacalcio, crediti, fantapunti o fantamedia, salvo i punteggi.
- Niente disclaimer tipo "notizia inventata" o "dati finti".
- "Derby" sempre con la D maiuscola. Titoli ed etichette con la maiuscola iniziale.
- I post ufficiali (Girrr Sport, Lega, Giornale) non parlano mai di scommesse.

## Regole comuni a tutti i repository di Gianluca

Valgono per chiunque modifichi questi repository: Gianluca, Claude Code (cloud o desktop), l'agente di VS Code, Perplexity, Aider o altri.

Repository: `o-fant-a-girrr` (sito della lega), `o-girrr-registro` (laboratorio e registro della lega), `armocromatic` (sito di armocromia), `giandjcosta` (profilo GitHub).

### Prima di cominciare
1. Leggi questo file fino in fondo: sotto ci sono le regole del singolo progetto.
2. Aggiorna la copia locale (`git pull`). I repository cambiano di continuo: lavorano più assistenti, e sul sito della lega scrivono anche i workflow ogni pochi minuti.
3. Guarda le Pull Request e i rami aperti: se qualcuno sta già lavorando sulla stessa parte, non sovrapporti.

### Mentre lavori
- Una modifica per argomento, piccola. Non toccare file che non c'entrano con quello che ti è stato chiesto.
- Lavora su un ramo con il tuo nome davanti: `claude/…`, `vscode/…`, `perplexity/…`, `aider/…`, `gianluca/…`. Commit con messaggi in italiano che dicono cosa cambia.
- Mai `git push --force`, mai riscrivere la storia di un ramo già su GitHub, mai cancellare rami di altri.
- Mai scrivere nel codice chiavi, token o password. Le chiavi "publishable" di Supabase già presenti nelle pagine sono pubbliche per scelta; ogni altra chiave no.
- Prima di consegnare, prova davvero: le pagine devono funzionare a 320 px di larghezza (iPhone SE) senza scorrere di lato, e la console del browser non deve avere errori nuovi.

### Cosa serve il "vai" di Gianluca
- Qualsiasi cosa che va online (merge sul ramo pubblicato, push sul sito vero). Unica eccezione: micro correzioni di testo nel sito della lega, che vanno online con un avviso dopo.
- Qualsiasi modifica al database Supabase (progetto `qmjqfgmvimsuxvghetgi`): niente SQL, niente migrazioni, niente dati cambiati senza il suo "vai" esplicito.
- Cancellare file, rami, Pull Request o dati.
- Se un controllo di sicurezza blocca un'operazione, fermati e spiega cosa è successo: non aggirarlo.

### Quando hai finito
- Di' cosa hai cambiato, cosa hai provato e cosa non hai potuto provare (per esempio Safari).
- Per la lega: aggiorna `STATO.md` nel repository `o-girrr-registro`.
- Rispondi in italiano.
