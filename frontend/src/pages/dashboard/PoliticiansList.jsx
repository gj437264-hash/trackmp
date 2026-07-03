import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Trash, Search, ExternalLink } from "lucide-react";

export default function PoliticiansList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/politicians", { params: q ? { q } : {} });
      setItems(data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const del = async (p) => {
    if (!window.confirm(`Move "${p.name}" to Trash?`)) return;
    try {
      await api.delete(`/politicians/${p.id}`);
      toast.success("Moved to Trash.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow">/// Records</div>
            <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">Politicians</h1>
          </div>
          <button
            data-testid="new-politician-btn"
            onClick={() => nav("/dashboard/politicians/new")}
            className="brutal-btn-primary"
          >
            <Plus size={16} className="mr-2" /> New Politician
          </button>
        </div>

        <div className="mt-6 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input data-testid="politician-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search politicians…" className="brutal-input pl-10" />
        </div>

        <div className="mt-6 border-2 border-black bg-white overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surfaceAlt">
              <tr>{["Name", "Party", "Country", "Role", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs font-bold uppercase p-3 border-b-2 border-black tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-10 label-eyebrow text-center">Loading…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={5} className="p-10 label-eyebrow text-center">No politicians yet</td></tr>}
              {items.map((p) => (
                <tr key={p.id} className="border-b border-neutral-300" data-testid={`politician-row-${p.id}`}>
                  <td className="p-3 font-bold">
                    <Link to={`/dashboard/politicians/${p.id}`} className="hover:text-klein">
                      {p.name}
                    </Link>
                  </td>
                  <td className="p-3">{p.party || "—"}</td>
                  <td className="p-3 font-mono">{p.country_code}</td>
                  <td className="p-3">{p.role || "—"}</td>
                  <td className="p-3 flex gap-2">
                    <Link to={`/politicians/${p.id}`} className="brutal-btn-secondary text-xs px-3 py-1.5" title="View public page">
                      <ExternalLink size={12} />
                    </Link>
                    <button data-testid={`edit-politician-${p.id}`} onClick={() => nav(`/dashboard/politicians/${p.id}`)} className="brutal-btn-secondary text-xs px-3 py-1.5">
                      <Edit size={12} />
                    </button>
                    <button data-testid={`delete-politician-${p.id}`} onClick={() => del(p)} className="brutal-btn-danger text-xs px-3 py-1.5">
                      <Trash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
