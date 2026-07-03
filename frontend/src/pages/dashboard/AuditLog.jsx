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
        <div className="label-eyebrow">/// Immutable Record</div>
        <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">Audit Log</h1>

        <div className="mt-6 brutal-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="label-eyebrow block mb-1 text-[10px]">Actor Email</label>
              <input value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })} className="brutal-input" data-testid="filter-actor" />
            </div>
            <div>
              <label className="label-eyebrow block mb-1 text-[10px]">Entity Type</label>
              <select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="brutal-input" data-testid="filter-entity">
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || "Any"}</option>)}
              </select>
            </div>
            <div>
              <label className="label-eyebrow block mb-1 text-[10px]">Action Contains</label>
              <input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="brutal-input" data-testid="filter-action" placeholder="e.g. created" />
            </div>
            <div>
              <label className="label-eyebrow block mb-1 text-[10px]">From</label>
              <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} className="brutal-input" />
            </div>
            <div>
              <label className="label-eyebrow block mb-1 text-[10px]">To</label>
              <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} className="brutal-input" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={load} className="brutal-btn-primary text-xs" data-testid="apply-filters"><RefreshCw size={12} className="mr-1" /> Apply</button>
            <button onClick={() => { setFilters({ actor: "", entity_type: "", action: "", from_date: "", to_date: "" }); setTimeout(load, 0); }} className="brutal-btn-secondary text-xs">Clear</button>
          </div>
        </div>

        <div className="mt-6 border-2 border-black bg-white overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surfaceAlt">
              <tr>{["Timestamp", "Actor", "Action", "Entity", "Entity ID", "Changes", "IP"].map((h) => (
                <th key={h} className="text-left text-xs font-bold uppercase p-3 border-b-2 border-black tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-10 label-eyebrow text-center">Loading…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={7} className="p-10 label-eyebrow text-center">No events</td></tr>}
              {items.map((e) => (
                <tr key={e.id} className="border-b border-neutral-300 align-top" data-testid={`audit-row-${e.id}`}>
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{e.actor_email || <span className="label-eyebrow">system</span>}</td>
                  <td className="p-3"><span className="font-mono text-xs bg-black text-white px-2 py-1 uppercase">{e.action}</span></td>
                  <td className="p-3 font-mono text-xs">{e.entity_type}</td>
                  <td className="p-3 font-mono text-xs">{String(e.entity_id).slice(-8)}</td>
                  <td className="p-3 font-mono text-[11px] max-w-md truncate" title={JSON.stringify(e.changed_fields)}>
                    {e.changed_fields && Object.keys(e.changed_fields).length ? JSON.stringify(e.changed_fields) : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
