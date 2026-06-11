
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_handle_uniq UNIQUE (platform, handle);
ALTER TABLE public.social_account_tokens
  ADD CONSTRAINT social_account_tokens_account_id_uniq UNIQUE (account_id);
