-- Curva · backend (Supabase). Incollare tutto nello SQL Editor ed eseguire.
-- Nessun accesso diretto alle tabelle: tutto passa dalle funzioni, che controllano il codice squadra.

create table if not exists curva_lock(team text primary key, h text not null);
create table if not exists curva_post(id bigserial primary key, team text not null, body text not null check (char_length(body) between 1 and 160), created timestamptz not null default now());
create table if not exists curva_reply(id bigserial primary key, k text not null, team text not null, body text not null check (char_length(body) between 1 and 160), created timestamptz not null default now());
create table if not exists curva_react(k text not null, team text not null, kind text not null check (kind in ('a','r')), primary key(k,team,kind));
create table if not exists curva_follow(team text not null, h text not null, primary key(team,h));
create table if not exists curva_prof(team text primary key, emoji text, hue int);
create index if not exists curva_reply_k on curva_reply(k);
create index if not exists curva_post_c on curva_post(created desc);
alter table curva_lock enable row level security;alter table curva_post enable row level security;alter table curva_reply enable row level security;
alter table curva_react enable row level security;alter table curva_follow enable row level security;alter table curva_prof enable row level security;
revoke all on curva_lock,curva_post,curva_reply,curva_react,curva_follow,curva_prof from anon,authenticated;

-- hash dei codici (gli stessi di data.json "lock"); aggiornare qui se cambiano i codici
insert into curva_lock(team,h) values
 ('The Blue brothers','9wa0tt'),('Apo team','uo2udk'),('Grodah','1k0gzg4'),('WOA','1tv1vl7'),('Real Madrink','4ew82v'),
 ('stif dc','okr2rh'),('Mariana Coneja','u93rsx'),('AFA SELECCION','1k5xv53'),('Oranje VC','1w47hm8'),('Atletico ma non troppo','1kzxfrf')
on conflict (team) do update set h=excluded.h;

