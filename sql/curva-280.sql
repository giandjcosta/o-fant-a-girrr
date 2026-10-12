-- Curva: i cori possono avere fino a 280 caratteri (le risposte restano a 140).
-- Eseguire una volta sola nello SQL Editor di Supabase (è sicuro rieseguirlo).
alter table curva_post drop constraint if exists curva_post_body_check;
alter table curva_post add constraint curva_post_body_check check (char_length(body) between 1 and 280);

create or replace function curva_scrivi(p_team text,p_code text,p_body text,p_img text default null) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin perform curva_chk(p_team,p_code);
 if char_length(btrim(p_body)) not between 1 and 280 then raise exception 'Il coro deve avere da 1 a 280 caratteri'; end if;
 if (select count(*) from curva_post where team=p_team and created>now()-interval '1 day')>=30 then raise exception 'Troppi cori oggi'; end if;
 if p_img is not null and (p_img not like 'data:image/jpeg;base64,%' or char_length(p_img)>220000) then raise exception 'Immagine non valida o troppo grande'; end if;
 insert into curva_post(team,body,img) values(p_team,btrim(p_body),p_img) returning id into i; return i; end $$;

grant execute on function curva_scrivi(text,text,text,text) to anon,authenticated;
notify pgrst, 'reload schema';
