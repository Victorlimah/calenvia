-- CAL-074: textos personalizados das mensagens enviadas pelo WhatsApp do próprio dono
-- (plano Básico e plano B). As mensagens automáticas usam os templates aprovados pela Meta.
alter table public.businesses
  add column message_texts jsonb not null default '{}'::jsonb
  check (jsonb_typeof(message_texts) = 'object' and pg_column_size(message_texts) < 8192);

grant update (message_texts) on public.businesses to authenticated;
