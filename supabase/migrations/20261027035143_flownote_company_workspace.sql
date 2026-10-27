-- Flownote hosted workspace. Passwords and sessions belong to Supabase Auth.
-- No production SQLite data is imported by this migration.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active','suspended','archived')),
  plan_code text not null default 'pilot',
  max_clients integer not null default 3 check (max_clients between 1 and 10000),
  created_at timestamptz not null default now()
);
create table public.company_memberships (
  company_id uuid not null references public.companies(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','editor','reviewer','viewer')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  primary key (company_id,user_id)
);
create index memberships_user_company_idx on public.company_memberships(user_id,company_id) where status='active';
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  csv_client_id text not null check (csv_client_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(company_id,id), unique(company_id,csv_client_id)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  client_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  campaigns text[] not null check (cardinality(campaigns) between 1 and 100),
  starts_on date not null, ends_on date not null check (ends_on>=starts_on),
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(company_id,id),
  foreign key(company_id,client_id) references public.clients(company_id,id)
);
create index projects_company_client_dates_idx on public.projects(company_id,client_id,starts_on,ends_on);
create table public.data_imports (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  project_id uuid not null, filename text not null check (char_length(filename) between 1 and 200),
  declared_source_sha256 text check (declared_source_sha256 ~ '^[a-f0-9]{64}$'),
  -- The DB computes canonical_rows_sha256 itself; declared_source_sha256 is untrusted client metadata.
  canonical_rows_sha256 text not null, source_row_count integer not null check (source_row_count between 1 and 15000),
  accepted_row_count integer not null check (accepted_row_count between 1 and 15000),
  excluded_row_count integer not null check (excluded_row_count>=0),
  excluded_reasons jsonb not null default '[]' check (jsonb_typeof(excluded_reasons)='array'),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  check (source_row_count=accepted_row_count+excluded_row_count),
  unique(company_id,id,project_id),
  foreign key(company_id,project_id) references public.projects(company_id,id)
);
create index imports_company_project_created_idx on public.data_imports(company_id,project_id,created_at desc);
create table public.import_rows (
  id bigint generated always as identity primary key,
  company_id uuid not null, import_id uuid not null, project_id uuid not null,
  source_line integer not null check (source_line>0), metric_date date not null,
  campaign text not null check (char_length(btrim(campaign)) between 1 and 200),
  currency text not null default 'KRW' check (currency='KRW'),
  impressions bigint not null check (impressions between 0 and 9007199254740991),
  clicks bigint not null check (clicks between 0 and 9007199254740991),
  spend_cents bigint not null check (spend_cents between 0 and 9007199254740991),
  leads bigint not null check (leads between 0 and 9007199254740991),
  unique(import_id,source_line), unique(import_id,metric_date,campaign),
  foreign key(company_id,import_id,project_id) references public.data_imports(company_id,id,project_id)
);
create index import_rows_company_import_date_idx on public.import_rows(company_id,import_id,metric_date);
create table public.reports (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  project_id uuid not null, period_start date not null, period_end date not null,
  created_at timestamptz not null default now(),
  check (period_end between period_start and period_start+365),
  unique(company_id,id,project_id), unique(company_id,project_id,period_start,period_end),
  foreign key(company_id,project_id) references public.projects(company_id,id)
);
create table public.report_versions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null,
  project_id uuid not null, report_id uuid not null, import_id uuid not null,
  version integer not null check(version>0),
  status text not null default 'DRAFT' check(status in ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','DELIVERED')),
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  content_hash text not null, note text not null default '' check(char_length(note)<=2000),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id), approved_at timestamptz, delivered_at timestamptz,
  check(approved_by is null or approved_by<>created_by),
  check((status in ('APPROVED','DELIVERED'))=(approved_by is not null and approved_at is not null)),
  check((status='DELIVERED')=(delivered_at is not null)),
  unique(report_id,version), unique(report_id,content_hash), unique(company_id,id),
  foreign key(company_id,report_id,project_id) references public.reports(company_id,id,project_id),
  foreign key(company_id,import_id,project_id) references public.data_imports(company_id,id,project_id)
);
create index versions_company_report_version_idx on public.report_versions(company_id,report_id,version desc);
create index versions_company_status_idx on public.report_versions(company_id,status,created_at desc);
create table public.report_events (
  id bigint generated always as identity primary key,
  company_id uuid not null, report_version_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null check(action in ('submit','request_changes','approve','mark_delivered')),
  note text not null default '' check(char_length(note)<=2000),
  created_at timestamptz not null default now(),
  foreign key(company_id,report_version_id) references public.report_versions(company_id,id)
);
create index report_events_company_version_idx on public.report_events(company_id,report_version_id,created_at desc);
create table public.audit_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id), actor_id uuid not null references auth.users(id),
  action text not null, entity_type text not null, entity_id uuid,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_company_created_idx on public.audit_events(company_id,created_at desc);

