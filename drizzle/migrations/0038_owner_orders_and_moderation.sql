-- Alleen de eigenaar (rol 'owner') ziet en beheert shop-bestellingen.
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'::app_role
  )
$$;

DROP POLICY "own orders" ON public.shop_orders;
CREATE POLICY "own orders" ON public.shop_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

DROP POLICY "admins update orders" ON public.shop_orders;
CREATE POLICY "owner updates orders" ON public.shop_orders
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()));

-- Beheerders kunnen leden waarschuwen.
CREATE TABLE public.member_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.member_warnings TO authenticated;
GRANT ALL ON public.member_warnings TO service_role;
ALTER TABLE public.member_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins warn members" ON public.member_warnings
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "read warnings" ON public.member_warnings
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Beheerders kunnen leden een time-out geven (tijdelijk niet posten in groepen).
CREATE TABLE public.member_timeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  until timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.member_timeouts TO authenticated;
GRANT ALL ON public.member_timeouts TO service_role;
ALTER TABLE public.member_timeouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins give timeouts" ON public.member_timeouts
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins end timeouts" ON public.member_timeouts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "read timeouts" ON public.member_timeouts
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_timed_out(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_timeouts
    WHERE member_id = _user_id AND until > now()
  )
$$;

-- Tijdens een time-out kan een lid niet in groepen posten.
DROP POLICY "write posts" ON public.posts;
CREATE POLICY "write posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_member(group_id)
    AND can_access_group(group_id)
    AND (NOT is_hidden)
    AND (NOT public.is_timed_out(auth.uid()))
  );