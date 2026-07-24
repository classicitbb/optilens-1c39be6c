-- Fixes 42703 "record OLD has no field innovations_customer_id" thrown on
-- every Innovations contacts sync since 20260718160000 landed.
--
-- Root cause: preserve_populated_crm_fields_on_innovations_sync() is one
-- trigger function shared by both public.customers and public.contacts,
-- branching on TG_TABLE_NAME. The original body combined the table check and
-- a same-line OLD.<column> reference in a single AND expression:
--
--   IF TG_TABLE_NAME = 'customers' AND OLD.innovations_customer_id IS NOT NULL THEN
--
-- Postgres must resolve every column reference in an expression against
-- OLD's actual row type at parse time, before any short-circuit evaluation
-- of the AND happens at runtime. On a contacts-table firing, OLD is a
-- contacts row (no innovations_customer_id column), so parsing this
-- expression fails with 42703 regardless of TG_TABLE_NAME's value.
--
-- Fix: nest the field access inside its own TG_TABLE_NAME branch so it is
-- only ever compiled against the matching table's row type.
CREATE OR REPLACE FUNCTION public.preserve_populated_crm_fields_on_innovations_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customers' THEN
    IF OLD.innovations_customer_id IS NOT NULL THEN
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
    END IF;
  ELSIF TG_TABLE_NAME = 'contacts' THEN
    IF OLD.innovations_contact_id IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
