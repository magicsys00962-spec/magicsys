
-- Drop old function if exists
DROP FUNCTION IF EXISTS public.login_user(TEXT, TEXT);

-- Create login_user_by_username function matching the expected response format
CREATE OR REPLACE FUNCTION public.login_user_by_username(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  warehouse_record RECORD;
BEGIN
  SELECT * INTO user_record 
  FROM users 
  WHERE username = p_username AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اسم المستخدم أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- Verify password
  IF user_record.password_hash != crypt(p_password, user_record.password_hash) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اسم المستخدم أو كلمة المرور غير صحيحة'
    );
  END IF;

  SELECT * INTO warehouse_record FROM warehouses WHERE id = user_record.warehouse_id;

  RETURN jsonb_build_object(
    'success', true,
    'user', to_jsonb(user_record),
    'warehouse', COALESCE(to_jsonb(warehouse_record), '{}'::jsonb)
  );
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.login_user_by_username(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_user_by_username(TEXT, TEXT) TO anon, authenticated;
