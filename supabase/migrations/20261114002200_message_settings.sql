-- CAL-111: ajustes de mensagens automáticas.

-- 1) Configuração por negócio (uma linha por negócio).
create table public.business_message_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  confirmation_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  -- Antecedências do lembrete, em minutos: 1440 (24 h) e/ou 120 (2 h).
  reminder_offsets_min int[] not null default '{120}'
    check (
      cardinality(reminder_offsets_min) between 1 and 2
      and reminder_offsets_min <@ array[1440, 120]
    ),
  cancellation_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Negócios que já existem recebem os valores padrão.
insert into public.business_message_settings (business_id)
select id from public.businesses
on conflict do nothing;

-- Negócios novos também.
create or replace function public.create_business_message_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_message_settings (business_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.create_business_message_settings() from public, anon, authenticated;

create trigger businesses_message_settings
  after insert on public.businesses
  for each row execute function public.create_business_message_settings();

-- RLS: o dono lê. Escrita só pelo servidor (server action), que confere o papel
-- (dono; gerente quando existir, CAL-112) e o plano — assim o Básico não liga nada
-- nem chamando a API do Supabase direto.
alter table public.business_message_settings enable row level security;
create policy business_message_settings_owner_select on public.business_message_settings
  for select to authenticated using ((select public.is_business_owner(business_id)));
revoke insert, update, delete on public.business_message_settings from anon, authenticated;

-- 2) Desligar as mensagens de um agendamento específico.
alter table public.appointments add column messages_enabled boolean not null default true;

-- 3) Envio bloqueado fica registrado como 'skipped', com o motivo (não conta na cota).
alter table public.messages drop constraint messages_status_check;
alter table public.messages add constraint messages_status_check
  check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped'));
alter table public.messages add column skip_reason text
  check (skip_reason in (
    'disabled_by_business', 'disabled_for_appointment', 'no_quota', 'plan_basic', 'opted_out'
  ));
alter table public.messages add constraint messages_skipped_has_reason
  check ((status = 'skipped') = (skip_reason is not null));

-- 4) Lembretes por antecedência: um por agendamento, horário e antecedência.
alter table public.messages add column reminder_offset_min int;
drop index if exists public.messages_one_reminder_idx;
create unique index messages_one_reminder_idx
  on public.messages (appointment_id, appointment_starts_at, coalesce(reminder_offset_min, 0))
  where type = 'reminder' and status <> 'failed';
