
-- Allow users to read their own role (needed for admin detection)
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
