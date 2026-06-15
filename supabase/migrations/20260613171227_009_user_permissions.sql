-- Add permissions column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Update login_user_by_username to include permissions in response
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

-- Update get_user_by_id to include permissions
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
    'warehouse', COALESCE(to_jsonb(warehouse_record), '{}'::jsonb)
  );
END;
$$;

-- Drop any existing versions of these functions
DROP FUNCTION IF EXISTS public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create RPC to create user with hashed password
CREATE FUNCTION public.create_user_with_password(
  p_name TEXT,
  p_email TEXT,
  p_username TEXT,
  p_password TEXT,
  p_role TEXT,
  p_warehouse_id UUID DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user RECORD;
BEGIN
  INSERT INTO users (name, email, username, password_hash, role, warehouse_id, phone, is_active, permissions)
  VALUES (
    p_name,
    p_email,
    p_username,
    crypt(p_password, gen_salt('bf')),
    p_role,
    p_warehouse_id,
    p_phone,
    true,
    p_permissions
  )
  RETURNING * INTO new_user;

  RETURN jsonb_build_object(
    'success', true,
    'user', to_jsonb(new_user)
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO anon, authenticated;

-- Drop any existing versions
DROP FUNCTION IF EXISTS public.update_user_with_permissions(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);

-- RPC to update user with permissions
CREATE FUNCTION public.update_user_with_permissions(
  p_user_id UUID,
  p_name TEXT,
  p_username TEXT,
  p_role TEXT,
  p_warehouse_id UUID DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET
    name = p_name,
    username = p_username,
    role = p_role,
    warehouse_id = p_warehouse_id,
    phone = p_phone,
    permissions = p_permissions
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اسم المستخدم مستخدم بالفعل'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_user_with_permissions(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_with_permissions(UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO anon, authenticated;
