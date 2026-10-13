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

create or replace function toto_pr_chiedi(p_team text, p_code text, p_a text, p_importo numeric, p_tasso numeric)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare nid bigint;
begin
  perform toto_chk(p_team, p_code);
  if p_a = p_team then raise exception 'Non puoi chiedere a te stesso'; end if;
  if not exists (select 1 from toto_conti where team = p_a) then raise exception 'Quella squadra non ha ancora un conto Totogirrr'; end if;
  if p_importo not in (10,25,50,100,150,200) then raise exception 'Importo non valido'; end if;
  if p_tasso not in (1.02,1.05,1.10,1.15,1.20,1.30,1.50) then raise exception 'Tasso non valido'; end if;
  if (select count(*) from toto_prestiti where debitore = p_team and stato in ('richiesta','controproposta')) >= 3 then
    raise exception 'Hai già 3 richieste in attesa'; end if;
  insert into toto_prestiti(creditore, debitore, importo, tasso, stato, attesa_di) values (p_a, p_team, p_importo, p_tasso, 'richiesta', p_a) returning id into nid;
  return jsonb_build_object('id', nid);
end $f$;

create or replace function toto_pr_rispondi(p_team text, p_code text, p_id bigint, p_azione text, p_tasso numeric default null)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare r toto_prestiti%rowtype; cc toto_conti%rowtype; dd numeric;
begin
  perform toto_chk(p_team, p_code);
  select * into r from toto_prestiti where id = p_id for update;
  if not found then raise exception 'Richiesta non trovata'; end if;
  if r.stato not in ('richiesta','controproposta') or r.attesa_di <> p_team then raise exception 'Non tocca a te rispondere'; end if;
  if p_azione = 'rifiuta' then
    update toto_prestiti set stato = 'rifiutato', aggiornato = now() where id = p_id; return jsonb_build_object('stato','rifiutato');
  elsif p_azione = 'controproponi' then
    if r.stato <> 'richiesta' or p_team <> r.creditore then raise exception 'Controproposta non possibile'; end if;
    if p_tasso not in (1.02,1.05,1.10,1.15,1.20,1.30,1.50) then raise exception 'Tasso non valido'; end if;
    update toto_prestiti set tasso = p_tasso, stato = 'controproposta', attesa_di = r.debitore, aggiornato = now() where id = p_id;
    return jsonb_build_object('stato','controproposta');
  elsif p_azione = 'accetta' then
    select * into cc from toto_conti where team = r.creditore for update;
    if cc.crediti < r.importo then raise exception 'Il prestatore non ha abbastanza fantacrediti'; end if;
    dd := round(r.importo * r.tasso, 2);
    update toto_conti set crediti = crediti - r.importo where team = r.creditore;
    update toto_conti set crediti = crediti + r.importo, debito_p = debito_p + dd where team = r.debitore;
    update toto_prestiti set stato = 'attivo', attesa_di = null, aggiornato = now() where id = p_id;
    insert into toto_movimenti(team,tipo,importo,nota) values
      (r.creditore,'prestito_dato',-r.importo,'Prestito a '||r.debitore||' al '||round(r.tasso*100)||'%'),
      (r.debitore,'prestito_ricevuto',r.importo,'Prestito da '||r.creditore||': ne devi restituire '||dd);
    return jsonb_build_object('stato','attivo','da_restituire',dd);
  end if;
  raise exception 'Azione non valida';
end $f$;

create or replace function toto_pr_restituisci(p_team text, p_code text, p_id bigint, p_importo numeric)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare r toto_prestiti%rowtype; resto numeric; v numeric; cd toto_conti%rowtype;
begin
  perform toto_chk(p_team, p_code);
  select * into r from toto_prestiti where id = p_id for update;
  if not found or r.debitore <> p_team or r.stato <> 'attivo' then raise exception 'Prestito non trovato'; end if;
  select * into cd from toto_conti where team = p_team for update;
  resto := round(r.importo * r.tasso, 2) - r.restituito;
  v := least(p_importo, resto, cd.crediti);
  if v <= 0 then raise exception 'Niente da restituire o fantacrediti insufficienti'; end if;
  update toto_conti set crediti = crediti - v, debito_p = greatest(0, debito_p - v) where team = p_team;
  update toto_conti set crediti = crediti + v where team = r.creditore;
  update toto_prestiti set restituito = restituito + v, stato = case when restituito + v >= round(importo*tasso,2) then 'chiuso' else stato end, aggiornato = now() where id = p_id;
  insert into toto_movimenti(team,tipo,importo,nota) values
    (p_team,'restituzione',-v,'Restituzione a '||r.creditore), (r.creditore,'rimborso_ricevuto',v,'Restituzione da '||p_team);
  return jsonb_build_object('restituito', v);
