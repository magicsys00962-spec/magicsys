-- Insert seed warehouses
INSERT INTO warehouses (id, name, code, address, phone) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'المخزن الرئيسي', 'W1', 'العنوان الرئيسي - بغداد', '07701234567'),
  ('22222222-2222-2222-2222-222222222222', 'مخزن الكرادة', 'W2', 'الكرادة - بغداد', '07701234568'),
  ('33333333-3333-3333-3333-333333333333', 'مخزع المنصور', 'W3', 'المنصور - بغداد', '07701234569');

-- Insert admin user
INSERT INTO users (id, name, email, password_hash, role, warehouse_id, is_active) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'مدير النظام', 'admin@magic.com', '$2a$10$YourHashedPasswordHere111111111111111111111111111111111111', 'ADMIN', NULL, true);

-- Insert employee users
INSERT INTO users (id, name, email, password_hash, role, warehouse_id, is_active) VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'أحمد محمد', 'ahmed@magic.com', '$2a$10$YourHashedPasswordHere111111111111111111111111111111111111', 'EMPLOYEE', '11111111-1111-1111-1111-111111111111', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'علي حسين', 'ali@magic.com', '$2a$10$YourHashedPasswordHere111111111111111111111111111111111111', 'EMPLOYEE', '22222222-2222-2222-2222-222222222222', true);

-- Insert project manager
INSERT INTO users (id, name, email, password_hash, role, warehouse_id, is_active) VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'محمود جاسم', 'mahmoud@magic.com', '$2a$10$YourHashedPasswordHere111111111111111111111111111111111111', 'PROJECT_MANAGER', NULL, true);

-- Insert craftsman
INSERT INTO users (id, name, email, password_hash, role, warehouse_id, craftsman_code, is_active) VALUES 
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'كريم عبدالله', 'karim@magic.com', '$2a$10$YourHashedPasswordHere111111111111111111111111111111111111', 'CRAFTSMAN', NULL, 'CRAFT-0001', true);

-- Insert price tiers
INSERT INTO price_tiers (id, name, description) VALUES 
  ('11111111-2222-3333-4444-555555555555', 'سعر الصنايعية الأساسي', 'السعر الخاص بصنايعي المعرض'),
  ('22222222-3333-4444-5555-666666666666', 'سعر الجملة', 'سعر الجملة للمتعهدين');

-- Insert categories
INSERT INTO product_categories (id, name, parent_id, warehouse_id) VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', 'سيراميك', NULL, '11111111-1111-1111-1111-111111111111'),
  ('aaaa2222-2222-2222-2222-222222222222', 'أرضيات', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaa3333-3333-3333-3333-333333333333', 'جدران', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaa4444-4444-4444-4444-444444444444', 'دهانات', NULL, '11111111-1111-1111-1111-111111111111'),
  ('aaaa5555-5555-5555-5555-555555555555', 'أدوات صحية', NULL, '11111111-1111-1111-1111-111111111111');

