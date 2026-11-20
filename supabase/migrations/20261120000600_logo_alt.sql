-- CAL-143: segunda versão do logo (opcional), usada quando o fundo da página é escuro.
alter table public.businesses add column logo_alt_url text check (char_length(logo_alt_url) <= 500);
grant update (logo_alt_url) on public.businesses to authenticated;
