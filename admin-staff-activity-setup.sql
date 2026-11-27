-- TALK OF: staff management + activity log. Run once in Supabase Dashboard > SQL Editor
-- (safe to re-run), AFTER products-setup.sql, stock-setup.sql and orders-setup.sql.

-- ============================================================================
-- 1. Staff: deactivation support
-- ============================================================================
-- A deactivated staff member keeps their role row (so reactivating restores it) but
-- has_role() stops counting it, so every RLS policy blocks them immediately.
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Backstop: an owner role row can never be deleted, demoted or deactivated through normal
-- writes (cascades from deleting the auth user are allowed). The staff server functions
-- check this too, and clients have no write access to user_roles at all.
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() <= 1 AND OLD.role = 'owner' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The owner role cannot be removed';
    END IF;
    IF NEW.role <> 'owner' OR NEW.is_active = false THEN
      RAISE EXCEPTION 'The owner role cannot be changed or deactivated';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_protect_owner ON public.user_roles;
CREATE TRIGGER user_roles_protect_owner
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- Owner-only staff list with emails from auth.users (never exposed to other roles).
CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE (
  user_id uuid,
  email text,
  role public.app_role,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  accepted boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only the owner can view staff' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT ur.user_id, u.email::text, ur.role, ur.is_active, ur.created_at,
         u.last_sign_in_at, (u.email_confirmed_at IS NOT NULL)
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  ORDER BY (ur.role = 'owner') DESC, ur.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_staff() TO authenticated;

-- ============================================================================
-- 2. Activity log (written only by triggers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,                      -- null = customer / system (e.g. a new order)
  actor_email text,
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'stock', 'order')),
  entity_id text,
  action text NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Read-only for staff; nobody can write, edit or delete rows through the API.
REVOKE ALL ON public.activity_log FROM anon, authenticated;
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

DROP POLICY IF EXISTS "Staff can read activity" ON public.activity_log;
CREATE POLICY "Staff can read activity"
ON public.activity_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

CREATE OR REPLACE FUNCTION public.log_activity(
  _entity_type text, _entity_id text, _action text, _summary text, _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  INSERT INTO public.activity_log (actor_id, actor_email, entity_type, entity_id, action, summary, details)
  VALUES (
    _uid,
    CASE WHEN _uid IS NULL THEN NULL ELSE (SELECT u.email::text FROM auth.users u WHERE u.id = _uid) END,
    _entity_type, _entity_id, _action, _summary, coalesce(_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Products ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_product_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parts text[] := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('product', NEW.id::text, 'created',
      format('Added product "%s"', NEW.name),
      jsonb_build_object('slug', NEW.slug, 'price', NEW.price));
  ELSIF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'created_at') = (to_jsonb(OLD) - 'created_at') THEN
      RETURN NULL;   -- nothing changed
    END IF;
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      _parts := _parts || format('price KSh %s → %s', OLD.price, NEW.price);
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      _parts := _parts || CASE WHEN NEW.is_active THEN 'now visible in the shop' ELSE 'hidden from the shop' END;
    END IF;
    IF cardinality(_parts) = 0 THEN
      _parts := ARRAY['details edited'];
    END IF;
    PERFORM public.log_activity('product', NEW.id::text, 'updated',
      format('Updated "%s": %s', NEW.name, array_to_string(_parts, ', ')),
      jsonb_build_object('slug', NEW.slug));
  ELSE
    PERFORM public.log_activity('product', OLD.id::text, 'deleted',
      format('Deleted product "%s"', OLD.name), jsonb_build_object('slug', OLD.slug));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_product_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_log_activity ON public.products;
CREATE TRIGGER products_log_activity
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_activity();

-- Stock ---------------------------------------------------------------------
-- Skips changes made by other triggers (order confirm/cancel stock moves, product delete
-- cascades): the order's own log line already covers those.
CREATE OR REPLACE FUNCTION public.log_stock_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
  _size text;
  _name text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    _pid := OLD.product_id; _size := OLD.size;
  ELSE
    _pid := NEW.product_id; _size := NEW.size;
  END IF;
  SELECT name INTO _name FROM public.products WHERE id = _pid;
  _name := coalesce(_name, 'unknown product');

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('stock', _pid::text, 'set',
      format('Stock for "%s" size %s set to %s', _name, _size, NEW.quantity),
      jsonb_build_object('size', _size, 'quantity', NEW.quantity));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      PERFORM public.log_activity('stock', _pid::text, 'changed',
        format('Stock for "%s" size %s: %s → %s', _name, _size, OLD.quantity, NEW.quantity),
        jsonb_build_object('size', _size, 'from', OLD.quantity, 'to', NEW.quantity));
    END IF;
  ELSE
    PERFORM public.log_activity('stock', _pid::text, 'untracked',
      format('Stopped tracking stock for "%s" size %s', _name, _size),
      jsonb_build_object('size', _size));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_stock_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS product_stock_log_activity ON public.product_stock;
CREATE TRIGGER product_stock_log_activity
AFTER INSERT OR UPDATE OR DELETE ON public.product_stock
FOR EACH ROW EXECUTE FUNCTION public.log_stock_activity();

-- Orders --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('order', NEW.id::text, 'placed',
      format('New order %s from %s (KSh %s)', NEW.order_no, NEW.customer_name, to_char(NEW.total, 'FM999,999,990')),
      jsonb_build_object('order_no', NEW.order_no, 'total', NEW.total));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.log_activity('order', NEW.id::text, 'status_changed',
        format('Order %s: %s → %s', NEW.order_no, OLD.status, NEW.status),
        jsonb_build_object('order_no', NEW.order_no, 'from', OLD.status, 'to', NEW.status));
    END IF;
  ELSE
    PERFORM public.log_activity('order', OLD.id::text, 'deleted',
      format('Deleted order %s (%s)', OLD.order_no, OLD.status),
      jsonb_build_object('order_no', OLD.order_no));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_order_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_log_activity ON public.orders;
CREATE TRIGGER orders_log_activity
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_activity();
