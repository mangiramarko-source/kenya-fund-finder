-- Local/CI-only prerequisites for replaying production cron migrations.
-- Supabase CLI loads roles.sql before project migrations; this file is not
-- part of the remote migration history. Values are inert local placeholders.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'kff_project_url'
      AND NULLIF(decrypted_secret, '') IS NOT NULL
  ) THEN
    PERFORM vault.create_secret(
      'http://127.0.0.1:54321',
      'kff_project_url',
      'Local migration replay placeholder'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'kff_automations_secret_key'
      AND NULLIF(decrypted_secret, '') IS NOT NULL
  ) THEN
    PERFORM vault.create_secret(
      'local-ci-placeholder-not-a-real-secret',
      'kff_automations_secret_key',
      'Local migration replay placeholder'
    );
  END IF;
END
$$;
