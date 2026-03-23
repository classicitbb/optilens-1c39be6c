ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS freight_provider TEXT NOT NULL DEFAULT 'dhl'
CHECK (freight_provider IN ('dhl', 'non-dhl'));

UPDATE public.shipments
SET freight_provider = 'dhl'
WHERE freight_provider IS NULL;
