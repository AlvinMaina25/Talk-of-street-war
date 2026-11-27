-- TALK OF: products table, RLS, storage bucket, and seed data.
-- Run this whole file once in Supabase Dashboard > SQL Editor.
-- Requires the earlier admin migration (user_roles + has_role) to already be applied.

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),          -- KES
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  alt text NOT NULL DEFAULT '',
  sizes text[] NOT NULL DEFAULT '{}',
  is_new boolean NOT NULL DEFAULT false,
  is_limited boolean NOT NULL DEFAULT false,
  allow_preorder boolean NOT NULL DEFAULT false,      -- seller opts in: piece is sold as a pre-order when not in stock
  preorder_lead_time text NOT NULL DEFAULT '',        -- shown to customers, e.g. '5-7 days'
  is_active boolean NOT NULL DEFAULT true,
  images text[] NOT NULL DEFAULT '{}',                -- first image is the main one
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
ON public.products FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Staff can read all products" ON public.products;
CREATE POLICY "Staff can read all products"
ON public.products FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "Owner and manager can insert products" ON public.products;
CREATE POLICY "Owner and manager can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Owner and manager can update products" ON public.products;
CREATE POLICY "Owner and manager can update products"
ON public.products FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Owner and manager can delete products" ON public.products;
CREATE POLICY "Owner and manager can delete products"
ON public.products FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Storage bucket: public read, owner/manager write.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS "Staff can list product images" ON storage.objects;
CREATE POLICY "Staff can list product images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'))
);

DROP POLICY IF EXISTS "Owner and manager can upload product images" ON storage.objects;
CREATE POLICY "Owner and manager can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

DROP POLICY IF EXISTS "Owner and manager can update product images" ON storage.objects;
CREATE POLICY "Owner and manager can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

DROP POLICY IF EXISTS "Owner and manager can delete product images" ON storage.objects;
CREATE POLICY "Owner and manager can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

-- Seed from src/data/products.ts. Existing ids become slugs, so product URLs don't change.
-- Seeded images keep their current site paths (/images/...); new uploads use the bucket.
INSERT INTO public.products
  (slug, name, price, category, description, alt, sizes, is_new, is_limited, is_active, images, created_at)
