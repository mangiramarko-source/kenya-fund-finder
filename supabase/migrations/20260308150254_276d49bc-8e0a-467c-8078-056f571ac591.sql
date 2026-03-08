
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;

-- Recreate as PERMISSIVE (default) policies
CREATE POLICY "Anyone can view active ads"
ON public.ads FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage ads"
ON public.ads FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
