import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { 
  Search, Mail, FilePlus2, Clock, Download, GitMerge, 
  Filter, ChevronDown, ChevronRight, RefreshCw, 
  TrendingUp, Users, CheckCircle, AlertCircle,
  ArrowUpDown, X
} from "lucide-react";
import { toast } from "sonner";
import { debounce } from "lodash";

// Constants with proper typing
const STATUSES = [
  { value: "", label: "All", icon: null },
  { value: "open", label: "Open", icon: "🔴" },
  { value: "pending_review", label: "Pending Review", icon: "🟡" },
  { value: "waiting_for_user", label: "Waiting for User", icon: "🟠" },
  { value: "approved", label: "Approved", icon: "✅" },
  { value: "rejected", label: "Rejected", icon: "❌" },
  { value: "solved", label: "Solved", icon: "✨" },
  { value: "closed", label: "Closed", icon: "🔵" },
  { value: "spam", label: "Spam", icon: "🚫" },
  { value: "archived", label: "Archived", icon: "📦" },
];

const STATUS_COLORS = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  waiting_for_user: "bg-orange-50 text-orange-700 border-orange-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  solved: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-slate-50 text-slate-600 border-slate-200",
  spam: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
};

const TICKET_TYPES = [
  { value: "", label: "All Types" },
  { value: "contact", label: "Contact" },
  { value: "update_request", label: "Update Request" },
];

