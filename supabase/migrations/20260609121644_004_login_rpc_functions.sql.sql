-- Create a function to authenticate users by email
-- This bypasses RLS because it's SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.login_user(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  warehouse_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE email = p_email AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO warehouse_record FROM warehouses WHERE id = user_record.warehouse_id;

  RETURN jsonb_build_object(
    'user', to_jsonb(user_record),
    'warehouse', to_jsonb(warehouse_record)
  );
END;
$$;

-- Create a function to get user by ID (for checkAuth)
CREATE OR REPLACE FUNCTION public.get_user_by_id(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  warehouse_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO warehouse_record FROM warehouses WHERE id = user_record.warehouse_id;

  RETURN jsonb_build_object(
    'user', to_jsonb(user_record),
    'warehouse', to_jsonb(warehouse_record)
  );
END;
$$;

-- Revoke execute from public and grant only to anon/authenticated
REVOKE EXECUTE ON FUNCTION public.login_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_user(TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_by_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_by_id(UUID) TO anon, authenticated;
