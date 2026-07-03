import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Users, Eye, CreditCard, Phone, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';
import clsx from 'clsx';

const CustomersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    fetchCustomers();
  }, [search, typeFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select(`
          *,
          user:users(id, craftsman_code)
        `)
        .order('name');

      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WALK_IN':
        return 'زبون عابر';
      case 'CRAFTSMAN':
        return 'صنايعي';
      case 'COMPANY':
        return 'جملة';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CRAFTSMAN':
        return 'bg-purple-100 text-purple-700';
      case 'COMPANY':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">الزباين</h1>
          <p className="text-sm lg:text-base text-gray-500 mt-1">إدارة حسابات الزباين</p>
        </div>
        <Link
          to="/customers/add"
          className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors touch-manipulation"
        >
          <Plus size={20} />
          إضافة زبون
        </Link>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-3 sm:py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 sm:py-2.5 rounded-lg border border-gray-300 text-base"
          >
            <option value="">كل الأنواع</option>
            <option value="WALK_IN">زبون عابر</option>
            <option value="CRAFTSMAN">صنايعي</option>
            <option value="COMPANY">جملة</option>
          </select>
        </div>
      </div>

      {/* Customers grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
              <div className="h-14 w-14 bg-gray-200 rounded-full mx-auto" />
              <div className="h-4 bg-gray-200 rounded mt-4 w-1/2 mx-auto" />
              <div className="h-3 bg-gray-200 rounded mt-2 w-1/3 mx-auto" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-xl shadow-card p-8 lg:p-12 text-center">
              <Users size={48} className="mx-auto text-gray-300" />
              <p className="text-gray-500 mt-4">لا يوجد زباين</p>
            </div>
          </div>
        ) : (
          customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-4 lg:p-6 text-right w-full touch-manipulation"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <Users size={22} className="text-gold-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-gray-800 truncate">{customer.name}</h3>
                    <span className={clsx('text-xs px-2 py-1 rounded-full', getTypeColor(customer.type))}>
                      {getTypeLabel(customer.type)}
                    </span>
                  </div>
                </div>
                <Eye size={18} className="text-gray-400 flex-shrink-0" />
              </div>

              <div className="mt-4 space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Phone size={14} />
                    <span className="truncate">{customer.phone}</span>
                  </div>
                )}
                {customer.type === 'CRAFTSMAN' && customer.user?.craftsman_code && (
                  <div className="flex items-center gap-2 text-purple-600 text-sm">
                    <CreditCard size={14} />
                    <span className="font-mono">{customer.user.craftsman_code}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Clock size={12} />
                  <span>منذ {new Date(customer.created_at).toLocaleDateString('ar')}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomersListPage;
