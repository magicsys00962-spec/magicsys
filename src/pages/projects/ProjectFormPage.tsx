import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Loader, User, MapPin, DollarSign, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

const ProjectFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    client_name: '',
    client_phone: '',
    location_address: '',
    total_contract_value: 0,
    status: 'INSPECTION_REQUESTED' as const,
    start_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.client_name) {
      toast.error('الرجاء إدخال عنوان المشروع واسم العميل');
      return;
    }

    if (!user) {
      toast.error('يجب تسجيل الدخول');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('projects').insert({
        project_manager_id: user.id,
        title: form.title,
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        location_address: form.location_address || null,
        total_contract_value: form.total_contract_value,
        status: form.status,
        start_date: form.start_date || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast.success('تم إنشاء المشروع بنجاح');
      navigate('/projects');
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مشروع جديد</h1>
          <p className="text-gray-500">أنشئ مشروع تنفيذ جديد</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 space-y-6">
        {/* Project title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            عنوان المشروع <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            placeholder="مثال: تشطيب فيلا الزهراء"
            required
          />
        </div>

        {/* Client info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User size={14} className="inline ml-1" />
              اسم العميل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم هاتف العميل
            </label>
            <input
              type="tel"
              value={form.client_phone}
              onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              placeholder="07901234567"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin size={14} className="inline ml-1" />
            موقع المشروع
          </label>
          <input
            type="text"
            value={form.location_address}
            onChange={(e) => setForm({ ...form, location_address: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            placeholder="العنوان التفصيلي"
          />
        </div>

        {/* Contract value and date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign size={14} className="inline ml-1" />
              قيمة العقد (دينار أردني)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.total_contract_value}
              onChange={(e) => setForm({ ...form, total_contract_value: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ البدء
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            حالة المشروع
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'INSPECTION_REQUESTED', label: 'طلب كشف', color: 'border-orange-500 bg-orange-50' },
              { value: 'INSPECTED', label: 'تم الكشف', color: 'border-amber-500 bg-amber-50' },
              { value: 'CONTRACT_SIGNED', label: 'تم توقيع العقد', color: 'border-purple-500 bg-purple-50' },
              { value: 'IN_PROGRESS', label: 'قيد التنفيذ', color: 'border-blue-500 bg-blue-50' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, status: option.value as any })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  form.status === option.value ? option.color : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={form.status === option.value ? 'font-semibold' : ''}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText size={14} className="inline ml-1" />
            ملاحظات
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            rows={3}
            placeholder="تفاصيل إضافية عن المشروع..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? 'جاري الحفظ...' : 'إنشاء المشروع'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectFormPage;
