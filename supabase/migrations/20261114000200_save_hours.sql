-- CAL-035 · Salvar horário de funcionamento e intervalos de uma vez (atômico).
-- security invoker: as policies de RLS do dono continuam valendo.

create or replace function public.save_business_hours(p_business_id uuid, p_days jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d jsonb;
  b jsonb;
begin
  if not public.is_business_owner(p_business_id) and auth.role() <> 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.business_breaks where business_id = p_business_id;

  for d in select * from jsonb_array_elements(p_days) loop
    insert into public.business_hours (business_id, weekday, is_open, opens_at, closes_at)
    values (
      p_business_id,
      (d->>'weekday')::smallint,
      (d->>'is_open')::boolean,
      case when (d->>'is_open')::boolean then (d->>'opens_at')::time end,
      case when (d->>'is_open')::boolean then (d->>'closes_at')::time end
    )
    on conflict (business_id, weekday) do update
      set is_open = excluded.is_open, opens_at = excluded.opens_at, closes_at = excluded.closes_at;

    if (d->>'is_open')::boolean then
      for b in select * from jsonb_array_elements(coalesce(d->'breaks', '[]'::jsonb)) loop
        insert into public.business_breaks (business_id, weekday, starts_at, ends_at)
        values (p_business_id, (d->>'weekday')::smallint, (b->>'starts_at')::time, (b->>'ends_at')::time);
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.save_business_hours(uuid, jsonb) from public, anon;
grant execute on function public.save_business_hours(uuid, jsonb) to authenticated, service_role;

-- Troca os serviços de um profissional de uma vez (atômico, com RLS).
create or replace function public.set_staff_services(p_staff_member_id uuid, p_service_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid;
begin
  select business_id into v_business from public.staff_members where id = p_staff_member_id;
  if v_business is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  delete from public.staff_services where staff_member_id = p_staff_member_id;
  insert into public.staff_services (business_id, staff_member_id, service_id)
  select v_business, p_staff_member_id, s.id
  from public.services s
  where s.business_id = v_business and s.id = any (p_service_ids);
end;
$$;

revoke execute on function public.set_staff_services(uuid, uuid[]) from public, anon;
grant execute on function public.set_staff_services(uuid, uuid[]) to authenticated, service_role;
