-- Ensure contact form submissions are delivered to the site owner.
-- Sets feedback_email on the single company_settings row when it is blank.
UPDATE public.company_settings
SET feedback_email = 'russell@classicvisions.net'
WHERE feedback_email IS NULL OR trim(feedback_email) = '';
