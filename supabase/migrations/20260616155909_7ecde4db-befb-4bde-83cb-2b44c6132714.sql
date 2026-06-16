
CREATE TABLE public.cart_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  note text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cart_drafts_user_id_updated_at_idx ON public.cart_drafts (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_drafts TO authenticated;
GRANT ALL ON public.cart_drafts TO service_role;

ALTER TABLE public.cart_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart drafts"
  ON public.cart_drafts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cart drafts"
  ON public.cart_drafts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart drafts"
  ON public.cart_drafts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart drafts"
  ON public.cart_drafts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_cart_drafts_updated_at
  BEFORE UPDATE ON public.cart_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
