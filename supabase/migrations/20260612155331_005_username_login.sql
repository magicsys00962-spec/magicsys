-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing admin user to have username 'admin' and password 'admin' (bcrypt hash of 'admin')
-- bcrypt hash of 'admin' with cost 10
UPDATE users 
SET username = 'admin', 
    password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email = 'admin@magic.com';

-- Remove all non-admin demo users
DELETE FROM users WHERE email IN ('ahmed@magic.com', 'ali@magic.com', 'mahmoud@magic.com', 'karim@magic.com');

-- Remove craftsman customers tied to deleted users
DELETE FROM customers WHERE user_id NOT IN (SELECT id FROM users) AND user_id IS NOT NULL;

-- Create RPC function for username+password login
CREATE OR REPLACE FUNCTION public.login_user_by_username(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  warehouse_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE username = p_username AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  END IF;

  -- Verify password using pgcrypto
  IF NOT (user_record.password_hash = crypt(p_password, user_record.password_hash)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  END IF;

  SELECT * INTO warehouse_record FROM warehouses WHERE id = user_record.warehouse_id;

  RETURN jsonb_build_object(
    'success', true,
    'user', to_jsonb(user_record),
    'warehouse', to_jsonb(warehouse_record)
  );
END;
$$;

-- Create RPC function to change password
CREATE OR REPLACE FUNCTION public.change_user_password(p_user_id UUID, p_current_password TEXT, p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  -- Verify current password
  IF NOT (user_record.password_hash = crypt(p_current_password, user_record.password_hash)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'كلمة المرور الحالية غير صحيحة');
  END IF;

  -- Update with new hashed password
  UPDATE users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم تغيير كلمة المرور بنجاح');
END;
$$;

-- Grant execute permissions
REVOKE EXECUTE ON FUNCTION public.login_user_by_username(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_user_by_username(TEXT, TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.change_user_password(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_password(UUID, TEXT, TEXT) TO anon, authenticated;
