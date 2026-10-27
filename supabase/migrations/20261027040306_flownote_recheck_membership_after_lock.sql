-- Recheck membership after waiting for the company write lock. A queued command
-- must not retain a role revoked by the transaction that owned the lock.
do $migration$
declare definition text; marker constant text:='perform 1 from public.companies where id=c for update;';
begin
 select pg_get_functiondef('app_private.command(text,jsonb)'::regprocedure) into definition;
 if strpos(definition,marker)=0 then raise exception 'Expected command lock not found'; end if;
 execute replace(definition,marker,marker||E'\n  role_name:=app_private.company_role(c);\n  if role_name is null then raise exception ''Company access revoked'' using errcode=''42501''; end if;');
end $migration$;