-- FNV-1a a 32 bit in base 36, identico al sito: hsh(team+'|'+CODE)
create or replace function curva_hash(s text) returns text language plpgsql immutable as $$
declare b bytea:=convert_to(s,'UTF8'); h bigint:=2166136261; i int; n bigint; r text:=''; d int;
begin
 for i in 0..length(b)-1 loop h:=((h # get_byte(b,i))*16777619) % 4294967296; end loop;
 n:=h; if n=0 then return '0'; end if;
 while n>0 loop d:=(n%36); r:=substr('0123456789abcdefghijklmnopqrstuvwxyz',d+1,1)||r; n:=n/36; end loop;
 return r;
end $$;

create or replace function curva_ok(p_team text,p_code text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from curva_lock where team=p_team and h=curva_hash(p_team||'|'||upper(coalesce(p_code,''))));
$$;
create or replace function curva_chk(p_team text,p_code text) returns void language plpgsql security definer set search_path=public as $$
begin if not curva_ok(p_team,p_code) then raise exception 'Codice non valido'; end if; end $$;

-- Feed: lettura libera (p_team/p_code opzionali); se il codice è giusto torna anche segui, applausi miei e profilo
create or replace function curva_feed(p_team text default null,p_code text default null) returns json language plpgsql security definer set search_path=public as $$
declare ok boolean:=p_team is not null and curva_ok(p_team,p_code); res json;
begin
 select json_build_object(
  'ok',ok,
  'posts',coalesce((select json_agg(x order by x.created desc) from (select id,team,body,extract(epoch from created)*1000 as ts,created from curva_post order by created desc limit 150) x),'[]'::json),
  'replies',coalesce((select json_agg(json_build_object('id',id,'k',k,'team',team,'body',body,'ts',extract(epoch from created)*1000) order by created) from curva_reply where created>now()-interval '30 days'),'[]'::json),
  'react',coalesce((select json_agg(json_build_object('k',k,'kind',kind,'n',n)) from (select k,kind,count(*) n from curva_react group by k,kind) q),'[]'::json),
  'mine',case when ok then coalesce((select json_agg(json_build_object('k',k,'kind',kind)) from curva_react where team=p_team),'[]'::json) else '[]'::json end,
  'follow',case when ok then coalesce((select json_agg(h) from curva_follow where team=p_team),'[]'::json) else '[]'::json end,
  'prof',coalesce((select json_object_agg(team,json_build_object('e',emoji,'h',hue)) from curva_prof),'{}'::json)
 ) into res;
 return res;
end $$;

create or replace function curva_scrivi(p_team text,p_code text,p_body text) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin perform curva_chk(p_team,p_code);
 if char_length(btrim(p_body)) not between 1 and 140 then raise exception 'Il coro deve avere da 1 a 140 caratteri'; end if;
 if (select count(*) from curva_post where team=p_team and created>now()-interval '1 day')>=30 then raise exception 'Troppi cori oggi'; end if;
 insert into curva_post(team,body) values(p_team,btrim(p_body)) returning id into i; return i; end $$;

create or replace function curva_rispondi(p_team text,p_code text,p_k text,p_body text) returns bigint language plpgsql security definer set search_path=public as $$
declare i bigint;
begin perform curva_chk(p_team,p_code);
 if char_length(btrim(p_body)) not between 1 and 140 then raise exception 'La risposta deve avere da 1 a 140 caratteri'; end if;
 if char_length(p_k)>40 then raise exception 'Coro non valido'; end if;
 if (select count(*) from curva_reply where team=p_team and created>now()-interval '1 day')>=60 then raise exception 'Troppe risposte oggi'; end if;
 insert into curva_reply(k,team,body) values(p_k,p_team,btrim(p_body)) returning id into i; return i; end $$;

create or replace function curva_reagisci(p_team text,p_code text,p_k text,p_kind text) returns boolean language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if p_kind not in ('a','r') or char_length(p_k)>40 then raise exception 'Richiesta non valida'; end if;
 if exists(select 1 from curva_react where k=p_k and team=p_team and kind=p_kind) then delete from curva_react where k=p_k and team=p_team and kind=p_kind; return false;
 else insert into curva_react(k,team,kind) values(p_k,p_team,p_kind); return true; end if; end $$;

-- cancella un coro (p_tipo 'p') o una risposta ('r'): solo l'autore o Oranje VC
create or replace function curva_cancella(p_team text,p_code text,p_tipo text,p_id bigint) returns void language plpgsql security definer set search_path=public as $$
declare a text;
begin perform curva_chk(p_team,p_code);
 if p_tipo='p' then select team into a from curva_post where id=p_id; else select team into a from curva_reply where id=p_id; end if;
 if a is null then return; end if;
 if a<>p_team and p_team<>'Oranje VC' then raise exception 'Puoi cancellare solo i tuoi cori'; end if;
 if p_tipo='p' then delete from curva_post where id=p_id; delete from curva_react where k='p'||p_id; delete from curva_reply where k='p'||p_id;
 else delete from curva_reply where id=p_id; end if; end $$;

create or replace function curva_segui(p_team text,p_code text,p_h text) returns boolean language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if char_length(p_h)>60 then raise exception 'Richiesta non valida'; end if;
 if exists(select 1 from curva_follow where team=p_team and h=p_h) then delete from curva_follow where team=p_team and h=p_h; return false;
 else insert into curva_follow(team,h) values(p_team,p_h); return true; end if; end $$;

create or replace function curva_profilo(p_team text,p_code text,p_emoji text,p_hue int) returns void language plpgsql security definer set search_path=public as $$
begin perform curva_chk(p_team,p_code);
 if char_length(coalesce(p_emoji,''))>8 then raise exception 'Emoji non valida'; end if;
 insert into curva_prof(team,emoji,hue) values(p_team,nullif(p_emoji,''),p_hue) on conflict (team) do update set emoji=excluded.emoji,hue=excluded.hue; end $$;

grant execute on function curva_feed(text,text),curva_scrivi(text,text,text),curva_rispondi(text,text,text,text),curva_reagisci(text,text,text,text),curva_cancella(text,text,text,bigint),curva_segui(text,text,text),curva_profilo(text,text,text,int) to anon,authenticated;
revoke execute on function curva_ok(text,text),curva_chk(text,text),curva_hash(text) from anon,authenticated,public;
