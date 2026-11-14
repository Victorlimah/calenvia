-- CAL-038 · Upload de imagens (logo, capa, fotos de profissionais e galeria)
-- Arquivos ficam em business-media/{business_id}/{tipo}/{arquivo}. Leitura pública
-- (são imagens da página pública); escrita só pelo dono do negócio da pasta.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.owns_media_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f-]{36}$'
      then public.is_business_owner(((storage.foldername(p_name))[1])::uuid)
    else false
  end;
$$;

revoke execute on function public.owns_media_path(text) from public, anon;
grant execute on function public.owns_media_path(text) to authenticated, service_role;

create policy business_media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-media' and public.owns_media_path(name));

create policy business_media_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'business-media' and public.owns_media_path(name))
  with check (bucket_id = 'business-media' and public.owns_media_path(name));

create policy business_media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-media' and public.owns_media_path(name));

create policy business_media_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'business-media' and public.owns_media_path(name));

-- Galeria "fotos do trabalho" da página pública.
create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  storage_path text,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_photos_business_idx on public.business_photos (business_id, sort_order);

alter table public.business_photos enable row level security;

create policy business_photos_owner_all on public.business_photos
  for all to authenticated
  using ((select public.is_business_owner(business_id)))
  with check ((select public.is_business_owner(business_id)));

revoke all on public.business_photos from anon;
