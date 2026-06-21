
-- Fix product_units SELECT policy to allow anon (custom auth app doesn't use Supabase auth)
DROP POLICY IF EXISTS "units_select_all" ON product_units;
CREATE POLICY "units_select_all" ON product_units FOR SELECT TO anon, authenticated USING (true);

-- Also check system_colors since it has RLS enabled
DROP POLICY IF EXISTS "system_colors_select" ON system_colors;
CREATE POLICY "system_colors_select" ON system_colors FOR SELECT TO anon, authenticated USING (true);
