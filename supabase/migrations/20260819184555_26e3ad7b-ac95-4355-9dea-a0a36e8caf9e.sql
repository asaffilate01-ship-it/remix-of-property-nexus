-- Portal syndication, provider connections and usage metering

create type public.portal_id as enum ('rightmove','zoopla','onthemarket','primelocation','gabley_site');
create type public.portal_listing_status as enum ('queued','sent','live','removed','error');
create type public.provider_kind as enum ('referencing','esign');

create table public.portal_channels (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  portal public.portal_id not null,
  enabled boolean not null default true,
  auto_publish boolean not null default false,
  branch_ref text,
  network_ref text,
  feed_token text not null default encode(gen_random_bytes(24),'hex'),
  config jsonb not null default '{}'::jsonb,
  last_feed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, portal, branch_id)
);
create unique index portal_channels_feed_token_key on public.portal_channels(feed_token);

grant select, insert, update, delete on public.portal_channels to authenticated;
grant all on public.portal_channels to service_role;
alter table public.portal_channels enable row level security;

create policy "Agency members read portal channels" on public.portal_channels
  for select to authenticated using (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "Agency members manage portal channels" on public.portal_channels
  for all to authenticated
  using (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

create table public.portal_listings (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.portal_channels(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  status public.portal_listing_status not null default 'queued',
  external_ref text,
  last_error text,
  last_pushed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, listing_id)
);
create index portal_listings_listing_idx on public.portal_listings(listing_id);

grant select, insert, update, delete on public.portal_listings to authenticated;
grant all on public.portal_listings to service_role;
alter table public.portal_listings enable row level security;

create policy "Agency members read portal listings" on public.portal_listings
  for select to authenticated using (exists (
    select 1 from public.portal_channels c
    where c.id = channel_id and (public.is_agency_member(c.agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  ));
create policy "Agency members manage portal listings" on public.portal_listings
  for all to authenticated
  using (exists (select 1 from public.portal_channels c where c.id = channel_id and (public.is_agency_member(c.agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.portal_channels c where c.id = channel_id and (public.is_agency_member(c.agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))));

create table public.portal_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.portal_channels(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  action text not null,
  ok boolean not null default true,
  detail text,
  created_at timestamptz not null default now()
);
create index portal_events_channel_idx on public.portal_events(channel_id, created_at desc);

grant select on public.portal_events to authenticated;
grant all on public.portal_events to service_role;
alter table public.portal_events enable row level security;
create policy "Agency members read portal events" on public.portal_events
  for select to authenticated using (exists (
    select 1 from public.portal_channels c
    where c.id = channel_id and (public.is_agency_member(c.agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  ));

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind public.provider_kind not null,
  provider text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, kind)
);

grant select, insert, update, delete on public.provider_connections to authenticated;
grant all on public.provider_connections to service_role;
alter table public.provider_connections enable row level security;
create policy "Agency members read provider connections" on public.provider_connections
  for select to authenticated using (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "Agency members manage provider connections" on public.provider_connections
  for all to authenticated
  using (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

alter table public.template_instances
  add column if not exists esign_provider text,
  add column if not exists esign_external_ref text;
create index if not exists template_instances_esign_ref_idx on public.template_instances(esign_external_ref);

create table public.usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  period_month date not null,
  managed_properties integer not null default 0,
  active_tenancies integer not null default 0,
  live_listings integer not null default 0,
  created_at timestamptz not null default now(),
  unique (agency_id, period_month)
);

grant select on public.usage_snapshots to authenticated;
grant all on public.usage_snapshots to service_role;
alter table public.usage_snapshots enable row level security;
create policy "Agency members read usage" on public.usage_snapshots
  for select to authenticated using (public.is_agency_member(agency_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

create or replace function public.get_agency_usage(_agency_id uuid)
returns table (managed_properties integer, active_tenancies integer, live_listings integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.properties p where p.agency_id = _agency_id),
    (select count(*)::int from public.tenancies t
       join public.properties p on p.id = t.property_id
      where p.agency_id = _agency_id and t.status = 'active'),
    (select count(*)::int from public.listings l where l.agency_id = _agency_id and l.status = 'published')
$$;

revoke all on function public.get_agency_usage(uuid) from public;
grant execute on function public.get_agency_usage(uuid) to authenticated, service_role;

create trigger portal_channels_set_updated_at before update on public.portal_channels
  for each row execute function public.set_updated_at();
create trigger portal_listings_set_updated_at before update on public.portal_listings
  for each row execute function public.set_updated_at();
create trigger provider_connections_set_updated_at before update on public.provider_connections
  for each row execute function public.set_updated_at();