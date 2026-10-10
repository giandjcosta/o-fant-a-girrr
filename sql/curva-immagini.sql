-- Curva · aggiornamento: immagini nei cori. Da eseguire DOPO curva.sql.
alter table curva_post add column if not exists img text;
alter table curva_post drop constraint if exists curva_post_img_ok;
alter table curva_post add constraint curva_post_img_ok check (img is null or (img like 'data:image/jpeg;base64,%' and char_length(img)<=220000));

drop function if exists curva_scrivi(text,text,text);
create or replace function curva_scrivi(p_team text,p_code text,p_body text,p_img text default null) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin perform curva_chk(p_team,p_code);
 if char_length(btrim(p_body)) not between 1 and 140 then raise exception 'Il coro deve avere da 1 a 140 caratteri'; end if;
 if (select count(*) from curva_post where team=p_team and created>now()-interval '1 day')>=30 then raise exception 'Troppi cori oggi'; end if;
 if p_img is not null and (p_img not like 'data:image/jpeg;base64,%' or char_length(p_img)>220000) then raise exception 'Immagine non valida o troppo grande'; end if;
 insert into curva_post(team,body,img) values(p_team,btrim(p_body),p_img) returning id into i; return i; end $$;

create or replace function curva_img(p_id bigint) returns text language sql stable security definer set search_path=public as $$
 select img from curva_post where id=p_id;
$$;

create or replace function curva_feed(p_team text default null,p_code text default null) returns json language plpgsql security definer set search_path=public as $$
declare ok boolean:=p_team is not null and curva_ok(p_team,p_code); res json;
begin
 select json_build_object(
  'ok',ok,
  'posts',coalesce((select json_agg(x order by x.created desc) from (select id,team,body,extract(epoch from created)*1000 as ts,created,(img is not null) as hi from curva_post order by created desc limit 150) x),'[]'::json),
  'replies',coalesce((select json_agg(json_build_object('id',id,'k',k,'team',team,'body',body,'ts',extract(epoch from created)*1000) order by created) from curva_reply where created>now()-interval '30 days'),'[]'::json),
  'react',coalesce((select json_agg(json_build_object('k',k,'kind',kind,'n',n)) from (select k,kind,count(*) n from curva_react group by k,kind) q),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

grant execute on function curva_scrivi(text,text,text,text),curva_img(bigint),curva_feed(text,text) to anon,authenticated;