VALUES
  ('dark-indigo-wide-leg-jeans', 'Dark Indigo Wide-Leg Jeans', 2400, 'Baggy Jeans (New)', 'Deep indigo denim with a wide, easy leg. A clean, dark base for every fit in the rotation.', 'Dark indigo wide-leg jeans laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/jeans-indigo-1.webp', '/images/jeans-indigo-2.webp', '/images/jeans-indigo-3.webp']::text[], now() + interval '0 seconds'),
  ('vintage-blue-panel-wide-leg-jeans', 'Vintage Blue Panel Wide-Leg Jeans', 2400, 'Baggy Jeans (New)', 'A faded vintage wash with front seam panels and slit pockets. Wide through the leg, with a lived-in feel from day one.', 'Faded vintage blue wide-leg jeans with front seam panels and slit pockets, laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/jeans-vintage-1.webp', '/images/jeans-vintage-2.webp', '/images/jeans-vintage-3.webp']::text[], now() + interval '1 seconds'),
  ('light-wash-bow-hem-jeans', 'Light Wash Bow-Hem Jeans', 2400, 'Baggy Jeans (New)', 'Light-wash baggy denim with pink ribbon bows tied at the hem slits. A soft detail on a relaxed fit.', 'Light wash baggy jeans with pink ribbon bows at the hem slits, laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], false, true, true, ARRAY['/images/jeans-bow-1.webp', '/images/jeans-bow-2.webp']::text[], now() + interval '2 seconds'),
  ('japan-retro-home-jersey', 'Japan Retro Home Jersey', 3500, 'Jerseys', 'Retro Japan home shirt in royal blue with white shoulder panels, red trim and the JFA crest. A collector''s piece that works as a streetwear layer.', 'Blue adidas Japan retro home football jersey with white shoulder panels, laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/jersey-japan-1.webp', '/images/jersey-japan-2.webp']::text[], now() + interval '3 seconds'),
  ('ac-milan-retro-home-jersey', 'AC Milan Retro Home Jersey', 3500, 'Jerseys', 'The classic red and black stripes with gold piping and the bwin front print. Retro Milan, ready to wear loose.', 'Red and black striped adidas AC Milan retro home football jersey with bwin sponsor, laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/jersey-milan-1.webp', '/images/jersey-milan-2.webp']::text[], now() + interval '4 seconds'),
  ('portugal-2012-away-jersey', 'Portugal 2012 Away Jersey', 3500, 'Jerseys', 'White Nike away shirt with the green and red cross stripes and the Portugal / Espanha 27/06/2012 match print. A clean one for the collection.', 'White Nike Portugal away football jersey with green and red cross stripes and Portugal/Espanha 27/06/2012 match print, laid flat', ARRAY['S', 'M', 'L', 'XL']::text[], false, true, true, ARRAY['/images/jersey-portugal-1.webp', '/images/jersey-portugal-2.webp']::text[], now() + interval '5 seconds'),
  ('washed-black-baggy-denim', 'Washed Black Baggy Denim', 2500, 'Baggy Jeans (New)', 'Heavy on the silhouette. Easy on the styling. A relaxed washed denim fit made for the everyday rotation.', 'Model wearing relaxed, washed-black baggy jeans', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/product-black-denim.webp']::text[], now() + interval '6 seconds'),
  ('vintage-blue-wide-leg-jeans', 'Vintage Blue Wide-Leg Jeans', 2200, 'Baggy Jeans (New)', 'Room to move, denim that does the talking. A vintage-inspired wide-leg cut with an easy, lived-in feel.', 'Model in a vintage blue denim jacket and wide-leg jeans', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/talk-of-denim.webp']::text[], now() + interval '7 seconds'),
  ('oversized-washed-black-jacket', 'Oversized Washed Black Jacket', 3800, 'Jackets', 'A boxy, washed-black outer layer with a little edge. Built to make the simplest fit feel intentional.', 'Model in an oversized washed-black jacket and baggy black denim in a Nairobi alley', ARRAY['S', 'M', 'L', 'XL']::text[], false, true, true, ARRAY['/images/talk-of-hero.webp']::text[], now() + interval '8 seconds'),
  ('utility-cargo-jorts', 'Utility Cargo Jorts', 1800, 'Jorts', 'A relaxed above-the-knee cut with utility pockets. Made for long days and low-effort styling.', 'Model wearing olive utility cargo jorts', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/product-jorts.webp']::text[], now() + interval '9 seconds'),
  ('vintage-graphic-tee', 'Vintage Graphic Tee', 1200, 'Tees/Shirts', 'A roomy everyday layer with a vintage-inspired graphic. Wear it your way, on repeat.', 'Model in a vintage-style oversized charcoal graphic tee', ARRAY['S', 'M', 'L', 'XL']::text[], false, false, true, ARRAY['/images/product-tee.webp']::text[], now() + interval '10 seconds'),
  ('oversized-denim-jacket', 'Oversized Denim Jacket', 3200, 'Jackets', 'The throw-on-and-go layer. A generous vintage denim shape that works with just about everything.', 'Model wearing an oversized blue denim jacket', ARRAY['S', 'M', 'L', 'XL']::text[], true, false, true, ARRAY['/images/product-denim-jacket.webp']::text[], now() + interval '11 seconds'),
  ('washed-denim-cargo-jorts', 'Washed Denim Cargo Jorts', 2400, 'Jorts', 'A long, roomy cargo cut in washed denim with everyday utility pockets. Made to anchor the rest of your outfit.', 'Model in washed denim cargo jorts with a vintage graphic tee', ARRAY['S', 'M', 'L', 'XL']::text[], false, true, true, ARRAY['/images/talk-of-lookbook.webp']::text[], now() + interval '12 seconds'),
  ('vintage-denim-co-ord', 'Vintage Denim Co-Ord', 2800, 'Jackets', 'Jacket and wide-leg jeans cut from the same vintage wash. Wear them together, or split the set across two fits.', 'Model in a matching vintage-wash denim jacket and wide-leg jeans', ARRAY['S', 'M', 'L', 'XL']::text[], false, false, true, ARRAY['/images/talk-of-denim.webp']::text[], now() + interval '13 seconds')
ON CONFLICT (slug) DO NOTHING;
