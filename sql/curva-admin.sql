-- Curva: pannello "Per Me" (solo Oranje VC). Post programmati come Lega/Giornale/Ciro o frase di un personaggio. Da eseguire dopo curva-sondaggi.sql; è sicuro rieseguirlo.
create table if not exists curva_adm(id bigserial primary key, h text not null check (h ~ '^[a-z0-9_]{2,40}$'), body text not null check (char_length(body) between 1 and 280), img text, quando timestamptz not null, created timestamptz not null default now());
alter table curva_adm enable row level security;

create or replace function curva_adm_scrivi(p_team text,p_code text,p_h text,p_body text,p_img text default null,p_quando timestamptz default null) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint; q timestamptz:=coalesce(p_quando,now());
begin perform curva_chk(p_team,p_code);
 if p_team<>'Oranje VC' then raise exception 'Solo Oranje VC'; end if;
 if p_h !~ '^[a-z0-9_]{2,40}$' then raise exception 'Personaggio non valido'; end if;
 if char_length(btrim(p_body)) not between 1 and 280 then raise exception 'Il testo deve avere da 1 a 280 caratteri'; end if;
 if p_img is not null and (p_img not like 'data:image/jpeg%' or char_length(p_img)>200000) then raise exception 'Immagine non valida'; end if;
 if q>now()+interval '90 days' then raise exception 'Data troppo lontana'; end if;
 insert into curva_adm(h,body,img,quando) values(p_h,btrim(p_body),p_img,q) returning id into i;
 return i; end $$;

create or replace function curva_adm_lista(p_team text,p_code text) returns json language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if p_team<>'Oranje VC' then raise exception 'Solo Oranje VC'; end if;
 return coalesce((select json_agg(json_build_object('id',id,'h',h,'body',body,'ts',extract(epoch from quando)*1000,'hi',(img is not null)) order by quando desc) from (select * from curva_adm order by quando desc limit 40) z),'[]'::json); end $$;

create or replace function curva_adm_cancella(p_team text,p_code text,p_id bigint) returns void language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if p_team<>'Oranje VC' then raise exception 'Solo Oranje VC'; end if;
 delete from curva_adm where id=p_id; delete from curva_react where k='a'||p_id; delete from curva_reply where k='a'||p_id; end $$;

create or replace function curva_adm_img(p_id bigint) returns text language sql stable security definer set search_path=public as $$
 select img from curva_adm where id=p_id and quando<=now();
$$;

create or replace function curva_feed(p_team text default null,p_code text default null) returns json language plpgsql security definer set search_path=public as $$
declare ok boolean:=p_team is not null and curva_ok(p_team,p_code); res json;
begin
 select json_build_object(
  'v',5,
  'ok',ok,
  'posts',coalesce((select json_agg(x order by x.created desc) from (select id,team,body,extract(epoch from created)*1000 as ts,created,(img is not null) as hi from curva_post order by created desc limit 150) x),'[]'::json),
  'replies',coalesce((select json_agg(json_build_object('id',id,'k',k,'team',team,'body',body,'ts',extract(epoch from created)*1000) order by created) from curva_reply where created>now()-interval '30 days'),'[]'::json),
  'react',coalesce((select json_agg(json_build_object('k',k,'kind',kind,'n',n)) from (select k,kind,count(*) n from curva_react group by k,kind) q),'[]'::json),
  'lk',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='a' and created>now()-interval '30 days'),'[]'::json),
  'polls',coalesce((select json_agg(json_build_object('id',po.post_id,'o',po.opts,'n',(select json_agg(c order by i) from (select g.i,count(vo.opt) c from generate_series(0,array_length(po.opts,1)-1) g(i) left join curva_vote vo on vo.post_id=po.post_id and vo.opt=g.i group by g.i) q))) from curva_poll po),'[]'::json),
  'pv',case when ok then coalesce((select json_object_agg(post_id,opt) from curva_vote where team=p_team),'{}'::json) else '{}'::json end,
  'adm',coalesce((select json_agg(json_build_object('id',id,'h',h,'body',body,'ts',extract(epoch from quando)*1000,'hi',(img is not null)) order by quando desc) from curva_adm where quando<=now() and quando>now()-interval '60 days'),'[]'::json),
  'rt',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='r' and created>now()-interval '30 days'),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue,'bh',bh,'a',case when av is not null then (extract(epoch from avt)*1000)::bigint end,'b',case when bi is not null then (extract(epoch from bit)*1000)::bigint end,'bio',bio)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

grant execute on function curva_adm_scrivi(text,text,text,text,text,timestamptz),curva_adm_lista(text,text),curva_adm_cancella(text,text,bigint),curva_adm_img(bigint),curva_feed(text,text) to anon,authenticated;
notify pgrst, 'reload schema';
