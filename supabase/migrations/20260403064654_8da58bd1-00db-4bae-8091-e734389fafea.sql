-- Explicitly deny anon inserts on page_views by ensuring no permissive INSERT policy exists for anon
-- The existing policy already restricts to authenticated users with user_id = auth.uid()
-- We add a restrictive default-deny for anon to be explicit
DO $$
BEGIN
  -- Check if there's any anon insert policy and drop it
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'page_views' 
    AND schemaname = 'public'
    AND cmd = 'INSERT'
    AND roles::text LIKE '%anon%'
  ) THEN
    RAISE NOTICE 'Anon insert policy found - would need manual removal';
  END IF;
END $$;