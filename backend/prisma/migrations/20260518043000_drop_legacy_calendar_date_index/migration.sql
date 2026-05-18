-- Remove the legacy global date_key unique index.
-- Calendar memos are now unique per user via (user_id, date_key).
DROP INDEX IF EXISTS "calendar_memos_date_key_key";
