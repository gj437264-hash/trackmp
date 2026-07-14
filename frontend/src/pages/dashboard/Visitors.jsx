import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Search, CheckCircle2, XCircle, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const deleteVisitor = async (v) => {
    if (!window.confirm(`Permanently delete ${v.first_name} ${v.last_name} (${v.email})? This cannot be undone.`)) return;
    setDeletingId(v.id);
    try {
      await api.delete(`/admin/visitors/${v.id}`);
      toast.success("Contributor deleted.");
      setVisitors((vs) => vs.filter((x) => x.id !== v.id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (q) params.q = q;
    const t = setTimeout(() => {
      api.get("/admin/visitors", { params })
        .then((r) => setVisitors(r.data.items || []))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, sort]);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="soft-label mb-0">/// Community</div>
        <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Contributors</h1>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email..."
              className="soft-input pl-10"
              data-testid="visitor-search"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="soft-input w-auto" data-testid="visitor-sort">
            <option value="recent">Most Recent</option>
            <option value="most_active">Most Active</option>
          </select>
        </div>

        <div className="mt-6 soft-table-wrap overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</div>
          ) : visitors.length === 0 ? (
            <div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No contributors yet</div>
          ) : (
            <table className="w-full border-collapse soft-table">
              <thead>
                <tr>
                  {["Name", "Email", "Country", "Tickets", "Approved", "Rejected", "Updates", "Additions", "Last Contact", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} data-testid={`visitor-row-${v.id}`}>
                    <td className="font-bold">
                      <Link to={`/dashboard/visitors/${v.id}`} className="hover:text-emerald-600 transition-colors">
                        {v.first_name} {v.last_name}
                      </Link>
                    </td>
                    <td className="text-sm text-slate-600">{v.email}</td>
                    <td className="font-mono text-xs">{v.country_code || "—"}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Ticket size={12} /> {v.ticket_count}
                      </span>
                    </td>
                    <td className="text-emerald-600 text-sm font-bold">{v.approved_count}</td>
                    <td className="text-rose-600 text-sm font-bold">{v.rejected_count}</td>
                    <td className="text-sm">{v.politician_updates_count}</td>
                    <td className="text-sm">{v.politicians_added_count}</td>
                    <td className="text-xs text-slate-400">{new Date(v.last_contact_date).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => deleteVisitor(v)}
                        disabled={deletingId === v.id}
                        className="btn-soft-danger px-3 py-1.5 disabled:opacity-50"
                        data-testid={`delete-visitor-${v.id}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
