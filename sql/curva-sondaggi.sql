-- Curva: sondaggi (2-4 opzioni, 24 ore, un voto per squadra). Da eseguire dopo curva-likes.sql; è sicuro rieseguirlo.
create table if not exists curva_poll(post_id bigint primary key references curva_post(id) on delete cascade, opts text[] not null check (array_length(opts,1) between 2 and 4));
create table if not exists curva_vote(post_id bigint not null references curva_post(id) on delete cascade, team text not null, opt int not null check (opt between 0 and 3), created timestamptz not null default now(), primary key(post_id,team));
alter table curva_poll enable row level security;
alter table curva_vote enable row level security;

create or replace function curva_sondaggio(p_team text,p_code text,p_body text,p_opts text[]) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint; o text; n int:=0; cl text[]:='{}';
begin perform curva_chk(p_team,p_code);
 if char_length(btrim(p_body)) not between 1 and 280 then raise exception 'La domanda deve avere da 1 a 280 caratteri'; end if;
 foreach o in array coalesce(p_opts,'{}') loop
  if btrim(o)<>'' then
   if char_length(btrim(o))>40 then raise exception 'Ogni risposta può avere al massimo 40 caratteri'; end if;
   cl:=cl||btrim(o); n:=n+1;
  end if;
 end loop;
 if n<2 or n>4 then raise exception 'Servono da 2 a 4 risposte'; end if;
 if (select count(*) from curva_post where team=p_team and created>now()-interval '1 day')>=30 then raise exception 'Troppi cori oggi'; end if;
 insert into curva_post(team,body) values(p_team,btrim(p_body)) returning id into i;
 insert into curva_poll(post_id,opts) values(i,cl);
 return i; end $$;

create or replace function curva_vota(p_team text,p_code text,p_post bigint,p_opt int) returns void language plpgsql security definer set search_path=public as $$
declare po curva_poll; t timestamptz;
begin perform curva_chk(p_team,p_code);
 select * into po from curva_poll where post_id=p_post;
 if po.post_id is null then raise exception 'Sondaggio non trovato'; end if;
 select created into t from curva_post where id=p_post;
 if t<now()-interval '24 hours' then raise exception 'Il sondaggio è chiuso'; end if;
 if p_opt<0 or p_opt>=array_length(po.opts,1) then raise exception 'Risposta non valida'; end if;
 insert into curva_vote(post_id,team,opt) values(p_post,p_team,p_opt) on conflict (post_id,team) do nothing;
end $$;

create or replace function curva_feed(p_team text default null,p_code text default null) returns json language plpgsql security definer set search_path=public as $$
declare ok boolean:=p_team is not null and curva_ok(p_team,p_code); res json;
begin
 select json_build_object(
  'v',4,
  'ok',ok,
  'posts',coalesce((select json_agg(x order by x.created desc) from (select id,team,body,extract(epoch from created)*1000 as ts,created,(img is not null) as hi from curva_post order by created desc limit 150) x),'[]'::json),
  'replies',coalesce((select json_agg(json_build_object('id',id,'k',k,'team',team,'body',body,'ts',extract(epoch from created)*1000) order by created) from curva_reply where created>now()-interval '30 days'),'[]'::json),
  'react',coalesce((select json_agg(json_build_object('k',k,'kind',kind,'n',n)) from (select k,kind,count(*) n from curva_react group by k,kind) q),'[]'::json),
  'lk',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='a' and created>now()-interval '30 days'),'[]'::json),
  'polls',coalesce((select json_agg(json_build_object('id',po.post_id,'o',po.opts,'n',(select json_agg(c order by i) from (select g.i,count(vo.opt) c from generate_series(0,array_length(po.opts,1)-1) g(i) left join curva_vote vo on vo.post_id=po.post_id and vo.opt=g.i group by g.i) q))) from curva_poll po),'[]'::json),
  'pv',case when ok then coalesce((select json_object_agg(post_id,opt) from curva_vote where team=p_team),'{}'::json) else '{}'::json end,
  'rt',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='r' and created>now()-interval '30 days'),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue,'bh',bh,'a',case when av is not null then (extract(epoch from avt)*1000)::bigint end,'b',case when bi is not null then (extract(epoch from bit)*1000)::bigint end,'bio',bio)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

grant execute on function curva_sondaggio(text,text,text,text[]),curva_vota(text,text,bigint,int),curva_feed(text,text) to anon,authenticated;
notify pgrst, 'reload schema';
