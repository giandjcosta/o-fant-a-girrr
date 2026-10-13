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


