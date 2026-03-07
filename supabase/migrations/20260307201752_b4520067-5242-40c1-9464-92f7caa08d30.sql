
-- Drop the overly permissive policy
DROP POLICY "Authenticated users can manage blog posts" ON public.blog_posts;

-- Admin-only write access using has_role function
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
