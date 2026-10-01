-- Rx order data model, Phase 0 (part 3): one draft store, proper columns.
--
--  * quotes.rx_payload     — the whole order payload (cv.rxorder/1 or /2),
--                            replacing the [[RXORDER:{...}]] blob that used to
--                            live in notes_internal.
--  * quotes.rx_order_number— the numeric order identifier the lab sees, from a
--                            database sequence instead of a per-browser
--                            localStorage counter (which collided across
--                            browsers). Same 8-digit range the form already
--                            uses, so existing numbers stay valid.
--  * quotes.is_test        — staff test-bench quotes; excluded from lists and
--                            reports.
-- Old rows keep their notes_internal blob untouched; rx_payload is backfilled
-- from it so every reader can use one source.

CREATE SEQUENCE IF NOT EXISTS public.rx_order_number_seq
  START WITH 80000000 MINVALUE 80000000 MAXVALUE 99999999;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS rx_payload jsonb,
  ADD COLUMN IF NOT EXISTS rx_order_number bigint,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS quotes_rx_order_number_key
  ON public.quotes (rx_order_number) WHERE rx_order_number IS NOT NULL;

-- Backfill rx_payload from the legacy blob, row by row so one malformed blob
-- cannot abort the migration. Also adopt the order number the form had
-- already printed on the order when it is unique and in range.
DO $$
DECLARE
  r record;
  v_json jsonb;
  v_no bigint;
BEGIN
  FOR r IN
    SELECT id, notes_internal FROM public.quotes
    WHERE quote_type = 'RX' AND rx_payload IS NULL AND notes_internal LIKE '%[[RXORDER:%'
  LOOP
    BEGIN
      v_json := substring(r.notes_internal FROM '\[\[RXORDER:(.*)\]\]')::jsonb;
      UPDATE public.quotes SET rx_payload = v_json WHERE id = r.id;
      IF (v_json ->> 'orderNo') ~ '^\d{8}$' THEN
        v_no := (v_json ->> 'orderNo')::bigint;
        IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE rx_order_number = v_no) THEN
          UPDATE public.quotes SET rx_order_number = v_no WHERE id = r.id;
        END IF;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'rx_payload backfill skipped for quote %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- New numbers must clear every number already adopted above.
DO $$
DECLARE v_max bigint;
BEGIN
  SELECT max(rx_order_number) INTO v_max FROM public.quotes;
  IF v_max IS NOT NULL AND v_max >= 80000000 THEN
    PERFORM setval('public.rx_order_number_seq', v_max);
  END IF;
END $$;
