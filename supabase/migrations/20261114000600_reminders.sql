-- CAL-069: lembretes automáticos.
-- messages.appointment_starts_at guarda para qual horário a mensagem foi enviada.
-- O índice "um lembrete por agendamento" passa a ser "um lembrete por agendamento e horário":
-- se o dono remarca, o cliente recebe um novo lembrete para o novo horário, nunca dois para o mesmo.
-- RLS de messages não muda (dono só lê; escrita só pelo servidor).

alter table public.messages add column appointment_starts_at timestamptz;

update public.messages m
   set appointment_starts_at = a.starts_at
  from public.appointments a
 where a.id = m.appointment_id
   and m.appointment_starts_at is null;

drop index if exists public.messages_one_reminder_idx;

create unique index messages_one_reminder_idx
  on public.messages (appointment_id, appointment_starts_at)
  where type = 'reminder' and status <> 'failed';

-- Busca dos lembretes de um lote de agendamentos.
create index messages_reminder_lookup_idx
  on public.messages (appointment_id)
  where type = 'reminder';
