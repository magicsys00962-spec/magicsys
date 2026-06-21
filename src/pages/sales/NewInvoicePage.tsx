import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  ShoppingCart,
  CreditCard,
  Clock,
  CheckCircle,
  Printer,
  Save,
  X,
  Loader,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore, getUnitLabel } from '../../stores/cartStore';
import type { Product, Customer, Warehouse } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const NewInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    items,
    customer,
    invoiceType,
    creditDays,
    notes,
    addItem,
    updateQuantity,
    updateDiscount,
    removeItem,
    setCustomer,
    setInvoiceType,
    setCreditDays,
    setNotes,
    getTotals,
    clearCart,
  } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  void loading;
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', type: 'WALK_IN' as const });
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [craftsmanPrices, setCraftsmanPrices] = useState<Record<string, number>>({});

  const totals = getTotals();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      setWarehouses(whData || []);

      // Fetch customers
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      setCustomers(custData || []);

      // Fetch products for user's warehouse or all if admin
      let productQuery = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name),
          warehouse:warehouses(name)
        `)
        .eq('is_archived', false)
        .order('name');

      if (user?.warehouse_id) {
        productQuery = productQuery.eq('warehouse_id', user.warehouse_id);
      }

      const { data: prodData } = await productQuery;
      setProducts(prodData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.includes(searchTerm) ||
      p.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.color_name && p.color_name.includes(searchTerm))
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.includes(customerSearch) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  const handleAddProduct = async (product: Product) => {
    // Check stock availability
    if (product.quantity_in_stock <= 0) {
      // Search other warehouses
      const { data } = await supabase.rpc('search_product_across_warehouses', { p_search: product.sku_code });
      const otherResults = (data?.results || []).filter((r: any) => r.warehouse_id !== user?.warehouse_id && r.quantity_in_stock > 0);
      if (otherResults.length > 0) {
        const info = otherResults.map((r: any) => `${r.warehouse_name}: ${r.quantity_in_stock}`).join(' | ');
        toast.error(`المنتج غير متوفر في مخزنك. متوفر في: ${info}`);
      } else {
        toast.error('المنتج غير متوفر في أي مخزن');
      }
      return;
    }

    const userType = customer?.type;
    // Apply craftsman custom price if available
    const overridePrice = craftsmanPrices[product.id];
    if (overridePrice !== undefined && customer?.type === 'CRAFTSMAN') {
      const item = {
        product,
        quantity: 1,
        discount: 0,
        discount_note: '',
        applied_price: Math.max(overridePrice, product.minimum_price),
        price_type: 'craftsman' as const,
      };
      useCartStore.getState().addItem(product, 1, userType);
      // Override the price after adding
      useCartStore.setState((state) => ({
        items: state.items.map((i) =>
          i.product.id === product.id ? { ...i, applied_price: Math.max(overridePrice, product.minimum_price), price_type: 'craftsman' } : i
        ),
      }));
      void item;
    } else {
      addItem(product, 1, userType);
    }
    setSearchTerm('');
    setShowProductSearch(false);
    toast.success(`تم إضافة ${product.name}`);
  };

  const handleSelectCustomer = async (c: Customer) => {
    setCustomer(c);
    setShowCustomerSearch(false);
    setCustomerSearch('');
    if (c.type === 'CRAFTSMAN') {
      const { data } = await supabase.rpc('get_craftsman_prices', {
        p_craftsman_customer_id: c.id,
      });
      if (data?.success && data.overrides?.length > 0) {
        const priceMap: Record<string, number> = {};
        data.overrides.forEach((ov: { product_id: string; custom_price: number }) => {
          priceMap[ov.product_id] = Number(ov.custom_price);
        });
        setCraftsmanPrices(priceMap);
        // Re-apply prices for already-added items
        useCartStore.setState((state) => ({
          items: state.items.map((item) =>
            priceMap[item.product.id] !== undefined
              ? { ...item, applied_price: Math.max(priceMap[item.product.id], item.product.minimum_price), price_type: 'craftsman' }
              : item
          ),
        }));
        toast.success(`تم تطبيق ${Object.keys(priceMap).length} سعر مخصص لهذا الصنايعي`);
      } else {
        setCraftsmanPrices({});
      }
    } else {
      setCraftsmanPrices({});
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      toast.error('الرجاء إدخال اسم الزبون');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();

      if (error) throw error;

      setCustomers([...customers, data]);
      setCustomer(data);
      setShowNewCustomer(false);
      setShowCustomerSearch(false);
      toast.success('تم إضافة الزبون بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const generateInvoiceNumber = async (warehouseCode: string) => {
    const year = new Date().getFullYear();
    const prefix = `MAG-${warehouseCode}-${year}`;

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `${prefix}%`);

    const nextNum = (count || 0) + 1;
    return `${prefix}-${String(nextNum).padStart(5, '0')}`;
  };

  const handleSaveInvoice = async () => {
    if (items.length === 0) {
      toast.error('الرجاء إضافة منتجات للفاتورة');
      return;
    }

    if (invoiceType === 'CREDIT' && !customer) {
      toast.error('يجب تحديد زبون للفاتورة الدائنة');
      return;
    }

    setSaving(true);

    try {
      // Validate stock availability before proceeding
      for (const item of items) {
        const { data: freshProduct } = await supabase
          .from('products')
          .select('quantity_in_stock, warehouse:warehouses(name)')
          .eq('id', item.product.id)
          .single();

        if (freshProduct && freshProduct.quantity_in_stock < item.quantity) {
          const warehouseName = (freshProduct.warehouse as any)?.name || '';
          throw new Error(
            `الكمية غير كافية للمنتج "${item.product.name}". المطلوب: ${item.quantity}, المتوفر: ${freshProduct.quantity_in_stock} في ${warehouseName}`
          );
        }
      }

      const warehouse = user?.warehouse_id
        ? warehouses.find((w) => w.id === user.warehouse_id)
        : warehouses[0];

      if (!warehouse) {
        throw new Error('لم يتم العثور على مخزن');
      }

      const invoiceNumber = await generateInvoiceNumber(warehouse.code);

      // Calculate credit due date
      let creditDueDate = null;
      if (invoiceType === 'CREDIT') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + creditDays);
        creditDueDate = dueDate.toISOString();
      }

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          warehouse_id: warehouse.id,
          employee_id: user?.id,
          customer_id: customer?.id || null,
          status: invoiceType,
          total_amount: totals.subtotal,
          discount_total: totals.discountTotal,
          net_amount: totals.netTotal,
          credit_due_date: creditDueDate,
          notes: notes || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items and update stock
      const invoiceItems = items.map((item) => ({
        invoice_id: invoiceData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        color_name: item.product.color_name,
        quantity: item.quantity,
        unit_price: item.applied_price,
        discount_amount: item.discount,
        discount_note: item.discount_note || null,
        subtotal: (item.applied_price - item.discount) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update stock for each product
      for (const item of items) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('quantity_in_stock')
          .eq('id', item.product.id)
          .single();

        if (currentProduct) {
          const newQty = currentProduct.quantity_in_stock - item.quantity;
          await supabase
            .from('products')
            .update({ quantity_in_stock: Math.max(0, newQty) })
            .eq('id', item.product.id);
        }
      }

      setSavedInvoiceId(invoiceData.id);
      toast.success('تم إنشاء الفاتورة بنجاح');
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  const handleNewInvoice = () => {
    clearCart();
    setSavedInvoiceId(null);
  };

  const invoiceTypeOptions = [
    { value: 'PAID', label: 'مدفوعة', icon: CheckCircle, color: 'bg-green-500' },
    { value: 'PENDING', label: 'معلقة', icon: Clock, color: 'bg-amber-500' },
    { value: 'CREDIT', label: 'دائن', icon: CreditCard, color: 'bg-orange-500' },
  ];

  if (savedInvoiceId) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">تم إنشاء الفاتورة بنجاح</h1>
          <p className="text-gray-500 mb-6">
            الفاتورة رقم: {savedInvoiceId}
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate(`/sales/invoices/${savedInvoiceId}`)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
            >
              <Printer size={20} />
              عرض وطباعة الفاتورة
            </button>
            <button
              onClick={handleNewInvoice}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              <Plus size={20} />
              فاتورة جديدة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Current warehouse indicator */}
      {user?.warehouse_id && (
        <div className="mb-4 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
          <span className="text-blue-600 font-medium">المخزن الحالي:</span>
          <span className="font-bold text-blue-800">{warehouses.find((w) => w.id === user.warehouse_id)?.name || '-'}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product search and cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product search */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="relative">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductSearch(true);
                }}
                onFocus={() => setShowProductSearch(true)}
                placeholder="ابحث عن منتج (اسم، رمز، لون)..."
                className="w-full pr-10 pl-4 py-3 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>

            {showProductSearch && searchTerm && (
              <div className="absolute z-20 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">لا توجد نتائج</p>
                ) : (
                  filteredProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full p-4 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.sku_code} • {product.color_name}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-800">
                            {product.retail_price.toFixed(3)} د.أ
                          </p>
                          <p className={`text-sm font-bold ${product.quantity_in_stock <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            متوفر: {product.quantity_in_stock} {getUnitLabel(product.unit)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="bg-white rounded-xl shadow-card">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart size={20} />
                سلة المشتريات ({items.length} منتج)
              </h2>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-4">السلة فارغة</p>
                <p className="text-sm text-gray-400 mt-1">ابحث عن منتج وأضفه للسلة</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.product.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.product.sku_code} • {item.product.color_name}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={clsx(
                              'text-xs px-2 py-1 rounded-full',
                              item.price_type === 'wholesale' && 'bg-blue-100 text-blue-700',
                              item.price_type === 'craftsman' && 'bg-purple-100 text-purple-700',
                              item.price_type === 'retail' && 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {item.price_type === 'wholesale' && 'سعر الجملة'}
                            {item.price_type === 'craftsman' && 'سعر الصنايعي'}
                            {item.price_type === 'retail' && 'سعر المفرق'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Quantity and discount */}
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, Math.max(0, item.quantity - 1), customer?.type)
                          }
                          className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.product.id,
                              Number(e.target.value),
                              customer?.type
                            )
                          }
                          className="w-20 text-center py-1.5 rounded-lg border border-gray-300"
                          min="0"
                        />
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1, customer?.type)
                          }
                          className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                        <span className="text-sm text-gray-500">
                          {getUnitLabel(item.product.unit)}
                        </span>
                      </div>

                      {/* Discount */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">خصم:</span>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => {
                            const discount = Number(e.target.value);
                            if (discount >= 0) {
                              updateDiscount(item.product.id, discount, item.discount_note);
                            }
                          }}
                          className="w-20 text-center py-1.5 rounded-lg border border-gray-300"
                          min="0"
                          step="0.001"
                        />
                        <span className="text-sm text-gray-500">د.أ</span>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {item.applied_price.toFixed(3)} د.أ × {item.quantity}
                        {item.discount > 0 && ` - ${item.discount.toFixed(3)} د.أ خصم`}
                      </span>
                      <span className="font-bold text-gray-800">
                        {((item.applied_price - item.discount) * item.quantity).toFixed(3)} د.أ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Customer and payment info */}
        <div className="space-y-6">
          {/* Customer selector */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User size={18} />
              الزبون
            </h3>

            {customer ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone || 'بدون رقم'}</p>
                {Object.keys(craftsmanPrices).length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-gold-700 bg-gold-50 rounded px-2 py-1 w-fit">
                    <Tag size={12} />
                    {Object.keys(craftsmanPrices).length} سعر مخصص مفعّل
                  </div>
                )}
                <button
                  onClick={() => { setCustomer(null); setCraftsmanPrices({}); }}
                  className="mt-2 text-sm text-red-500 hover:text-red-600"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerSearch(true);
                    }}
                    placeholder="ابحث عن زبون..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  />

                  {showCustomerSearch && customerSearch && (
                    <div className="absolute z-20 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                      {filteredCustomers.slice(0, 5).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full p-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium">{c.name}</p>
                          <p className="text-sm text-gray-500">{c.phone}</p>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setShowNewCustomer(true);
                          setShowCustomerSearch(false);
                        }}
                        className="w-full p-3 text-right text-gold-600 hover:bg-gray-50 font-medium"
                      >
                        + إضافة زبون جديد
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="w-full py-2.5 text-gold-600 hover:bg-gold-50 rounded-lg border border-gold-200 font-medium transition-colors"
                >
                  إضافة زبون جديد
                </button>
              </div>
            )}
          </div>

          {/* Invoice type */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="font-semibold text-gray-800 mb-3">نوع الفاتورة</h3>
            <div className="grid grid-cols-3 gap-2">
              {invoiceTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInvoiceType(opt.value as any)}
                  className={clsx(
                    'p-3 rounded-lg text-center transition-all',
                    invoiceType === opt.value
                      ? `${opt.color} text-white`
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  )}
                >
                  <opt.icon size={20} className="mx-auto mb-1" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            {invoiceType === 'CREDIT' && (
              <div className="mt-4">
                <label className="text-sm text-gray-600">مده الدائن (أيام)</label>
                <input
                  type="number"
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                  className="w-full mt-1 px-4 py-2 rounded-lg border border-gray-300"
                  min="1"
                />
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{totals.subtotal.toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الخصم</span>
                <span className="text-red-500">-{totals.discountTotal.toFixed(3)} د.أ</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-gold-600">{totals.netTotal.toFixed(3)} د.أ</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-sm text-gray-600">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 px-4 py-2 rounded-lg border border-gray-300"
                rows={2}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSaveInvoice}
              disabled={saving || items.length === 0}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gold-500 hover:bg-gold-600 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'جاري الحفظ...' : 'إنشاء الفاتورة'}
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إضافة زبون جديد</h3>
              <button
                onClick={() => setShowNewCustomer(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النوع
                </label>
                <select
                  value={newCustomer.type}
                  onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                >
                  <option value="WALK_IN">زبون عابر</option>
                  <option value="CRAFTSMAN">صنايعي</option>
                  <option value="COMPANY">شركة</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewCustomer(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateCustomer}
                className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewInvoicePage;
