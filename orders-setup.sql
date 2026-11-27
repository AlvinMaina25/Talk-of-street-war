-- TALK OF: orders. Run once in Supabase Dashboard > SQL Editor,
-- AFTER products-setup.sql and stock-setup.sql.

CREATE SEQUENCE IF NOT EXISTS public.order_no_seq START 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT ('TO-' || nextval('public.order_no_seq')),
  customer_name text NOT NULL,
  phone text NOT NULL,
  notes text,                         -- customer's note from the bag
  order_notes text,                   -- internal notes (staff only)
  items jsonb NOT NULL,               -- [{product_id, slug, name, size, qty, price}]
  total integer NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'delivered', 'cancelled')),
  stock_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- No access for the public at all. Customers place orders only through place_order() below.
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT SELECT, DELETE ON public.orders TO authenticated;
GRANT UPDATE (status, order_notes) ON public.orders TO authenticated;   -- staff can change nothing else
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
CREATE POLICY "Staff can view orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Owner and manager can delete orders" ON public.orders;
CREATE POLICY "Owner and manager can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Public order placement. The server looks up names and prices itself, so a customer
-- cannot send fake prices. Returns only the order number.
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name text,
  _phone text,
  _notes text,
  _items jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text := btrim(coalesce(_customer_name, ''));
  _tel text := btrim(coalesce(_phone, ''));
  _note text := nullif(btrim(coalesce(_notes, '')), '');
  _line jsonb;
  _clean jsonb := '[]'::jsonb;
  _prod public.products%ROWTYPE;
  _qty integer;
  _size text;
  _tracked integer;
  _total integer := 0;
  _no text;
BEGIN
  IF char_length(_name) < 2 OR char_length(_name) > 100 THEN
    RAISE EXCEPTION 'Order rejected: please enter your name';
  END IF;
  IF _tel !~ '^[0-9+() -]{7,20}$' THEN
    RAISE EXCEPTION 'Order rejected: please enter a valid phone number';
  END IF;
  IF _note IS NOT NULL AND char_length(_note) > 500 THEN
    RAISE EXCEPTION 'Order rejected: note is too long';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 30 THEN
    RAISE EXCEPTION 'Order rejected: your bag is empty';
  END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _size := _line->>'size';
    IF (_line->>'qty') !~ '^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Order rejected: invalid quantity';
    END IF;
    _qty := (_line->>'qty')::integer;
    IF _qty < 1 OR _qty > 20 THEN
      RAISE EXCEPTION 'Order rejected: invalid quantity';
    END IF;

    SELECT * INTO _prod FROM public.products WHERE slug = (_line->>'product_id') AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order rejected: an item in your bag is no longer available';
    END IF;
    IF _size IS NULL OR NOT (_size = ANY (_prod.sizes)) THEN
      RAISE EXCEPTION 'Order rejected: % is not available in size %', _prod.name, coalesce(_size, '?');
    END IF;

    SELECT quantity INTO _tracked FROM public.product_stock WHERE product_id = _prod.id AND size = _size;
    IF FOUND AND _tracked < _qty THEN
      RAISE EXCEPTION 'Order rejected: % (size %) has only % left', _prod.name, _size, _tracked;
    END IF;

    _total := _total + _prod.price * _qty;
    _clean := _clean || jsonb_build_object(
      'product_id', _prod.id, 'slug', _prod.slug, 'name', _prod.name,
      'size', _size, 'qty', _qty, 'price', _prod.price
    );
  END LOOP;

  INSERT INTO public.orders (customer_name, phone, notes, items, total)
  VALUES (_name, _tel, _note, _clean, _total)
  RETURNING order_no INTO _no;

  RETURN _no;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, jsonb) TO anon, authenticated;

-- Stock: confirmed/delivered orders take items out of stock once; cancelling puts them back.
-- Only sizes that already have a stock row are touched (untracked sizes stay untracked).
CREATE OR REPLACE FUNCTION public.apply_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _line jsonb;
BEGIN
  NEW.updated_at := now();

  IF NEW.status IN ('confirmed', 'delivered') AND NOT NEW.stock_applied THEN
    FOR _line IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      UPDATE public.product_stock
      SET quantity = greatest(quantity - (_line->>'qty')::integer, 0), updated_at = now()
      WHERE product_id = (_line->>'product_id')::uuid AND size = _line->>'size';
    END LOOP;
    NEW.stock_applied := true;
  ELSIF NEW.status = 'cancelled' AND NEW.stock_applied THEN
    FOR _line IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      UPDATE public.product_stock
      SET quantity = quantity + (_line->>'qty')::integer, updated_at = now()
      WHERE product_id = (_line->>'product_id')::uuid AND size = _line->>'size';
    END LOOP;
    NEW.stock_applied := false;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_order_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_apply_stock ON public.orders;
CREATE TRIGGER orders_apply_stock
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_order_stock();