// Memoized StatCard component
const StatCard = React.memo(({ label, value, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {value ?? "—"}
            </span>
            {trend && (
              <span className={`text-xs font-semibold ${
                trend > 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
            <Icon className="w-5 h-5 text-emerald-600" />
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

// Memoized TicketRow component
const TicketRow = React.memo(({ ticket, isSelected, onSelect, onToggleSelect }) => {
  const statusColor = STATUS_COLORS[ticket.status] || "bg-slate-50 text-slate-500 border-slate-200";
  
  return (
    <div 
      className={`flex items-start gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-150 group ${
        isSelected ? "bg-blue-50/30" : ""
      }`}
    >
      <div className="flex items-start gap-3 pt-0.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(ticket.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer"
          data-testid={`select-ticket-${ticket.id}`}
        />
      </div>
      
      <Link 
        to={`/dashboard/community/${ticket.id}`} 
        className="flex-1 min-w-0"
        data-testid={`ticket-row-${ticket.id}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {ticket.ticket_number}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                {ticket.status?.replace(/_/g, " ") || "Unknown"}
              </span>
              {ticket.type === "contact" ? (
                <Mail size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              ) : (
                <FilePlus2 size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              )}
            </div>
            
            <div className="mt-1.5">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {ticket.subject || "No subject"}
              </h3>
              {ticket.user_email && (
                <p className="text-xs text-slate-500 mt-0.5">
                  By: {ticket.user_email}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={12} className="shrink-0" />
              <span className="whitespace-nowrap">
                {new Date(ticket.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
          </div>
        </div>
      </Link>
    </div>
  );
});

TicketRow.displayName = 'TicketRow';

export default function CommunityDesk() {
  // State management
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [merging, setMerging] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/admin/tickets/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Fetch tickets with sanitized parameters
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(status && { status }),
        ...(type && { ticket_type: type }),
        ...(searchQuery && { q: searchQuery.trim() }),
        sort_field: sortField,
        sort_direction: sortDirection,
      };
      
      const response = await api.get("/admin/tickets", { params });
      setTickets(response.data.items || []);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [status, type, searchQuery, sortField, sortDirection]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handlers with proper error handling
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleStatusChange = useCallback((newStatus) => {
    setStatus(newStatus);
    setSelected([]);
  }, []);

  const handleTypeChange = useCallback((e) => {
    setType(e.target.value);
    setSelected([]);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selected.length === tickets.length) {
      setSelected([]);
    } else {
      setSelected(tickets.map(t => t.id));
    }
  }, [selected, tickets]);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  // Merge tickets with validation
  const mergeSelected = useCallback(async () => {
    if (selected.length < 2) {
      toast.error("Select at least 2 tickets to merge.");
      return;
    }

    if (!window.confirm(`Merge ${selected.length - 1} ticket(s) into the first selected ticket? This action cannot be undone.`)) {
      return;
    }

    setMerging(true);
    try {
      const [master, ...rest] = selected;
      await api.post(`/admin/tickets/${master}/merge`, { 
        merge_ticket_ids: rest 
      });
      
      toast.success(`Successfully merged ${rest.length} tickets`);
      setSelected([]);
      await fetchTickets();
    } catch (error) {
      const errorMessage = error?.response?.data?.detail || "Merge failed";
      toast.error(errorMessage);
    } finally {
      setMerging(false);
    }
  }, [selected, fetchTickets]);

  // Export tickets with sanitized params
  const exportCsv = useCallback(async () => {
    try {
      const params = {
        ...(status && { status }),
        ...(type && { ticket_type: type }),
        ...(searchQuery && { q: searchQuery.trim() })
      };
      
      const response = await api.get("/admin/tickets/export", { 
        params, 
        responseType: "blob" 
      });
      
      // Create and download file securely
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Export completed successfully");
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  }, [status, type, searchQuery]);

  const refreshData = useCallback(() => {
    fetchTickets();
    toast.success("Refreshed tickets");
  }, [fetchTickets]);

  // Sort handler
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  // Memoized stats cards
  const statsCards = useMemo(() => {
    if (!stats) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Open Tickets" 
          value={stats.open_tickets} 
          icon={AlertCircle}
          trend={stats.open_trend}
        />
        <StatCard 
          label="Pending Review" 
          value={stats.pending_review} 
          icon={Clock}
          trend={stats.pending_trend}
        />
        <StatCard 
          label="Approved Today" 
          value={stats.approved_today} 
          icon={CheckCircle}
        />
        <StatCard 
          label="Closed Today" 
          value={stats.closed_today} 
          icon={TrendingUp}
        />
        <StatCard 
          label="New Contributors" 
          value={stats.new_contributors_today} 
          icon={Users}
        />
        <StatCard 
          label="Repeat Contributors" 
          value={stats.repeat_contributors} 
          icon={Users}
        />
        <StatCard 
          label="Contact Requests" 
          value={stats.total_contact_requests} 
          icon={Mail}
        />
        <StatCard 
          label="Update Requests" 
          value={stats.total_update_requests} 
          icon={FilePlus2}
        />
      </div>
    );
  }, [stats]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-[0.2em]">
                Support Management
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Community Desk
            </h1>
            <p className="mt-1.5 text-slate-500">
              Manage and resolve community tickets efficiently
            </p>
          </div>
          
          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw size={16} className={`${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button 
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all duration-200"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {statsCards && (
          <div className="mt-8">
            {statsCards}
          </div>
        )}

        {/* Main Content */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar - Status Filters */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={16} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Filter by Status
                </h3>
              </div>
              <div className="space-y-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    data-testid={`status-filter-${s.value || "all"}`}
                    className={`
                      w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      flex items-center gap-2
                      ${status === s.value 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20" 
                        : "text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    {s.icon && <span className="text-base">{s.icon}</span>}
                    <span>{s.label}</span>
                    {status === s.value && (
                      <ChevronDown size={14} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  onChange={handleSearchChange}
                  placeholder="Search by ticket #, subject, or user..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                  data-testid="ticket-search"
                />
              </div>
              
              <select 
                value={type} 
                onChange={handleTypeChange} 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                data-testid="type-filter"
              >
                {TICKET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Selection Actions */}
              {selected.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                  <span className="text-sm font-medium text-blue-700">
                    {selected.length} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X size={14} className="text-blue-600" />
                  </button>
                </div>
              )}

              {selected.length >= 2 && (
                <button
                  onClick={mergeSelected}
                  disabled={merging}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                  data-testid="merge-tickets-btn"
                >
                  <GitMerge size={16} />
                  {merging ? "Merging..." : `Merge ${selected.length}`}
                </button>
              )}
            </div>

            {/* Tickets Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Table Header */}
              <div className="flex items-center gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.length === tickets.length && tickets.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer"
                  />
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <button
                    onClick={() => handleSort("ticket_number")}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                  >
                    Ticket
                    <ArrowUpDown size={12} />
                  </button>
                  <button
                    onClick={() => handleSort("created_at")}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors ml-auto"
                  >
                    Date
                    <ArrowUpDown size={12} />
                  </button>
                </div>
              </div>

              {/* Tickets List */}
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400 font-medium">Loading tickets...</span>
                    </div>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                      <Search size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600">No tickets found</h3>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      isSelected={selected.includes(ticket.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Footer - Total count */}
            {!loading && tickets.length > 0 && (
              <div className="mt-4 text-sm text-slate-500 text-center">
                Showing {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
