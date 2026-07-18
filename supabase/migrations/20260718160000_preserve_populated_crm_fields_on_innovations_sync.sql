-- Innovations may enrich blank CRM data, but it must not replace a value that
-- an admin or contact has already supplied. The two immutable source keys stay
-- writable so the ERP relationship can continue to resolve correctly.
CREATE OR REPLACE FUNCTION public.preserve_populated_crm_fields_on_innovations_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- The Innovations receiver is the only service-role writer for these rows.
  -- Keep normal staff edits unrestricted.
  IF auth.role() <> 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customers' AND OLD.innovations_customer_id IS NOT NULL THEN
    NEW.name := COALESCE(NULLIF(BTRIM(OLD.name), ''), NEW.name);
    NEW.account_number := COALESCE(NULLIF(BTRIM(OLD.account_number), ''), NEW.account_number);
    NEW.address := COALESCE(NULLIF(BTRIM(OLD.address), ''), NEW.address);
    NEW.country_code := COALESCE(NULLIF(BTRIM(OLD.country_code), ''), NEW.country_code);
    NEW.email := COALESCE(NULLIF(BTRIM(OLD.email), ''), NEW.email);
    NEW.phone := COALESCE(NULLIF(BTRIM(OLD.phone), ''), NEW.phone);
    NEW.notes := COALESCE(NULLIF(BTRIM(OLD.notes), ''), NEW.notes);
    NEW.pay_by_card := COALESCE(OLD.pay_by_card, NEW.pay_by_card);
    NEW.pay_by_eft := COALESCE(OLD.pay_by_eft, NEW.pay_by_eft);
    NEW.eft_institution_name := COALESCE(NULLIF(BTRIM(OLD.eft_institution_name), ''), NEW.eft_institution_name);
    NEW.default_payment_type := COALESCE(OLD.default_payment_type, NEW.default_payment_type);
  ELSIF TG_TABLE_NAME = 'contacts' AND OLD.innovations_contact_id IS NOT NULL THEN
    NEW.name := COALESCE(NULLIF(BTRIM(OLD.name), ''), NEW.name);
    NEW.business_name := COALESCE(NULLIF(BTRIM(OLD.business_name), ''), NEW.business_name);
    NEW.email := COALESCE(NULLIF(BTRIM(OLD.email), ''), NEW.email);
    NEW.phone := COALESCE(NULLIF(BTRIM(OLD.phone), ''), NEW.phone);
    NEW.street := COALESCE(NULLIF(BTRIM(OLD.street), ''), NEW.street);
    NEW.street2 := COALESCE(NULLIF(BTRIM(OLD.street2), ''), NEW.street2);
    NEW.city := COALESCE(NULLIF(BTRIM(OLD.city), ''), NEW.city);
    NEW.state := COALESCE(NULLIF(BTRIM(OLD.state), ''), NEW.state);
    NEW.zip := COALESCE(NULLIF(BTRIM(OLD.zip), ''), NEW.zip);
    NEW.country := COALESCE(NULLIF(BTRIM(OLD.country), ''), NEW.country);
    NEW.country_code := COALESCE(NULLIF(BTRIM(OLD.country_code), ''), NEW.country_code);
    NEW.is_company := COALESCE(OLD.is_company, NEW.is_company);
    NEW.status := COALESCE(NULLIF(BTRIM(OLD.status), ''), NEW.status);
    NEW.pipeline_stage := COALESCE(NULLIF(BTRIM(OLD.pipeline_stage), ''), NEW.pipeline_stage);
    NEW.type := COALESCE(NULLIF(BTRIM(OLD.type), ''), NEW.type);
    NEW.notes := COALESCE(NULLIF(BTRIM(OLD.notes), ''), NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_populated_customer_fields_on_innovations_sync ON public.customers;
CREATE TRIGGER preserve_populated_customer_fields_on_innovations_sync
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.preserve_populated_crm_fields_on_innovations_sync();

DROP TRIGGER IF EXISTS preserve_populated_contact_fields_on_innovations_sync ON public.contacts;
CREATE TRIGGER preserve_populated_contact_fields_on_innovations_sync
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.preserve_populated_crm_fields_on_innovations_sync();
