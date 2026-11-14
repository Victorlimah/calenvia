-- CAL-109: programa de indicação. Cada negócio tem um código; quem se cadastra pelo link
-- fica ligado a quem indicou. Só o servidor grava esses campos.
alter table public.businesses
  add column referral_code text unique check (referral_code is null or referral_code ~ '^[a-z0-9]{6,12}$'),
  add column referred_by uuid references public.businesses (id) on delete set null;

-- Quem indicou vê só nome e data dos indicados (sem outros dados), via função.
create or replace function public.my_referrals()
returns table (name text, created_at timestamptz, active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, b.created_at, (b.onboarding_completed_at is not null) as active
  from public.businesses b
  where b.referred_by in (select id from public.businesses where owner_id = auth.uid())
  order by b.created_at desc
  limit 200;
$$;

revoke execute on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;
