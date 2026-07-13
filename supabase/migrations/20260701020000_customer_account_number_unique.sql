-- Innovations account-number linking: the account_number on public.customers
-- is the sole key that ties a website customer's account to their Innovations
-- ERP account (statements, balances, invoices). Guard against duplicates so a
-- typo/second entry can't silently point two accounts at the same statement.
--
-- Partial (not plain) unique index: many existing customers rows have no
-- account_number yet, and NULLs must not collide with each other. This index
-- is a data-integrity guard only — it is NOT used as an ON CONFLICT arbiter
-- anywhere (a partial index can't serve that role; see
-- 20260630160000_innovations_sync_fix_unique_indexes.sql for why).
CREATE UNIQUE INDEX IF NOT EXISTS customers_account_number_key
  ON public.customers (account_number)
  WHERE account_number IS NOT NULL AND account_number <> '';
