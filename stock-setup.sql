-- TALK OF: stock management. Run once in Supabase Dashboard > SQL Editor,
-- AFTER products-setup.sql.
-- A size with no row is "not tracked" and counts as available.

CREATE TABLE IF NOT EXISTS public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size)
);

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.product_stock TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_stock TO authenticated;
GRANT ALL ON public.product_stock TO service_role;

-- Storefront: anyone can read stock for active products.
DROP POLICY IF EXISTS "Public can read stock of active products" ON public.product_stock;
CREATE POLICY "Public can read stock of active products"
ON public.product_stock FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true));

DROP POLICY IF EXISTS "Staff can read all stock" ON public.product_stock;
CREATE POLICY "Staff can read all stock"
ON public.product_stock FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can insert stock" ON public.product_stock;
CREATE POLICY "Staff can insert stock"
ON public.product_stock FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can update stock" ON public.product_stock;
CREATE POLICY "Staff can update stock"
ON public.product_stock FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can delete stock" ON public.product_stock;
CREATE POLICY "Staff can delete stock"
ON public.product_stock FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));
