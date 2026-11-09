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

## Numeri di versione (decisione di Gianluca, 9 novembre 2026)
- Prima di rilasciare qualcosa sul sito vero chiedi a Gianluca che tipo di aggiornamento è: correzione minore → terza cifra (5.6.1, 5.6.2); aggiornamento medio → seconda cifra (5.7, cioè 5.7.0); aggiornamento grande → prima cifra (6.0, 7.0). Sul sito: 5.5.1 (copia offline e scorciatoie); in prova: 5.6.
- A ogni rilascio la versione va aggiunta a `versioni.json` nella radice di `gh-pages` (messaggio per il gruppo e changelog), con `rilascio/versioni/aggiungi.py` del registro: la pagina Versioni e l'avviso in Home si aggiornano da soli.

## Regole sui contenuti — tre livelli di scrittura (decisione di Gianluca, 1° novembre 2026)
O Girrr si racconta come un campionato vero, ma i dati sono quelli ufficiali di Leghe Fantacalcio. Realismo nel racconto, precisione nei dati.
1. **Sportivo** (Home, risultati, classifica, titoli, rivalità, presentazioni delle partite): squadre, allenatori, gol, vittorie, pareggi, sconfitte, punti in classifica, giornata, Campionato, Champions Cup, Derby.
2. **Tecnico** (Tabellone di dettaglio, Regole, Statistiche, Campo, schede, Annuario, Totogirrr): Fantapunti, voti, bonus e malus, modificatore della difesa e fantacrediti dove sono il dato vero, sempre con l'unità chiara.
3. **Editoriale** (Giornale, Radio, Curva, personaggi): raccontano come i media sportivi, con risultati e fatti veri. **Radio e Giornale non parlano di Fantapunti**, tranne: le vittorie decise da pochissimi fantapunti; il Cucchiaio di legno (il punteggio più basso della giornata); le statistiche del Giornale (miglior punteggio, record e simili).
- Non confondere gol del risultato, Fantapunti, punti in classifica e fantacrediti. I pareggi restano pareggi.
- Dove mancano dati storici scrivere «Dato non conservato»: niente statistiche ricostruite per ipotesi.
- Niente disclaimer tipo "notizia inventata" o "dati finti".
- Le frasi iniziano con la maiuscola, anche dopo un punto. Nelle legende usare etichette con iniziale maiuscola e separare chiaramente i significati.
- **Dopo il punto mediano «·» la parola comincia sempre con la maiuscola** (decisione di Gianluca, ribadita il 9 novembre 2026): «Offline · Copia delle 15:46», «Roma · Attaccante», «Campionato · Risultati della 7ª giornata». Mai «· copia», «· pagato». Vale per testi, pulsanti, avvisi, notifiche, immagini e commenti nel codice. I numeri restano numeri («· 9 novembre»).
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
- **Identificazione obbligatoria dell'autore (vale per TUTTI gli assistenti e collaboratori):** ogni nuovo ramo deve iniziare con il prefisso dell'agente che lo crea e ogni messaggio di commit e titolo di Pull Request deve iniziare con il nome dello stesso autore seguito da due punti. Esempi: `chatgpt/nome-attivita` → `ChatGPT: descrizione`; `grok/nome-attivita` → `Grok: descrizione`; `claude/nome-attivita` → `Claude: descrizione`; `vscode/nome-attivita` → `VSCode: descrizione`; `perplexity/nome-attivita` → `Perplexity: descrizione`; `aider/nome-attivita` → `Aider: descrizione`; `gianluca/nome-attivita` → `Gianluca: descrizione`. Il prefisso identifica chi ha realmente effettuato la modifica: non usare il nome di un altro assistente. Anche i commit successivi sullo stesso ramo mantengono il prefisso del loro effettivo autore. Non rinominare rami o riscrivere commit già esistenti per adeguarli retroattivamente.
- Mai `git push --force`, mai riscrivere la storia di un ramo già su GitHub, mai cancellare rami di altri.
- Mai scrivere nel codice chiavi, token o password. Le chiavi "publishable" di Supabase già presenti nelle pagine sono pubbliche per scelta; ogni altra chiave no.
- Prima di consegnare, prova davvero: le pagine devono funzionare a 320 px di larghezza (iPhone SE) senza scorrere di lato, e la console del browser non deve avere errori nuovi.
- **Prove su tutti gli schermi (Gianluca, 9 novembre 2026):** ogni novità e ogni versione si prova su telefono piccolo e grande (iPhone SE, iPhone recente, Android piccolo e grande), iPad e tablet Android in verticale e orizzontale, PC (1280, 1920), monitor grande (2560) e smart TV (1920×1080 a densità doppia), con l'identità di iOS e di Android. A Gianluca si mandano le foto su PC e TV. Script pronto nel registro: `prove/prova_schermi_56.js`. Se un motore non è disponibile (per esempio WebKit/Safari) va detto.

### Cosa serve il "vai" di Gianluca
- Qualsiasi cosa che va online (merge sul ramo pubblicato, push sul sito vero). Unica eccezione: micro correzioni di testo nel sito della lega, che vanno online con un avviso dopo.
- Qualsiasi modifica al database Supabase (progetto `qmjqfgmvimsuxvghetgi`): niente SQL, niente migrazioni, niente dati cambiati senza il suo "vai" esplicito.
- Cancellare file, rami, Pull Request o dati.
- Se un controllo di sicurezza blocca un'operazione, fermati e spiega cosa è successo: non aggirarlo.

### Quando hai finito
- Di' cosa hai cambiato, cosa hai provato e cosa non hai potuto provare (per esempio Safari).
- Per la lega: aggiorna `STATO.md` nel repository `o-girrr-registro`.
- Rispondi in italiano.
