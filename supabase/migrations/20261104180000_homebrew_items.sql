-- DM-authored homebrew items (library scope, not shared catalog).

create table public.homebrew_items (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.players (email),
  campaign_ids uuid[] not null default '{}'::uuid[],
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index homebrew_items_owner_email_idx on public.homebrew_items (owner_email);
create index homebrew_items_campaign_ids_idx on public.homebrew_items using gin (campaign_ids);

alter table public.homebrew_items enable row level security;

revoke all on table public.homebrew_items from public, anon, authenticated;

grant all on table public.homebrew_items to service_role;
