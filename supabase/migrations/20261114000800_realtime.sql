-- CAL-060: agenda em tempo real. O Realtime (postgres_changes) respeita o RLS:
-- cada dono só recebe eventos do próprio negócio.
alter publication supabase_realtime add table public.appointments, public.time_blocks;
