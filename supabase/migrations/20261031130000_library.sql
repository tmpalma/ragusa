-- C1 library schema.
-- Anon and authenticated have no privileges and no policies, so the anon key cannot read or write.
-- The service role bypasses row level security and is how the library function reaches these tables.
-- No snapshot tables. Hit points and spell slots stay inside characters.document.

create table public.players (
  email text primary key,
  display_name text not null,
  auth_user_id uuid unique,
  measurement_system text check (measurement_system in ('imperial', 'metric'))
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.players (email),
  title text not null,
  document jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.players (email),
  title text not null,
  updated_at timestamptz not null default now()
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id),
  character_id uuid not null unique references public.characters (id),
  sort_order int not null default 0,
  initiative int,
  session jsonb not null default '{}'::jsonb
);

create index characters_owner_email_idx on public.characters (owner_email);
create index campaigns_owner_email_idx on public.campaigns (owner_email);
create index campaign_members_campaign_id_idx on public.campaign_members (campaign_id);

alter table public.players enable row level security;
alter table public.characters enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

revoke all on table
  public.players,
  public.characters,
  public.campaigns,
  public.campaign_members
from public, anon, authenticated;

grant all on table
  public.players,
  public.characters,
  public.campaigns,
  public.campaign_members
to service_role;
