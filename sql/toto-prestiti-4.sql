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
