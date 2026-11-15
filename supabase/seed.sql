-- CAL-030 · Dados de demonstração (só para desenvolvimento local)
-- Logins do painel (app.localhost:3000):
--   ze@calenvia.dev  / calenvia123  → Barbearia do Zé (barbearia-do-ze.localhost:3000)
--   ana@calenvia.dev / calenvia123  → Ana Nails (ana-nails.localhost:3000)
--   admin@calenvia.dev / calenvia123 → administração da Calenvia (app.localhost:3000/admin)

-- ---------------------------------------------------------------------------
-- Donos (auth.users + auth.identities para login com e-mail e senha)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'ze@calenvia.dev',
   extensions.crypt('calenvia123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Zé"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'ana@calenvia.dev',
   extensions.crypt('calenvia123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ana"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-0000000000ad',
   'authenticated', 'authenticated', 'admin@calenvia.dev',
   extensions.crypt('calenvia123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Admin"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('ze@calenvia.dev', 'ana@calenvia.dev', 'admin@calenvia.dev');

-- Administração da Calenvia (CAL-114)
insert into public.platform_admins (user_id, note)
values ('0a000000-0000-4000-8000-0000000000ad', 'Admin local de desenvolvimento');

-- ---------------------------------------------------------------------------
-- Negócios
-- ---------------------------------------------------------------------------
insert into public.businesses (
  id, owner_id, slug, name, segment, address, address_reference, whatsapp, instagram, timezone,
  accent_color, headline, subheadline, slot_interval_min, min_notice_min, max_days_ahead,
  cancel_notice_min, plan, plan_status, onboarding_completed_at
) values
  ('0b000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001',
   'barbearia-do-ze', 'Barbearia do Zé', 'barbearia',
   'Rua Barbosa de Freitas, 1200 — Aldeota, Fortaleza/CE', 'Em frente à praça, ao lado da farmácia',
   '5585988887777', 'barbeariadoze', 'America/Fortaleza', '#F5B014',
   'Seu corte no horário certo, sem fila.',
   'Agende em menos de 1 minuto e receba a confirmação no WhatsApp.',
   30, 60, 30, 120, 'pro', 'active', now()),
  ('0b000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000002',
   'ana-nails', 'Ana Nails', 'manicure',
   'Av. Paulista, 900, sala 42 — Bela Vista, São Paulo/SP', 'Prédio comercial, 4º andar',
   '5511977776666', 'ananails', 'America/Sao_Paulo', '#E0457B',
   'Unhas impecáveis, horário garantido.',
   'Escolha o serviço, o dia e pronto. Sem troca de mensagens.',
   15, 120, 45, 240, 'basic', 'active', now());

-- ---------------------------------------------------------------------------
-- Horário de funcionamento (0 = domingo … 6 = sábado)
-- ---------------------------------------------------------------------------
-- Barbearia: ter–sex 9h–19h, sáb 8h–14h, dom e seg fechado. Almoço 12h–13h (ter–sex).
insert into public.business_hours (business_id, weekday, is_open, opens_at, closes_at)
select '0b000000-0000-4000-8000-000000000001', d,
  d between 2 and 6,
  case when d between 2 and 5 then '09:00'::time when d = 6 then '08:00'::time end,
  case when d between 2 and 5 then '19:00'::time when d = 6 then '14:00'::time end
from generate_series(0, 6) d;

insert into public.business_breaks (business_id, weekday, starts_at, ends_at)
select '0b000000-0000-4000-8000-000000000001', d, '12:00', '13:00' from generate_series(2, 5) d;

-- Manicure: seg–sáb 8h–18h, dom fechado. Almoço 12h–13h30 (seg–sex).
insert into public.business_hours (business_id, weekday, is_open, opens_at, closes_at)
select '0b000000-0000-4000-8000-000000000002', d,
  d between 1 and 6,
  case when d between 1 and 6 then '08:00'::time end,
  case when d between 1 and 6 then '18:00'::time end
from generate_series(0, 6) d;

insert into public.business_breaks (business_id, weekday, starts_at, ends_at)
select '0b000000-0000-4000-8000-000000000002', d, '12:00', '13:30' from generate_series(1, 5) d;

-- ---------------------------------------------------------------------------
-- Serviços
-- ---------------------------------------------------------------------------
insert into public.services (id, business_id, name, description, duration_min, price_cents, is_featured, sort_order) values
  ('0c000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', 'Corte masculino', 'Tesoura ou máquina, com acabamento e lavagem.', 30, 4000, true, 1),
  ('0c000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001', 'Barba completa', 'Toalha quente, navalha e hidratação.', 30, 3000, false, 2),
  ('0c000000-0000-4000-8000-000000000003', '0b000000-0000-4000-8000-000000000001', 'Corte + barba', 'O combo completo com desconto.', 60, 6000, true, 3),
  ('0c000000-0000-4000-8000-000000000004', '0b000000-0000-4000-8000-000000000001', 'Pezinho', 'Acabamento do contorno.', 15, 1500, false, 4),
  ('0c000000-0000-4000-8000-000000000011', '0b000000-0000-4000-8000-000000000002', 'Manicure', 'Cutilagem e esmaltação tradicional.', 45, 3500, false, 1),
  ('0c000000-0000-4000-8000-000000000012', '0b000000-0000-4000-8000-000000000002', 'Pedicure', 'Cutilagem, lixa e esmaltação.', 60, 4000, false, 2),
  ('0c000000-0000-4000-8000-000000000013', '0b000000-0000-4000-8000-000000000002', 'Mão + pé', 'Manicure e pedicure no mesmo horário.', 90, 7000, true, 3),
  ('0c000000-0000-4000-8000-000000000014', '0b000000-0000-4000-8000-000000000002', 'Alongamento em gel', 'Unhas alongadas com acabamento natural.', 120, 15000, true, 4);

-- ---------------------------------------------------------------------------
-- Profissionais
-- ---------------------------------------------------------------------------
insert into public.staff_members (id, business_id, name, role) values
  ('0d000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', 'Zé Carlos', 'Barbeiro e dono'),
  ('0d000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001', 'Rafael Lima', 'Barbeiro'),
  ('0d000000-0000-4000-8000-000000000011', '0b000000-0000-4000-8000-000000000002', 'Ana Souza', 'Manicure e nail designer');

-- Zé faz tudo; Rafael não faz barba completa.
insert into public.staff_services (business_id, staff_member_id, service_id)
select s.business_id, sm.id, s.id
from public.services s
join public.staff_members sm on sm.business_id = s.business_id
where not (sm.id = '0d000000-0000-4000-8000-000000000002' and s.id = '0c000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
insert into public.customers (id, business_id, name, whatsapp, last_visit_at) values
  ('0e000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-000000000001', 'Lucas Andrade', '5585999110001', now() - interval '14 days'),
  ('0e000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000001', 'Pedro Henrique', '5585999110002', now() - interval '30 days'),
  ('0e000000-0000-4000-8000-000000000003', '0b000000-0000-4000-8000-000000000001', 'Mateus Rocha', '5585999110003', null),
  ('0e000000-0000-4000-8000-000000000011', '0b000000-0000-4000-8000-000000000002', 'Juliana Martins', '5511988220001', now() - interval '20 days'),
  ('0e000000-0000-4000-8000-000000000012', '0b000000-0000-4000-8000-000000000002', 'Camila Ferreira', '5511988220002', null);

-- ---------------------------------------------------------------------------
-- Agendamentos (relativos ao próximo dia útil de cada negócio, no fuso dele)
-- ---------------------------------------------------------------------------
-- Helper temporário: próximo dia (a partir de amanhã) em que o negócio abre.
create or replace function pg_temp.next_open_day(p_business uuid, p_tz text)
returns date language sql as $$
  select d::date
  from generate_series((now() at time zone p_tz)::date + 1, (now() at time zone p_tz)::date + 8, interval '1 day') d
  join public.business_hours h
    on h.business_id = p_business and h.weekday = extract(dow from d)::int and h.is_open
  order by d limit 1;
$$;

create or replace function pg_temp.at_local(p_day date, p_time time, p_tz text)
returns timestamptz language sql as $$ select (p_day + p_time) at time zone p_tz; $$;

insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status, source, price_cents, customer_name, customer_whatsapp)
select '0b000000-0000-4000-8000-000000000001', c, s, st,
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000001', 'America/Fortaleza'), t::time, 'America/Fortaleza'),
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000001', 'America/Fortaleza'), t::time, 'America/Fortaleza') + make_interval(mins => dur),
  'confirmed', src, price, cname, cphone
from (values
  ('0e000000-0000-4000-8000-000000000001'::uuid, '0c000000-0000-4000-8000-000000000001'::uuid, '0d000000-0000-4000-8000-000000000001'::uuid, '09:00', 30, 'link', 4000, 'Lucas Andrade', '5585999110001'),
  ('0e000000-0000-4000-8000-000000000002'::uuid, '0c000000-0000-4000-8000-000000000003'::uuid, '0d000000-0000-4000-8000-000000000001'::uuid, '10:00', 60, 'link', 6000, 'Pedro Henrique', '5585999110002'),
  ('0e000000-0000-4000-8000-000000000003'::uuid, '0c000000-0000-4000-8000-000000000001'::uuid, '0d000000-0000-4000-8000-000000000002'::uuid, '09:30', 30, 'manual', 4000, 'Mateus Rocha', '5585999110003'),
  ('0e000000-0000-4000-8000-000000000001'::uuid, '0c000000-0000-4000-8000-000000000004'::uuid, '0d000000-0000-4000-8000-000000000002'::uuid, '15:00', 15, 'link', 1500, 'Lucas Andrade', '5585999110001')
) as v(c, s, st, t, dur, src, price, cname, cphone);

-- Um atendimento concluído no passado (histórico do cliente).
insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status, source, price_cents, customer_name, customer_whatsapp)
values ('0b000000-0000-4000-8000-000000000001', '0e000000-0000-4000-8000-000000000001', '0c000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001',
  date_trunc('hour', now() - interval '14 days'), date_trunc('hour', now() - interval '14 days') + interval '30 minutes',
  'completed', 'link', 4000, 'Lucas Andrade', '5585999110001');

insert into public.appointments (business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status, source, price_cents, customer_name, customer_whatsapp)
select '0b000000-0000-4000-8000-000000000002', c, s, '0d000000-0000-4000-8000-000000000011',
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000002', 'America/Sao_Paulo'), t::time, 'America/Sao_Paulo'),
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000002', 'America/Sao_Paulo'), t::time, 'America/Sao_Paulo') + make_interval(mins => dur),
  'confirmed', 'link', price, cname, cphone
from (values
  ('0e000000-0000-4000-8000-000000000011'::uuid, '0c000000-0000-4000-8000-000000000013'::uuid, '08:30', 90, 7000, 'Juliana Martins', '5511988220001'),
  ('0e000000-0000-4000-8000-000000000012'::uuid, '0c000000-0000-4000-8000-000000000011'::uuid, '14:00', 45, 3500, 'Camila Ferreira', '5511988220002')
) as v(c, s, t, dur, price, cname, cphone);

-- Bloqueio: Rafael sai mais cedo no próximo dia útil.
insert into public.time_blocks (business_id, staff_member_id, starts_at, ends_at, reason)
select '0b000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000002',
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000001', 'America/Fortaleza'), '17:00', 'America/Fortaleza'),
  pg_temp.at_local(pg_temp.next_open_day('0b000000-0000-4000-8000-000000000001', 'America/Fortaleza'), '19:00', 'America/Fortaleza'),
  'Consulta médica';

insert into public.message_usage (business_id, period, count)
values ('0b000000-0000-4000-8000-000000000001', to_char(now() at time zone 'America/Fortaleza', 'YYYY-MM'), 12);
