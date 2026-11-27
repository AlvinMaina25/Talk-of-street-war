-- TALK OF: makes sure admin image uploads work. Safe to run more than once.
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Owner and manager roles can upload; everyone can view the pictures on the storefront.

-- 1) Buckets (public so the storefront can show the pictures, 5 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('site-images',    'site-images',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif'];

-- 2) Policies for both buckets
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['product-images','site-images'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff can list %1$s" ON storage.objects', b);
    EXECUTE format($p$CREATE POLICY "Staff can list %1$s" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = %1$L AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'staff')))$p$, b);

    EXECUTE format('DROP POLICY IF EXISTS "Owner and manager can upload %1$s" ON storage.objects', b);
    EXECUTE format($p$CREATE POLICY "Owner and manager can upload %1$s" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %1$L AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager')))$p$, b);

    EXECUTE format('DROP POLICY IF EXISTS "Owner and manager can update %1$s" ON storage.objects', b);
    EXECUTE format($p$CREATE POLICY "Owner and manager can update %1$s" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %1$L AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager')))$p$, b);

    EXECUTE format('DROP POLICY IF EXISTS "Owner and manager can delete %1$s" ON storage.objects', b);
    EXECUTE format($p$CREATE POLICY "Owner and manager can delete %1$s" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %1$L AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager')))$p$, b);
  END LOOP;
END $$;
