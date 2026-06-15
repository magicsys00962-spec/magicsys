import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, X, MapPin, Phone, User, CheckCircle, Clock, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, isAdmin } from '../../stores/authStore';
import type { InspectionRequest } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const InspectionRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [projectManagers, setProjectManagers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    location_address: '',
    description: '',
    project_manager_id: '',
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inspection_requests')
        .select('*, sent_by:users!inspection_requests_sent_by_id_fkey(name), project_manager:users!inspection_requests_project_manager_id_fkey(name)')
        .order('created_at', { ascending: false });

      if (user?.role === 'PROJECT_MANAGER') {
        query = query.eq('project_manager_id', user.id);
      } else if (user?.role === 'EMPLOYEE') {
        query = query.eq('sent_by_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);

      const { data: pmData } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'PROJECT_MANAGER')
        .eq('is_active', true);
      setProjectManagers(pmData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      toast.error('الرجاء إدخال اسم العميل');
      return;
    }

    try {
      const { error } = await supabase.from('inspection_requests').insert({
        sent_by_id: user!.id,
        project_manager_id: form.project_manager_id || null,
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim() || null,
        location_address: form.location_address.trim() || null,
        description: form.description.trim() || null,
        status: 'PENDING',
      });

      if (error) throw error;
      toast.success('تم إرسال طلب الكشف بنجاح');
      setShowForm(false);
      setForm({ client_name: '', client_phone: '', location_address: '', description: '', project_manager_id: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleAssign = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('inspection_requests')
        .update({ status: 'ASSIGNED', project_manager_id: user!.id })
        .eq('id', requestId);
      if (error) throw error;
      toast.success('تم قبول طلب الكشف');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleComplete = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('inspection_requests')
        .update({ status: 'COMPLETED' })
        .eq('id', requestId);
      if (error) throw error;
      toast.success('تم إكمال الكشف');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700', icon: Clock };
      case 'ASSIGNED': return { label: 'تم التعيين', color: 'bg-blue-100 text-blue-700', icon: User };
      case 'COMPLETED': return { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      default: return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const canSendRequests = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
  const canAcceptRequests = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">طلبات الكشف</h1>
          <p className="text-gray-500 mt-1">إدارة طلبات الكشف الميداني</p>
        </div>
        {canSendRequests && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <Plus size={20} />
            طلب كشف جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300" />
          <p className="text-gray-500 mt-4">لا توجد طلبات كشف</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => {
            const statusConfig = getStatusConfig(req.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={req.id} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{req.client_name}</h3>
                    {req.client_phone && (
                      <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Phone size={14} />
                        <span dir="ltr">{req.client_phone}</span>
                      </p>
                    )}
                  </div>
                  <span className={clsx('flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium', statusConfig.color)}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </span>
                </div>

                {req.location_address && (
                  <p className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    {req.location_address}
                  </p>
                )}

                {req.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{req.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    <span>أرسل بواسطة: {(req as any).sent_by?.name || '-'}</span>
                    {(req as any).project_manager?.name && (
                      <span className="mr-3">مدير المشروع: {(req as any).project_manager.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canAcceptRequests && req.status === 'PENDING' && (
                      <button
                        onClick={() => handleAssign(req.id)}
                        className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                      >
                        قبول الطلب
                      </button>
                    )}
                    {canAcceptRequests && req.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleComplete(req.id)}
                        className="text-sm px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                      >
                        إكمال الكشف
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {new Date(req.created_at).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Send size={20} className="text-gold-500" />
                إرسال طلب كشف
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم العميل <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان / الموقع</label>
                <input
                  type="text"
                  value={form.location_address}
                  onChange={(e) => setForm({ ...form, location_address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  rows={3}
                />
              </div>

              {projectManagers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">مدير المشروع (اختياري)</label>
                  <select
                    value={form.project_manager_id}
                    onChange={(e) => setForm({ ...form, project_manager_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  >
                    <option value="">أي مدير مشروع</option>
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg">
                  إرسال الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionRequestsPage;
