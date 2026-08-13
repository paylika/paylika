-- ============================================================
--  Paylika — tables Telegram (pour le bot / webhook)
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- Utilisateurs Telegram ayant interagi avec le bot (/start).
-- On stocke leur chat_id pour pouvoir leur écrire en privé (rappels).
create table if not exists public.telegram_users (
  telegram_user_id bigint primary key,
  chat_id bigint not null,
  username text,
  first_name text,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Chats (groupes/canaux) où le bot a été ajouté comme admin.
-- Le proprio reliera ensuite chaque chat à un groupe Paylika (group_id).
create table if not exists public.telegram_connections (
  chat_id bigint primary key,
  title text,
  group_id uuid references public.groups(id) on delete set null,
  status text not null default 'pending', -- pending | linked | removed
  created_at timestamptz not null default now()
);

-- RLS activée SANS policy publique : seul le service_role (Edge Functions)
-- y accède. La clé anon ne peut ni lire ni écrire ces tables (données sensibles).
alter table public.telegram_users       enable row level security;
alter table public.telegram_connections enable row level security;