end $f$;

create or replace function toto_pr_stato(p_team text, p_code text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
begin
  perform toto_chk(p_team, p_code);
  return jsonb_build_object(
   'prestiti', coalesce((select jsonb_agg(jsonb_build_object('id',id,'creditore',creditore,'debitore',debitore,'importo',importo,'tasso',tasso,'restituito',restituito,'stato',stato,'attesa_di',attesa_di,'creato',creato) order by aggiornato desc)
       from toto_prestiti where (creditore = p_team or debitore = p_team) and (stato in ('richiesta','controproposta','attivo') or aggiornato > now() - interval '7 days')), '[]'::jsonb),
   'movimenti', coalesce((select jsonb_agg(jsonb_build_object('tipo',tipo,'importo',importo,'nota',nota,'creato',creato) order by creato desc)
       from (select * from toto_movimenti where team = p_team order by creato desc limit 30) m), '[]'::jsonb),
   'debito_p', (select debito_p from toto_conti where team = p_team));
end $f$;

grant execute on function toto_pr_chiedi(text,text,text,numeric,numeric), toto_pr_rispondi(text,text,bigint,text,numeric),
  toto_pr_restituisci(text,text,bigint,numeric), toto_pr_stato(text,text) to anon, authenticated;

-- toto_risolvi: come prima (40% al banco), in piu' il 25% della vincita va ai prestatori e tutto finisce nei movimenti
create or replace function public.toto_risolvi(p_id text)
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare s record; l record; n_v int; n_p int; n_sch int := 0; vin numeric; tr numeric; cd numeric; dp numeric; quota numeric; rest numeric; pay numeric; tot numeric;
begin
  for s in select distinct sc.id, sc.team, sc.puntata, sc.quota from toto_schedine sc join toto_selezioni x on x.schedina = sc.id
           where x.partita = p_id and sc.stato = 'aperta' loop
    select count(*) filter (where esito='v'), count(*) filter (where esito='p') into n_v, n_p from toto_selezioni where schedina = s.id;
    if n_p > 0 then
      update toto_schedine set stato = 'persa' where id = s.id; n_sch := n_sch + 1;
    elsif n_v = (select count(*) from toto_selezioni where schedina = s.id) then
      vin := round(s.puntata*s.quota,2);
      select debito, debito_p into cd, dp from toto_conti where team = s.team for update;
      tr := least(cd, round(vin*0.4,2));
      -- quota ai prestatori: 25% della vincita, fino al debito verso di loro
      quota := least(dp, round(vin*0.25,2)); rest := quota; tot := 0;
      for l in select * from toto_prestiti where debitore = s.team and stato = 'attivo' order by creato for update loop
        exit when rest <= 0;
        pay := least(rest, round(l.importo*l.tasso,2) - l.restituito);
        if pay > 0 then
          update toto_prestiti set restituito = restituito + pay, stato = case when restituito + pay >= round(importo*tasso,2) then 'chiuso' else stato end, aggiornato = now() where id = l.id;
          update toto_conti set crediti = crediti + pay where team = l.creditore;
          insert into toto_movimenti(team,tipo,importo,nota) values
            (l.creditore,'rimborso_ricevuto',pay,'Rimborso automatico da '||s.team||' (25% di una vincita)'),
            (s.team,'rimborso',-pay,'25% della vincita a '||l.creditore||' per il prestito');
          rest := rest - pay; tot := tot + pay;
        end if;
      end loop;
      update toto_schedine set stato = 'vinta', vincita = vin where id = s.id;
      update toto_conti set crediti = crediti + vin - tr - tot, debito = debito - tr, debito_p = greatest(0, debito_p - tot) where team = s.team;
      if tr > 0 then insert into toto_movimenti(team,tipo,importo,nota) values (s.team,'banco',-tr,'40% della vincita trattenuto dal banco per il prestito'); end if;
      n_sch := n_sch + 1;
    end if;
  end loop;
  return n_sch;
end $function$;
