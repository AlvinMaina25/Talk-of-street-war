-- TALK OF: RLS check for every role. Run in Supabase Dashboard > SQL Editor, AFTER all the
-- *-setup.sql files. It creates throwaway users and data, tries real queries as each role
-- (anon, signed-in with no role, deactivated staff, staff, manager, owner), then ROLLS BACK,
-- so nothing is kept. (Sequences still advance: the next order number may skip one.)
-- It ends with a message that is raised as an error on purpose (that is what rolls everything back):
-- "RLS CHECK PASSED" means every role behaves as designed; otherwise it lists each FAIL.

BEGIN;

CREATE TEMP TABLE rls_results (test text, actor text, expected text, actual text, pass boolean);
GRANT ALL ON rls_results TO PUBLIC;

-- ---- fixtures (created as the superuser, so RLS doesn't apply) ------------------------------
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'rls-owner@example.test',    now()),
  ('00000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'rls-manager@example.test',  now()),
  ('00000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'rls-staff@example.test',    now()),
  ('00000000-0000-4000-8000-0000000000a4', 'authenticated', 'authenticated', 'rls-inactive@example.test', now()),
  ('00000000-0000-4000-8000-0000000000a5', 'authenticated', 'authenticated', 'rls-norole@example.test',   now());

INSERT INTO public.user_roles (user_id, role, is_active) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'owner',   true),
  ('00000000-0000-4000-8000-0000000000a2', 'manager', true),
  ('00000000-0000-4000-8000-0000000000a3', 'staff',   true),
  ('00000000-0000-4000-8000-0000000000a4', 'staff',   false);

INSERT INTO public.products (id, slug, name, price, category, sizes, is_active) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'rls-active',   'RLS Active',   100, 'Test', ARRAY['M'], true),
  ('00000000-0000-4000-8000-0000000000b2', 'rls-inactive', 'RLS Inactive', 100, 'Test', ARRAY['M'], false);

INSERT INTO public.product_stock (product_id, size, quantity) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'M', 5);

INSERT INTO public.orders (id, customer_name, phone, items, total) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'RLS Customer', '0700000000',
   '[{"product_id":"00000000-0000-4000-8000-0000000000b1","slug":"rls-active","name":"RLS Active","size":"M","qty":1,"price":100}]'::jsonb, 100);

-- ---- runner: executes one statement as one actor, then undoes it ---------------------------
CREATE FUNCTION pg_temp.run_as(_uid uuid, _role text, _sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE _n bigint := 0; _out text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN _uid IS NULL THEN '{}' ELSE json_build_object('sub', _uid, 'role', _role)::text END, true);
  EXECUTE format('SET LOCAL ROLE %I', _role);
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := 'ok:' || _n;
    RAISE EXCEPTION 'undo' USING ERRCODE = 'XXRBK';        -- roll the statement back
  EXCEPTION
    WHEN SQLSTATE 'XXRBK' THEN NULL;
    WHEN OTHERS THEN _out := 'error:' || SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  RETURN _out;
END $$;

