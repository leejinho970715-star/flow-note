-- Run with an administrative SQL connection. Every fixture is rolled back.
-- This verifies actual PostgreSQL privileges/RLS/RPC, not an Auth email delivery flow.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('f10a0000-0000-4000-8000-000000000001','authenticated','authenticated','flownote-sql-owner-a@example.invalid',now(),'{}','{"display_name":"SQL owner A"}',now(),now()),
 ('f10a0000-0000-4000-8000-000000000002','authenticated','authenticated','flownote-sql-owner-b@example.invalid',now(),'{}','{}',now(),now()),
 ('f10a0000-0000-4000-8000-000000000003','authenticated','authenticated','flownote-sql-reviewer@example.invalid',now(),'{}','{}',now(),now());
set local role anon;
do $$ begin
 begin perform public.flownote_command('create_company','{"name":"blocked"}'); raise exception 'Anonymous command unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin perform count(*) from public.companies; raise exception 'Anonymous table unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f10a0000-0000-4000-8000-000000000002',true);
do $$ declare result jsonb; begin
 result:=public.flownote_command('create_company','{"name":"SQL isolated company B"}');
 perform set_config('test.company_b',result->>'company_id',true);
 result:=public.flownote_command('create_client',jsonb_build_object('company_id',result->>'company_id','name','B-only customer','csv_client_id','B01'));
 perform set_config('test.client_b',result->>'id',true);
end $$;
select set_config('request.jwt.claim.sub','f10a0000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb; payload jsonb; rejected boolean; version_id uuid; begin
 result:=public.flownote_command('create_company','{"name":"SQL company A"}');
 perform set_config('test.company_a',result->>'company_id',true);
 assert (select count(*) from public.companies)=1, 'Company RLS isolation failed';
 assert (select count(*) from public.clients where id=current_setting('test.client_b')::uuid)=0, 'Client isolation failed';
 begin update public.company_memberships set role='owner'; raise exception 'Direct role mutation unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.flownote_command('create_client',jsonb_build_object('company_id',current_setting('test.company_b'),'name','attack','csv_client_id','X')); raise exception 'Forged company unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 result:=public.flownote_command('create_client',jsonb_build_object('company_id',current_setting('test.company_a'),'name','A customer','csv_client_id','A01'));
 perform set_config('test.client_a',result->>'id',true);
 begin
  perform public.flownote_command('create_project',jsonb_build_object('company_id',current_setting('test.company_a'),'client_id',current_setting('test.client_b'),'name','attack','campaigns',jsonb_build_array('search'),'starts_on','2026-10-01','ends_on','2026-12-31'));
  raise exception 'Cross-tenant FK target unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 result:=public.flownote_command('create_project',jsonb_build_object('company_id',current_setting('test.company_a'),'client_id',current_setting('test.client_a'),'name','A project','campaigns',jsonb_build_array('search'),'starts_on','2026-10-01','ends_on','2026-12-31'));
 perform set_config('test.project_a',result->>'id',true);
 payload:=jsonb_build_object('company_id',current_setting('test.company_a'),'project_id',result->>'id','period_start','2026-10-19','period_end','2026-10-25','filename','synthetic.csv','source_row_count',2,'excluded_row_count',0,'rows',jsonb_build_array(
  jsonb_build_object('source_line',2,'date','2026-10-19','campaign','search','currency','KRW','impressions',100,'clicks',10,'spend_cents',10000,'leads',2),
  jsonb_build_object('source_line',3,'date','2026-10-20','campaign','search','currency','KRW','impressions',300,'clicks',30,'spend_cents',30000,'leads',6)));
 perform set_config('test.payload',payload::text,true);
 result:=public.flownote_command('save_report',payload); version_id:=(result->>'id')::uuid;
 perform set_config('test.version_1',version_id::text,true);
 assert (select (snapshot#>>'{current,spend_cents}')::bigint from public.report_versions where id=version_id)=40000, 'DB recomputation failed';
 assert (select (snapshot#>>'{current,ctr}')::numeric from public.report_versions where id=version_id)=0.1, 'Weighted ratio failed';
 result:=public.flownote_command('transition_report',jsonb_build_object('company_id',current_setting('test.company_a'),'version_id',version_id,'transition','submit'));
 begin perform public.flownote_command('transition_report',jsonb_build_object('company_id',current_setting('test.company_a'),'version_id',version_id,'transition','approve')); raise exception 'Self approval unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 perform public.flownote_command('add_member',jsonb_build_object('company_id',current_setting('test.company_a'),'email','flownote-sql-reviewer@example.invalid','role','reviewer'));
end $$;
select set_config('request.jwt.claim.sub','f10a0000-0000-4000-8000-000000000003',true);
do $$ begin
 begin perform public.flownote_command('create_client',jsonb_build_object('company_id',current_setting('test.company_a'),'name','blocked','csv_client_id','Z')); raise exception 'Reviewer write unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 perform public.flownote_command('transition_report',jsonb_build_object('company_id',current_setting('test.company_a'),'version_id',current_setting('test.version_1'),'transition','approve','note','Synthetic SQL test approval'));
 assert (select status from public.report_versions where id=current_setting('test.version_1')::uuid)='APPROVED', 'Independent approval failed';
 begin update public.report_versions set snapshot='{}'; raise exception 'Direct report overwrite unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','f10a0000-0000-4000-8000-000000000001',true);
do $$ declare payload jsonb; rejected boolean:=false; result jsonb; begin
 begin perform public.flownote_command('save_report',current_setting('test.payload')::jsonb);
 exception when unique_violation then rejected:=true; end;
 assert rejected, 'Duplicate rows unexpectedly saved';
 assert (select count(*) from public.data_imports)=1, 'Failed duplicate import did not roll back';
 payload:=jsonb_set(current_setting('test.payload')::jsonb,'{rows,0,spend_cents}','11000');
 result:=public.flownote_command('save_report',payload);
 assert (select status from public.report_versions where id=(result->>'id')::uuid)='DRAFT', 'New version inherited approval';
 assert (select version from public.report_versions where id=(result->>'id')::uuid)=2, 'Version allocation failed';
 assert (select (snapshot#>>'{current,spend_cents}')::bigint from public.report_versions where id=current_setting('test.version_1')::uuid)=40000, 'Approved snapshot changed';
 assert (select count(*) from public.latest_report_versions)=1, 'Latest-version query duplicated a report';
 perform public.flownote_command('disable_member',jsonb_build_object('company_id',current_setting('test.company_a'),'email','flownote-sql-reviewer@example.invalid'));
end $$;
select set_config('request.jwt.claim.sub','f10a0000-0000-4000-8000-000000000003',true);
do $$ begin assert (select count(*) from public.reports)=0, 'Disabled membership still has access'; end $$;
reset role;
-- Even administrative accidental content changes hit the immutability trigger.
do $$ declare rejected boolean:=false; begin
 begin update public.report_versions set snapshot='{}' where id=current_setting('test.version_1')::uuid;
 exception when raise_exception then rejected:=true; end;
 assert rejected, 'Immutable content trigger failed';
end $$;
rollback;
select 'PASS: anonymous deny, tenant isolation, role tampering, cross-tenant mapping, DB totals, self approval deny, independent approval, duplicate rollback, immutable v1, v2 draft, live membership revocation; all fixtures rolled back' as verification;
