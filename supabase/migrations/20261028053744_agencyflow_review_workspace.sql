-- AgencyFlow is isolated from Flownote's existing company/report tables.
create schema if not exists af_private;
revoke all on schema af_private from public, anon;
grant usage on schema af_private to authenticated;
create table public.af_orgs(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 120),created_by uuid not null references auth.users,trial_ends_at timestamptz not null default now()+interval '14 days',plan text not null default 'agency' check(plan in ('lite','pro','agency')),subscription_status text not null default 'trialing' check(subscription_status in ('trialing','active','past_due','canceled')),created_at timestamptz not null default now());
create table public.af_members(org_id uuid not null references public.af_orgs,user_id uuid not null references auth.users,role text not null check(role in ('admin','member','client')),name text not null,primary key(org_id,user_id));
create table public.af_clients(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,name text not null,contact text not null default '',email text not null default '',phone text not null default '',business_number text not null default '',memo text not null default '',archived boolean not null default false,unique(org_id,id));
create table public.af_projects(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,client_id uuid not null,name text not null,stage text not null default '상담' check(stage in ('상담','견적','계약','디자인','개발','검수','완료','유지보수')),owner_name text not null default '',amount bigint not null default 0 check(amount between 0 and 10000000000),starts_on date not null,due_on date not null,website_url text not null default '',archived boolean not null default false,unique(org_id,id),foreign key(org_id,client_id) references public.af_clients(org_id,id),check(due_on>=starts_on));
create table public.af_project_access(org_id uuid not null,project_id uuid not null,user_id uuid not null,primary key(project_id,user_id),foreign key(org_id,project_id) references public.af_projects(org_id,id),foreign key(org_id,user_id) references public.af_members(org_id,user_id));
create table public.af_versions(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,number int not null,title text not null,path text not null unique,status text not null default 'review' check(status in ('review','approved')),created_by uuid not null references auth.users,created_at timestamptz not null default now(),approved_by uuid references auth.users,approved_at timestamptz,foreign key(org_id,project_id) references public.af_projects(org_id,id),unique(project_id,number),unique(org_id,project_id,id));
create table public.af_feedbacks(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,version_id uuid not null,x numeric not null check(x between 0 and 1),y numeric not null check(y between 0 and 1),body text not null check(length(body) between 1 and 3000),status text not null default '대기' check(status in ('대기','작업중','완료')),created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,project_id,version_id) references public.af_versions(org_id,project_id,id),unique(org_id,project_id,id));
create table public.af_comments(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,feedback_id uuid not null,body text not null check(length(body) between 1 and 3000),created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,project_id,feedback_id) references public.af_feedbacks(org_id,project_id,id));
create table public.af_quotes(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,number int not null,lines jsonb not null,subtotal bigint not null,vat bigint not null,total bigint not null,status text not null default 'draft' check(status in ('draft','sent','approved')),created_by uuid not null references auth.users,created_at timestamptz not null default now(),approved_by uuid references auth.users,approved_at timestamptz,foreign key(org_id,project_id) references public.af_projects(org_id,id),unique(project_id,number));
create table public.af_tasks(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,title text not null,status text not null default '대기' check(status in ('대기','진행중','완료')),priority text not null default '보통' check(priority in ('낮음','보통','높음','긴급')),due_on date not null,owner_name text not null default '',foreign key(org_id,project_id) references public.af_projects(org_id,id));
create table public.af_contracts(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,version int not null,body text not null,status text not null default 'draft',created_at timestamptz not null default now(),foreign key(org_id,project_id) references public.af_projects(org_id,id),unique(project_id,version));
create table public.af_files(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,path text not null unique,category text not null check(category in ('디자인','계약서','견적서','산출물','기타')),created_at timestamptz not null default now(),foreign key(org_id,project_id) references public.af_projects(org_id,id));
create table public.af_subscriptions(id uuid primary key default gen_random_uuid(),org_id uuid not null unique references public.af_orgs,provider text not null default 'toss',provider_reference text unique,status text not null default 'pending',current_period_end timestamptz,created_at timestamptz not null default now());
create table public.af_payments(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,subscription_id uuid references public.af_subscriptions,provider_payment_key text unique,order_id text not null unique,amount bigint not null check(amount>=0),status text not null,created_at timestamptz not null default now());
create table public.af_notifications(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,user_id uuid not null references auth.users,body text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.af_events(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,actor_id uuid not null references auth.users,action text not null,project_id uuid,created_at timestamptz not null default now());
create index af_members_user_idx on public.af_members(user_id,org_id);
create index af_access_user_idx on public.af_project_access(user_id,project_id);
create index af_projects_client_idx on public.af_projects(org_id,client_id);
create index af_versions_project_idx on public.af_versions(org_id,project_id);
create index af_feedback_version_idx on public.af_feedbacks(org_id,project_id,version_id);
create index af_comments_feedback_idx on public.af_comments(org_id,project_id,feedback_id);
create index af_quotes_project_idx on public.af_quotes(org_id,project_id);
create index af_tasks_project_idx on public.af_tasks(org_id,project_id);
create index af_files_project_idx on public.af_files(org_id,project_id);
create index af_contracts_project_idx on public.af_contracts(org_id,project_id);
create index af_payments_org_idx on public.af_payments(org_id);
create index af_notifications_user_idx on public.af_notifications(user_id,org_id);
create index af_events_org_idx on public.af_events(org_id,created_at);
create function af_private.role_for(o uuid) returns text language sql stable security definer set search_path='' as $$select role from public.af_members where org_id=o and user_id=(select auth.uid())$$;
create function af_private.project_allowed(p uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.af_projects x join public.af_members m on m.org_id=x.org_id where x.id=p and m.user_id=(select auth.uid()) and (m.role in ('admin','member') or exists(select 1 from public.af_project_access a where a.project_id=p and a.user_id=m.user_id)))$$;
create function af_private.writable(o uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.af_orgs where id=o and (subscription_status='active' or (subscription_status='trialing' and trial_ends_at>now())))$$;
revoke all on all functions in schema af_private from public,anon;
grant execute on function af_private.role_for(uuid),af_private.project_allowed(uuid),af_private.writable(uuid) to authenticated;
do $$declare t text;begin foreach t in array array['af_orgs','af_members','af_clients','af_projects','af_project_access','af_versions','af_feedbacks','af_comments','af_quotes','af_tasks','af_contracts','af_files','af_subscriptions','af_payments','af_notifications','af_events'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);end loop;end$$;
create policy af_org_read on public.af_orgs for select to authenticated using(af_private.role_for(id) is not null);
create policy af_member_read on public.af_members for select to authenticated using(user_id=(select auth.uid()) or af_private.role_for(org_id) in ('admin','member'));
create policy af_client_read on public.af_clients for select to authenticated using(af_private.role_for(org_id) in ('admin','member'));
create policy af_project_read on public.af_projects for select to authenticated using(af_private.project_allowed(id));
create policy af_access_read on public.af_project_access for select to authenticated using(user_id=(select auth.uid()) or af_private.role_for(org_id)='admin');
create policy af_version_read on public.af_versions for select to authenticated using(af_private.project_allowed(project_id));
create policy af_feedback_read on public.af_feedbacks for select to authenticated using(af_private.project_allowed(project_id));
create policy af_comment_read on public.af_comments for select to authenticated using(af_private.project_allowed(project_id));
create policy af_quote_read on public.af_quotes for select to authenticated using(af_private.project_allowed(project_id) and (af_private.role_for(org_id) in ('admin','member') or status in ('sent','approved')));
create policy af_task_read on public.af_tasks for select to authenticated using(af_private.role_for(org_id) in ('admin','member'));
create policy af_contract_read on public.af_contracts for select to authenticated using(af_private.role_for(org_id) in ('admin','member'));
create policy af_file_read on public.af_files for select to authenticated using(af_private.project_allowed(project_id));
create policy af_subscription_read on public.af_subscriptions for select to authenticated using(af_private.role_for(org_id)='admin');
create policy af_payment_read on public.af_payments for select to authenticated using(af_private.role_for(org_id)='admin');
create policy af_notification_read on public.af_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy af_event_read on public.af_events for select to authenticated using(af_private.role_for(org_id) in ('admin','member'));
create function af_private.command(action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();o uuid;pr uuid;rid uuid;v public.af_versions;f public.af_feedbacks;q public.af_quotes;r text;obj jsonb;line jsonb;sub bigint:=0;tax bigint;n int;cnt int;lim int;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then raise exception '이메일을 확인한 계정으로 로그인하세요.';end if;
 if action='create_org' then
  perform pg_advisory_xact_lock(hashtextextended(u::text,1));
  if exists(select 1 from public.af_members where user_id=u and role='admin') then raise exception '이미 관리하는 회사가 있습니다.';end if;
  insert into public.af_orgs(name,created_by) values(trim(p->>'name'),u) returning id into o;
  insert into public.af_members values(o,u,'admin',left(coalesce(p->>'name','관리자'),120));
  return jsonb_build_object('id',o);
 end if;
 o:=(p->>'org_id')::uuid;
 perform 1 from public.af_orgs where id=o for update;
 r:=af_private.role_for(o);
 if r is null then raise exception '회사 접근 권한이 없습니다.';end if;
 if not af_private.writable(o) then raise exception '체험이 종료되어 읽기 전용입니다. 데이터는 보관됩니다.';end if;
 pr:=nullif(p->>'project_id','')::uuid;
 if pr is not null and not exists(select 1 from public.af_projects where id=pr and org_id=o and not archived) then raise exception '이 회사의 활성 프로젝트가 아닙니다.';end if;
 if pr is not null and not af_private.project_allowed(pr) then raise exception '프로젝트 접근 권한이 없습니다.';end if;
 if action not in ('feedback','reply','approve_version','approve_quote') and r not in ('admin','member') then raise exception '내부 팀 권한이 필요합니다.';end if;
 case action
 when 'save_client' then
  if length(trim(p->>'name')) not between 1 and 120 or length(coalesce(p->>'memo',''))>3000 then raise exception '고객 이름과 메모를 확인하세요.';end if;
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.af_clients where id=rid and org_id<>o) then raise exception '다른 회사 고객입니다.';end if;
  insert into public.af_clients(id,org_id,name,contact,email,phone,business_number,memo) values(rid,o,trim(p->>'name'),left(coalesce(p->>'contact',''),120),left(coalesce(p->>'email',''),254),left(coalesce(p->>'phone',''),50),left(coalesce(p->>'business_number',''),40),coalesce(p->>'memo','')) on conflict(id) do update set name=excluded.name,contact=excluded.contact,email=excluded.email,phone=excluded.phone,business_number=excluded.business_number,memo=excluded.memo returning to_jsonb(af_clients.*) into obj;
 when 'archive_client' then
  if exists(select 1 from public.af_projects where client_id=(p->>'id')::uuid and org_id=o and not archived) then raise exception '연결된 활성 프로젝트를 먼저 보관하세요.';end if;
  update public.af_clients set archived=true where id=(p->>'id')::uuid and org_id=o returning to_jsonb(af_clients.*) into obj;
 when 'save_project' then
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  if length(trim(p->>'name')) not between 1 and 160 then raise exception '프로젝트 이름을 확인하세요.';end if;
  if not exists(select 1 from public.af_clients where id=(p->>'client_id')::uuid and org_id=o and not archived) then raise exception '활성 고객을 선택하세요.';end if;
  if exists(select 1 from public.af_projects where id=rid and org_id<>o) then raise exception '다른 회사 프로젝트입니다.';end if;
  select case plan when 'lite' then 5 when 'pro' then 20 else 100 end into lim from public.af_orgs where id=o;
  if not exists(select 1 from public.af_projects where id=rid and not archived and stage not in ('완료','유지보수')) and coalesce(p->>'stage','상담') not in ('완료','유지보수') and (select count(*) from public.af_projects where org_id=o and not archived and stage not in ('완료','유지보수'))>=lim then raise exception '활성 프로젝트 한도에 도달했습니다. 플랜 범위를 확인하세요.';end if;
  if coalesce(p->>'website_url','')<>'' and p->>'website_url' !~ '^https://' then raise exception '웹사이트는 https URL을 사용하세요.';end if;
  insert into public.af_projects(id,org_id,client_id,name,stage,owner_name,amount,starts_on,due_on,website_url) values(rid,o,(p->>'client_id')::uuid,trim(p->>'name'),coalesce(p->>'stage','상담'),left(coalesce(p->>'owner_name',''),120),coalesce((p->>'amount')::bigint,0),(p->>'starts_on')::date,(p->>'due_on')::date,left(coalesce(p->>'website_url',''),1500)) on conflict(id) do update set name=excluded.name,client_id=excluded.client_id,stage=excluded.stage,owner_name=excluded.owner_name,amount=excluded.amount,starts_on=excluded.starts_on,due_on=excluded.due_on,website_url=excluded.website_url returning to_jsonb(af_projects.*) into obj;
 when 'stage' then
  select case plan when 'lite' then 5 when 'pro' then 20 else 100 end into lim from public.af_orgs where id=o;
  if p->>'stage' not in ('완료','유지보수') and exists(select 1 from public.af_projects where id=pr and stage in ('완료','유지보수')) and (select count(*) from public.af_projects where org_id=o and not archived and stage not in ('완료','유지보수'))>=lim then raise exception '활성 프로젝트 한도에 도달했습니다.';end if;
  update public.af_projects set stage=p->>'stage' where id=pr and org_id=o returning to_jsonb(af_projects.*) into obj;
 when 'archive_project' then
  update public.af_projects set archived=true where id=pr and org_id=o returning to_jsonb(af_projects.*) into obj;
 when 'invite' then
  if r<>'admin' then raise exception '관리자만 구성원을 추가할 수 있습니다.';end if;
  if p->>'role' not in ('member','client') then raise exception '역할을 확인하세요.';end if;
  select id into rid from auth.users where lower(email)=lower(trim(p->>'email')) and email_confirmed_at is not null and coalesce(is_anonymous,false)=false;
  if rid is null then raise exception '상대방이 먼저 가입하고 이메일 확인을 완료해야 합니다. 초대 메일은 아직 자동 발송하지 않습니다.';end if;
  select case plan when 'lite' then 1 when 'pro' then 3 else 10 end into lim from public.af_orgs where id=o;
  if p->>'role'='member' and not exists(select 1 from public.af_members where org_id=o and user_id=rid) and (select count(*) from public.af_members where org_id=o and role<>'client')>=lim then raise exception '내부 사용자 한도에 도달했습니다.';end if;
  if p->>'role'='client' and pr is null then raise exception '고객에게 공개할 프로젝트를 선택하세요.';end if;
  insert into public.af_members values(o,rid,p->>'role',left(coalesce(nullif(p->>'name',''),p->>'email'),120)) on conflict do nothing;
  if p->>'role'='client' then
   if exists(select 1 from public.af_members where org_id=o and user_id=rid and role<>'client') then raise exception '내부 팀원을 고객으로 지정할 수 없습니다.';end if;
   insert into public.af_project_access values(o,pr,rid) on conflict do nothing;
  end if;
  obj:=jsonb_build_object('user_id',rid);
 when 'version' then
  if length(trim(p->>'title')) not between 1 and 160 then raise exception '시안 제목을 입력하세요.';end if;
  if p->>'path' not like o::text||'/'||pr::text||'/%' or not exists(select 1 from storage.objects where bucket_id='agencyflow-designs' and name=p->>'path' and owner_id=u::text) then raise exception '이 프로젝트에 직접 업로드한 시안 파일이 필요합니다.';end if;
  select coalesce(max(number),0)+1 into n from public.af_versions where project_id=pr;
  insert into public.af_versions(org_id,project_id,number,title,path,created_by) values(o,pr,n,trim(p->>'title'),p->>'path',u) returning to_jsonb(af_versions.*) into obj;
 when 'feedback' then
  select * into v from public.af_versions where id=(p->>'version_id')::uuid and project_id=pr and org_id=o for update;
  if v.id is null or v.status='approved' then raise exception '승인된 시안은 변경할 수 없습니다. 새 버전을 등록하세요.';end if;
  insert into public.af_feedbacks(org_id,project_id,version_id,x,y,body,created_by) values(o,pr,v.id,(p->>'x')::numeric,(p->>'y')::numeric,trim(p->>'body'),u) returning to_jsonb(af_feedbacks.*) into obj;
 when 'feedback_status' then
  update public.af_feedbacks set status=p->>'status' where id=(p->>'id')::uuid and project_id=pr and org_id=o and exists(select 1 from public.af_versions where id=version_id and status='review') returning to_jsonb(af_feedbacks.*) into obj;
 when 'reply' then
  select * into f from public.af_feedbacks where id=(p->>'feedback_id')::uuid and project_id=pr and org_id=o;
  if f.id is null or exists(select 1 from public.af_versions where id=f.version_id and status='approved') then raise exception '승인된 시안의 대화는 보관 전용입니다.';end if;
  insert into public.af_comments(org_id,project_id,feedback_id,body,created_by) values(o,pr,f.id,trim(p->>'body'),u) returning to_jsonb(af_comments.*) into obj;
 when 'approve_version' then
  if r<>'client' then raise exception '이 프로젝트에 초대된 고객만 승인할 수 있습니다.';end if;
  select * into v from public.af_versions where id=(p->>'version_id')::uuid and project_id=pr and org_id=o for update;
  if v.id is null or v.status<>'review' or v.number<>(select max(number) from public.af_versions where project_id=pr) then raise exception '최신 검수 중 버전만 승인할 수 있습니다.';end if;
  if exists(select 1 from public.af_feedbacks where version_id=v.id and status<>'완료') then raise exception '미완료 피드백을 먼저 확인하세요.';end if;
  update public.af_versions set status='approved',approved_by=u,approved_at=now() where id=v.id returning to_jsonb(af_versions.*) into obj;
 when 'quote' then
  if jsonb_typeof(p->'lines')<>'array' or jsonb_array_length(p->'lines') not between 1 and 30 then raise exception '견적 항목은 1~30개입니다.';end if;
  for line in select * from jsonb_array_elements(p->'lines') loop
   if length(trim(line->>'name')) not between 1 and 160 or (line->>'quantity')::numeric<>trunc((line->>'quantity')::numeric) or (line->>'unitPrice')::numeric<>trunc((line->>'unitPrice')::numeric) or (line->>'quantity')::bigint not between 1 and 10000 or (line->>'unitPrice')::bigint not between 0 and 100000000 then raise exception '견적 항목의 수량·단가를 확인하세요.';end if;
   sub:=sub+(line->>'quantity')::bigint*(line->>'unitPrice')::bigint;
  end loop;
  if sub>1000000000 then raise exception '견적 공급가액 한도를 초과했습니다.';end if;
  tax:=round(sub*.1);select coalesce(max(number),0)+1 into n from public.af_quotes where project_id=pr;
  insert into public.af_quotes(org_id,project_id,number,lines,subtotal,vat,total,created_by) values(o,pr,n,p->'lines',sub,tax,sub+tax,u) returning to_jsonb(af_quotes.*) into obj;
 when 'send_quote' then
  update public.af_quotes set status='sent' where id=(p->>'id')::uuid and project_id=pr and org_id=o and status='draft' returning to_jsonb(af_quotes.*) into obj;
 when 'approve_quote' then
  if r<>'client' then raise exception '지정된 고객만 견적을 승인할 수 있습니다.';end if;
  select * into q from public.af_quotes where id=(p->>'id')::uuid and project_id=pr and org_id=o for update;
  if q.status<>'sent' or q.number<>(select max(number) from public.af_quotes where project_id=pr) then raise exception '최신 전달 견적만 승인할 수 있습니다.';end if;
  update public.af_quotes set status='approved',approved_by=u,approved_at=now() where id=q.id returning to_jsonb(af_quotes.*) into obj;
 when 'task' then
  if length(trim(p->>'title')) not between 1 and 200 then raise exception '작업 제목을 입력하세요.';end if;
  insert into public.af_tasks(org_id,project_id,title,priority,due_on,owner_name) values(o,pr,trim(p->>'title'),p->>'priority',(p->>'due_on')::date,left(coalesce(p->>'owner_name',''),120)) returning to_jsonb(af_tasks.*) into obj;
 when 'task_status' then update public.af_tasks set status=p->>'status' where id=(p->>'id')::uuid and org_id=o and project_id=pr returning to_jsonb(af_tasks.*) into obj;
 else raise exception '지원하지 않는 작업입니다.';
 end case;
 if obj is null then raise exception '작업 대상이 없거나 현재 상태에서 변경할 수 없습니다.';end if;
 insert into public.af_events(org_id,actor_id,action,project_id) values(o,u,action,pr);
 return obj;
end$$;
revoke all on function af_private.command(text,jsonb) from public,anon;
grant execute on function af_private.command(text,jsonb) to authenticated;
create function public.agencyflow_command(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select af_private.command(p_action,p_payload)$$;
revoke all on function public.agencyflow_command(text,jsonb) from public,anon;
grant execute on function public.agencyflow_command(text,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('agencyflow-designs','agencyflow-designs',false,5242880,array['image/png','image/jpeg','image/webp']);
create function af_private.storage_project(path text) returns uuid language plpgsql immutable set search_path='' as $$begin return split_part(path,'/',2)::uuid;exception when invalid_text_representation then return null;end$$;
revoke all on function af_private.storage_project(text) from public,anon;grant execute on function af_private.storage_project(text) to authenticated;
create policy agencyflow_storage_read on storage.objects for select to authenticated using(bucket_id='agencyflow-designs' and af_private.project_allowed(af_private.storage_project(name)) and exists(select 1 from public.af_projects where id=af_private.storage_project(name) and org_id::text=split_part(name,'/',1)));
create policy agencyflow_storage_insert on storage.objects for insert to authenticated with check(bucket_id='agencyflow-designs' and exists(select 1 from public.af_projects p where p.id=af_private.storage_project(name) and p.org_id::text=split_part(name,'/',1) and not p.archived and af_private.role_for(p.org_id) in ('admin','member') and af_private.writable(p.org_id)));
create policy agencyflow_storage_orphan_delete on storage.objects for delete to authenticated using(bucket_id='agencyflow-designs' and owner_id=(select auth.uid())::text and not exists(select 1 from public.af_versions where path=name));
comment on table public.af_payments is 'Server payment provider verification only. No client writes, no billing keys in public tables. Toss merchant setup is pending.';
comment on table public.af_contracts is 'Future module schema only. Online quote/design approval is not an electronic-signature integration.';
-- Upload quota is checked under the same organization lock as commands.
create function af_private.upload_allowed(path text,bytes bigint) returns boolean language plpgsql security definer set search_path='' as $$declare o uuid;cap bigint;used bigint;begin
 select org_id into o from public.af_projects where id=af_private.storage_project(path) and org_id::text=split_part(path,'/',1) and not archived;
 if o is null then return false;end if;
 perform 1 from public.af_orgs where id=o for update;
 if af_private.role_for(o) not in ('admin','member') or not af_private.writable(o) or bytes is null or bytes<1 or bytes>5242880 then return false;end if;
 select case when subscription_status='trialing' then 1073741824 when plan='lite' then 1073741824 when plan='pro' then 10737418240 else 53687091200 end into cap from public.af_orgs where id=o;
 select coalesce(sum((metadata->>'size')::bigint),0) into used from storage.objects where bucket_id='agencyflow-designs' and split_part(name,'/',1)=o::text;
 return used+bytes<=cap;
end$$;
revoke all on function af_private.upload_allowed(text,bigint) from public,anon;grant execute on function af_private.upload_allowed(text,bigint) to authenticated;
drop policy agencyflow_storage_insert on storage.objects;
create policy agencyflow_storage_insert on storage.objects for insert to authenticated with check(bucket_id='agencyflow-designs' and af_private.upload_allowed(name,(metadata->>'size')::bigint));