-- ---- the matrix: statement + which actors must be ALLOWED (everyone else must be denied) -----
CREATE TEMP TABLE rls_tests (label text, stmt text, allowed text[]);
INSERT INTO rls_tests VALUES
 ('read hidden product',      $q$SELECT 1 FROM public.products WHERE id = '00000000-0000-4000-8000-0000000000b2'$q$, '{staff,manager,owner}'),
 ('read visible product',     $q$SELECT 1 FROM public.products WHERE id = '00000000-0000-4000-8000-0000000000b1'$q$, '{anon,norole,inactive,staff,manager,owner}'),
 ('insert product',           $q$INSERT INTO public.products (slug,name,price,category) VALUES ('rls-new','RLS New',1,'Test')$q$, '{manager,owner}'),
 ('update product',           $q$UPDATE public.products SET price = 101 WHERE id = '00000000-0000-4000-8000-0000000000b1'$q$, '{manager,owner}'),
 ('delete product',           $q$DELETE FROM public.products WHERE id = '00000000-0000-4000-8000-0000000000b2'$q$, '{manager,owner}'),
 ('update stock',             $q$UPDATE public.product_stock SET quantity = 4 WHERE product_id = '00000000-0000-4000-8000-0000000000b1'$q$, '{staff,manager,owner}'),
 ('read orders',              $q$SELECT 1 FROM public.orders$q$, '{staff,manager,owner}'),
 ('update order status',      $q$UPDATE public.orders SET status = 'confirmed' WHERE id = '00000000-0000-4000-8000-0000000000c1'$q$, '{staff,manager,owner}'),
 ('edit order customer data', $q$UPDATE public.orders SET customer_name = 'X' WHERE id = '00000000-0000-4000-8000-0000000000c1'$q$, '{}'),
 ('delete order',             $q$DELETE FROM public.orders WHERE id = '00000000-0000-4000-8000-0000000000c1'$q$, '{manager,owner}'),
 ('place order (public RPC)', $q$SELECT public.place_order('RLS Buyer','0700000001','', '[{"product_id":"rls-active","size":"M","qty":1}]'::jsonb)$q$, '{anon,norole,inactive,staff,manager,owner}'),
 ('read site settings',       $q$SELECT 1 FROM public.site_settings$q$, '{anon,norole,inactive,staff,manager,owner}'),
 ('update site settings',     $q$UPDATE public.site_settings SET hero_title = 'X' WHERE id = 1$q$, '{manager,owner}'),
 ('read activity log',        $q$SELECT 1 FROM public.activity_log$q$, '{staff,manager,owner}'),
 ('write activity log',       $q$INSERT INTO public.activity_log (entity_type, action, summary) VALUES ('order','x','x')$q$, '{}'),
 ('read all user_roles',      $q$SELECT 1 FROM public.user_roles WHERE user_id <> auth.uid()$q$, '{owner}'),
 ('write user_roles',         $q$INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-4000-8000-0000000000a5','manager')$q$, '{}'),
 ('promote self via update',  $q$UPDATE public.user_roles SET role = 'owner' WHERE user_id = auth.uid()$q$, '{}'),
 ('list_staff()',             $q$SELECT * FROM public.list_staff()$q$, '{owner}'),
 ('upload site image',        $q$INSERT INTO storage.objects (bucket_id, name) VALUES ('site-images','rls-test.png')$q$, '{manager,owner}'),
 ('upload product image',     $q$INSERT INTO storage.objects (bucket_id, name) VALUES ('product-images','rls-test.png')$q$, '{manager,owner}');

CREATE TEMP TABLE rls_actors (name text, uid uuid, pg_role text);
INSERT INTO rls_actors VALUES
 ('anon',     NULL,                                           'anon'),
 ('norole',   '00000000-0000-4000-8000-0000000000a5',         'authenticated'),
 ('inactive', '00000000-0000-4000-8000-0000000000a4',         'authenticated'),
 ('staff',    '00000000-0000-4000-8000-0000000000a3',         'authenticated'),
 ('manager',  '00000000-0000-4000-8000-0000000000a2',         'authenticated'),
 ('owner',    '00000000-0000-4000-8000-0000000000a1',         'authenticated');

DO $$
DECLARE t record; a record; res text; should_allow boolean; ok boolean; rows_n int;
BEGIN
  FOR t IN SELECT * FROM rls_tests LOOP
    FOR a IN SELECT * FROM rls_actors LOOP
      res := pg_temp.run_as(a.uid, a.pg_role, t.stmt);
      should_allow := a.name = ANY (t.allowed);
      rows_n := CASE WHEN res LIKE 'ok:%' THEN split_part(res, ':', 2)::int ELSE -1 END;
      -- allowed = ran and touched/returned at least one row; denied = permission error or zero rows
      ok := CASE WHEN should_allow THEN rows_n >= 1 ELSE (res = 'error:42501' OR rows_n = 0) END;
      INSERT INTO rls_results VALUES (t.label, a.name, CASE WHEN should_allow THEN 'allowed' ELSE 'denied' END, res, ok);
    END LOOP;
  END LOOP;
END $$;

-- ---- direct checks (superuser) ----------------------------------------------------------------
INSERT INTO rls_results VALUES
 ('has_role ignores deactivated staff', 'inactive', 'false',
  public.has_role('00000000-0000-4000-8000-0000000000a4', 'staff')::text,
  public.has_role('00000000-0000-4000-8000-0000000000a4', 'staff') = false);

DO $$
DECLARE res text := 'no error';
BEGIN
  BEGIN
    UPDATE public.user_roles SET is_active = false WHERE user_id = '00000000-0000-4000-8000-0000000000a1';
  EXCEPTION WHEN OTHERS THEN res := 'blocked';
  END;
  INSERT INTO rls_results VALUES ('owner role cannot be deactivated (trigger)', 'any', 'blocked', res, res = 'blocked');
  res := 'no error';
  BEGIN
    DELETE FROM public.user_roles WHERE user_id = '00000000-0000-4000-8000-0000000000a1';
  EXCEPTION WHEN OTHERS THEN res := 'blocked';
  END;
  INSERT INTO rls_results VALUES ('owner role cannot be deleted (trigger)', 'any', 'blocked', res, res = 'blocked');
END $$;

-- Activity triggers: the fixtures above should have been logged.
INSERT INTO rls_results
SELECT 'activity: product added', 'trigger', '>=1', n::text, n >= 1
FROM (SELECT count(*) n FROM public.activity_log WHERE summary = 'Added product "RLS Active"') x;
INSERT INTO rls_results
SELECT 'activity: order placed', 'trigger', '>=1', n::text, n >= 1
FROM (SELECT count(*) n FROM public.activity_log WHERE summary LIKE 'New order % from RLS Customer%') x;

-- ---- report ---------------------------------------------------------------------------------
-- The report is raised as an error ON PURPOSE: that aborts the transaction, so nothing from this
-- script is ever kept, and the SQL editor shows the message. Read the message, not the error icon.
DO $$
DECLARE total int; failed int; lines text;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE NOT pass) INTO total, failed FROM rls_results;
  SELECT string_agg(format('FAIL  %s | %s | expected %s | got %s', test, actor, expected, actual), E'\n' ORDER BY test, actor)
    INTO lines FROM rls_results WHERE NOT pass;
  IF failed = 0 THEN
    RAISE EXCEPTION E'RLS CHECK PASSED: % of % checks behaved as designed. (Rolled back; nothing was kept.)', total, total;
  ELSE
    RAISE EXCEPTION E'RLS CHECK FOUND % PROBLEM(S) out of % checks:\n%\n(Rolled back; nothing was kept.)', failed, total, lines;
  END IF;
END $$;

ROLLBACK;
