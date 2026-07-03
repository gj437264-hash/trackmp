import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { RotateCcw, Trash2, RefreshCw } from "lucide-react";

const ENTITY_TYPES = ["", "politician", "user", "country", "state", "city", "constituency", "relative", "wealth"];
const NAME_FIELDS = {
  politician: "name", user: "email", country: "name", state: "name",
  city: "name", constituency: "name", relative: "name", wealth: "year",
};

export default function Trash() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/trash", { params: type ? { entity_type: type } : {} });
      setItems(data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  const restore = async (it) => {
    if (!window.confirm(`Restore this ${it.entity_type}?`)) return;
    try { await api.post("/admin/trash/restore", { entity_type: it.entity_type, entity_id: it.entity_id }); toast.success("Restored."); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const purge = async (it) => {
    const actualName = String(it.record[NAME_FIELDS[it.entity_type]] ?? "");
    const typed = window.prompt(
      `PERMANENT DELETE — type the exact ${NAME_FIELDS[it.entity_type]} to confirm:\n\n${actualName}`
    );
    if (typed == null) return;
    try {
      await api.post("/admin/trash/purge", {
        entity_type: it.entity_type,
        entity_id: it.entity_id,
        confirm_name: typed,
      });
      toast.success("Permanently purged.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow">/// Recoverable Records</div>
            <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">Trash</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="brutal-input text-sm" data-testid="trash-type">
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || "All types"}</option>)}
            </select>
            <button onClick={load} className="brutal-btn-secondary text-xs"><RefreshCw size={12} /></button>
          </div>
        </div>

        <div className="mt-6 border-2 border-black bg-white overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surfaceAlt">
              <tr>{["Type", "Name / Key", "Deleted At", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs font-bold uppercase p-3 border-b-2 border-black tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="p-10 label-eyebrow text-center">Loading…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={4} className="p-10 label-eyebrow text-center">Trash is empty</td></tr>}
              {items.map((it) => {
                const displayName = String(it.record[NAME_FIELDS[it.entity_type]] ?? it.entity_id);
                return (
                  <tr key={it.entity_id} className="border-b border-neutral-300" data-testid={`trash-row-${it.entity_id}`}>
                    <td className="p-3 font-mono text-xs uppercase">{it.entity_type}</td>
                    <td className="p-3 font-bold">{displayName}</td>
                    <td className="p-3 font-mono text-xs">{it.record.deleted_at ? new Date(it.record.deleted_at).toLocaleString() : "—"}</td>
                    <td className="p-3 flex gap-2">
                      <button data-testid={`restore-${it.entity_id}`} onClick={() => restore(it)} className="brutal-btn-secondary text-xs px-3 py-1.5">
                        <RotateCcw size={12} className="mr-1" /> Restore
                      </button>
                      <button data-testid={`purge-${it.entity_id}`} onClick={() => purge(it)} className="brutal-btn-danger text-xs px-3 py-1.5">
                        <Trash2 size={12} className="mr-1" /> Purge
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
