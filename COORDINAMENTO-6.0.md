# Pacchetto server ChatGPT per la 6.0

Integra `calcoli/tifosi/` e il workflow `tifosi-giornata.yml` insieme al rilascio preparato nel Registro. Coordinamento e istruzioni complete: https://github.com/giandjcosta/o-girrr-registro/issues/57 e `COORDINAMENTO-6.0.md` sul ramo 6.0 del Registro.

Nessun deploy o modifica del database è stato eseguito. La SQL nuova è nel Registro (`sql/mvp-tifosi-60.sql`) e richiede l’autorizzazione prevista in AGENTS.md. Il workflow non lavora dal ramo di preparazione e non si attiva sul main finché `versioni.json` di gh-pages non indica la 6.0.

La dipendenza `calcoli/premi/registra_premi.py` è inclusa, identica alla fonte del Registro: serve al controllo delle intestazioni del nuovo workflow. Il workflow sponsor continua a usare il Registro come prima.

Si riusa `SUPABASE_SECRET_KEY` oppure il vecchio `SUPABASE_SERVICE_ROLE_KEY`, con lo stesso controllo di tipo/progetto già usato dai premi. Non configurare chiavi pubbliche al loro posto. Il servizio non modifica crediti, reputazione o gh-pages; apre votazioni con giurie vere e normalizzate e archivia quelle scadute anche senza allenatori.

Il codice che pubblica i racconti resta nel Registro ed estende la redazione già programmata, senza nuove API a pagamento. Le versioni anteriori alla 6.0 non vengono toccate.
