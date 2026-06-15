-- RLS Policies for warehouses
CREATE POLICY "warehouses_select_admin" ON warehouses FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "warehouses_insert_admin" ON warehouses FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "warehouses_update_admin" ON warehouses FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "warehouses_delete_admin" ON warehouses FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for users
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "users_insert_admin" ON users FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') OR auth.uid() IS NULL);
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "users_delete_admin" ON users FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "users_select_craftsman" ON users FOR SELECT
  TO authenticated USING (role = 'CRAFTSMAN');

-- RLS Policies for products
CREATE POLICY "products_select_all" ON products FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "products_insert_warehouse" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'EMPLOYEE'))
  );
CREATE POLICY "products_update_warehouse" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'EMPLOYEE'))
  );
CREATE POLICY "products_delete_admin" ON products FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for product_categories
CREATE POLICY "categories_select_all" ON product_categories FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "categories_insert_admin" ON product_categories FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "categories_update_admin" ON product_categories FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "categories_delete_admin" ON product_categories FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for customers
CREATE POLICY "customers_select_all" ON customers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "customers_insert_employee" ON customers FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "customers_update_employee" ON customers FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "customers_delete_admin" ON customers FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for invoices
CREATE POLICY "invoices_select_warehouse" ON invoices FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR 
    warehouse_id = (SELECT warehouse_id FROM users WHERE id = auth.uid())
    OR
    employee_id = auth.uid()
    OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );
CREATE POLICY "invoices_insert_employee" ON invoices FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "invoices_update_employee" ON invoices FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for invoice_items
CREATE POLICY "invoice_items_select_warehouse" ON invoice_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id AND (warehouse_id = (SELECT warehouse_id FROM users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')))
  );
CREATE POLICY "invoice_items_insert_employee" ON invoice_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "invoice_items_update_employee" ON invoice_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for stock_transfers
CREATE POLICY "transfers_select_warehouse" ON stock_transfers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "transfers_insert_employee" ON stock_transfers FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "transfers_update_employee" ON stock_transfers FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for projects
CREATE POLICY "projects_select_own" ON projects FOR SELECT
  TO authenticated USING (
    project_manager_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "projects_insert_pm" ON projects FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER')));
CREATE POLICY "projects_update_pm" ON projects FOR UPDATE
  TO authenticated USING (project_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for project_expenses
CREATE POLICY "expenses_select_project" ON project_expenses FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (project_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')))
  );
CREATE POLICY "expenses_insert_pm" ON project_expenses FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER')));

-- RLS Policies for project_materials
CREATE POLICY "materials_select_project" ON project_materials FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (project_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')))
  );
CREATE POLICY "materials_insert_pm" ON project_materials FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE')));
CREATE POLICY "materials_update_pm" ON project_materials FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE')));

-- RLS Policies for inspection_requests
CREATE POLICY "inspections_select_relevant" ON inspection_requests FOR SELECT
  TO authenticated USING (
    sent_by_id = auth.uid() 
    OR project_manager_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'EMPLOYEE')
  );
CREATE POLICY "inspections_insert_employee" ON inspection_requests FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));
CREATE POLICY "inspections_update_pm" ON inspection_requests FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE')));

-- RLS Policies for notifications
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (recipient_id = auth.uid());

-- RLS Policies for daily_reports
CREATE POLICY "reports_select_warehouse" ON daily_reports FOR SELECT
  TO authenticated USING (
    employee_id = auth.uid()
    OR warehouse_id = (SELECT warehouse_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "reports_insert_employee" ON daily_reports FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for expenses
CREATE POLICY "expenses_select_warehouse" ON expenses FOR SELECT
  TO authenticated USING (
    employee_id = auth.uid()
    OR warehouse_id = (SELECT warehouse_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "expenses_insert_employee" ON expenses FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for craftsman_cards
CREATE POLICY "cards_select_owner" ON craftsman_cards FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE'))
  );
CREATE POLICY "cards_insert_employee" ON craftsman_cards FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'EMPLOYEE')));

-- RLS Policies for price_tiers
CREATE POLICY "tiers_select_all" ON price_tiers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "tiers_insert_admin" ON price_tiers FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "tiers_update_admin" ON price_tiers FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "tiers_delete_admin" ON price_tiers FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for price_tier_overrides
CREATE POLICY "overrides_select_all" ON price_tier_overrides FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "overrides_insert_admin" ON price_tier_overrides FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "overrides_update_admin" ON price_tier_overrides FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "overrides_delete_admin" ON price_tier_overrides FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- RLS Policies for system_settings
CREATE POLICY "settings_select_all" ON system_settings FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "settings_update_admin" ON system_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "settings_insert_admin" ON system_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));