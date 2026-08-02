import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { RefreshCw, Search, X, Calendar, User, Tag, Activity, Clock } from "lucide-react";

const ENTITY_TYPES = ["", "politician", "user", "country", "state", "city", "constituency", "relative", "wealth", "signup_request"];

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor: "", entity_type: "", action: "", from_date: "", to_date: "" });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get("/admin/audit", { params });
      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to load audit log:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ actor: "", entity_type: "", action: "", from_date: "", to_date: "" });
    setTimeout(load, 0);
  }, [load]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== "");
  }, [filters]);

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getActionColor = useCallback((action) => {
    const colors = {
      create: 'bg-emerald-100 text-emerald-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-rose-100 text-rose-800',
      login: 'bg-indigo-100 text-indigo-800',
      logout: 'bg-gray-100 text-gray-800',
    };
    return colors[action?.toLowerCase()] || 'bg-slate-100 text-slate-800';
  }, []);

  const toggleRow = useCallback((id) => {
    setExpandedRow(prev => prev === id ? null : id);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium tracking-wider mb-1">
              <Activity size={16} />
              <span>Immutable Record</span>
            </div>
            <h1 className="font-display font-bold text-3xl text-slate-900">Audit Log</h1>
            <p className="text-slate-500 text-sm mt-1">Track all system activities and changes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Clock size={16} className="text-slate-400" />
              <span className="text-sm text-slate-600 font-mono">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Filters</span>
              {hasActiveFilters && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                <User size={14} />
                Actor Email
              </label>
              <input 
                value={filters.actor} 
                onChange={(e) => handleFilterChange('actor', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="Search by email..."
                data-testid="filter-actor"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                <Tag size={14} />
                Entity Type
              </label>
              <select 
                value={filters.entity_type} 
                onChange={(e) => handleFilterChange('entity_type', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                data-testid="filter-entity"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t || "Any Entity"}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                <Activity size={14} />
                Action Contains
              </label>
              <input 
                value={filters.action} 
                onChange={(e) => handleFilterChange('action', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="e.g., created"
                data-testid="filter-action"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                <Calendar size={14} />
                From
              </label>
              <input 
                type="date" 
                value={filters.from_date} 
                onChange={(e) => handleFilterChange('from_date', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                <Calendar size={14} />
                To
              </label>
              <input 
                type="date" 
                value={filters.to_date} 
                onChange={(e) => handleFilterChange('to_date', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={load} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              data-testid="apply-filters"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Apply Filters
            </button>
            <button 
              onClick={clearFilters} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
            >
              <X size={16} />
              Clear All
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">
            {!loading && (
              <span>
                Showing <span className="font-semibold text-slate-900">{items.length}</span> events
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Timestamp", "Actor", "Action", "Entity", "Entity ID", "Changes", "IP"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center">
                      <div className="inline-flex items-center gap-3 text-slate-400">
                        <RefreshCw size={20} className="animate-spin" />
                        <span className="font-medium">Loading audit events...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center">
                      <div className="text-slate-400">
                        <Activity size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No events found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map((e) => (
                  <React.Fragment key={e.id}>
                    <tr 
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${expandedRow === e.id ? 'bg-indigo-50' : ''}`}
                      onClick={() => toggleRow(e.id)}
                      data-testid={`audit-row-${e.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {formatTimestamp(e.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {e.actor_email || <span className="text-slate-400 italic">system</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(e.action)}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {e.entity_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {String(e.entity_id).slice(-8)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 max-w-xs truncate">
                        {e.changed_fields && Object.keys(e.changed_fields).length ? (
                          <span className="text-indigo-600">
                            {Object.keys(e.changed_fields).length} field{Object.keys(e.changed_fields).length > 1 ? 's' : ''} changed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {e.ip || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-400 text-xs">
                          {expandedRow === e.id ? '▼' : '▶'}
                        </span>
                      </td>
                    </tr>
                    {expandedRow === e.id && e.changed_fields && Object.keys(e.changed_fields).length > 0 && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan="8" className="px-4 py-3">
                          <div className="bg-white rounded-lg p-4 border border-indigo-100">
                            <div className="text-xs font-medium text-slate-600 mb-2">Changes Details:</div>
                            <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(e.changed_fields, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
