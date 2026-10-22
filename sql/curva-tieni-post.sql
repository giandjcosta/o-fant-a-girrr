-- Curva: i post scritti a mano (Lega, Giornale, Ciro, personaggi) non spariscono più dopo 60 giorni. Sicuro rieseguirlo.
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
  'adm',coalesce((select json_agg(json_build_object('id',id,'h',h,'body',body,'ts',extract(epoch from quando)*1000,'hi',(img is not null)) order by quando desc) from curva_adm where quando<=now()),'[]'::json),
  'rt',coalesce((select json_agg(json_build_object('k',k,'team',team,'ts',extract(epoch from created)*1000) order by created desc) from curva_react where kind='r' and created>now()-interval '30 days'),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue,'bh',bh,'a',case when av is not null then (extract(epoch from avt)*1000)::bigint end,'b',case when bi is not null then (extract(epoch from bit)*1000)::bigint end,'bio',bio)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

grant execute on function curva_feed(text,text) to anon,authenticated;
notify pgrst, 'reload schema';
