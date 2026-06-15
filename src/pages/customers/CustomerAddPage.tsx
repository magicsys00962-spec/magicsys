import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, User, Phone, CreditCard, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const CustomerAddPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    type: 'WALK_IN' as 'WALK_IN' | 'CRAFTSMAN' | 'COMPANY',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('الرجاء إدخال اسم الزبون');
      return;
    }

    setSaving(true);

    try {
      let userId = null;

      // If craftsman, create user account too
      if (form.type === 'CRAFTSMAN') {
        const craftsmanCount = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'CRAFTSMAN');

        const code = `CRAFT-${String((craftsmanCount.count || 0) + 1).padStart(4, '0')}`;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            name: form.name,
            email: `${code.toLowerCase()}@magic.com`,
            password_hash: 'temp',
            role: 'CRAFTSMAN',
            craftsman_code: code,
            phone: form.phone || null,
            is_active: true,
          })
          .select()
          .single();

        if (userError) throw userError;
        userId = userData.id;
      }

      // Create customer
      const { error: customerError } = await supabase.from('customers').insert({
        name: form.name,
        phone: form.phone || null,
        type: form.type,
        notes: form.notes || null,
        user_id: userId,
      });

      if (customerError) throw customerError;

      toast.success('تم إضافة الزبون بنجاح');
      navigate('/customers');
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء الإضافة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إضافة زبون جديد</h1>
          <p className="text-gray-500">أدخل بيانات الزبون الجديد</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 space-y-6">
        {/* Customer type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            نوع الزبون
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'WALK_IN', label: 'زبون عابر', icon: User },
              { value: 'CRAFTSMAN', label: 'صنايعي', icon: CreditCard },
              { value: 'COMPANY', label: 'شركة', icon: User },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, type: option.value as any })}
                className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                  form.type === option.value
                    ? 'border-gold-500 bg-gold-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <option.icon
                  size={24}
                  className={form.type === option.value ? 'text-gold-600' : 'text-gray-400'}
                />
                <span className={form.type === option.value ? 'font-semibold' : ''}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الاسم <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            placeholder="أدخل اسم الزبون"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم الهاتف
          </label>
          <div className="relative">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              placeholder="مثال: 07901234567"
            />
            <Phone
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            rows={3}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        {/* Craftsman note */}
        {form.type === 'CRAFTSMAN' && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              عند اختيار "صنايعي"، سيتم إنشاء حساب لعرض سجل المشتريات ورمز خاص للبطاقة.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/customers')}
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
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerAddPage;
