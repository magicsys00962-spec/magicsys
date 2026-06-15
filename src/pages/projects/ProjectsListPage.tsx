import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Wrench,
  Eye,
  Search,
  MapPin,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Project, ProjectStatus } from '../../types';
import clsx from 'clsx';

const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, search, user]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by project manager
      if (user?.role === 'PROJECT_MANAGER') {
        query = query.eq('project_manager_id', user.id);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,client_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'مكتمل', icon: CheckCircle, color: 'bg-green-100 text-green-700' };
      case 'IN_PROGRESS':
        return { label: 'قيد التنفيذ', icon: Clock, color: 'bg-blue-100 text-blue-700' };
      case 'CONTRACT_SIGNED':
        return { label: 'تم توقيع العقد', icon: FileText, color: 'bg-purple-100 text-purple-700' };
      case 'INSPECTED':
        return { label: 'تم الكشف', icon: Eye, color: 'bg-amber-100 text-amber-700' };
      case 'INSPECTION_REQUESTED':
        return { label: 'طلب كشف', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' };
      case 'CANCELLED':
        return { label: 'ملغي', icon: X, color: 'bg-gray-100 text-gray-700' };
      default:
        return { label: status, icon: Clock, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المشاريع</h1>
          <p className="text-gray-500 mt-1">إدارة مشاريع التنفيذ</p>
        </div>
        <Link
          to="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          مشروع جديد
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالعنوان أو اسم العميل..."
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300"
          >
            <option value="">كل الحالات</option>
            <option value="INSPECTION_REQUESTED">طلب كشف</option>
            <option value="INSPECTED">تم الكشف</option>
            <option value="CONTRACT_SIGNED">تم توقيع العقد</option>
            <option value="IN_PROGRESS">قيد التنفيذ</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="CANCELLED">ملغي</option>
          </select>
        </div>
      </div>

      {/* Projects list */}
      <div className="space-y-4">
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-4" />
              </div>
            ))
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-12 text-center">
            <Wrench size={48} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-4">لا توجد مشاريع</p>
          </div>
        ) : (
          projects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {project.title}
                      </h3>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                          statusConfig.color
                        )}
                      >
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={16} />
                        <span>{project.client_name}</span>
                        {project.client_phone && (
                          <span className="text-gray-400">({project.client_phone})</span>
                        )}
                      </div>
                      {project.location_address && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <MapPin size={14} />
                          <span>{project.location_address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left mr-4">
                    <p className="text-sm text-gray-500">قيمة العقد</p>
                    <p className="font-bold text-gold-600">
                      {project.total_contract_value.toFixed(3)} د.أ
                    </p>
                    {project.total_expenses > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          المصروفات: {project.total_expenses.toFixed(3)} د.أ
                        </p>
                        <p
                          className={clsx(
                            'text-sm font-semibold',
                            project.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          الربح: {project.profit.toFixed(3)} د.أ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectsListPage;
