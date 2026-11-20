-- CAL-137: o aceite do convite precisa saber se o e-mail convidado já tem conta (para pedir a
-- senha dessa conta em vez de criar outra). Só o servidor (service role) chama.
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke execute on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
