-- Cover foreign keys for growing company history and account maintenance.
create index audit_actor_idx on public.audit_events(actor_id);
create index clients_creator_idx on public.clients(created_by);
create index companies_creator_idx on public.companies(created_by);
create index imports_creator_idx on public.data_imports(created_by);
create index import_rows_parent_idx on public.import_rows(company_id,import_id,project_id);
create index projects_creator_idx on public.projects(created_by);
create index report_events_actor_idx on public.report_events(actor_id);
create index versions_approver_idx on public.report_versions(approved_by);
create index versions_creator_idx on public.report_versions(created_by);
create index versions_import_parent_idx on public.report_versions(company_id,import_id,project_id);
create index versions_report_parent_idx on public.report_versions(company_id,report_id,project_id);

-- Snapshot labels, per-campaign totals, and previous-period totals are calculated
-- from the same DB import, never from a client-provided summary object.
create function app_private.complete_report_snapshot() returns trigger
language plpgsql set search_path='' as $$
declare start_day date; end_day date; campaign_totals jsonb; previous_totals jsonb; client_label jsonb;
begin
 start_day:=(new.snapshot->>'period_start')::date; end_day:=(new.snapshot->>'period_end')::date;
 if exists(select 1 from jsonb_each(new.snapshot->'current') e where e.key in ('impressions','clicks','spend_cents','leads') and (e.value::text)::numeric>9007199254740991) then
  raise exception 'Report totals exceed the safe client integer range'; end if;
 select jsonb_build_object('id',c.id,'csv_client_id',c.csv_client_id,'name',c.name) into client_label
  from public.clients c join public.projects p on p.company_id=c.company_id and p.client_id=c.id
  where p.company_id=new.company_id and p.id=new.project_id;
 select coalesce(jsonb_agg(t order by t->>'name'),'[]') into campaign_totals from (
  select jsonb_build_object('name',campaign,'impressions',sum(impressions),'clicks',sum(clicks),'spend_cents',sum(spend_cents),'leads',sum(leads),
   'ctr',sum(clicks)::numeric/nullif(sum(impressions),0),'cpc_cents',sum(spend_cents)::numeric/nullif(sum(clicks),0),'cpl_cents',sum(spend_cents)::numeric/nullif(sum(leads),0)) as t
  from public.import_rows where import_id=new.import_id and metric_date between start_day and end_day group by campaign
 ) grouped;
 select jsonb_build_object('rows',count(*),'impressions',coalesce(sum(impressions),0),'clicks',coalesce(sum(clicks),0),'spend_cents',coalesce(sum(spend_cents),0),'leads',coalesce(sum(leads),0)) into previous_totals
  from public.import_rows where import_id=new.import_id and metric_date between start_day-(end_day-start_day+1) and start_day-1;
 if exists(select 1 from jsonb_each(previous_totals) e where e.key in ('impressions','clicks','spend_cents','leads') and (e.value::text)::numeric>9007199254740991) then
  raise exception 'Comparison totals exceed the safe client integer range'; end if;
 new.snapshot:=new.snapshot||jsonb_build_object('client',client_label,'campaigns',campaign_totals,'previous',previous_totals);
 return new;
end $$;
revoke all on function app_private.complete_report_snapshot() from public,anon,authenticated;
create trigger complete_report_snapshot before insert on public.report_versions for each row execute function app_private.complete_report_snapshot();
