-- Paylika — réglages plateforme (1 seule ligne). Contient le Pixel Meta de
-- Paylika (acquisition), éditable depuis la console admin.
-- À exécuter dans Supabase → SQL Editor.

create table if not exists public.platform_settings (
  id            int primary key default 1,
  meta_pixel_id text,
  updated_at    timestamptz default now(),
  constraint platform_settings_one_row check (id = 1)
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Le Pixel ID est PUBLIC (présent dans le code client) → lecture ouverte.
-- L'écriture passe uniquement par l'Edge Function admin (service_role), donc
-- aucune policy d'écriture n'est accordée à anon/authenticated.
drop policy if exists "platform_settings read" on public.platform_settings;
create policy "platform_settings read"
  on public.platform_settings for select to anon, authenticated using (true);
