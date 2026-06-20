-- 1. Product units table (dynamic units management)
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_select_all" ON product_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_insert_admin" ON product_units FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "units_update_admin" ON product_units FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "units_delete_admin" ON product_units FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- Seed default units
INSERT INTO product_units (name) VALUES ('piece'), ('meter'), ('box'), ('kg') ON CONFLICT (name) DO NOTHING;

-- 2. Add purchase_price, dimensions, and is_archived to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(15,3) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_length DECIMAL(15,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_width DECIMAL(15,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_thickness DECIMAL(15,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 3. Drop the CHECK constraint on unit column to allow dynamic units
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_check;

-- 4. Enhance stock_transfers table (already exists but needs more columns)
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 5. RPC: manage product units (bypass RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.add_product_unit(p_user_id UUID, p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD; v_unit RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود'); END IF;
  IF v_user.role NOT IN ('ADMIN', 'EMPLOYEE') THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  INSERT INTO product_units(name) VALUES(p_name) RETURNING * INTO v_unit;
  RETURN jsonb_build_object('success', true, 'unit', to_jsonb(v_unit));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'هذه الوحدة موجودة بالفعل');
END;$$;
REVOKE EXECUTE ON FUNCTION public.add_product_unit(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_product_unit(UUID,TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_product_unit(p_user_id UUID, p_unit_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true AND role = 'ADMIN';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  DELETE FROM product_units WHERE id = p_unit_id;
  RETURN jsonb_build_object('success', true);
END;$$;
REVOKE EXECUTE ON FUNCTION public.delete_product_unit(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_product_unit(UUID,UUID) TO anon, authenticated;

-- 6. RPC: transfer stock between warehouses
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_user_id UUID,
  p_product_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_quantity DECIMAL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_source_product RECORD;
  v_target_product RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود'); END IF;

  -- Find source product
  SELECT * INTO v_source_product FROM products WHERE id = p_product_id AND warehouse_id = p_from_warehouse_id AND is_archived = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المنتج غير موجود في المخزن المصدر'); END IF;

  -- Check sufficient stock
  IF v_source_product.quantity_in_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'message', 'الكمية المطلوبة غير متوفرة. المتوفر: ' || v_source_product.quantity_in_stock);
  END IF;

  -- Deduct from source
  UPDATE products SET quantity_in_stock = quantity_in_stock - p_quantity, updated_at = NOW()
  WHERE id = p_product_id;

  -- Find or create target product in destination warehouse
  SELECT * INTO v_target_product FROM products
  WHERE name = v_source_product.name
    AND sku_code = v_source_product.sku_code
    AND warehouse_id = p_to_warehouse_id
    AND COALESCE(color_name, '') = COALESCE(v_source_product.color_name, '')
    AND is_archived = false;

  IF FOUND THEN
    UPDATE products SET quantity_in_stock = quantity_in_stock + p_quantity, updated_at = NOW()
    WHERE id = v_target_product.id;
  ELSE
    INSERT INTO products (name, sku_code, category_id, warehouse_id, color_code, color_name, color_id,
      quantity_in_stock, unit, retail_price, wholesale_price, craftsman_price, minimum_price,
      wholesale_threshold, reorder_level, purchase_price, dimension_length, dimension_width, dimension_thickness)
    VALUES (
      v_source_product.name, v_source_product.sku_code, v_source_product.category_id, p_to_warehouse_id,
      v_source_product.color_code, v_source_product.color_name, v_source_product.color_id,
      p_quantity, v_source_product.unit, v_source_product.retail_price, v_source_product.wholesale_price,
      v_source_product.craftsman_price, v_source_product.minimum_price, v_source_product.wholesale_threshold,
      v_source_product.reorder_level, v_source_product.purchase_price,
      v_source_product.dimension_length, v_source_product.dimension_width, v_source_product.dimension_thickness
    );
  END IF;

  -- Log the transfer
  INSERT INTO stock_transfers (product_id, from_warehouse_id, to_warehouse_id, requested_by_id, quantity, status, notes, product_name)
  VALUES (p_product_id, p_from_warehouse_id, p_to_warehouse_id, p_user_id, p_quantity, 'CONFIRMED', p_notes, v_source_product.name);

  RETURN jsonb_build_object('success', true, 'message', 'تم نقل الكمية بنجاح');
END;$$;
REVOKE EXECUTE ON FUNCTION public.transfer_stock(UUID,UUID,UUID,UUID,DECIMAL,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID,UUID,UUID,UUID,DECIMAL,TEXT) TO anon, authenticated;

-- 7. RPC: delete or archive product
CREATE OR REPLACE FUNCTION public.delete_or_archive_product(
  p_user_id UUID,
  p_product_id UUID,
  p_mode TEXT -- 'delete' or 'archive'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD; v_product RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود'); END IF;
  IF v_user.role NOT IN ('ADMIN', 'EMPLOYEE') THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المنتج غير موجود'); END IF;

  IF p_mode = 'archive' THEN
    UPDATE products SET is_archived = true, updated_at = NOW() WHERE id = p_product_id;
    RETURN jsonb_build_object('success', true, 'message', 'تم أرشفة المنتج بنجاح');
  ELSIF p_mode = 'delete' THEN
    -- Set product_id to NULL in invoice_items (keep invoice history)
    UPDATE invoice_items SET product_id = NULL WHERE product_id = p_product_id;
    DELETE FROM products WHERE id = p_product_id;
    RETURN jsonb_build_object('success', true, 'message', 'تم حذف المنتج نهائياً');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'الوضع غير معروف');
  END IF;
END;$$;
REVOKE EXECUTE ON FUNCTION public.delete_or_archive_product(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_or_archive_product(UUID,UUID,TEXT) TO anon, authenticated;

-- 8. RPC: get profits data
CREATE OR REPLACE FUNCTION public.get_profits_report(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_invoices JSONB;
  v_top_products JSONB;
  v_total_revenue DECIMAL := 0;
  v_total_cost DECIMAL := 0;
  v_total_profit DECIMAL := 0;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود'); END IF;

  -- Check permission (ADMIN always, or user has profits permission)
  IF v_user.role != 'ADMIN' AND NOT COALESCE((v_user.permissions->>'profits')::boolean, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'غير مصرح بعرض الأرباح');
  END IF;

  -- Get invoice-level profit data
  SELECT jsonb_agg(inv_data) INTO v_invoices FROM (
    SELECT jsonb_build_object(
      'invoice_id', i.id,
      'invoice_number', i.invoice_number,
      'date', i.created_at,
      'total_revenue', i.net_amount,
      'total_cost', COALESCE(SUM(
        CASE WHEN p.purchase_price > 0 THEN p.purchase_price * ii.quantity ELSE 0 END
      ), 0),
      'profit', i.net_amount - COALESCE(SUM(
        CASE WHEN p.purchase_price > 0 THEN p.purchase_price * ii.quantity ELSE 0 END
      ), 0),
      'customer_name', COALESCE(c.name, 'زبون عابر')
    ) as inv_data
    FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    LEFT JOIN products p ON p.id = ii.product_id
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.status = 'PAID'
      AND i.created_at::date >= p_start_date
      AND i.created_at::date <= p_end_date
    GROUP BY i.id, i.invoice_number, i.created_at, i.net_amount, c.name
    ORDER BY i.created_at DESC
  ) sub;

  -- Calculate totals
  SELECT
    COALESCE(SUM(i.net_amount), 0),
    COALESCE(SUM(sub_cost.cost), 0)
  INTO v_total_revenue, v_total_cost
  FROM invoices i
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(
      CASE WHEN p.purchase_price > 0 THEN p.purchase_price * ii.quantity ELSE 0 END
    ), 0) as cost
    FROM invoice_items ii
    LEFT JOIN products p ON p.id = ii.product_id
    WHERE ii.invoice_id = i.id
  ) sub_cost ON true
  WHERE i.status = 'PAID'
    AND i.created_at::date >= p_start_date
    AND i.created_at::date <= p_end_date;

  v_total_profit := v_total_revenue - v_total_cost;

  -- Top 10 products by profit
  SELECT jsonb_agg(prod_data) INTO v_top_products FROM (
    SELECT jsonb_build_object(
      'product_name', ii.product_name,
      'total_quantity', SUM(ii.quantity),
      'total_revenue', SUM(ii.subtotal),
      'total_cost', COALESCE(SUM(p.purchase_price * ii.quantity), 0),
      'total_profit', SUM(ii.subtotal) - COALESCE(SUM(p.purchase_price * ii.quantity), 0)
    ) as prod_data
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    LEFT JOIN products p ON p.id = ii.product_id
    WHERE i.status = 'PAID'
      AND i.created_at::date >= p_start_date
      AND i.created_at::date <= p_end_date
    GROUP BY ii.product_name
    ORDER BY SUM(ii.subtotal) - COALESCE(SUM(p.purchase_price * ii.quantity), 0) DESC
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'total_revenue', v_total_revenue,
    'total_cost', v_total_cost,
    'total_profit', v_total_profit,
    'invoices', COALESCE(v_invoices, '[]'::jsonb),
    'top_products', COALESCE(v_top_products, '[]'::jsonb)
  );
END;$$;
REVOKE EXECUTE ON FUNCTION public.get_profits_report(UUID,DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profits_report(UUID,DATE,DATE) TO anon, authenticated;

-- 9. Update add_product_with_colors RPC to include purchase_price and dimensions
CREATE OR REPLACE FUNCTION public.add_product_with_colors(
  p_user_id UUID,
  p_name TEXT,
  p_sku_code TEXT,
  p_category_id UUID,
  p_unit TEXT,
  p_retail_price DECIMAL,
  p_wholesale_price DECIMAL,
  p_craftsman_price DECIMAL,
  p_minimum_price DECIMAL,
  p_wholesale_threshold DECIMAL,
  p_reorder_level DECIMAL,
  p_color_variants JSONB,
  p_purchase_price DECIMAL DEFAULT 0,
  p_dimension_length DECIMAL DEFAULT NULL,
  p_dimension_width DECIMAL DEFAULT NULL,
  p_dimension_thickness DECIMAL DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user RECORD;
  v_variant JSONB;
  v_product_id UUID;
  v_created_ids JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود'); END IF;
  IF v_user.role NOT IN ('ADMIN', 'EMPLOYEE') THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(p_color_variants) LOOP
    INSERT INTO products(
      name, sku_code, category_id, warehouse_id,
      color_id, color_name, color_code,
      quantity_in_stock, unit,
      retail_price, wholesale_price, craftsman_price,
      minimum_price, wholesale_threshold, reorder_level,
      purchase_price, dimension_length, dimension_width, dimension_thickness
    ) VALUES (
      p_name, p_sku_code, p_category_id,
      (v_variant->>'warehouse_id')::UUID,
      (v_variant->>'color_id')::UUID,
      v_variant->>'color_name',
      v_variant->>'hex_code',
      (v_variant->>'quantity')::DECIMAL,
      p_unit,
      p_retail_price, p_wholesale_price, p_craftsman_price,
      p_minimum_price, p_wholesale_threshold, p_reorder_level,
      p_purchase_price, p_dimension_length, p_dimension_width, p_dimension_thickness
    ) RETURNING id INTO v_product_id;
    v_created_ids := v_created_ids || jsonb_build_array(v_product_id::text);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created_ids', v_created_ids);
END;$$;
