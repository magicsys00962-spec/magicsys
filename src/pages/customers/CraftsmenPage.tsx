import React, { useEffect, useState } from 'react';
import { Plus, CreditCard, Printer, Users, Phone, Search } from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';
// clsx import not needed
import toast from 'react-hot-toast';

const CraftsmenPage: React.FC = () => {
  const [craftsmen, setCraftsmen] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCraftsman, setNewCraftsman] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchCraftsmen();
  }, [search]);

  const fetchCraftsmen = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select(`
          *,
          user:users(id, craftsman_code, email)
        `)
        .eq('type', 'CRAFTSMAN')
        .order('name');

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCraftsmen(data || []);
    } catch (error) {
      console.error('Error fetching craftsmen:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCraftsmanCode = () => {
    const num = String(craftsmen.length + 1).padStart(4, '0');
    return `CRAFT-${num}`;
  };

  const handleAddCraftsman = async () => {
    if (!newCraftsman.name) {
      toast.error('الرجاء إدخال اسم الصنايعي');
      return;
    }

    try {
      const code = generateCraftsmanCode();

      // Create user account for craftsman
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: newCraftsman.name,
          email: `${code.toLowerCase()}@magic.com`,
          password_hash: 'temp',
          role: 'CRAFTSMAN',
          craftsman_code: code,
          phone: newCraftsman.phone || null,
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create customer record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: newCraftsman.name,
          phone: newCraftsman.phone || null,
          type: 'CRAFTSMAN',
          user_id: userData.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      setCraftsmen([...craftsmen, customerData]);
      setShowAddForm(false);
      setNewCraftsman({ name: '', phone: '' });
      toast.success('تم إضافة الصنايعي بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handlePrintCard = (craftsman: Customer) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const code = craftsman.user?.craftsman_code || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>بطاقة صنايعي - ${craftsman.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; }
          .card {
            width: 85mm;
            height: 54mm;
            border: 2px solid #C9A84C;
            border-radius: 8px;
            margin: 10mm auto;
            padding: 5mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%);
          }
          .logo { font-size: 18px; font-weight: bold; color: #C9A84C; margin-bottom: 3mm; }
          .name { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 2mm; }
          .code { font-size: 16px; font-weight: bold; font-family: monospace; color: #333; letter-spacing: 2px; margin-bottom: 3mm; }
          .qr { width: 18mm; height: 18mm; }
          .phone { font-size: 10px; color: #666; margin-top: 2mm; }
          @media print {
            body { margin: 0; }
            .card { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Magic</div>
          <div class="name">${craftsman.name}</div>
          <div class="code">${code}</div>
          <div class="qr">
            <svg viewBox="0 0 100 100" width="68" height="68">
              ${QRCode.renderAsString(code, { size: 100, level: 'L', bgColor: 'transparent', fgColor: '#333' }).replace(/<?xml[^>]*>/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '')}
            </svg>
          </div>
          ${craftsman.phone ? `<div class="phone">${craftsman.phone}</div>` : ''}
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الصنايعية</h1>
          <p className="text-gray-500 mt-1">إدارة حسابات الصنايعية وطباعة البطاقات</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          إضافة صنايعي
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="relative">
          <Search
            size={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
          />
        </div>
      </div>

      {/* Craftsmen grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
                <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
                <div className="h-4 bg-gray-200 rounded mt-4 w-1/2 mx-auto" />
              </div>
            ))
        ) : craftsmen.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <CreditCard size={48} className="mx-auto text-gray-300" />
              <p className="text-gray-500 mt-4">لا يوجد صنايعية</p>
            </div>
          </div>
        ) : (
          craftsmen.map((craftsman) => (
            <div
              key={craftsman.id}
              className="bg-white rounded-xl shadow-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{craftsman.name}</h3>
                    <p className="text-sm text-purple-600 font-mono">
                      {craftsman.user?.craftsman_code}
                    </p>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                  <QRCode
                    value={craftsman.user?.craftsman_code || ''}
                    size={56}
                    level="L"
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {craftsman.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    <span>{craftsman.phone}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handlePrintCard(craftsman)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
              >
                <Printer size={16} />
                طباعة البطاقة
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add craftsman modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">إضافة صنايعي جديد</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCraftsman.name}
                  onChange={(e) => setNewCraftsman({ ...newCraftsman, name: e.target.value })}
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
                  value={newCraftsman.phone}
                  onChange={(e) => setNewCraftsman({ ...newCraftsman, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddCraftsman}
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

export default CraftsmenPage;
