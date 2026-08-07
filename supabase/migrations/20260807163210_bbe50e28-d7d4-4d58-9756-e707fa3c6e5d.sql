-- Remove direct customer write paths from authoritative quote financial records.
DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can delete own quotes" ON public.quotes;

CREATE POLICY "Staff can insert quotes"
ON public.quotes FOR INSERT TO authenticated
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can update quotes"
ON public.quotes FOR UPDATE TO authenticated
USING (public.has_edit_role(auth.uid()))
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can delete quotes"
ON public.quotes FOR DELETE TO authenticated
USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert lines for own quotes" ON public.quote_lines;
DROP POLICY IF EXISTS "Users can update lines for own quotes" ON public.quote_lines;
DROP POLICY IF EXISTS "Users can delete lines for own quotes" ON public.quote_lines;
DROP POLICY IF EXISTS "Customers can insert own quote lines" ON public.quote_lines;
DROP POLICY IF EXISTS "Customers can update own quote lines" ON public.quote_lines;
DROP POLICY IF EXISTS "Customers can delete own quote lines" ON public.quote_lines;

CREATE POLICY "Staff can insert quote lines"
ON public.quote_lines FOR INSERT TO authenticated
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can update quote lines"
ON public.quote_lines FOR UPDATE TO authenticated
USING (public.has_edit_role(auth.uid()))
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can delete quote lines"
ON public.quote_lines FOR DELETE TO authenticated
USING (public.has_edit_role(auth.uid()));

-- Keep personal overrides readable to their owner, but make all writes staff-only.
DROP POLICY IF EXISTS "Users can insert own price overrides" ON public.user_price_overrides;
DROP POLICY IF EXISTS "Users can update own price overrides" ON public.user_price_overrides;
DROP POLICY IF EXISTS "Users can delete own price overrides" ON public.user_price_overrides;
DROP POLICY IF EXISTS "Users can manage own price overrides" ON public.user_price_overrides;
DROP POLICY IF EXISTS "Users manage own price overrides" ON public.user_price_overrides;

CREATE POLICY "Staff can insert user price overrides"
ON public.user_price_overrides FOR INSERT TO authenticated
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can update user price overrides"
ON public.user_price_overrides FOR UPDATE TO authenticated
USING (public.has_edit_role(auth.uid()))
WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Staff can delete user price overrides"
ON public.user_price_overrides FOR DELETE TO authenticated
USING (public.has_edit_role(auth.uid()));