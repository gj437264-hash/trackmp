import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Search, Mail, FilePlus2, Clock, Download, GitMerge } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { v: "", l: "All" },
  { v: "open", l: "Open" },
  { v: "pending_review", l: "Pending Review" },
  { v: "waiting_for_user", l: "Waiting for User" },
  { v: "approved", l: "Approved" },
  { v: "rejected", l: "Rejected" },
  { v: "solved", l: "Solved" },
  { v: "closed", l: "Closed" },
  { v: "spam", l: "Spam" },
  { v: "archived", l: "Archived" },
];

const STATUS_COLORS = {
  open: "bg-emerald-50 text-emerald-700",
  pending_review: "bg-amber-50 text-amber-700",
  waiting_for_user: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  solved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
  spam: "bg-rose-50 text-rose-700",
  archived: "bg-slate-100 text-slate-400",
};

function StatCard({ label, value }) {
  return (
    <div className="soft-card p-4">
      <div className="font-display font-black text-2xl text-slate-800">{value ?? "—"}</div>
      <div className="soft-label mt-1 mb-0">{label}</div>
    </div>
  );
}

export default function CommunityDesk() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [merging, setMerging] = useState(false);

  const toggleSelect = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const mergeSelected = async () => {
    if (selected.length < 2) { toast.error("Select at least 2 tickets to merge."); return; }
    const [master, ...rest] = selected;
    if (!window.confirm(`Merge ${rest.length} ticket(s) into the first selected ticket? This cannot be undone.`)) return;
    setMerging(true);
    try {
      await api.post(`/admin/tickets/${master}/merge`, { merge_ticket_ids: rest });
      toast.success("Tickets merged.");
      setSelected([]);
      const params = {};
      if (status) params.status = status;
      if (type) params.ticket_type = type;
      if (q) params.q = q;
      const { data } = await api.get("/admin/tickets", { params });
      setTickets(data.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const exportCsv = async () => {
    try {
      const params = {};
      if (status) params.status = status;
      if (type) params.ticket_type = type;
      const res = await api.get("/admin/tickets/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "tickets_export.csv";
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  useEffect(() => {
    api.get("/admin/tickets/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (type) params.ticket_type = type;
    if (q) params.q = q;
    const t = setTimeout(() => {
      api.get("/admin/tickets", { params })
        .then((r) => setTickets(r.data.items || []))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [status, type, q]);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="soft-label mb-0">/// Community</div>
        <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Community Desk</h1>

        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Open Tickets" value={stats.open_tickets} />
            <StatCard label="Pending Review" value={stats.pending_review} />
            <StatCard label="Approved Today" value={stats.approved_today} />
            <StatCard label="Closed Today" value={stats.closed_today} />
            <StatCard label="Contact Requests" value={stats.total_contact_requests} />
            <StatCard label="Update Requests" value={stats.total_update_requests} />
            <StatCard label="New Contributors" value={stats.new_contributors_today} />
            <StatCard label="Repeat Contributors" value={stats.repeat_contributors} />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Status sidebar */}
          <div className="soft-card p-2 h-fit">
            {STATUSES.map((s) => (
              <button
                key={s.v}
                onClick={() => setStatus(s.v)}
                data-testid={`status-filter-${s.v || "all"}`}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors duration-200 ${
                  status === s.v ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>

          {/* List */}
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ticket #, subject..."
                  className="soft-input pl-10"
                  data-testid="ticket-search"
                />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value)} className="soft-input w-auto" data-testid="type-filter">
                <option value="">All Types</option>
                <option value="contact">Contact</option>
                <option value="update_request">Update Request</option>
              </select>
              <button onClick={exportCsv} className="btn-soft-secondary text-xs px-4 py-2" data-testid="export-tickets-btn">
                <Download size={14} className="mr-1" /> Export
              </button>
              {selected.length >= 2 && (
                <button onClick={mergeSelected} disabled={merging} className="btn-soft-primary text-xs px-4 py-2 disabled:opacity-50" data-testid="merge-tickets-btn">
                  <GitMerge size={14} className="mr-1" /> {merging ? "Merging…" : `Merge ${selected.length} Selected`}
                </button>
              )}
            </div>
            <div className="soft-card overflow-hidden p-0">
              {loading ? (
                <div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</div>
              ) : tickets.length === 0 ? (
                <div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No tickets match these filters</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(t.id); }}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`select-ticket-${t.id}`}
                      />
                      <Link to={`/dashboard/community/${t.id}`} className="flex items-center gap-4 flex-1 min-w-0" data-testid={`ticket-row-${t.id}`}>
                      <div className="shrink-0">
                        {t.type === "contact" ? <Mail size={18} className="text-slate-400" /> : <FilePlus2 size={18} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-600">{t.ticket_number}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || "bg-slate-100 text-slate-500"}`}>
                            {t.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="font-bold text-sm truncate mt-1 text-slate-800">{t.subject}</div>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
