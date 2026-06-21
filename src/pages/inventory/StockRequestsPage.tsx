import React, { useEffect, useState } from 'react';
import { Send, Inbox, Check, X, Search, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { StockRequest, Product, Warehouse } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const StockRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'send' | 'incoming'>('incoming');
  const [incomingRequests, setIncomingRequests] = useState<StockRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  // Send request form
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [requestQty, setRequestQty] = useState(1);
  const [requestNotes, setRequestNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchWarehouses();
  }, [user]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchRequests = async () => {
    if (!user?.warehouse_id) return;
    setLoading(true);
    try {
      const [{ data: incoming }, { data: sent }] = await Promise.all([
        supabase
          .from('stock_requests')
          .select('*, from_warehouse:warehouses!stock_requests_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_requests_to_warehouse_id_fkey(name), requested_by:users!stock_requests_requested_by_id_fkey(name)')
          .eq('from_warehouse_id', user.warehouse_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('stock_requests')
          .select('*, from_warehouse:warehouses!stock_requests_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_requests_to_warehouse_id_fkey(name), requested_by:users!stock_requests_requested_by_id_fkey(name)')
          .eq('to_warehouse_id', user.warehouse_id)
          .order('created_at', { ascending: false }),
      ]);
      setIncomingRequests(incoming || []);
      setSentRequests(sent || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (search.trim().length < 2) return;
    const { data } = await supabase.rpc('search_product_across_warehouses', { p_search: search.trim() });
    if (data?.results) {
      const filtered = data.results.filter((r: any) => r.warehouse_id !== user?.warehouse_id);
      setSearchResults(filtered);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedProduct || !sourceWarehouse || requestQty <= 0) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('stock_requests').insert({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        from_warehouse_id: sourceWarehouse,
        to_warehouse_id: user?.warehouse_id,
        requested_by_id: user?.id,
        quantity: requestQty,
        notes: requestNotes || null,
      });
      if (error) throw error;

      // Send notifications to all users in the source warehouse
      const { data: warehouseUsers } = await supabase
        .from('users')
        .select('id')
        .eq('warehouse_id', sourceWarehouse)
        .eq('is_active', true);

      if (warehouseUsers?.length) {
        const wh = warehouses.find((w) => w.id === user?.warehouse_id);
        const notifications = warehouseUsers.map((u) => ({
          recipient_id: u.id,
          type: 'STOCK_REQUEST',
          title: 'طلب مواد جديد',
          message: `طلب ${user?.name} من ${wh?.name || 'مخزنك'} كمية ${requestQty} من ${selectedProduct.name}`,
          reference_type: 'stock_request',
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast.success('تم إرسال الطلب بنجاح');
      setSelectedProduct(null);
      setSourceWarehouse('');
      setRequestQty(1);
      setRequestNotes('');
      setSearch('');
      setSearchResults([]);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.rpc('process_stock_request', {
        p_user_id: user?.id,
        p_request_id: requestId,
        p_action: action,
        p_notes: null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success(action === 'APPROVE' ? 'تم قبول الطلب' : 'تم رفض الطلب');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock size={12} />قيد الانتظار</span>;
      case 'APPROVED': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={12} />مقبول</span>;
      case 'REJECTED': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle size={12} />مرفوض</span>;
      default: return null;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">طلبات المواد</h1>
        <p className="text-gray-500 mt-1">طلب واستقبال المواد بين المخازن</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('incoming')} className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors', tab === 'incoming' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
          <Inbox size={18} />
          الطلبات الواردة
          {incomingRequests.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{incomingRequests.filter((r) => r.status === 'PENDING').length}</span>
          )}
        </button>
        <button onClick={() => setTab('send')} className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors', tab === 'send' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
          <Send size={18} />
          إرسال طلب
        </button>
      </div>

      {/* Incoming Requests Tab */}
      {tab === 'incoming' && (
        <div className="space-y-4">
          {incomingRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <Inbox size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد طلبات واردة</p>
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl shadow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mt-1">
                      <Package size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{req.product_name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        الكمية المطلوبة: <span className="font-bold">{req.quantity}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        من: {(req as any).requested_by?.name || '-'} | مخزن: {(req as any).to_warehouse?.name || '-'}
                      </p>
                      {req.notes && <p className="text-sm text-gray-400 mt-1">ملاحظات: {req.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString('ar')} - {new Date(req.created_at).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleAction(req.id, 'APPROVE')}
                          disabled={processing === req.id}
                          className="flex items-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <Check size={16} />
                          قبول
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'REJECT')}
                          disabled={processing === req.id}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <X size={16} />
                          رفض
                        </button>
                      </>
                    ) : getStatusBadge(req.status)}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Sent requests */}
          {sentRequests.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">طلباتي المرسلة</h2>
              <div className="space-y-3">
                {sentRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{req.product_name} - كمية: {req.quantity}</p>
                      <p className="text-sm text-gray-500">من مخزن: {(req as any).from_warehouse?.name || '-'}</p>
                      <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString('ar')}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Request Tab */}
      {tab === 'send' && (
        <div className="bg-white rounded-xl shadow-card p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">طلب مادة من مخزن آخر</h3>

          {/* Search for product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ابحث عن المنتج</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="اسم المنتج أو الرمز..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
              </div>
              <button onClick={handleSearch} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">بحث</button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && !selectedProduct && (
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((item: any) => (
                <button
                  key={`${item.id}-${item.warehouse_id}`}
                  onClick={() => { setSelectedProduct(item); setSourceWarehouse(item.warehouse_id); setSearchResults([]); }}
                  className="w-full p-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-gray-800">{item.name} {item.color_name && `(${item.color_name})`}</p>
                  <p className="text-sm text-gray-500">مخزن: {item.warehouse_name} | متوفر: {item.quantity_in_stock}</p>
                </button>
              ))}
            </div>
          )}

          {/* Selected product */}
          {selectedProduct && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">من مخزن: {selectedProduct.warehouse_name} | متوفر: {selectedProduct.quantity_in_stock}</p>
                </div>
                <button onClick={() => { setSelectedProduct(null); setSourceWarehouse(''); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الكمية المطلوبة</label>
            <input
              type="number"
              value={requestQty}
              onChange={(e) => setRequestQty(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              min="1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              rows={2}
            />
          </div>

          <button
            onClick={handleSendRequest}
            disabled={sending || !selectedProduct}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {sending ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StockRequestsPage;
