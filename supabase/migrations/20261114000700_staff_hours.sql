-- CAL-036: horário próprio por profissional (sobrescreve o horário do negócio).
-- p_days = null → volta a usar o horário do negócio (apaga o horário próprio).
-- security invoker: as policies de staff_hours (dono só mexe no próprio negócio) continuam valendo.
create or replace function public.save_staff_hours(p_staff_member_id uuid, p_days jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid;
  d jsonb;
begin
  select business_id into v_business from public.staff_members where id = p_staff_member_id;
  if v_business is null
     or (not public.is_business_owner(v_business) and auth.role() <> 'service_role') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.staff_hours where staff_member_id = p_staff_member_id;

  if p_days is null then
    return;
  end if;

  for d in select * from jsonb_array_elements(p_days) loop
    insert into public.staff_hours (business_id, staff_member_id, weekday, is_open, opens_at, closes_at)
    values (
      v_business,
      p_staff_member_id,
      (d->>'weekday')::smallint,
      (d->>'is_open')::boolean,
      case when (d->>'is_open')::boolean then (d->>'opens_at')::time end,
      case when (d->>'is_open')::boolean then (d->>'closes_at')::time end
    );
  end loop;
end;
$$;

revoke execute on function public.save_staff_hours(uuid, jsonb) from public, anon;
grant execute on function public.save_staff_hours(uuid, jsonb) to authenticated, service_role;
