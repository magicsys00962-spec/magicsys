
-- ============================================
-- Invoice Returns System
-- ============================================

CREATE TABLE invoice_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_return_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES invoice_returns(id) ON DELETE CASCADE NOT NULL,
  invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_returned DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,3) NOT NULL,
  return_amount DECIMAL(15,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_returns
CREATE POLICY "returns_select_all" ON invoice_returns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "returns_insert_all" ON invoice_returns FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "returns_update_all" ON invoice_returns FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "returns_delete_admin" ON invoice_returns FOR DELETE TO anon, authenticated USING (true);

-- RLS policies for invoice_return_items
CREATE POLICY "return_items_select_all" ON invoice_return_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "return_items_insert_all" ON invoice_return_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "return_items_update_all" ON invoice_return_items FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "return_items_delete_all" ON invoice_return_items FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- Stock Requests (inter-warehouse requests)
-- ============================================

CREATE TABLE stock_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL NOT NULL,
  product_name TEXT NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')) DEFAULT 'PENDING',
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_requests_select_all" ON stock_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stock_requests_insert_all" ON stock_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "stock_requests_update_all" ON stock_requests FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "stock_requests_delete_all" ON stock_requests FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- RPC: Process invoice return
-- ============================================
CREATE OR REPLACE FUNCTION public.process_invoice_return(
  p_user_id UUID,
  p_invoice_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_invoice RECORD;
  v_return RECORD;
  v_item JSONB;
  v_total DECIMAL(15,3) := 0;
  v_return_item RECORD;
BEGIN
  -- Verify user
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  -- Check permission (admin always allowed, employee needs 'returns' permission)
  IF v_user.role != 'ADMIN' THEN
    IF NOT (v_user.permissions ? 'returns' AND (v_user.permissions->>'returns')::boolean = true) THEN
      RETURN jsonb_build_object('success', false, 'message', 'ليس لديك صلاحية إرجاع الفواتير');
    END IF;
  END IF;

  -- Get invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة غير موجودة');
  END IF;

  -- Calculate total return amount
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'return_amount')::DECIMAL;
  END LOOP;

  -- Create the return record
  INSERT INTO invoice_returns (invoice_id, employee_id, warehouse_id, total_return_amount, notes)
  VALUES (p_invoice_id, p_user_id, v_invoice.warehouse_id, v_total, p_notes)
  RETURNING * INTO v_return;

  -- Insert return items and restore stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO invoice_return_items (return_id, invoice_item_id, product_id, product_name, quantity_returned, unit_price, return_amount)
    VALUES (
      v_return.id,
      (v_item->>'invoice_item_id')::UUID,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity_returned')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'return_amount')::DECIMAL
    );

    -- Restore stock to the warehouse
    IF (v_item->>'product_id') IS NOT NULL THEN
      UPDATE products 
      SET quantity_in_stock = quantity_in_stock + (v_item->>'quantity_returned')::DECIMAL
      WHERE id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'return_id', v_return.id, 'total_return_amount', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_invoice_return(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_invoice_return(UUID, UUID, JSONB, TEXT) TO anon, authenticated;

-- ============================================
-- RPC: Process stock request (approve/reject)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_stock_request(
  p_user_id UUID,
  p_request_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_request RECORD;
  v_product RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  SELECT * INTO v_request FROM stock_requests WHERE id = p_request_id AND status = 'PENDING';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود أو تمت معالجته');
  END IF;

  -- Verify user belongs to the source warehouse
  IF v_user.warehouse_id != v_request.from_warehouse_id AND v_user.role != 'ADMIN' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ليس لديك صلاحية التعامل مع هذا الطلب');
  END IF;

  IF p_action = 'APPROVE' THEN
    -- Check stock availability in source warehouse
    SELECT * INTO v_product FROM products 
    WHERE id = v_request.product_id AND warehouse_id = v_request.from_warehouse_id;
    
    IF NOT FOUND OR v_product.quantity_in_stock < v_request.quantity THEN
      RETURN jsonb_build_object('success', false, 'message', 'الكمية غير متوفرة في المخزن');
    END IF;

    -- Deduct from source
    UPDATE products SET quantity_in_stock = quantity_in_stock - v_request.quantity
    WHERE id = v_request.product_id AND warehouse_id = v_request.from_warehouse_id;

    -- Add to destination (find or create product entry)
    UPDATE products SET quantity_in_stock = quantity_in_stock + v_request.quantity
    WHERE id = v_request.product_id AND warehouse_id = v_request.to_warehouse_id;

    -- If product doesn't exist in destination warehouse, we just update the request status
    -- The admin should handle this case manually

    UPDATE stock_requests SET 
      status = 'APPROVED', 
      approved_by_id = p_user_id, 
      response_notes = p_notes,
      responded_at = NOW()
    WHERE id = p_request_id;

    -- Send notification to requester
    INSERT INTO notifications (recipient_id, type, title, message, reference_id, reference_type)
    VALUES (v_request.requested_by_id, 'STOCK_REQUEST_APPROVED', 
      'تم قبول طلب المواد', 
      'تم قبول طلبك للمنتج: ' || v_request.product_name || ' بكمية ' || v_request.quantity,
      p_request_id, 'stock_request');

  ELSIF p_action = 'REJECT' THEN
    UPDATE stock_requests SET 
      status = 'REJECTED', 
      approved_by_id = p_user_id, 
      response_notes = p_notes,
      responded_at = NOW()
    WHERE id = p_request_id;

    -- Send notification to requester
    INSERT INTO notifications (recipient_id, type, title, message, reference_id, reference_type)
    VALUES (v_request.requested_by_id, 'STOCK_REQUEST_REJECTED', 
      'تم رفض طلب المواد', 
      'تم رفض طلبك للمنتج: ' || v_request.product_name || COALESCE(' - السبب: ' || p_notes, ''),
      p_request_id, 'stock_request');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'إجراء غير صالح');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_stock_request(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_stock_request(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- ============================================
-- RPC: Search product across warehouses
-- ============================================
CREATE OR REPLACE FUNCTION public.search_product_across_warehouses(
  p_search TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_results
  FROM (
    SELECT p.id, p.name, p.sku_code, p.color_name, p.quantity_in_stock, p.unit,
           p.retail_price, p.wholesale_price, p.warehouse_id,
           w.name as warehouse_name, w.code as warehouse_code
    FROM products p
    JOIN warehouses w ON p.warehouse_id = w.id
    WHERE p.is_archived = false
      AND p.quantity_in_stock > 0
      AND (
        p.name ILIKE '%' || p_search || '%' OR
        p.sku_code ILIKE '%' || p_search || '%' OR
        p.color_name ILIKE '%' || p_search || '%'
      )
    ORDER BY w.name, p.name
  ) r;

  RETURN jsonb_build_object('success', true, 'results', v_results);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_product_across_warehouses(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_product_across_warehouses(TEXT) TO anon, authenticated;