create function app_private.freeze_report_content() returns trigger
language plpgsql set search_path='' as $$ begin
 if (to_jsonb(new)-array['status','approved_by','approved_at','delivered_at']) is distinct from
    (to_jsonb(old)-array['status','approved_by','approved_at','delivered_at']) then
  raise exception 'Report content is immutable; save a new version';
 end if;
 return new;
end $$;
revoke all on function app_private.freeze_report_content() from public,anon,authenticated;
create trigger freeze_report_content before update on public.report_versions for each row execute function app_private.freeze_report_content();

-- Private narrowly scoped authorization helper avoids membership-policy recursion.
create function app_private.company_role(p_company uuid) returns text
language sql stable security definer set search_path=''
as $$ select m.role from public.company_memberships m join public.companies c on c.id=m.company_id
 where m.company_id=p_company and m.user_id=(select auth.uid()) and m.status='active' and c.status='active' $$;
revoke all on function app_private.company_role(uuid) from public,anon;
grant execute on function app_private.company_role(uuid) to authenticated;

create function app_private.new_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100));
  return new;
end $$;
revoke all on function app_private.new_profile() from public,anon,authenticated;
create trigger flownote_auth_profile after insert on auth.users for each row execute function app_private.new_profile();
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',''),100) from auth.users on conflict(id) do nothing;

