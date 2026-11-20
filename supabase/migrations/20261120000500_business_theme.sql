-- CAL-140: tema da página pública (contrato em src/lib/themes/schema.ts, validado com Zod no
-- servidor). null = padrão "Noturno" com a cor de destaque (accent_color) do negócio.
-- A tabela businesses já tem RLS (dono/membro com permissão); aqui só a coluna e o privilégio.
alter table public.businesses
  add column theme jsonb
    check (theme is null or (jsonb_typeof(theme) = 'object' and pg_column_size(theme) <= 16384));

-- O dono (e quem tem settings.manage, pela policy de update) pode gravar o tema.
grant update (theme) on public.businesses to authenticated;
