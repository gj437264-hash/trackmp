// /opt/trackmp/frontend/src/pages/dashboard/VoiceModerationPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import {
  MessageCircle,
  CornerDownRight,
  Flag,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Inbox,
  ShieldAlert,
  Ban,
  Plus,
  Clock,
  User,
  FileText,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// ============================================
// UTILITY FUNCTIONS
// ============================================
const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const flattenItems = (discussions) => {
  const items = [];
  for (const d of discussions) {
    for (const c of d.comments) {
      items.push({ kind: "comment", articleTitle: d.articleTitle, ...c });
      for (const r of c.replies || []) {
        items.push({ 
          kind: "reply", 
          articleTitle: d.articleTitle, 
          parent_id: c.id, 
          ...r 
        });
      }
    }
  }
  return items;
};

// ============================================
// CONFIRM DELETE MODAL
// ============================================
const ConfirmDeleteModal = ({ item, onCancel, onConfirm }) => {
  if (!item) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-100">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Delete permanently?</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <FileText size={12} />
            <span>{item.articleTitle}</span>
            <span className="w-px h-3 bg-slate-300" />
            <span className="capitalize">{item.kind}</span>
          </div>
          <p className="text-sm text-slate-700 font-medium">"{item.body}"</p>
        </div>
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(item)}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODERATION ROW
// ============================================
const ModerationRow = React.memo(({ 
  item, 
  onHideToggle, 
  onDelete, 
  onDismissReports, 
  onBlockIp, 
  isIpBlocked 
}) => {
  const [reportsOpen, setReportsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isReply = item.kind === "reply";
  
  const getSeverity = (reportCount) => {
    if (reportCount >= 5) return "high";
    if (reportCount >= 3) return "medium";
    if (reportCount >= 1) return "low";
    return "none";
  };
  
  const severity = getSeverity(item.report_count);
  
  const severityColors = {
    high: "border-red-400 bg-red-50/30",
    medium: "border-amber-400 bg-amber-50/30",
    low: "border-amber-200 bg-amber-50/20",
    none: "border-slate-200 bg-white",
  };

  return (
    <div
      className={`border rounded-xl transition-all duration-200 ${
        severityColors[severity]
      } ${item.hidden ? "opacity-60" : ""} ${isReply ? "ml-8 border-l-4 border-l-slate-300" : ""} ${
        isHovered ? "shadow-md" : "shadow-sm"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isReply && <CornerDownRight size={14} className="text-slate-400 flex-shrink-0" />}
              
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {item.anon_label}
                </span>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {item.ip}
                </span>
              </div>
              
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {timeAgo(item.date)}
              </span>
              
              <span className="text-xs text-slate-500 truncate max-w-[200px] flex items-center gap-1">
                <FileText size={12} className="flex-shrink-0" />
                {item.articleTitle}
              </span>
              
              {item.hidden && (
                <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Hidden
                </span>
              )}
              
              {item.report_count > 0 && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Flag size={10} /> 
                  {item.report_count} report{item.report_count > 1 ? "s" : ""}
                </span>
              )}
            </div>
            
            {/* Content */}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {item.body}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onHideToggle(item)}
              title={item.hidden ? "Unhide" : "Hide"}
              className={`p-1.5 rounded-lg transition-colors ${
                item.hidden 
                  ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            
            <button
              onClick={() => onBlockIp(item.ip)}
              disabled={isIpBlocked}
              title={isIpBlocked ? "IP already blocked" : "Block this IP"}
              className={`p-1.5 rounded-lg transition-colors ${
                isIpBlocked
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <Ban size={15} />
            </button>
            
            <button
              onClick={() => onDelete(item)}
              title="Delete permanently"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Reports */}
        {item.report_count > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200/60">
            <button
              onClick={() => setReportsOpen((v) => !v)}
              className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
            >
              {reportsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              View report reasons
            </button>
            
            {reportsOpen && (
              <div className="mt-2 space-y-1.5">
                {item.reports.map((r, i) => (
                  <div
                    key={i}
                    className="bg-white/60 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-600 flex items-center justify-between"
                  >
                    <span>{r.reason}</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(r.date)}
                    </span>
                  </div>
                ))}
                
                <button
                  onClick={() => onDismissReports(item)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1 transition-colors"
                >
                  <Check size={14} /> Dismiss all reports
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ModerationRow.displayName = 'ModerationRow';

// ============================================
// BLOCKED IPs PANEL
// ============================================
const BlockedIpsPanel = ({ blockedIps, onAdd, onRemove }) => {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ipInputRef = useRef(null);

  const handleSubmit = async () => {
    const trimmed = ip.trim();
    if (!trimmed || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAdd(trimmed, reason.trim());
      setIp("");
      setReason("");
      ipInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
          <div className="p-1.5 bg-red-50 rounded-lg">
            <Ban size={16} className="text-red-500" />
          </div>
          <span>Blocked IPs</span>
          <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {blockedIps.length}
          </span>
        </div>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <input
                ref={ipInputRef}
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="IP address (e.g. 203.0.113.4)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                disabled={isSubmitting}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!ip.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm hover:shadow-md flex-shrink-0"
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Block
            </button>
          </div>

          {blockedIps.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No IPs currently blocked
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {blockedIps.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="font-mono font-semibold text-slate-700">{b.ip}</span>
                    {b.reason && (
                      <>
                        <span className="w-px h-4 bg-slate-300 flex-shrink-0" />
                        <span className="text-slate-500 truncate">{b.reason}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(b.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// STAT CARD
// ============================================
const StatCard = ({ icon: Icon, label, value, color = "emerald", subtitle }) => {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-50 text-slate-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex-1 min-w-[100px] shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE
// ============================================
export default function VoiceModerationPage() {
  const [discussions, setDiscussions] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("reported");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadDiscussions = useCallback(async () => {
    try {
      const response = await api.get("/admin/voice/discussions");
      setDiscussions(response.data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load discussions");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadBlockedIps = useCallback(async () => {
    try {
      const response = await api.get("/admin/voice/blocked-ips");
      setBlockedIps(response.data);
    } catch (e) {
      // Silently fail for blocked IPs
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadDiscussions(), loadBlockedIps()]);
  }, [loadDiscussions, loadBlockedIps]);

  useEffect(() => {
    refreshData();
  }, []);

  const allItems = useMemo(() => flattenItems(discussions), [discussions]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    
    if (tab === "reported") {
      items = items.filter((i) => i.report_count > 0);
    } else if (tab === "hidden") {
      items = items.filter((i) => i.hidden);
    }
    
    if (searchQuery) {
      const term = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.body.toLowerCase().includes(term) ||
          i.articleTitle.toLowerCase().includes(term) ||
          i.anon_label.toLowerCase().includes(term)
      );
    }
    
    return [...items].sort((a, b) => {
      if (b.report_count !== a.report_count) {
        return b.report_count - a.report_count;
      }
      return new Date(b.date) - new Date(a.date);
    });
  }, [allItems, tab, searchQuery]);

  const stats = useMemo(() => ({
    comments: allItems.filter((i) => i.kind === "comment").length,
    replies: allItems.filter((i) => i.kind === "reply").length,
    reported: allItems.filter((i) => i.report_count > 0).length,
    hidden: allItems.filter((i) => i.hidden).length,
    reportedHigh: allItems.filter((i) => i.report_count >= 3).length,
  }), [allItems]);

  // ---- Actions ----
  const handleHideToggle = useCallback(async (item) => {
    try {
      await api.patch(`/admin/voice/comments/${item.id}`, { hidden: !item.hidden });
      await loadDiscussions();
      showSuccess(`Comment ${!item.hidden ? 'hidden' : 'unhidden'} successfully`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to update comment");
    }
  }, [loadDiscussions]);

  const handleDelete = useCallback(async (item) => {
    try {
      await api.delete(`/admin/voice/comments/${item.id}`);
      setDeleteTarget(null);
      await loadDiscussions();
      showSuccess("Comment deleted permanently");
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to delete comment");
    }
  }, [loadDiscussions]);

  const handleDismissReports = useCallback(async (item) => {
    try {
      await api.delete(`/admin/voice/comments/${item.id}/reports`);
      await loadDiscussions();
      showSuccess("Reports dismissed");
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to dismiss reports");
    }
  }, [loadDiscussions]);

  const handleAddBlockedIp = useCallback(async (ip, reason) => {
    try {
      await api.post("/admin/voice/blocked-ips", { ip, reason });
      await loadBlockedIps();
      showSuccess(`IP ${ip} blocked`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to block IP");
    }
  }, [loadBlockedIps]);

  const handleRemoveBlockedIp = useCallback(async (id) => {
    try {
      await api.delete(`/admin/voice/blocked-ips/${id}`);
      await loadBlockedIps();
      showSuccess("IP unblocked");
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to unblock IP");
    }
  }, [loadBlockedIps]);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const tabs = [
    { key: "reported", label: "Reported", icon: Flag, count: stats.reported },
    { key: "all", label: "All", icon: Inbox, count: allItems.length },
    { key: "hidden", label: "Hidden", icon: EyeOff, count: stats.hidden },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
            <ShieldAlert size={14} />
            <span>Moderation Dashboard</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Voice Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review and moderate user comments across all articles
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              <span className="text-sm font-medium hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <Check size={16} />
              {successMessage}
            </div>
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="text-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard icon={MessageCircle} label="Comments" value={stats.comments} color="blue" />
          <StatCard icon={CornerDownRight} label="Replies" value={stats.replies} color="slate" />
          <StatCard icon={Flag} label="Reported" value={stats.reported} color="amber" />
          <StatCard icon={EyeOff} label="Hidden" value={stats.hidden} color="slate" />
          <StatCard 
            icon={AlertTriangle} 
            label="High Priority" 
            value={stats.reportedHigh} 
            color="red"
            subtitle="3+ reports"
          />
        </div>

        {/* Blocked IPs Panel */}
        <BlockedIpsPanel 
          blockedIps={blockedIps} 
          onAdd={handleAddBlockedIp} 
          onRemove={handleRemoveBlockedIp} 
        />

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                  tab === t.key 
                    ? "bg-white text-emerald-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                <t.icon size={14} />
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tab === t.key ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-500"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full sm:w-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content, article, or user..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={40} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-sm text-slate-400">Loading comments...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 border border-slate-200 rounded-2xl">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No comments in this view</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? "Try adjusting your search terms" : "Switch tabs to see more content"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ModerationRow
                key={`${item.id}-${item.kind}`}
                item={item}
                onHideToggle={handleHideToggle}
                onDelete={setDeleteTarget}
                onDismissReports={handleDismissReports}
                onBlockIp={handleAddBlockedIp}
                isIpBlocked={blockedIps.some((b) => b.ip === item.ip)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        item={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
