-- ============================================================
--  Paylika — schéma initial + données de démo
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

create extension if not exists "pgcrypto";

-- Groupes / canaux monétisés (canal Telegram, salle de sport, etc.)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'telegram' check (kind in ('telegram','gym','other')),
  telegram_chat_id text,
  created_at timestamptz not null default now()
);

-- Formules d'abonnement rattachées à un groupe
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  currency text not null default 'XOF',
  interval_days int not null default 30,
  created_at timestamptz not null default now()
);

-- Abonnés (personnes)
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  telegram_username text,
  telegram_user_id bigint,
  phone text,
  created_at timestamptz not null default now()
);

-- Abonnements : lient un abonné à une formule/groupe, avec statut + échéance
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  status text not null default 'active' check (status in ('active','expired','pending','cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Paiements
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  method text,
  status text not null default 'completed' check (status in ('completed','pending','failed','refunded')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_expires on public.subscriptions(expires_at);
create index if not exists idx_payments_paid_at on public.payments(paid_at);

-- ============================================================
--  RLS — Row Level Security
--  ⚠️ DÉV UNIQUEMENT : lecture ouverte à la clé anon pour voir
--  les données dans l'app. À RESTREINDRE avant la production
--  (passer la lecture derrière l'authentification).
-- ============================================================
alter table public.groups        enable row level security;
alter table public.plans         enable row level security;
alter table public.subscribers   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['groups','plans','subscribers','subscriptions','payments'] loop
    execute format('drop policy if exists "dev anon read" on public.%I;', t);
    execute format('create policy "dev anon read" on public.%I for select to anon using (true);', t);
  end loop;
end $$;

-- ============================================================
--  Données de démo  (ne s'insèrent qu'une fois : gardées si déjà présentes)
-- ============================================================

-- Groupes
insert into public.groups (name, kind, telegram_chat_id)
select v.name, v.kind, v.chat
from (values
  ('Crypto Signals VIP',   'telegram', '-1001111111111'),
  ('Fitness Club Premium', 'gym',      null),
  ('Yoga Studio',          'gym',      null),
  ('Trading Room',         'telegram', '-1002222222222')
) as v(name, kind, chat)
where not exists (select 1 from public.groups g where g.name = v.name);

-- Une formule mensuelle par groupe, prix selon le groupe
insert into public.plans (group_id, name, price, currency, interval_days)
select g.id, g.name || ' — Mensuel',
  case g.name
    when 'Crypto Signals VIP'   then 15000
    when 'Fitness Club Premium' then 20000
    when 'Yoga Studio'          then 12000
    else 25000
  end,
  'XOF', 30
from public.groups g
where not exists (select 1 from public.plans p where p.group_id = g.id);

-- Abonnés
insert into public.subscribers (full_name, telegram_username, phone)
select v.name, v.uname, v.phone
from (values
  ('Aïssatou Ba', 'aissatou_ba', '+221770000001'),
  ('Moussa Diop', 'moussa_d',    '+221770000002'),
  ('John Keïta',  'john_k',      '+221770000003'),
  ('Fatou Sow',   'fatou_sow',   '+221770000004'),
  ('Serigne War', 'serigne_w',   '+221770000005'),
  ('John Diallo', 'john_diallo', '+221770000006')
) as v(name, uname, phone)
where not exists (select 1 from public.subscribers s where s.full_name = v.name);

-- Abonnements : un par abonné (John Diallo volontairement expiré → relance)
insert into public.subscriptions (subscriber_id, plan_id, group_id, status, started_at, expires_at)
select s.id, p.id, g.id,
       case when m.expired then 'expired' else 'active' end,
       now() - interval '20 days',
       case when m.expired then now() - interval '1 day'
            else now() + interval '10 days' end
from (values
  ('Aïssatou Ba', 'Crypto Signals VIP',   false),
  ('Moussa Diop', 'Fitness Club Premium', false),
  ('John Keïta',  'Trading Room',         false),
  ('Fatou Sow',   'Yoga Studio',          false),
  ('Serigne War', 'Crypto Signals VIP',   false),
  ('John Diallo', 'Fitness Club Premium', true)
) as m(sub_name, grp_name, expired)
join public.subscribers s on s.full_name = m.sub_name
join public.groups g on g.name = m.grp_name
join public.plans p on p.group_id = g.id
where not exists (
  select 1 from public.subscriptions x where x.subscriber_id = s.id
);

-- Paiements pour les abonnements actifs
insert into public.payments (subscription_id, subscriber_id, amount, currency, method, status, paid_at)
select sub.id, sub.subscriber_id, pl.price, 'XOF', 'wave', 'completed', now() - interval '20 days'
from public.subscriptions sub
join public.plans pl on pl.id = sub.plan_id
where sub.status = 'active'
  and not exists (select 1 from public.payments pay where pay.subscription_id = sub.id);
