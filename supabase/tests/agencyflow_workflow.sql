-- Actual database verification; all synthetic identities, metadata and business rows roll back.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('f20a0000-0000-4000-8000-000000000001','authenticated','authenticated','af-test-owner-a@example.invalid',now(),'{}','{}',now(),now()),
('f20a0000-0000-4000-8000-000000000002','authenticated','authenticated','af-test-owner-b@example.invalid',now(),'{}','{}',now(),now()),
('f20a0000-0000-4000-8000-000000000003','authenticated','authenticated','af-test-client@example.invalid',now(),'{}','{}',now(),now());
create function pg_temp.must_fail(sql text) returns void language plpgsql as $$declare rejected boolean:=false;begin begin execute sql;exception when others then rejected:=true;end;assert rejected,'Forbidden action unexpectedly succeeded';end$$;
grant execute on function pg_temp.must_fail(text) to anon,authenticated;
set local role anon;
select pg_temp.must_fail('select count(*) from public.af_orgs');
select pg_temp.must_fail($x$select public.agencyflow_command('create_org','{"name":"anonymous"}')$x$);
set local role authenticated;
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000002',true);
do $$declare o jsonb;begin o:=public.agencyflow_command('create_org','{"name":"Test B"}');perform set_config('af_test.b',o->>'id',true);end$$;
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000001',true);
do $$declare o jsonb;c jsonb;p jsonb;p2 jsonb;q jsonb;begin
 o:=public.agencyflow_command('create_org','{"name":"Test A"}');perform set_config('af_test.a',o->>'id',true);
 assert (select count(*) from public.af_orgs)=1,'Tenant isolation failed';
 c:=public.agencyflow_command('save_client',jsonb_build_object('org_id',o->>'id','name','Synthetic customer'));perform set_config('af_test.c',c->>'id',true);
 p:=public.agencyflow_command('save_project',jsonb_build_object('org_id',o->>'id','client_id',c->>'id','name','Review project','starts_on','2026-10-28','due_on','2026-11-20','amount',4500000));perform set_config('af_test.p',p->>'id',true);
 p2:=public.agencyflow_command('save_project',jsonb_build_object('org_id',o->>'id','client_id',c->>'id','name','Hidden project','starts_on','2026-10-28','due_on','2026-11-20'));perform set_config('af_test.p2',p2->>'id',true);
 perform public.agencyflow_command('invite',jsonb_build_object('org_id',o->>'id','project_id',p->>'id','email','af-test-client@example.invalid','role','client','name','Test client'));
 q:=public.agencyflow_command('quote',jsonb_build_object('org_id',o->>'id','project_id',p->>'id','lines','[{"name":"Design","quantity":3,"unitPrice":10000}]'::jsonb));perform set_config('af_test.q',q->>'id',true);
 assert (q->>'total')::bigint=33000,'Server quote total mismatch';
 perform public.agencyflow_command('send_quote',jsonb_build_object('org_id',o->>'id','project_id',p->>'id','id',q->>'id'));
end$$;
select pg_temp.must_fail('update public.af_members set role=''admin''');
select pg_temp.must_fail(format($x$select public.agencyflow_command('save_client','{"org_id":"%s","name":"forged"}')$x$,current_setting('af_test.b')));
select pg_temp.must_fail(format($x$select public.agencyflow_command('quote','{"org_id":"%s","project_id":"%s","lines":[{"name":"bad","quantity":-1,"unitPrice":100}]}')$x$,current_setting('af_test.a'),current_setting('af_test.p')));
reset role;
insert into storage.objects(bucket_id,name,owner_id,metadata) values('agencyflow-designs',current_setting('af_test.a')||'/'||current_setting('af_test.p')||'/test.png','f20a0000-0000-4000-8000-000000000001','{"size":1024,"mimetype":"image/png"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000001',true);
do $$declare v jsonb;begin v:=public.agencyflow_command('version',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'title','v1','path',current_setting('af_test.a')||'/'||current_setting('af_test.p')||'/test.png'));perform set_config('af_test.v',v->>'id',true);end$$;
select pg_temp.must_fail(format($x$select public.agencyflow_command('approve_version','{"org_id":"%s","project_id":"%s","version_id":"%s"}')$x$,current_setting('af_test.a'),current_setting('af_test.p'),current_setting('af_test.v')));
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000003',true);
do $$declare f jsonb;begin
 assert (select count(*) from public.af_projects)=1,'Client saw unassigned project';assert (select count(*) from public.af_clients)=0,'Client saw internal contact records';
 assert (select count(*) from storage.objects where bucket_id='agencyflow-designs')=1,'Assigned private file not readable';
 f:=public.agencyflow_command('feedback',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'version_id',current_setting('af_test.v'),'x',0.4,'y',0.6,'body','Please adjust button'));perform set_config('af_test.f',f->>'id',true);
 perform public.agencyflow_command('reply',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'feedback_id',f->>'id','body','Client reply'));
end$$;
select pg_temp.must_fail(format($x$select public.agencyflow_command('stage','{"org_id":"%s","project_id":"%s","stage":"완료"}')$x$,current_setting('af_test.a'),current_setting('af_test.p')));
select pg_temp.must_fail(format($x$select public.agencyflow_command('approve_version','{"org_id":"%s","project_id":"%s","version_id":"%s"}')$x$,current_setting('af_test.a'),current_setting('af_test.p'),current_setting('af_test.v')));
select pg_temp.must_fail(format($x$select public.agencyflow_command('feedback','{"org_id":"%s","project_id":"%s","version_id":"%s","x":2,"y":0.5,"body":"outside"}')$x$,current_setting('af_test.a'),current_setting('af_test.p'),current_setting('af_test.v')));
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000001',true);
select public.agencyflow_command('feedback_status',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'id',current_setting('af_test.f'),'status','완료'));
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000003',true);
do $$declare v jsonb;q jsonb;begin
 v:=public.agencyflow_command('approve_version',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'version_id',current_setting('af_test.v')));assert v->>'status'='approved','Client approval failed';
 q:=public.agencyflow_command('approve_quote',jsonb_build_object('org_id',current_setting('af_test.a'),'project_id',current_setting('af_test.p'),'id',current_setting('af_test.q')));assert q->>'status'='approved','Quote approval failed';
end$$;
select pg_temp.must_fail(format($x$select public.agencyflow_command('reply','{"org_id":"%s","project_id":"%s","feedback_id":"%s","body":"overwrite approved"}')$x$,current_setting('af_test.a'),current_setting('af_test.p'),current_setting('af_test.f')));
reset role;
update public.af_orgs set trial_ends_at=now()-interval '1 day' where id=current_setting('af_test.a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000001',true);
select pg_temp.must_fail(format($x$select public.agencyflow_command('save_client','{"org_id":"%s","name":"after expiry"}')$x$,current_setting('af_test.a')));
do $$begin assert (select count(*) from public.af_projects)=2,'Expired trial lost read access';assert not af_private.upload_allowed(current_setting('af_test.a')||'/'||current_setting('af_test.p')||'/after.png',1024),'Expired upload allowed';end$$;
select set_config('request.jwt.claim.sub','f20a0000-0000-4000-8000-000000000002',true);
do $$begin assert (select count(*) from public.af_versions)=0,'Cross-tenant versions leaked';assert (select count(*) from storage.objects where bucket_id='agencyflow-designs')=0,'Cross-tenant storage leaked';end$$;
rollback;
select 'AgencyFlow tenant/client access, quotes, pin/thread, approval locks, trial expiry and storage isolation passed; fixtures rolled back' as result;
