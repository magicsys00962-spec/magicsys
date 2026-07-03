
-- Atomic invoice number generation using advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_warehouse_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INT;
  v_prefix TEXT;
  v_count INT;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());
  v_prefix := 'MAG-' || p_warehouse_code || '-' || v_year;

  -- Use advisory lock keyed on warehouse code hash to serialize concurrent calls
  PERFORM pg_advisory_xact_lock(hashtext(v_prefix));

  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE invoice_number LIKE v_prefix || '%';

  v_number := v_prefix || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) TO anon, authenticated;
