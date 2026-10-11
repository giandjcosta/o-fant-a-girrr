-- Curva v2: rilanci sul profilo, colore e foto per avatar e sfondo, bio modificabile.
-- Eseguire una volta sola nello SQL Editor di Supabase (è sicuro rieseguirlo).
alter table curva_post add column if not exists img text;
alter table curva_react add column if not exists created timestamptz not null default now();

alter table curva_prof add column if not exists bh int;
alter table curva_prof add column if not exists av text;
alter table curva_prof add column if not exists bi text;
alter table curva_prof add column if not exists avt timestamptz;
alter table curva_prof add column if not exists bit timestamptz;
alter table curva_prof add column if not exists bio text;

drop function if exists curva_profilo(text,text,text,int);
drop function if exists curva_profilo(text,text,text,int,int,text,text);
-- p_av / p_bi: null = non cambiare, '' = togli l'immagine, altrimenti la nuova immagine
create or replace function curva_profilo(p_team text,p_code text,p_emoji text,p_hue int,p_bh int default null,p_av text default null,p_bi text default null,p_bio text default null) returns void language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if char_length(coalesce(p_emoji,''))>8 then raise exception 'Emoji non valida'; end if;
 if p_bio is not null and char_length(p_bio)>100 then raise exception 'La bio può avere al massimo 100 caratteri'; end if;
 if p_av is not null and p_av<>'' and (p_av not like 'data:image/jpeg;base64,%' or char_length(p_av)>60000) then raise exception 'Foto profilo non valida o troppo grande'; end if;
 if p_bi is not null and p_bi<>'' and (p_bi not like 'data:image/jpeg;base64,%' or char_length(p_bi)>140000) then raise exception 'Sfondo non valido o troppo grande'; end if;
 insert into curva_prof(team,emoji,hue,bh,av,avt,bi,bit,bio) values(p_team,nullif(p_emoji,''),p_hue,p_bh,nullif(p_av,''),case when nullif(p_av,'') is not null then now() end,nullif(p_bi,''),case when nullif(p_bi,'') is not null then now() end,nullif(btrim(coalesce(p_bio,'')),''))
 on conflict (team) do update set emoji=excluded.emoji,hue=excluded.hue,bh=excluded.bh,
  av=case when p_av is null then curva_prof.av when p_av='' then null else p_av end,
  avt=case when p_av is null then curva_prof.avt when p_av='' then null else now() end,
  bi=case when p_bi is null then curva_prof.bi when p_bi='' then null else p_bi end,
  bit=case when p_bi is null then curva_prof.bit when p_bi='' then null else now() end,
  bio=case when p_bio is null then curva_prof.bio else nullif(btrim(p_bio),'') end;
end $$;

create or replace function curva_pimg(p_team text,p_w text) returns text language sql stable security definer set search_path=public as $$
 select case when p_w='a' then av else bi end from curva_prof where team=p_team;
$$;

create or replace function curva_feed(p_team text default null,p_code text default null) returns json language plpgsql security definer set search_path=public as $$
declare ok boolean:=p_team is not null and curva_ok(p_team,p_code); res json;
begin
 select json_build_object(
  'v',3,
  'ok',ok,
  'posts',coalesce((select json_agg(x order by x.created desc) from (select id,team,body,extract(epoch from created)*1000 as ts,created,(img is not null) as hi from curva_post order by created desc limit 150) x),'[]'::json),
  'replies',coalesce((select json_agg(json_build_object('id',id,'k',k,'team',team,'body',body,'ts',extract(epoch from created)*1000) order by created) from curva_reply where created>now()-interval '30 days'),'[]'::json),
  'react',coalesce((select json_agg(json_build_object('k',k,'kind',kind,'n',n)) from (select k,kind,count(*) n from curva_react group by k,kind) q),'[]'::json),
  'rt',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='r' and created>now()-interval '30 days'),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue,'bh',bh,'a',case when av is not null then (extract(epoch from avt)*1000)::bigint end,'b',case when bi is not null then (extract(epoch from bit)*1000)::bigint end,'bio',bio)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

grant execute on function curva_feed(text,text),curva_profilo(text,text,text,int,int,text,text,text),curva_pimg(text,text) to anon,authenticated;
