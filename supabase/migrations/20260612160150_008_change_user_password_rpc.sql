
-- Create change_user_password function matching the expected response format
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
  IF user_record.password_hash != crypt(p_current_password, user_record.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'message', 'كلمة المرور الحالية غير صحيحة');
  END IF;

  -- Update to new password
  UPDATE users 
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم تغيير كلمة المرور بنجاح');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.change_user_password(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_password(UUID, TEXT, TEXT) TO anon, authenticated;
