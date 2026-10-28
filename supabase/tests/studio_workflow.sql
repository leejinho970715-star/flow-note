-- Transaction-only synthetic fixtures; no permanent Auth account or business row.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('f30a0000-0000-4000-8000-000000000001','authenticated','authenticated','studio-owner@example.invalid',now(),'{}','{}',now(),now()),
('f30a0000-0000-4000-8000-000000000002','authenticated','authenticated','studio-reviewer@example.invalid',now(),'{}','{}',now(),now()),
('f30a0000-0000-4000-8000-000000000003','authenticated','authenticated','studio-client@example.invalid',now(),'{}','{}',now(),now()),
('f30a0000-0000-4000-8000-000000000004','authenticated','authenticated','studio-other@example.invalid',now(),'{}','{}',now(),now());
create function pg_temp.must_fail(sql text) returns void language plpgsql as $$declare rejected boolean:=false;begin begin execute sql;exception when others then rejected:=true;end;assert rejected,'Forbidden action unexpectedly succeeded';end$$;
grant execute on function pg_temp.must_fail(text) to anon,authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','f30a0000-0000-4000-8000-000000000001',true);
do $$declare o jsonb;c jsonb;d jsonb;a jsonb;begin
 o:=public.agencyflow_command('create_org','{"name":"Studio rollback test"}');perform set_config('studio_test.org',o->>'id',true);
 perform public.agencyflow_command('invite',jsonb_build_object('org_id',o->>'id','email','studio-reviewer@example.invalid','name','Reviewer','role','member'));
 c:=public.studio_command('save_contact',jsonb_build_object('org_id',o->>'id','name','Synthetic client'));perform set_config('studio_test.contact',c->>'id',true);
 d:=public.studio_command('save_deal',jsonb_build_object('org_id',o->>'id','contact_id',c->>'id','title','Opportunity','amount',300000,'due_on',current_date,'stage','상담'));perform set_config('studio_test.deal',d->>'id',true);
 perform public.studio_command('followup',jsonb_build_object('org_id',o->>'id','contact_id',c->>'id','title','Call','due_on',current_date));
 perform public.studio_command('contact_note',jsonb_build_object('org_id',o->>'id','contact_id',c->>'id','body','Notes'));
 perform public.studio_command('notice',jsonb_build_object('org_id',o->>'id','title','Team notice','body','Content','pinned',true));
 perform public.studio_command('calendar',jsonb_build_object('org_id',o->>'id','title','Meeting','starts_at',now(),'ends_at',now()+interval '1 hour'));
 perform public.studio_command('team_task',jsonb_build_object('org_id',o->>'id','title','Task','assignee_id','f30a0000-0000-4000-8000-000000000002','due_on',current_date));
 a:=public.studio_command('approval',jsonb_build_object('org_id',o->>'id','title','Review','body','Internal proposal','approver_id','f30a0000-0000-4000-8000-000000000002'));perform set_config('studio_test.approval',a->>'id',true);
end$$;
select pg_temp.must_fail('update public.studio_contacts set name=''forged''');
select pg_temp.must_fail(format($x$select public.studio_command('archive_contact','{"org_id":"%s","id":"%s"}')$x$,current_setting('studio_test.org'),current_setting('studio_test.contact')));
select pg_temp.must_fail(format($x$select public.studio_command('approval','{"org_id":"%s","title":"Self","body":"No","approver_id":"f30a0000-0000-4000-8000-000000000001"}')$x$,current_setting('studio_test.org')));
select pg_temp.must_fail(format($x$select public.studio_command('decide_approval','{"org_id":"%s","id":"%s","status":"승인"}')$x$,current_setting('studio_test.org'),current_setting('studio_test.approval')));
select set_config('request.jwt.claim.sub','f30a0000-0000-4000-8000-000000000002',true);
do $$declare a jsonb;begin assert (select count(*) from public.studio_contacts)=1,'Member read failed';a:=public.studio_command('decide_approval',jsonb_build_object('org_id',current_setting('studio_test.org'),'id',current_setting('studio_test.approval'),'status','승인','decision_note','Reviewed'));assert a->>'status'='승인','Approval failed';end$$;
select pg_temp.must_fail(format($x$select public.studio_command('decide_approval','{"org_id":"%s","id":"%s","status":"반려"}')$x$,current_setting('studio_test.org'),current_setting('studio_test.approval')));
select pg_temp.must_fail(format($x$select public.studio_command('notice','{"org_id":"%s","title":"Pinned","body":"No","pinned":true}')$x$,current_setting('studio_test.org')));
reset role;
insert into public.af_members(org_id,user_id,name,role) values(current_setting('studio_test.org')::uuid,'f30a0000-0000-4000-8000-000000000003','Client','client');
set local role authenticated;
select set_config('request.jwt.claim.sub','f30a0000-0000-4000-8000-000000000003',true);
do $$begin assert (select count(*) from public.studio_contacts)=0,'Client saw CRM';assert (select count(*) from public.studio_notices)=0,'Client saw internal notices';end$$;
select pg_temp.must_fail(format($x$select public.studio_command('save_contact','{"org_id":"%s","name":"forged"}')$x$,current_setting('studio_test.org')));
select set_config('request.jwt.claim.sub','f30a0000-0000-4000-8000-000000000004',true);
do $$begin assert (select count(*) from public.studio_contacts)=0,'Cross tenant leak';end$$;
select pg_temp.must_fail(format($x$select public.studio_command('save_contact','{"org_id":"%s","name":"forged"}')$x$,current_setting('studio_test.org')));
reset role;
update public.af_orgs set trial_ends_at=now()-interval '1 day' where id=current_setting('studio_test.org')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f30a0000-0000-4000-8000-000000000001',true);
select pg_temp.must_fail(format($x$select public.studio_command('save_contact','{"org_id":"%s","name":"expired"}')$x$,current_setting('studio_test.org')));
do $$begin assert (select count(*) from public.studio_contacts)=1,'Expired trial lost read';end$$;
set local role anon;
select pg_temp.must_fail('select * from public.studio_contacts');
select pg_temp.must_fail($x$select public.studio_command('save_contact','{}')$x$);
rollback;
select 'Studio CRM/groupware commands, staff/client/tenant isolation, approval locks and expired-trial read-only passed; all fixtures rolled back' as result;
