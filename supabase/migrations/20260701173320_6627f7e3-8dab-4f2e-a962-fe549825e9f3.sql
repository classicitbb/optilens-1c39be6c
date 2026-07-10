CREATE UNIQUE INDEX IF NOT EXISTS customers_account_number_key
  ON public.customers (account_number)
  WHERE account_number IS NOT NULL AND account_number <> '';