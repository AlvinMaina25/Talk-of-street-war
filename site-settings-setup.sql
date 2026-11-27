-- TALK OF: site_settings table (single row), RLS, and the "site-images" storage bucket.
-- Run this whole file once in Supabase Dashboard > SQL Editor (safe to re-run).
-- Requires the earlier admin migration (user_roles + has_role) to already be applied.

CREATE TABLE IF NOT EXISTS public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),     -- enforces a single row
  hero_image text NOT NULL DEFAULT '/images/talk-of-hero.webp',
  hero_title text NOT NULL DEFAULT E'NOT MADE\nTO BLEND IN.',
  hero_subtitle text NOT NULL DEFAULT 'STREETWEAR THAT SPEAKS BEFORE YOU DO.',
  announcement_text text NOT NULL DEFAULT 'YOUR NEXT FIT IS WAITING — SHOP THE LATEST DROPS',
  announcement_active boolean NOT NULL DEFAULT true,
  whatsapp_number text NOT NULL DEFAULT '254725647479'
    CHECK (whatsapp_number ~ '^254[17][0-9]{8}$'),      -- digits only, international format
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
ON public.site_settings FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Owner and manager can insert site settings" ON public.site_settings;
CREATE POLICY "Owner and manager can insert site settings"
ON public.site_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Owner and manager can update site settings" ON public.site_settings;
CREATE POLICY "Owner and manager can update site settings"
ON public.site_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Storage bucket: public read, owner/manager write.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-images', 'site-images', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS "Staff can list site images" ON storage.objects;
CREATE POLICY "Staff can list site images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'site-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'))
);

DROP POLICY IF EXISTS "Owner and manager can upload site images" ON storage.objects;
CREATE POLICY "Owner and manager can upload site images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

DROP POLICY IF EXISTS "Owner and manager can update site images" ON storage.objects;
CREATE POLICY "Owner and manager can update site images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'site-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

DROP POLICY IF EXISTS "Owner and manager can delete site images" ON storage.objects;
CREATE POLICY "Owner and manager can delete site images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'site-images'
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);