-- Insert sample products
INSERT INTO products (id, name, sku_code, category_id, warehouse_id, color_code, color_name, quantity_in_stock, unit, retail_price, wholesale_price, craftsman_price, minimum_price, wholesale_threshold, reorder_level) VALUES 
  ('bbbb1111-1111-1111-1111-111111111111', 'سيراميك فاخر 60×60', 'CER-001', 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '#E8DCC4', 'بيج فاتح', 150, 'box', 25.000, 22.000, 23.500, 20.000, 10, 20),
  ('bbbb2222-2222-2222-2222-222222222222', 'سيراميك لؤلؤي 30×60', 'CER-002', 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '#FFFFFF', 'أبيض لؤلؤي', 200, 'box', 18.000, 15.500, 16.500, 14.000, 10, 25),
  ('bbbb3333-3333-3333-3333-333333333333', 'سيراميك خشبي 60×60', 'CER-003', 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '#8B7355', 'بني خشبي', 80, 'box', 30.000, 27.000, 28.000, 25.000, 5, 15),
  ('bbbb4444-4444-4444-4444-444444444444', 'بلاط حمام أزرق', 'TILE-001', 'aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '#1E90FF', 'أزرق سماوي', 120, 'box', 22.000, 19.000, 20.000, 17.500, 8, 18),
  ('bbbb5555-5555-5555-5555-555555555555', 'بلاط مطبخ أخضر', 'TILE-002', 'aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '#90EE90', 'أخضر فاتح', 90, 'box', 24.000, 21.000, 22.000, 19.500, 8, 15),
  ('bbbb6666-6666-6666-6666-666666666666', 'دهان زيتي أبيض', 'PNT-001', 'aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '#FFFFFF', 'أبيض ناصع', 50, 'box', 45.000, 40.000, 42.000, 38.000, 3, 10),
  ('bbbb7777-7777-7777-7777-777777777777', 'دهان ممتاز رمادي', 'PNT-002', 'aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '#808080', 'رمادي فاتح', 35, 'box', 48.000, 43.000, 45.000, 40.000, 3, 8),
  ('bbbb8888-8888-8888-8888-888888888888', 'حوض مغسلة فاخر', 'SAN-001', 'aaaa5555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '#FFFFFF', 'أبيض لامع', 25, 'piece', 120.000, 100.000, 110.000, 95.000, 2, 5),
  ('bbbb9999-9999-9999-9999-999999999999', 'صنبور كروم فاخر', 'TAP-001', 'aaaa5555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '#C0C0C0', 'كروم لامع', 40, 'piece', 85.000, 70.000, 78.000, 65.000, 1, 8),
  ('bbbbaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'مرحاض كامل تركيب', 'WC-001', 'aaaa5555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '#FFFFFF', 'أبيض كلاسيك', 30, 'piece', 180.000, 150.000, 165.000, 140.000, 2, 6);

-- Products for warehouse 2
INSERT INTO products (id, name, sku_code, category_id, warehouse_id, color_code, color_name, quantity_in_stock, unit, retail_price, wholesale_price, craftsman_price, minimum_price, wholesale_threshold, reorder_level) VALUES 
  ('bbbbcccc-cccc-cccc-cccc-cccccccccccc', 'رخام إيطالي 60×60', 'MBL-001', 'aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '#F5DEB3', 'بيج رخامي', 60, 'box', 55.000, 50.000, 52.000, 48.000, 5, 10),
  ('bbbbdddd-dddd-dddd-dddd-dddddddddddd', 'جرانيت أسود لامع', 'GRN-001', 'aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '#2C2C2C', 'أسود لامع', 40, 'box', 65.000, 58.000, 61.000, 55.000, 4, 8);

-- Products for warehouse 3
INSERT INTO products (id, name, sku_code, category_id, warehouse_id, color_code, color_name, quantity_in_stock, unit, retail_price, wholesale_price, craftsman_price, minimum_price, wholesale_threshold, reorder_level) VALUES 
  ('bbbbeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'بورسلان مودرن', 'POR-001', 'aaaa2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '#C0C0C0', 'فضي مودرن', 70, 'box', 48.000, 42.000, 45.000, 40.000, 5, 12);

-- Insert customers
INSERT INTO customers (id, name, phone, type, user_id) VALUES 
  ('cccc1111-1111-1111-1111-111111111111', 'زبون عابر 1', '07901234567', 'WALK_IN', NULL),
  ('cccc2222-2222-2222-2222-222222222222', 'كريم عبدالله', '07901234568', 'CRAFTSMAN', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('cccc3333-3333-3333-3333-333333333333', 'شركة البناء الحديث', '07901234569', 'COMPANY', NULL);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES 
  ('credit_deadline_days', '30'),
  ('company_name', 'Magic'),
  ('company_phone', '07701234567'),
  ('company_address', 'بغداد - العراق'),
  ('invoice_prefix', 'MAG');

-- Create indexes for performance
CREATE INDEX idx_products_warehouse ON products(warehouse_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku_code);
CREATE INDEX idx_invoices_warehouse ON invoices(warehouse_id);
CREATE INDEX idx_invoices_employee ON invoices(employee_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_craftsman_code ON users(craftsman_code);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_status ON projects(status);