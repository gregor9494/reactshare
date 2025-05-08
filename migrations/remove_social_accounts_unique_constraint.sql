BEGIN;
ALTER TABLE social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_user_id_provider_key;
COMMIT;