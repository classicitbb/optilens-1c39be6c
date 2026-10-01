-- Rx order data model, Phase 0 (part 1).
--
-- 1. rx_details.od_height / os_height — ONE height per eye, per lens. What it
--    means depends on the lens: OC height (single vision), segment height
--    (bifocal / flat-top) or fitting height (progressive). It is one field to
--    the lab (rx_*_seg_height); the form labels it by lens type. The older
--    single fitting_height / seg_height columns stay as the fallback for rows
--    saved before this migration.
-- 2. quote_frame_details.mount_type — the mount (full rim, drilled, ...) used
--    to be written into model_colour, so the lab received it as frame_model.
--    model_colour goes back to meaning the frame model/colour.
ALTER TABLE public.rx_details
  ADD COLUMN IF NOT EXISTS od_height text,
  ADD COLUMN IF NOT EXISTS os_height text;

ALTER TABLE public.quote_frame_details
  ADD COLUMN IF NOT EXISTS mount_type text;
