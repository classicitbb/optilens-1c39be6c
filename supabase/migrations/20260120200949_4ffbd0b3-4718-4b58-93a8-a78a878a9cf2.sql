-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own cart items"
ON public.cart_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart"
ON public.cart_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint to prevent duplicate product entries per user
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_product_unique UNIQUE (user_id, product_id);