do $$ declare t text; begin
 foreach t in array array['profiles','companies','company_memberships','clients','projects','data_imports','import_rows','reports','report_versions','report_events','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['company_memberships','clients','projects','data_imports','import_rows','reports','report_versions','report_events','audit_events'] loop
  execute format('create policy tenant_read on public.%I for select to authenticated using (app_private.company_role(company_id) is not null)',t);
 end loop;
end $$;
create policy company_read on public.companies for select to authenticated using(app_private.company_role(id) is not null);
create policy profile_read on public.profiles for select to authenticated using(
 id=(select auth.uid()) or exists(select 1 from public.company_memberships m where m.user_id=profiles.id and app_private.company_role(m.company_id) is not null));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant update(display_name) on public.profiles to authenticated;

-- All business writes use one authenticated command gateway. Authenticated callers
-- have no INSERT/UPDATE/DELETE privilege on business tables, even on their own company.
create function app_private.command(p_action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); c uuid; role_name text; target uuid; client uuid; proj public.projects%rowtype;
 version_row public.report_versions%rowtype; report_key uuid; import_key uuid; next_version integer;
 first_day date; last_day date; item jsonb; rows_data jsonb; snapshot_data jsonb; summary jsonb;
 canonical_hash text; row_total integer; declared_total integer; excluded_total integer; meta jsonb;
 name_value text; campaigns_value text[]; target_user uuid; note_value text;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
  raise exception 'Verified email login required' using errcode='42501'; end if;
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>3000000 then raise exception 'Invalid or oversized payload'; end if;
 if p_action='create_company' then
  name_value:=btrim(p->>'name');
  if name_value is null or char_length(name_value) not between 1 and 120 then raise exception 'Company name required'; end if;
  perform pg_advisory_xact_lock(hashtext(u::text));
  if (select count(*) from public.company_memberships where user_id=u and role='owner')>=3 then raise exception 'Company creation limit'; end if;
  insert into public.companies(name,created_by) values(name_value,u) returning id into c;
  insert into public.company_memberships(company_id,user_id,role) values(c,u,'owner');
  target:=c;
 else
  c:=(p->>'company_id')::uuid; role_name:=app_private.company_role(c);
  if role_name is null then raise exception 'Company access denied' using errcode='42501'; end if;
  perform 1 from public.companies where id=c for update;
  if p_action in ('add_member','disable_member') then
   if role_name<>'owner' then raise exception 'Owner required' using errcode='42501'; end if;
   select id into target_user from auth.users where lower(email)=lower(btrim(p->>'email')) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
   if target_user is null then raise exception 'Verified registered account required'; end if;
   if target_user=u or exists(select 1 from public.company_memberships where company_id=c and user_id=target_user and role='owner') then raise exception 'Owner membership is protected'; end if;
   if p_action='add_member' then
    if coalesce(p->>'role','') not in ('editor','reviewer','viewer') then raise exception 'Invalid member role'; end if;
    insert into public.company_memberships(company_id,user_id,role) values(c,target_user,p->>'role')
     on conflict(company_id,user_id) do update set role=excluded.role,status='active';
   else update public.company_memberships set status='disabled' where company_id=c and user_id=target_user; end if;
   target:=target_user;
  elsif p_action='create_client' then
   if role_name not in ('owner','editor') then raise exception 'Writer required' using errcode='42501'; end if;
   if (select count(*) from public.clients where company_id=c)>=(select max_clients from public.companies where id=c) then raise exception 'Client limit reached'; end if;
   insert into public.clients(company_id,name,csv_client_id,created_by) values(c,btrim(p->>'name'),p->>'csv_client_id',u) returning id into target;
  elsif p_action='create_project' then
   if role_name not in ('owner','editor') then raise exception 'Writer required' using errcode='42501'; end if;
   client:=(p->>'client_id')::uuid;
   if not exists(select 1 from public.clients where company_id=c and id=client) then raise exception 'Client access denied' using errcode='42501'; end if;
   if jsonb_typeof(p->'campaigns') is distinct from 'array' then raise exception 'Campaign array required'; end if;
   select array_agg(distinct btrim(value)) into campaigns_value from jsonb_array_elements_text(p->'campaigns');
   if exists(select 1 from unnest(campaigns_value) x where char_length(x) not between 1 and 200) then raise exception 'Invalid campaign'; end if;
   first_day:=(p->>'starts_on')::date; last_day:=(p->>'ends_on')::date;
   if exists(select 1 from public.projects where company_id=c and client_id=client and status='active' and campaigns&&campaigns_value and starts_on<=last_day and ends_on>=first_day) then raise exception 'Overlapping campaign mapping'; end if;
   insert into public.projects(company_id,client_id,name,campaigns,starts_on,ends_on,created_by)
    values(c,client,btrim(p->>'name'),campaigns_value,first_day,last_day,u) returning id into target;
  elsif p_action='save_report' then
   if role_name not in ('owner','editor') then raise exception 'Writer required' using errcode='42501'; end if;
   select * into proj from public.projects where company_id=c and id=(p->>'project_id')::uuid and status='active';
   if not found then raise exception 'Project access denied' using errcode='42501'; end if;
   first_day:=(p->>'period_start')::date; last_day:=(p->>'period_end')::date;
   if first_day is null or last_day is null or last_day not between first_day and first_day+365 or first_day<proj.starts_on or last_day>proj.ends_on then raise exception 'Invalid report period'; end if;
   rows_data:=p->'rows';
   if jsonb_typeof(rows_data) is distinct from 'array' then raise exception 'Rows array required'; end if;
   row_total:=jsonb_array_length(rows_data);
   if row_total not between 1 and 15000 then raise exception 'Row count limit'; end if;
   declared_total:=(p->>'source_row_count')::integer; excluded_total:=(p->>'excluded_row_count')::integer;
   if declared_total is null or excluded_total is null or declared_total<>row_total+excluded_total then raise exception 'Row reconciliation failed'; end if;
   -- Canonical DB-generated hash is independent of the source-hash assertion.
   canonical_hash:=encode(extensions.digest(convert_to(rows_data::text,'UTF8'),'sha256'),'hex');
   insert into public.data_imports(company_id,project_id,filename,declared_source_sha256,canonical_rows_sha256,source_row_count,accepted_row_count,excluded_row_count,excluded_reasons,created_by)
    values(c,proj.id,p->>'filename',p->>'source_sha256',canonical_hash,declared_total,row_total,excluded_total,coalesce(p->'excluded_reasons','[]'),u) returning id into import_key;
   for item in select value from jsonb_array_elements(rows_data) loop
    if coalesce(item->>'campaign','')<>all(proj.campaigns) or coalesce(item->>'currency','')<>'KRW' then raise exception 'Row mapping or currency mismatch'; end if;
    if (item->>'date')::date not between greatest(proj.starts_on,first_day-(last_day-first_day+1)) and last_day then raise exception 'Row date outside comparison period'; end if;
    if exists(select 1 from (values(item->>'impressions'),(item->>'clicks'),(item->>'spend_cents'),(item->>'leads'),(item->>'source_line')) n(v) where v is null or v !~ '^[0-9]{1,16}$') then raise exception 'Nonnegative integer metrics required'; end if;
    insert into public.import_rows(company_id,import_id,project_id,source_line,metric_date,campaign,currency,impressions,clicks,spend_cents,leads)
     values(c,import_key,proj.id,(item->>'source_line')::integer,(item->>'date')::date,item->>'campaign','KRW',(item->>'impressions')::bigint,(item->>'clicks')::bigint,(item->>'spend_cents')::bigint,(item->>'leads')::bigint);
   end loop;
   if not exists(select 1 from public.import_rows where import_id=import_key and metric_date between first_day and last_day) then raise exception 'No current-period rows'; end if;
   select jsonb_build_object('rows',count(*),'impressions',sum(impressions),'clicks',sum(clicks),'spend_cents',sum(spend_cents),'leads',sum(leads),
    'ctr',sum(clicks)::numeric/nullif(sum(impressions),0),'cpc_cents',sum(spend_cents)::numeric/nullif(sum(clicks),0),'cpl_cents',sum(spend_cents)::numeric/nullif(sum(leads),0)) into summary
    from public.import_rows where import_id=import_key and metric_date between first_day and last_day;
   snapshot_data:=jsonb_build_object('schema_version',1,'currency','KRW','project',to_jsonb(proj),'period_start',first_day,'period_end',last_day,'current',summary,'canonical_rows_sha256',canonical_hash);
   insert into public.reports(company_id,project_id,period_start,period_end) values(c,proj.id,first_day,last_day)
    on conflict(company_id,project_id,period_start,period_end) do nothing;
   select id into report_key from public.reports where company_id=c and project_id=proj.id and period_start=first_day and period_end=last_day;
   select coalesce(max(version),0)+1 into next_version from public.report_versions where report_id=report_key;
   insert into public.report_versions(company_id,project_id,report_id,import_id,version,snapshot,content_hash,note,created_by)
    values(c,proj.id,report_key,import_key,next_version,snapshot_data,canonical_hash,coalesce(p->>'note',''),u) returning id into target;
  elsif p_action='transition_report' then
   select * into version_row from public.report_versions where company_id=c and id=(p->>'version_id')::uuid for update;
   if not found then raise exception 'Report access denied' using errcode='42501'; end if;
   if exists(select 1 from public.report_versions where report_id=version_row.report_id and version>version_row.version) then raise exception 'Latest version required'; end if;
   note_value:=btrim(coalesce(p->>'note',''));
   if char_length(note_value)>2000 then raise exception 'Note too long'; end if;
   if p->>'transition'='submit' then
    if role_name not in ('owner','editor') or (role_name<>'owner' and version_row.created_by<>u) then raise exception 'Writer required' using errcode='42501'; end if;
    if version_row.status not in ('DRAFT','CHANGES_REQUESTED') then raise exception 'Draft required'; end if;
    update public.report_versions set status='IN_REVIEW' where id=version_row.id;
   elsif p->>'transition' in ('approve','request_changes') then
    if role_name not in ('owner','reviewer') or version_row.created_by=u then raise exception 'Independent reviewer required' using errcode='42501'; end if;
    if version_row.status<>'IN_REVIEW' then raise exception 'Review state required'; end if;
    if p->>'transition'='approve' then update public.report_versions set status='APPROVED',approved_by=u,approved_at=now() where id=version_row.id;
    else
     if note_value='' then raise exception 'Change reason required'; end if;
     update public.report_versions set status='CHANGES_REQUESTED' where id=version_row.id;
    end if;
   elsif p->>'transition'='mark_delivered' then
    if role_name not in ('owner','editor') or (role_name<>'owner' and version_row.created_by<>u) then raise exception 'Writer required' using errcode='42501'; end if;
    if version_row.status<>'APPROVED' or note_value='' then raise exception 'Approved version and manual delivery note required'; end if;
    update public.report_versions set status='DELIVERED',delivered_at=now() where id=version_row.id;
   else raise exception 'Unknown transition'; end if;
   insert into public.report_events(company_id,report_version_id,actor_id,action,note) values(c,version_row.id,u,p->>'transition',note_value);
   target:=version_row.id;
  else raise exception 'Unknown command'; end if;
 end if;
 insert into public.audit_events(company_id,actor_id,action,entity_type,entity_id,details)
  values(c,u,p_action,case when p_action in ('save_report','transition_report') then 'report_version' else p_action end,target,
   case when p_action='transition_report' then jsonb_build_object('transition',p->>'transition') else '{}' end);
 return jsonb_build_object('id',target,'company_id',c);
end $$;
revoke all on function app_private.command(text,jsonb) from public,anon;
grant execute on function app_private.command(text,jsonb) to authenticated;
create function public.flownote_command(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select app_private.command(p_action,p_payload) $$;
revoke all on function public.flownote_command(text,jsonb) from public,anon;
grant execute on function public.flownote_command(text,jsonb) to authenticated;

create view public.latest_report_versions with(security_invoker=true) as
 select distinct on(report_id) * from public.report_versions order by report_id,version desc;
grant select on public.latest_report_versions to authenticated;
revoke all on public.latest_report_versions from anon;
comment on table public.data_imports is 'Import metadata and declared exclusions; raw CSV is not stored. Source authenticity/completeness is not asserted.';
comment on table public.import_rows is 'Immutable normalized rows grouped by import. Do not sum all imports: revisions repeat historical metrics.';
comment on table public.report_events is 'Version-bound approval and manual delivery history. Delivery record is not email transmission or receipt.';
comment on function public.flownote_command(text,jsonb) is 'Authenticated tenant command gateway; validates live membership and recomputes report totals. No service-role key needed in clients.';
