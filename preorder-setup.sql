-- TALK OF: per-product pre-order option.
-- Run once in Supabase Dashboard > SQL Editor (safe to run again).
-- Fresh installs also get these columns from products-setup.sql.
-- All existing products stay OFF. Turn it on per product in Admin > Products.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS allow_preorder boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS preorder_lead_time text NOT NULL DEFAULT '';
