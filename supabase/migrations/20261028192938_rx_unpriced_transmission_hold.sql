-- The file sent to a lab must state the same hold enforced on the website.
CREATE FUNCTION public.mark_unpriced_rx_shipping_hold() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE note text; hold_note constant text := 'PRICE TO BE CONFIRMED - DO NOT SHIP UNTIL ALL CHARGES ARE PAID';
BEGIN
  IF NEW.status NOT IN ('pending_review','approved') THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM public.quote_lines WHERE quote_id=NEW.quote_id AND needs_assistance AND assistance_note ILIKE '%not priced%') THEN
    note := COALESCE(NEW.payload->'quote'->>'notes_customer','');
    IF position(hold_note IN note)=0 THEN
      NEW.payload := jsonb_set(NEW.payload,'{quote}',COALESCE(NEW.payload->'quote','{}'::jsonb) || jsonb_build_object('notes_customer',concat_ws(E'\n',NULLIF(note,''),hold_note)),true);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mark_unpriced_rx_shipping_hold() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zzz_mark_unpriced_rx_shipping_hold BEFORE INSERT OR UPDATE OF payload,status ON public.rx_order_submissions FOR EACH ROW EXECUTE FUNCTION public.mark_unpriced_rx_shipping_hold();
NOTIFY pgrst,'reload schema';
