-- Add UPDATE and DELETE policies for expenses (missing from original migration)
CREATE POLICY "expenses_update_employee" ON expenses FOR UPDATE
  TO authenticated USING (
    employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "expenses_delete_employee" ON expenses FOR DELETE
  TO authenticated USING (
    employee_id = auth.uid()
    OR warehouse_id = (SELECT warehouse_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- RPC to add an expense (bypasses RLS auth.uid() limitation)
CREATE OR REPLACE FUNCTION public.add_expense(
  p_user_id UUID,
  p_warehouse_id UUID,
  p_name TEXT,
  p_amount DECIMAL,
  p_expense_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_expense RECORD;
BEGIN
  -- Verify user is active and allowed
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  IF v_user.role NOT IN ('ADMIN', 'EMPLOYEE') THEN
    RETURN jsonb_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  INSERT INTO expenses (warehouse_id, employee_id, name, amount, expense_date, notes)
  VALUES (p_warehouse_id, p_user_id, p_name, p_amount, p_expense_date, p_notes)
  RETURNING * INTO v_expense;

  RETURN jsonb_build_object('success', true, 'expense', to_jsonb(v_expense));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_expense(UUID, UUID, TEXT, DECIMAL, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_expense(UUID, UUID, TEXT, DECIMAL, DATE, TEXT) TO anon, authenticated;

-- RPC to delete an expense
CREATE OR REPLACE FUNCTION public.delete_expense(
  p_user_id UUID,
  p_expense_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_expense RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المصروف غير موجود');
  END IF;

  -- Allow delete if admin, or same warehouse employee
  IF v_user.role = 'ADMIN' 
     OR v_expense.employee_id = p_user_id
     OR v_expense.warehouse_id = v_user.warehouse_id THEN
    DELETE FROM expenses WHERE id = p_expense_id;
    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'غير مصرح بحذف هذا المصروف');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_expense(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expense(UUID, UUID) TO anon, authenticated;

-- RPC to get expenses for a warehouse on a date range
CREATE OR REPLACE FUNCTION public.get_expenses(
  p_user_id UUID,
  p_warehouse_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_expenses JSONB;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'warehouse_id', e.warehouse_id,
      'employee_id', e.employee_id,
      'name', e.name,
      'amount', e.amount,
      'expense_date', e.expense_date,
      'notes', e.notes,
      'created_at', e.created_at,
      'employee_name', u.name
    ) ORDER BY e.created_at DESC
  ) INTO v_expenses
  FROM expenses e
  LEFT JOIN users u ON u.id = e.employee_id
  WHERE e.warehouse_id = p_warehouse_id
    AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
    AND (p_date_to IS NULL OR e.expense_date <= p_date_to);

  RETURN jsonb_build_object('success', true, 'expenses', COALESCE(v_expenses, '[]'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_expenses(UUID, UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expenses(UUID, UUID, DATE, DATE) TO anon, authenticated;
