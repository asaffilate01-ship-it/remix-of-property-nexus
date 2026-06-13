
-- Helper: contact IDs owned by the current user (email match in auth.users)
CREATE OR REPLACE FUNCTION public.current_user_contact_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.contacts c
  JOIN auth.users u ON u.id = auth.uid()
  WHERE c.email IS NOT NULL AND lower(c.email) = lower(u.email)
$$;

-- TENANCIES: tenant can see their own
CREATE POLICY "Tenants view own tenancy"
ON public.tenancies FOR SELECT
TO authenticated
USING (tenant_user_id = auth.uid());

-- PROPERTIES: tenant can see the property they rent
CREATE POLICY "Tenants view their property"
ON public.properties FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  WHERE t.property_id = properties.id AND t.tenant_user_id = auth.uid()
));

-- ROOMS: tenant can see their room
CREATE POLICY "Tenants view their room"
ON public.rooms FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  WHERE t.room_id = rooms.id AND t.tenant_user_id = auth.uid()
));

-- RENT SCHEDULE: tenant can see their own
CREATE POLICY "Tenants view own rent schedule"
ON public.rent_schedule FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  WHERE t.id = rent_schedule.tenancy_id AND t.tenant_user_id = auth.uid()
));

-- COMPLIANCE: tenant can see records for their property
CREATE POLICY "Tenants view property compliance"
ON public.compliance_records FOR SELECT
TO authenticated
USING (
  property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.property_id = compliance_records.property_id
      AND t.tenant_user_id = auth.uid()
      AND t.status = 'active'
  )
);

-- WORK ORDERS: tenant view + insert; contractor view + status update
CREATE POLICY "Tenants view own work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenancies t
  WHERE t.id = work_orders.tenancy_id AND t.tenant_user_id = auth.uid()
));

CREATE POLICY "Tenants create work orders for own tenancy"
ON public.work_orders FOR INSERT
TO authenticated
WITH CHECK (
  reported_by = auth.uid()
  AND tenancy_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = work_orders.tenancy_id AND t.tenant_user_id = auth.uid()
  )
);

CREATE POLICY "Contractors view assigned work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (contact_id IN (SELECT public.current_user_contact_ids()));

CREATE POLICY "Contractors update assigned work orders"
ON public.work_orders FOR UPDATE
TO authenticated
USING (contact_id IN (SELECT public.current_user_contact_ids()))
WITH CHECK (contact_id IN (SELECT public.current_user_contact_ids()));

-- WORK ORDER UPDATES: contractor + tenant can append on their orders
CREATE POLICY "Assignees view work order updates"
ON public.work_order_updates FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.work_orders w
  WHERE w.id = work_order_updates.work_order_id
    AND (
      w.contact_id IN (SELECT public.current_user_contact_ids())
      OR EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id = w.tenancy_id AND t.tenant_user_id = auth.uid()
      )
    )
));

CREATE POLICY "Assignees post work order updates"
ON public.work_order_updates FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_updates.work_order_id
      AND (
        w.contact_id IN (SELECT public.current_user_contact_ids())
        OR EXISTS (
          SELECT 1 FROM public.tenancies t
          WHERE t.id = w.tenancy_id AND t.tenant_user_id = auth.uid()
        )
      )
  )
);

-- SALES DEALS: conveyancer sees matters where they are buyer or seller side
CREATE POLICY "Conveyancers view their matters"
ON public.sales_deals FOR SELECT
TO authenticated
USING (
  seller_conveyancer_id IN (SELECT public.current_user_contact_ids())
  OR buyer_conveyancer_id IN (SELECT public.current_user_contact_ids())
);

-- CONTACTS: third parties can see their own contact card
CREATE POLICY "Users view own contact records"
ON public.contacts FOR SELECT
TO authenticated
USING (id IN (SELECT public.current_user_contact_ids()));

-- JOB MEDIA: contractor + tenant can view media on their work orders
CREATE POLICY "Assignees view job media"
ON public.job_media FOR SELECT
TO authenticated
USING (
  work_order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = job_media.work_order_id
      AND (
        w.contact_id IN (SELECT public.current_user_contact_ids())
        OR EXISTS (
          SELECT 1 FROM public.tenancies t
          WHERE t.id = w.tenancy_id AND t.tenant_user_id = auth.uid()
        )
      )
  )
);
