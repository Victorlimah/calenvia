-- CAL-137: aceitar o convite de dono. Tudo numa transação: trava o convite, confere que ainda
-- vale (não aceito, não cancelado, dentro da validade) e que o negócio continua sem dono,
-- preenche businesses.owner_id, cria o membro `owner` e marca o convite como aceito.
-- Só o servidor (service role) chama.

create or replace function public.accept_owner_invitation(p_token_hash text, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.owner_invitations%rowtype;
  biz_owner uuid;
begin
  select * into inv from public.owner_invitations
  where token_hash = p_token_hash
  for update;
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if inv.canceled_at is not null then
    raise exception 'invitation_canceled' using errcode = 'P0001';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invitation_used' using errcode = 'P0001';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;
  -- O convite é para um e-mail: a conta precisa ser dele.
  if not exists (
    select 1 from auth.users u where u.id = p_user_id and lower(u.email) = inv.email
  ) then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  select owner_id into biz_owner from public.businesses where id = inv.business_id for update;
  if biz_owner is not null and biz_owner <> p_user_id then
    raise exception 'business_has_owner' using errcode = 'P0001';
  end if;

  update public.businesses set owner_id = p_user_id where id = inv.business_id;

  insert into public.business_members (business_id, user_id, role, display_name, email)
  select inv.business_id, u.id, 'owner',
         coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), inv.owner_name), u.email
  from auth.users u where u.id = p_user_id
  on conflict (business_id, user_id) do nothing;

  update public.owner_invitations
  set accepted_at = now(), accepted_by = p_user_id, updated_at = now()
  where id = inv.id;

  return inv.business_id;
end;
$$;

revoke execute on function public.accept_owner_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.accept_owner_invitation(text, uuid) to service_role;
