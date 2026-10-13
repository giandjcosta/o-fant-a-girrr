-- Totogirrr: prestiti tra fantallenatori + movimenti del conto.
-- Da incollare nel SQL Editor di Supabase ed eseguire una volta sola.
-- Non tocca le tabelle esistenti, tranne una colonna nuova in toto_conti (debito_p).
-- Rimborso automatico: il 25% di ogni vincita del debitore va ai prestatori (dopo la
-- trattenuta del 40% del banco, che resta com'era). Il debitore puo' restituire di piu' quando vuole.

alter table toto_conti add column if not exists debito_p numeric not null default 0;

create table if not exists toto_prestiti (
  id bigserial primary key,
  creditore text not null,
  debitore text not null,
  importo numeric not null,
  tasso numeric not null,            -- 1.10 = restituisci il 110%
  restituito numeric not null default 0,
  stato text not null default 'richiesta',  -- richiesta, controproposta, attivo, chiuso, rifiutato
  attesa_di text,                    -- chi deve rispondere
  creato timestamptz not null default now(),
  aggiornato timestamptz not null default now()
);
create table if not exists toto_movimenti (
  id bigserial primary key,
  team text not null,
  tipo text not null,                -- banco, prestito_dato, prestito_ricevuto, rimborso, rimborso_ricevuto, restituzione
  importo numeric not null,          -- con segno: negativo = esce dal tuo conto
  nota text,
  creato timestamptz not null default now()
);
alter table toto_prestiti enable row level security;
alter table toto_movimenti enable row level security;


