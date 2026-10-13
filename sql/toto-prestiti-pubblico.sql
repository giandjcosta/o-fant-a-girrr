-- Da incollare ed eseguire una volta in Supabase: rende pubblici (senza codici) i prestiti attivi e chiusi, per i post di TotoGirrr in Curva.
create or replace function toto_pr_pubblico()
 returns jsonb language sql security definer set search_path to 'public' as $f$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'creditore',creditore,'debitore',debitore,'importo',importo,'tasso',tasso,'restituito',restituito,'stato',stato,'ts',aggiornato) order by aggiornato desc), '[]'::jsonb)
  from (select * from toto_prestiti where stato in ('attivo','chiuso') order by aggiornato desc limit 20) x;
$f$;
grant execute on function toto_pr_pubblico() to anon, authenticated;
