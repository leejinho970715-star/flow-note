-- Storage performs an INSERT permission preflight before final file metadata is populated.
-- Reserve a bounded upload first; verify actual bytes when trusted Storage metadata arrives.
create table public.af_uploads(id uuid primary key default gen_random_uuid(),org_id uuid not null,project_id uuid not null,owner_id uuid not null references auth.users,path text not null unique,reserved_bytes bigint not null check(reserved_bytes between 1 and 5242880),expires_at timestamptz not null default now()+interval '15 minutes',finalized_at timestamptz,created_at timestamptz not null default now(),foreign key(org_id,project_id) references public.af_projects(org_id,id));
create index af_uploads_org_idx on public.af_uploads(org_id,expires_at);
create index af_uploads_owner_idx on public.af_uploads(owner_id);
alter table public.af_uploads enable row level security;
revoke all on public.af_uploads from anon,authenticated;
grant select on public.af_uploads to authenticated;
create policy af_upload_read on public.af_uploads for select to authenticated using(owner_id=(select auth.uid()) and af_private.role_for(org_id) in ('admin','member'));
create function af_private.storage_cap(o uuid) returns bigint language sql stable security definer set search_path='' as $$select case when subscription_status='trialing' then 1073741824 when plan='lite' then 1073741824 when plan='pro' then 10737418240 else 53687091200 end from public.af_orgs where id=o$$;
revoke all on function af_private.storage_cap(uuid) from public,anon,authenticated;
create or replace function af_private.upload_allowed(path text,bytes bigint) returns boolean language plpgsql security definer set search_path='' as $$declare slot public.af_uploads;begin
 select * into slot from public.af_uploads r where r.path=upload_allowed.path and r.owner_id=(select auth.uid()) and r.expires_at>now() and r.finalized_at is null;
 if slot.id is null then return false;end if;
 perform 1 from public.af_orgs where id=slot.org_id for update;
 return af_private.role_for(slot.org_id) in ('admin','member') and af_private.writable(slot.org_id) and exists(select 1 from public.af_projects where id=slot.project_id and org_id=slot.org_id and not archived);
end$$;
create function af_private.check_uploaded_object() returns trigger language plpgsql security definer set search_path='' as $$declare slot public.af_uploads;actual bigint;used bigint;pending bigint;begin
 if new.bucket_id<>'agencyflow-designs' or new.metadata->>'size' is null then return new;end if;
 actual:=(new.metadata->>'size')::bigint;
 select * into slot from public.af_uploads r where r.path=new.name;
 if slot.id is null or slot.owner_id::text<>new.owner_id or actual<>slot.reserved_bytes then raise exception 'File size or owner does not match the reserved upload';end if;
 perform 1 from public.af_orgs where id=slot.org_id for update;
 if not af_private.writable(slot.org_id) then raise exception 'Trial has expired';end if;
 select coalesce(sum((metadata->>'size')::bigint),0) into used from storage.objects where bucket_id='agencyflow-designs' and split_part(name,'/',1)=slot.org_id::text;
 select coalesce(sum(reserved_bytes),0) into pending from public.af_uploads where org_id=slot.org_id and id<>slot.id and finalized_at is null and expires_at>now();
 if used+pending>af_private.storage_cap(slot.org_id) then raise exception 'Storage quota exceeded';end if;
 update public.af_uploads set finalized_at=now() where id=slot.id;
 return new;
end$$;
revoke all on function af_private.check_uploaded_object() from public,anon,authenticated;
create trigger agencyflow_verify_uploaded_bytes after insert or update of metadata on storage.objects for each row execute function af_private.check_uploaded_object();

create or replace function af_private.command(action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 when 'reserve_upload' then
  if (p->>'bytes')::bigint not between 1 and 5242880 or p->>'mime' not in ('image/png','image/jpeg','image/webp') then raise exception '5MB 이하 PNG/JPG/WebP 파일이 필요합니다.';end if;
  if (select count(*) from public.af_uploads where org_id=o and finalized_at is null and expires_at>now())>=50 then raise exception '진행 중인 업로드가 너무 많습니다. 잠시 후 다시 시도하세요.';end if;
  if (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='agencyflow-designs' and split_part(name,'/',1)=o::text)+(select coalesce(sum(reserved_bytes),0) from public.af_uploads where org_id=o and finalized_at is null and expires_at>now())+(p->>'bytes')::bigint>af_private.storage_cap(o) then raise exception '시안 저장공간 한도를 초과했습니다.';end if;
  insert into public.af_uploads(org_id,project_id,owner_id,path,reserved_bytes) values(o,pr,u,o::text||'/'||pr::text||'/'||gen_random_uuid()::text||case p->>'mime' when 'image/png' then '.png' when 'image/jpeg' then '.jpg' else '.webp' end,(p->>'bytes')::bigint) returning to_jsonb(af_uploads.*) into obj;
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
