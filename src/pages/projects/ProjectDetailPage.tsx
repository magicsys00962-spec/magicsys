import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  Plus,
  X,
  Package,
  FileText,
  Edit2,
  Save,
  Loader,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Project, ProjectExpense, ProjectMaterial } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'INSPECTION_REQUESTED', label: 'طلب كشف', color: 'bg-amber-100 text-amber-700' },
  { value: 'INSPECTED', label: 'تم الكشف', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTRACT_SIGNED', label: 'توقيع العقد', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'COMPLETED', label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  { value: 'CANCELLED', label: 'ملغي', color: 'bg-gray-100 text-gray-700' },
];

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [contractValue, setContractValue] = useState('');

  useEffect(() => {
    if (id) fetchProject(id);
  }, [id]);

  const fetchProject = async (projectId: string) => {
    setLoading(true);
    try {
      const [{ data: projData, error: projErr }, { data: expData }, { data: matData }] = await Promise.all([
        supabase.from('projects').select('*, project_manager:users!projects_project_manager_id_fkey(name)').eq('id', projectId).single(),
        supabase.from('project_expenses').select('*').eq('project_id', projectId).order('date', { ascending: false }),
        supabase.from('project_materials').select('*, product:products(name, sku_code, unit), warehouse:warehouses(name)').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);

      if (projErr) throw projErr;
      setProject(projData);
      setNewStatus(projData.status);
      setContractValue(String(projData.total_contract_value || 0));
      setExpenses(expData || []);
      setMaterials(matData || []);
    } catch (error) {
      console.error('Error:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!project) return;
    try {
      const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
      if (error) throw error;
      setProject({ ...project, status: newStatus as any });
      setEditingStatus(false);
      toast.success('تم تحديث الحالة');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleUpdateContract = async () => {
    if (!project) return;
    try {
      const val = Number(contractValue);
      const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const { error } = await supabase.from('projects').update({
        total_contract_value: val,
        profit: val - totalExp,
      }).eq('id', project.id);
      if (error) throw error;
      setProject({ ...project, total_contract_value: val, profit: val - totalExp });
      setEditingContract(false);
      toast.success('تم تحديث قيمة العقد');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.amount) {
      toast.error('الرجاء إدخال الوصف والمبلغ');
      return;
    }

    setSavingExpense(true);
    try {
      const amount = Number(expenseForm.amount);
      const { data, error } = await supabase.from('project_expenses').insert({
        project_id: project!.id,
        description: expenseForm.description.trim(),
        amount,
        date: expenseForm.date,
        added_by_id: user!.id,
      }).select().single();

      if (error) throw error;

      const newExpenses = [data, ...expenses];
      const totalExp = newExpenses.reduce((s, ex) => s + Number(ex.amount), 0);

      await supabase.from('projects').update({
        total_expenses: totalExp,
        profit: (project!.total_contract_value || 0) - totalExp,
      }).eq('id', project!.id);

      setExpenses(newExpenses);
      setProject({
        ...project!,
        total_expenses: totalExp,
        profit: (project!.total_contract_value || 0) - totalExp,
      });
      setShowExpenseForm(false);
      setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
      toast.success('تم إضافة المصروف');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSavingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!project) return null;

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === project.status);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = (project.total_contract_value || 0) - totalExpenses;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.title}</h1>
            <p className="text-gray-500">{project.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button onClick={handleUpdateStatus} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                <Save size={16} />
              </button>
              <button onClick={() => setEditingStatus(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={clsx('px-4 py-2 rounded-lg text-sm font-semibold', statusConfig?.color)}>
                {statusConfig?.label}
              </span>
              <button onClick={() => setEditingStatus(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="تغيير الحالة">
                <Edit2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Phone size={16} />
            <span className="text-sm">هاتف العميل</span>
          </div>
          <p className="font-semibold text-gray-800" dir="ltr">{project.client_phone || '-'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <MapPin size={16} />
            <span className="text-sm">الموقع</span>
          </div>
          <p className="font-semibold text-gray-800">{project.location_address || '-'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Calendar size={16} />
            <span className="text-sm">تاريخ البدء</span>
          </div>
          <p className="font-semibold text-gray-800">
            {project.start_date ? new Date(project.start_date).toLocaleDateString('ar') : '-'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <FileText size={16} />
            <span className="text-sm">مدير المشروع</span>
          </div>
          <p className="font-semibold text-gray-800">{(project as any).project_manager?.name || '-'}</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">قيمة العقد</span>
            <button onClick={() => setEditingContract(true)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <Edit2 size={14} />
            </button>
          </div>
          {editingContract ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-gray-300 text-lg"
                step="0.001"
              />
              <button onClick={handleUpdateContract} className="p-2 bg-green-100 text-green-700 rounded">
                <Save size={14} />
              </button>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-800">{(project.total_contract_value || 0).toFixed(3)} <span className="text-sm text-gray-400">د.أ</span></p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <span className="text-sm text-gray-500">إجمالي المصروفات</span>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalExpenses.toFixed(3)} <span className="text-sm text-gray-400">د.أ</span></p>
        </div>

        <div className={clsx('rounded-xl shadow-card p-6', profit >= 0 ? 'bg-green-50' : 'bg-red-50')}>
          <span className="text-sm text-gray-500">صافي الربح</span>
          <p className={clsx('text-2xl font-bold mt-1', profit >= 0 ? 'text-green-600' : 'text-red-600')}>
            {profit.toFixed(3)} <span className="text-sm text-gray-400">د.أ</span>
          </p>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <DollarSign size={20} className="text-red-500" />
            المصروفات ({expenses.length})
          </h2>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1 text-sm px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 font-medium"
          >
            <Plus size={16} />
            إضافة مصروف
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا توجد مصروفات مسجلة</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-800">{exp.description}</p>
                  <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('ar')}</p>
                </div>
                <span className="font-bold text-red-600">{Number(exp.amount).toFixed(3)} د.أ</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package size={20} className="text-blue-500" />
            المواد المطلوبة ({materials.length})
          </h2>
        </div>

        {materials.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا توجد مواد مطلوبة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">الكمية المطلوبة</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">الكمية المسلمة</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">المخزن</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materials.map((mat) => (
                  <tr key={mat.id}>
                    <td className="px-5 py-3 font-medium">{(mat as any).product?.name || '-'}</td>
                    <td className="px-5 py-3">{mat.quantity_requested}</td>
                    <td className="px-5 py-3">{mat.quantity_delivered}</td>
                    <td className="px-5 py-3 text-gray-500">{(mat as any).warehouse?.name || '-'}</td>
                    <td className="px-5 py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        mat.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {mat.status === 'DELIVERED' ? 'تم التسليم' : 'قيد الانتظار'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-gray-700 mb-2">ملاحظات</h3>
          <p className="text-gray-600">{project.notes}</p>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إضافة مصروف</h3>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ (د.أ) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  step="0.001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" disabled={savingExpense} className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg disabled:opacity-50">
                  {savingExpense ? <Loader className="animate-spin mx-auto" size={20} /> : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
