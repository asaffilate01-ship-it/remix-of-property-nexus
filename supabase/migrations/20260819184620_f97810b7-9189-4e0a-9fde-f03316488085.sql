create or replace function public.get_agency_usage(_agency_id uuid)
returns table (managed_properties integer, active_tenancies integer, live_listings integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_agency_member(_agency_id, auth.uid()) or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorised for this agency';
  end if;
  return query
  select
    (select count(*)::int from public.properties p where p.agency_id = _agency_id),
    (select count(*)::int from public.tenancies t
       join public.properties p on p.id = t.property_id
      where p.agency_id = _agency_id and t.status = 'active'),
    (select count(*)::int from public.listings l where l.agency_id = _agency_id and l.status = 'published');
end;
$$;