-- New optional Studio modules. Existing Flownote/AgencyFlow data and commands are unchanged.
create schema studio_private;
revoke all on schema studio_private from public,anon;
grant usage on schema studio_private to authenticated;
create table public.studio_contacts(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,name text not null,contact text not null default '',email text not null default '',phone text not null default '',source text not null default '직접 등록',owner_name text not null default '',memo text not null default '',archived boolean not null default false,created_by uuid not null references auth.users,created_at timestamptz not null default now(),unique(org_id,id));
create table public.studio_deals(id uuid primary key default gen_random_uuid(),org_id uuid not null,contact_id uuid not null,title text not null,amount bigint not null check(amount between 0 and 10000000000),stage text not null default '신규' check(stage in ('신규','상담','제안','협상','수주','종료')),due_on date not null,owner_name text not null default '',archived boolean not null default false,created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,contact_id) references public.studio_contacts(org_id,id),unique(org_id,id));
create table public.studio_followups(id uuid primary key default gen_random_uuid(),org_id uuid not null,contact_id uuid not null,title text not null,due_on date not null,status text not null default '예정' check(status in ('예정','완료')),created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,contact_id) references public.studio_contacts(org_id,id));
create table public.studio_contact_notes(id uuid primary key default gen_random_uuid(),org_id uuid not null,contact_id uuid not null,body text not null check(length(body) between 1 and 5000),created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,contact_id) references public.studio_contacts(org_id,id));
create table public.studio_notices(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,title text not null,body text not null,pinned boolean not null default false,archived boolean not null default false,created_by uuid not null references auth.users,created_at timestamptz not null default now());
create table public.studio_calendar(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,title text not null,starts_at timestamptz not null,ends_at timestamptz not null,location text not null default '',created_by uuid not null references auth.users,created_at timestamptz not null default now(),check(ends_at>starts_at));
create table public.studio_approvals(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,title text not null,body text not null,approver_id uuid not null,status text not null default '대기' check(status in ('대기','승인','반려','취소')),decision_note text not null default '',decided_at timestamptz,created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,approver_id) references public.af_members(org_id,user_id),check(approver_id<>created_by));
create table public.studio_team_tasks(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,title text not null,assignee_id uuid not null,due_on date not null,status text not null default '대기' check(status in ('대기','진행중','완료')),priority text not null default '보통' check(priority in ('보통','높음','긴급')),created_by uuid not null references auth.users,created_at timestamptz not null default now(),foreign key(org_id,assignee_id) references public.af_members(org_id,user_id));
create table public.studio_activity(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.af_orgs,actor_id uuid not null references auth.users,action text not null,target_id uuid,created_at timestamptz not null default now());
create index studio_contacts_org_idx on public.studio_contacts(org_id,created_at);
create index studio_deals_contact_idx on public.studio_deals(org_id,contact_id);
create index studio_followups_contact_idx on public.studio_followups(org_id,contact_id,due_on);
create index studio_notes_contact_idx on public.studio_contact_notes(org_id,contact_id,created_at);
create index studio_notices_org_idx on public.studio_notices(org_id,created_at);
create index studio_calendar_org_idx on public.studio_calendar(org_id,starts_at);
create index studio_approvals_org_idx on public.studio_approvals(org_id,created_at);
create index studio_approvals_reviewer_idx on public.studio_approvals(org_id,approver_id);
create index studio_tasks_assignee_idx on public.studio_team_tasks(org_id,assignee_id,due_on);
create index studio_activity_org_idx on public.studio_activity(org_id,created_at);
do $$declare t text;begin foreach t in array array['studio_contacts','studio_deals','studio_followups','studio_contact_notes','studio_notices','studio_calendar','studio_approvals','studio_team_tasks','studio_activity'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('create policy studio_staff_read on public.%I for select to authenticated using(af_private.role_for(org_id) in (''admin'',''member''))',t);end loop;end$$;
create function studio_private.command(action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();o uuid:=(p->>'org_id')::uuid;r text;rid uuid;cid uuid;obj jsonb;a public.studio_approvals;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then raise exception '이메일 확인을 마친 계정으로 로그인하세요.';end if;
 perform 1 from public.af_orgs where id=o for update;r:=af_private.role_for(o);
 if r is null or r not in ('admin','member') then raise exception '이 회사의 내부 팀원만 접근할 수 있습니다.';end if;
 if not af_private.writable(o) then raise exception '체험이 종료되어 읽기 전용입니다. 자료는 보관됩니다.';end if;
 if action in ('save_contact','save_deal','followup','notice','calendar','approval','team_task') and length(trim(coalesce(p->>'title',p->>'name',''))) not between 1 and 160 then raise exception '이름 또는 제목을 1~160자로 입력하세요.';end if;
 case action
 when 'save_contact' then
  if (select count(*) from public.studio_contacts where org_id=o and not archived)>=500 and nullif(p->>'id','') is null then raise exception '파일럿 고객 한도 500곳입니다. 확장 범위를 상담하세요.';end if;
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.studio_contacts where id=rid and org_id<>o) then raise exception '다른 회사 고객입니다.';end if;
  insert into public.studio_contacts(id,org_id,name,contact,email,phone,source,owner_name,memo,created_by) values(rid,o,trim(p->>'name'),left(coalesce(p->>'contact',''),120),left(coalesce(p->>'email',''),254),left(coalesce(p->>'phone',''),50),left(coalesce(p->>'source','직접 등록'),80),left(coalesce(p->>'owner_name',''),120),left(coalesce(p->>'memo',''),5000),u) on conflict(id) do update set name=excluded.name,contact=excluded.contact,email=excluded.email,phone=excluded.phone,source=excluded.source,owner_name=excluded.owner_name,memo=excluded.memo returning to_jsonb(studio_contacts.*) into obj;
 when 'archive_contact' then
  if exists(select 1 from public.studio_deals where org_id=o and contact_id=(p->>'id')::uuid and not archived and stage not in ('수주','종료')) then raise exception '진행 중 영업기회를 먼저 정리하세요.';end if;
  update public.studio_contacts set archived=true where org_id=o and id=(p->>'id')::uuid returning to_jsonb(studio_contacts.*) into obj;
 when 'save_deal' then
  cid:=(p->>'contact_id')::uuid;if not exists(select 1 from public.studio_contacts where org_id=o and id=cid and not archived) then raise exception '이 회사의 활성 고객을 선택하세요.';end if;
  if (select count(*) from public.studio_deals where org_id=o and not archived)>=1000 and nullif(p->>'id','') is null then raise exception '파일럿 영업기회 한도 1000건입니다.';end if;
  rid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());if exists(select 1 from public.studio_deals where id=rid and org_id<>o) then raise exception '다른 회사 기회입니다.';end if;
  insert into public.studio_deals(id,org_id,contact_id,title,amount,stage,due_on,owner_name,created_by) values(rid,o,cid,trim(p->>'title'),(p->>'amount')::bigint,coalesce(p->>'stage','신규'),(p->>'due_on')::date,left(coalesce(p->>'owner_name',''),120),u) on conflict(id) do update set contact_id=excluded.contact_id,title=excluded.title,amount=excluded.amount,stage=excluded.stage,due_on=excluded.due_on,owner_name=excluded.owner_name returning to_jsonb(studio_deals.*) into obj;
 when 'deal_stage' then update public.studio_deals set stage=p->>'stage' where id=(p->>'id')::uuid and org_id=o returning to_jsonb(studio_deals.*) into obj;
 when 'archive_deal' then update public.studio_deals set archived=true where id=(p->>'id')::uuid and org_id=o returning to_jsonb(studio_deals.*) into obj;
 when 'followup' then
  if not exists(select 1 from public.studio_contacts where org_id=o and id=(p->>'contact_id')::uuid and not archived) then raise exception '활성 고객을 선택하세요.';end if;
  insert into public.studio_followups(org_id,contact_id,title,due_on,created_by) values(o,(p->>'contact_id')::uuid,trim(p->>'title'),(p->>'due_on')::date,u) returning to_jsonb(studio_followups.*) into obj;
 when 'followup_done' then update public.studio_followups set status='완료' where org_id=o and id=(p->>'id')::uuid returning to_jsonb(studio_followups.*) into obj;
 when 'contact_note' then
  if not exists(select 1 from public.studio_contacts where org_id=o and id=(p->>'contact_id')::uuid) then raise exception '고객을 확인하세요.';end if;
  insert into public.studio_contact_notes(org_id,contact_id,body,created_by) values(o,(p->>'contact_id')::uuid,trim(p->>'body'),u) returning to_jsonb(studio_contact_notes.*) into obj;
 when 'notice' then
  if length(coalesce(p->>'body','')) not between 1 and 10000 then raise exception '공지 내용은 1~10000자입니다.';end if;
  if coalesce((p->>'pinned')::boolean,false) and r<>'admin' then raise exception '고정 공지는 관리자만 설정합니다.';end if;
  insert into public.studio_notices(org_id,title,body,pinned,created_by) values(o,trim(p->>'title'),p->>'body',coalesce((p->>'pinned')::boolean,false),u) returning to_jsonb(studio_notices.*) into obj;
 when 'archive_notice' then update public.studio_notices set archived=true where org_id=o and id=(p->>'id')::uuid and (created_by=u or r='admin') returning to_jsonb(studio_notices.*) into obj;
 when 'calendar' then insert into public.studio_calendar(org_id,title,starts_at,ends_at,location,created_by) values(o,trim(p->>'title'),(p->>'starts_at')::timestamptz,(p->>'ends_at')::timestamptz,left(coalesce(p->>'location',''),200),u) returning to_jsonb(studio_calendar.*) into obj;
 when 'approval' then
  if not exists(select 1 from public.af_members where org_id=o and user_id=(p->>'approver_id')::uuid and role in ('admin','member')) then raise exception '내부 결재자를 선택하세요.';end if;
  if length(coalesce(p->>'body','')) not between 1 and 10000 then raise exception '결재 내용은 1~10000자입니다.';end if;
  insert into public.studio_approvals(org_id,title,body,approver_id,created_by) values(o,trim(p->>'title'),p->>'body',(p->>'approver_id')::uuid,u) returning to_jsonb(studio_approvals.*) into obj;
 when 'decide_approval' then
  select * into a from public.studio_approvals where id=(p->>'id')::uuid and org_id=o for update;
  if a.id is null or a.status<>'대기' or a.approver_id<>u or a.created_by=u or p->>'status' not in ('승인','반려') then raise exception '지정된 다른 결재자만 대기 문서를 승인·반려할 수 있습니다.';end if;
  update public.studio_approvals set status=p->>'status',decision_note=left(coalesce(p->>'decision_note',''),3000),decided_at=now() where id=a.id returning to_jsonb(studio_approvals.*) into obj;
 when 'cancel_approval' then update public.studio_approvals set status='취소',decided_at=now() where id=(p->>'id')::uuid and org_id=o and created_by=u and status='대기' returning to_jsonb(studio_approvals.*) into obj;
 when 'team_task' then
  if not exists(select 1 from public.af_members where org_id=o and user_id=(p->>'assignee_id')::uuid and role in ('admin','member')) then raise exception '내부 담당자를 선택하세요.';end if;
  insert into public.studio_team_tasks(org_id,title,assignee_id,due_on,priority,created_by) values(o,trim(p->>'title'),(p->>'assignee_id')::uuid,(p->>'due_on')::date,coalesce(p->>'priority','보통'),u) returning to_jsonb(studio_team_tasks.*) into obj;
 when 'team_task_status' then update public.studio_team_tasks set status=p->>'status' where id=(p->>'id')::uuid and org_id=o returning to_jsonb(studio_team_tasks.*) into obj;
 else raise exception '지원하지 않는 Studio 작업입니다.';
 end case;
 if obj is null then raise exception '작업 대상이 없거나 변경 권한·상태가 맞지 않습니다.';end if;
 insert into public.studio_activity(org_id,actor_id,action,target_id) values(o,u,action,(obj->>'id')::uuid);return obj;
end$$;
revoke all on function studio_private.command(text,jsonb) from public,anon;grant execute on function studio_private.command(text,jsonb) to authenticated;
create function public.studio_command(p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select studio_private.command(p_action,p_payload)$$;
revoke all on function public.studio_command(text,jsonb) from public,anon;grant execute on function public.studio_command(text,jsonb) to authenticated;
