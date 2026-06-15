-- 1. Product colors registry (system-wide color palette)
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#CCCCCC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colors_select_all" ON product_colors FOR SELECT TO authenticated USING (true);
CREATE POLICY "colors_insert_admin" ON product_colors FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "colors_update_admin" ON product_colors FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "colors_delete_admin" ON product_colors FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- Add color_id FK to products (optional link to product_colors registry)
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES product_colors(id) ON DELETE SET NULL;

-- 2. Craftsman custom price overrides per product
CREATE TABLE IF NOT EXISTS craftsman_price_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  craftsman_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_price DECIMAL(15,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (craftsman_customer_id, product_id)
);
ALTER TABLE craftsman_price_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overrides_craftsman_select" ON craftsman_price_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "overrides_craftsman_insert" ON craftsman_price_overrides FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "overrides_craftsman_update" ON craftsman_price_overrides FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "overrides_craftsman_delete" ON craftsman_price_overrides FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 3. RPC: manage colors (SECURITY DEFINER to bypass RLS since we use custom auth)
CREATE OR REPLACE FUNCTION public.add_product_color(p_user_id UUID, p_name TEXT, p_hex_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD; v_color RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true AND role = 'ADMIN';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  INSERT INTO product_colors(name, hex_code) VALUES(p_name, p_hex_code) RETURNING * INTO v_color;
  RETURN jsonb_build_object('success', true, 'color', to_jsonb(v_color));
END;$$;
REVOKE EXECUTE ON FUNCTION public.add_product_color(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_product_color(UUID,TEXT,TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_product_color(p_user_id UUID, p_color_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true AND role = 'ADMIN';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  DELETE FROM product_colors WHERE id = p_color_id;
  RETURN jsonb_build_object('success', true);
END;$$;
REVOKE EXECUTE ON FUNCTION public.delete_product_color(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_product_color(UUID,UUID) TO anon, authenticated;

-- 4. RPC: upsert craftsman price override
CREATE OR REPLACE FUNCTION public.upsert_craftsman_price(
  p_user_id UUID,
  p_craftsman_customer_id UUID,
  p_product_id UUID,
  p_custom_price DECIMAL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true AND role = 'ADMIN';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  INSERT INTO craftsman_price_overrides(craftsman_customer_id, product_id, custom_price)
  VALUES(p_craftsman_customer_id, p_product_id, p_custom_price)
  ON CONFLICT(craftsman_customer_id, product_id) DO UPDATE SET custom_price = EXCLUDED.custom_price, updated_at = NOW();
  RETURN jsonb_build_object('success', true);
END;$$;
REVOKE EXECUTE ON FUNCTION public.upsert_craftsman_price(UUID,UUID,UUID,DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_craftsman_price(UUID,UUID,UUID,DECIMAL) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_craftsman_price(p_user_id UUID, p_override_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id AND is_active = true AND role = 'ADMIN';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  DELETE FROM craftsman_price_overrides WHERE id = p_override_id;
  RETURN jsonb_build_object('success', true);
END;$$;
REVOKE EXECUTE ON FUNCTION public.delete_craftsman_price(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_craftsman_price(UUID,UUID) TO anon, authenticated;

-- 5. RPC: get craftsman price overrides for a customer
CREATE OR REPLACE FUNCTION public.get_craftsman_prices(p_craftsman_customer_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_overrides JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cpo.id,
      'product_id', cpo.product_id,
      'custom_price', cpo.custom_price,
      'product_name', p.name,
      'product_sku', p.sku_code,
      'color_name', p.color_name
    )
  ) INTO v_overrides
  FROM craftsman_price_overrides cpo
  JOIN products p ON p.id = cpo.product_id
  WHERE cpo.craftsman_customer_id = p_craftsman_customer_id;
  RETURN jsonb_build_object('success', true, 'overrides', COALESCE(v_overrides, '[]'::jsonb));
END;$$;
REVOKE EXECUTE ON FUNCTION public.get_craftsman_prices(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_craftsman_prices(UUID) TO anon, authenticated;

-- 6. RPC: add product with multi-color variants in one call
-- (Creates one product record per color per warehouse)
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
  p_color_variants JSONB  -- [{color_id, color_name, hex_code, warehouse_id, quantity}]
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
      minimum_price, wholesale_threshold, reorder_level
    ) VALUES (
      p_name, p_sku_code, p_category_id,
      (v_variant->>'warehouse_id')::UUID,
      (v_variant->>'color_id')::UUID,
      v_variant->>'color_name',
      v_variant->>'hex_code',
      (v_variant->>'quantity')::DECIMAL,
      p_unit,
      p_retail_price, p_wholesale_price, p_craftsman_price,
      p_minimum_price, p_wholesale_threshold, p_reorder_level
    ) RETURNING id INTO v_product_id;
    v_created_ids := v_created_ids || jsonb_build_array(v_product_id::text);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created_ids', v_created_ids);
END;$$;
REVOKE EXECUTE ON FUNCTION public.add_product_with_colors FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_product_with_colors TO anon, authenticated;
