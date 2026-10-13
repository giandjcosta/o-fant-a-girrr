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


