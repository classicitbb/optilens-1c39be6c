DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('quotes', 'quote_lines', 'user_price_overrides')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND policyname NOT ILIKE '%staff%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;