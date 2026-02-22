
-- Add PDF header/footer fields to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS pdf_header_html text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pdf_footer_html text NOT NULL DEFAULT '';

-- Make the data-files bucket public so logo URLs work
UPDATE storage.buckets SET public = true WHERE id = 'data-files';

-- Ensure public read policy exists for data-files
CREATE POLICY "Public read access for data-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'data-files');
