-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Warehouses table
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE', 'CRAFTSMAN', 'PROJECT_MANAGER', 'WALK_IN_CUSTOMER')),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  craftsman_code TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price tiers
CREATE TABLE price_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  color_code TEXT,
  color_name TEXT,
  quantity_in_stock DECIMAL(15,3) DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('piece', 'box', 'meter', 'kg')),
  retail_price DECIMAL(15,3) NOT NULL,
  wholesale_price DECIMAL(15,3),
  craftsman_price DECIMAL(15,3),
  minimum_price DECIMAL(15,3) NOT NULL,
  wholesale_threshold DECIMAL(15,3) DEFAULT 1,
  reorder_level DECIMAL(15,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, sku_code)
);

-- Price tier overrides
CREATE TABLE price_tier_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_tier_id UUID REFERENCES price_tiers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  override_price DECIMAL(15,3) NOT NULL,
  UNIQUE(price_tier_id, product_id)
);

-- Update user to reference price tier
ALTER TABLE users ADD COLUMN special_price_tier_id UUID REFERENCES price_tiers(id) ON DELETE SET NULL;

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  type TEXT NOT NULL CHECK (type IN ('WALK_IN', 'CRAFTSMAN', 'COMPANY')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'CREDIT')) DEFAULT 'PAID',
  total_amount DECIMAL(15,3) NOT NULL,
  discount_total DECIMAL(15,3) DEFAULT 0,
  net_amount DECIMAL(15,3) NOT NULL,
  credit_due_date TIMESTAMPTZ,
  credit_overdue BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  color_name TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,3) NOT NULL,
  discount_amount DECIMAL(15,3) DEFAULT 0,
  discount_note TEXT,
  subtotal DECIMAL(15,3) NOT NULL
);

-- Stock transfers table
CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  quantity DECIMAL(15,3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'CONFIRMED', 'CANCELLED')) DEFAULT 'REQUESTED',
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reports table
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  total_paid DECIMAL(15,3) DEFAULT 0,
  total_pending DECIMAL(15,3) DEFAULT 0,
  total_credit DECIMAL(15,3) DEFAULT 0,
  total_expenses DECIMAL(15,3) DEFAULT 0,
  expenses_detail JSONB DEFAULT '[]',
  net_cash DECIMAL(15,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  location_address TEXT,
  status TEXT NOT NULL CHECK (status IN ('INSPECTION_REQUESTED', 'INSPECTED', 'CONTRACT_SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'INSPECTION_REQUESTED',
  contract_image_url TEXT,
  start_date DATE,
  end_date DATE,
  total_contract_value DECIMAL(15,3) DEFAULT 0,
  total_expenses DECIMAL(15,3) DEFAULT 0,
  profit DECIMAL(15,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project expenses table
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,3) NOT NULL,
  date DATE NOT NULL,
  added_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project materials table
CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity_requested DECIMAL(15,3) NOT NULL,
  quantity_delivered DECIMAL(15,3) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'DELIVERED')) DEFAULT 'PENDING',
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection requests table
CREATE TABLE inspection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sent_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  location_address TEXT,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ASSIGNED', 'COMPLETED')) DEFAULT 'PENDING',
  assigned_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Craftsman cards table
CREATE TABLE craftsman_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  craftsman_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  card_design_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table for daily expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount DECIMAL(15,3) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tier_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;