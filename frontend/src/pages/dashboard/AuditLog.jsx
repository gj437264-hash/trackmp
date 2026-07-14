import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { RefreshCw } from "lucide-react";

const ENTITY_TYPES = ["", "politician", "user", "country", "state", "city", "constituency", "relative", "wealth", "signup_request"];

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor: "", entity_type: "", action: "", from_date: "", to_date: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get("/admin/audit", { params });
      setItems(data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="soft-label mb-0">/// Immutable Record</div>
        <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Audit Log</h1>

        <div className="mt-6 soft-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="soft-label text-[10px] mb-1">Actor Email</label>
              <input value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })} className="soft-input" data-testid="filter-actor" />
            </div>
            <div>
              <label className="soft-label text-[10px] mb-1">Entity Type</label>
              <select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="soft-input" data-testid="filter-entity">
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || "Any"}</option>)}
              </select>
            </div>
            <div>
              <label className="soft-label text-[10px] mb-1">Action Contains</label>
              <input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="soft-input" data-testid="filter-action" placeholder="e.g. created" />
            </div>
            <div>
              <label className="soft-label text-[10px] mb-1">From</label>
              <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} className="soft-input" />
            </div>
            <div>
              <label className="soft-label text-[10px] mb-1">To</label>
              <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} className="soft-input" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={load} className="btn-soft-primary text-xs px-4 py-2" data-testid="apply-filters"><RefreshCw size={12} className="mr-1" /> Apply</button>
            <button onClick={() => { setFilters({ actor: "", entity_type: "", action: "", from_date: "", to_date: "" }); setTimeout(load, 0); }} className="btn-soft-secondary text-xs px-4 py-2">Clear</button>
          </div>
        </div>

        <div className="mt-6 soft-table-wrap overflow-x-auto">
          <table className="w-full border-collapse soft-table">
            <thead>
              <tr>{["Timestamp", "Actor", "Action", "Entity", "Entity ID", "Changes", "IP"].map((h) => (
                <th key={h}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No events</td></tr>}
              {items.map((e) => (
                <tr key={e.id} className="align-top" data-testid={`audit-row-${e.id}`}>
                  <td className="font-mono text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="font-mono text-xs">{e.actor_email || <span className="soft-label mb-0 inline">system</span>}</td>
                  <td><span className="font-mono text-xs bg-slate-800 text-white px-2 py-1 rounded-full uppercase">{e.action}</span></td>
                  <td className="font-mono text-xs">{e.entity_type}</td>
                  <td className="font-mono text-xs">{String(e.entity_id).slice(-8)}</td>
                  <td className="font-mono text-[11px] max-w-md truncate" title={JSON.stringify(e.changed_fields)}>
                    {e.changed_fields && Object.keys(e.changed_fields).length ? JSON.stringify(e.changed_fields) : "—"}
                  </td>
                  <td className="font-mono text-xs">{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
