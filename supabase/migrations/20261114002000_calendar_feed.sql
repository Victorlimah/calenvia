-- CAL-107: link privado do calendário (ICS) para assinar no Google Agenda / iPhone / Outlook.
-- O token é gerado e trocado só pelo servidor; quem tem o link vê os horários (com nome do cliente).
alter table public.businesses add column calendar_token text unique
  check (calendar_token is null or char_length(calendar_token) >= 32);
