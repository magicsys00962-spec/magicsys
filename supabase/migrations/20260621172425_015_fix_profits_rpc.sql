
-- Fix profits RPC to use correct permission key 'reports_profits'
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

  -- Allow admin OR users with reports_profits permission OR reports permission
  IF v_user.role != 'ADMIN' THEN
    IF NOT (
      COALESCE((v_user.permissions->>'reports_profits')::boolean, false) OR
      COALESCE((v_user.permissions->>'reports')::boolean, false)
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'غير مصرح بعرض الأرباح');
    END IF;
  END IF;

  -- Warehouse filter: admins see all, employees see their warehouse
  -- Get invoice-level profit data
  SELECT jsonb_agg(inv_data ORDER BY (inv_data->>'date') DESC) INTO v_invoices FROM (
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
      AND (v_user.role = 'ADMIN' OR i.warehouse_id = v_user.warehouse_id)
    GROUP BY i.id, i.invoice_number, i.created_at, i.net_amount, c.name
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
    AND i.created_at::date <= p_end_date
    AND (v_user.role = 'ADMIN' OR i.warehouse_id = v_user.warehouse_id);

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
      AND (v_user.role = 'ADMIN' OR i.warehouse_id = v_user.warehouse_id)
    GROUP BY ii.product_name
    ORDER BY (SUM(ii.subtotal) - COALESCE(SUM(p.purchase_price * ii.quantity), 0)) DESC
    LIMIT 10
  ) sub2;

  RETURN jsonb_build_object(
    'success', true,
    'total_revenue', v_total_revenue,
    'total_cost', v_total_cost,
    'total_profit', v_total_profit,
    'invoices', COALESCE(v_invoices, '[]'::jsonb),
    'top_products', COALESCE(v_top_products, '[]'::jsonb)
  );
END;
$$;
