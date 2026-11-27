-- Run once in the Supabase SQL editor to bring existing products in line with the new categories.
-- (products-setup.sql already uses the new names for fresh installs.)
update public.products set category = 'Baggy Jeans (New)' where category = 'Baggy Jeans';
update public.products set category = 'Tees/Shirts'       where category = 'Tops';

-- "Jackets" is not renamed automatically: the current jackets are denim, not leather.
-- Move a product to leather once it really is one, e.g.:
-- update public.products set category = 'Leather Jackets' where slug = 'your-leather-jacket-slug';
