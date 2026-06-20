export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CRAFTSMAN' | 'PROJECT_MANAGER' | 'WALK_IN_CUSTOMER';
export type CustomerType = 'WALK_IN' | 'CRAFTSMAN' | 'COMPANY';
export type InvoiceStatus = 'PAID' | 'PENDING' | 'CREDIT';
export type ProjectStatus = 'INSPECTION_REQUESTED' | 'INSPECTED' | 'CONTRACT_SIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TransferStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';
export type MaterialStatus = 'PENDING' | 'DELIVERED';
export type InspectionStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED';
export type ProductUnit = string;

export type PermissionKey =
  | 'dashboard'
  | 'inventory'
  | 'inventory_add'
  | 'inventory_warnings'
  | 'inventory_categories'
  | 'inventory_colors'
  | 'inventory_units'
  | 'inventory_transfer'
  | 'sales'
  | 'sales_create'
  | 'customers'
  | 'customers_craftsmen'
  | 'customers_add'
  | 'projects'
  | 'projects_inspections'
  | 'reports'
  | 'reports_profits'
  | 'admin_users'
  | 'admin_warehouses'
  | 'admin_pricing'
  | 'admin_settings';

export type UserPermissions = Partial<Record<PermissionKey, boolean>>;

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  warehouse_id: string | null;
  craftsman_code: string | null;
  phone: string | null;
  is_active: boolean;
  permissions?: UserPermissions;
  created_at: string;
  warehouse?: Warehouse;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku_code: string;
  category_id: string | null;
  warehouse_id: string;
  color_code: string | null;
  color_name: string | null;
  quantity_in_stock: number;
  unit: ProductUnit;
  retail_price: number;
  wholesale_price: number | null;
  craftsman_price: number | null;
  minimum_price: number;
  purchase_price: number;
  wholesale_threshold: number;
  reorder_level: number;
  dimension_length: number | null;
  dimension_width: number | null;
  dimension_thickness: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
  warehouse?: Warehouse;
}

export interface ProductCategory {
  id: string;
  name: string;
  parent_id: string | null;
  warehouse_id: string | null;
  created_at: string;
  parent?: ProductCategory;
  children?: ProductCategory[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  type: CustomerType;
  user_id: string | null;
  notes: string | null;
  created_at: string;
  user?: User;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  warehouse_id: string;
  employee_id: string;
  customer_id: string | null;
  status: InvoiceStatus;
  total_amount: number;
  discount_total: number;
  net_amount: number;
  credit_due_date: string | null;
  credit_overdue: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  employee?: User;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  color_name: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_note: string | null;
  subtotal: number;
}

export interface Project {
  id: string;
  project_manager_id: string;
  title: string;
  client_name: string;
  client_phone: string | null;
  location_address: string | null;
  status: ProjectStatus;
  contract_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  total_contract_value: number;
  total_expenses: number;
  profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_manager?: User;
  materials?: ProjectMaterial[];
  expenses?: ProjectExpense[];
}

export interface ProjectMaterial {
  id: string;
  project_id: string;
  product_id: string | null;
  quantity_requested: number;
  quantity_delivered: number;
  status: MaterialStatus;
  warehouse_id: string | null;
  created_at: string;
  product?: Product;
}

export interface ProjectExpense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  date: string;
  added_by_id: string | null;
  created_at: string;
}

export interface InspectionRequest {
  id: string;
  sent_by_id: string;
  project_manager_id: string | null;
  client_name: string;
  client_phone: string | null;
  location_address: string | null;
  description: string | null;
  status: InspectionStatus;
  assigned_project_id: string | null;
  created_at: string;
  sent_by?: User;
  project_manager?: User;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  product_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  requested_by_id: string | null;
  quantity: number;
  status: TransferStatus;
  invoice_id: string | null;
  notes: string | null;
  product_name: string | null;
  created_at: string;
  transferred_at: string;
  product?: Product;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  requested_by?: User;
}

export interface DailyExpense {
  id: string;
  warehouse_id: string;
  employee_id: string | null;
  name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  discount_note: string;
  applied_price: number;
  price_type: 'retail' | 'wholesale' | 'craftsman';
}

export interface DashboardStats {
  total_sales_today: number;
  pending_invoices: number;
  overdue_credit: number;
  low_stock_count: number;
  daily_profit?: number;
  active_projects?: number;
  pending_inspections?: number;
}

export interface ProductUnitRecord {
  id: string;
  name: string;
  created_at: string;
}
