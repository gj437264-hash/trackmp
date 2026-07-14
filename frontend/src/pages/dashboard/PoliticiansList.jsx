import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Trash, Search, ExternalLink, Upload, Download, FileDown } from "lucide-react";

export default function PoliticiansList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);
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

  const downloadFile = async (path, filename) => {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/politicians/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} politician${data.created !== 1 ? "s" : ""}.`);
        load();
      } else {
        toast.info("Import finished — nothing new was created.");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="soft-label mb-0">/// Records</div>
            <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Politicians</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="download-template-btn"
              onClick={() => downloadFile("/politicians/import-template", "politician_import_template.csv")}
              className="btn-soft-secondary text-xs px-4 py-2"
            >
              <FileDown size={14} className="mr-2" /> Template
            </button>
            <button
              data-testid="export-csv-btn"
              onClick={() => downloadFile("/politicians/export", "politicians_export.csv")}
              className="btn-soft-secondary text-xs px-4 py-2"
            >
              <Download size={14} className="mr-2" /> Export CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
              className="hidden"
              data-testid="import-csv-file"
            />
            <button
              data-testid="import-csv-btn"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="btn-soft-secondary text-xs px-4 py-2 disabled:opacity-50"
            >
              <Upload size={14} className="mr-2" /> {importing ? "Importing…" : "Import CSV"}
            </button>
            <button
              data-testid="new-politician-btn"
              onClick={() => nav("/dashboard/politicians/new")}
              className="btn-soft-primary"
            >
              <Plus size={16} className="mr-2" /> New Politician
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input data-testid="politician-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search politicians…" className="soft-input pl-10" />
        </div>

        {importResult && (
          <div className="mt-6 soft-card p-5" data-testid="import-result-summary">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800">Import Results</h3>
              <button onClick={() => setImportResult(null)} className="text-xs font-bold uppercase text-slate-400 hover:text-slate-700 transition-colors">
                Dismiss
              </button>
            </div>
            <div className="mt-3 flex gap-6 text-sm font-mono">
              <span className="text-emerald-600 font-bold">{importResult.created} created</span>
              <span className="text-amber-600 font-bold">{(importResult.skipped || []).length} skipped</span>
              <span className="text-rose-600 font-bold">{(importResult.errors || []).length} errors</span>
            </div>
            {(importResult.skipped || []).length > 0 && (
              <div className="mt-4">
                <div className="soft-label mb-1">Skipped</div>
                <ul className="text-sm space-y-1">
                  {importResult.skipped.map((s, i) => (
                    <li key={i} className="text-slate-500">Row {s.row}: {s.name} — {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {(importResult.errors || []).length > 0 && (
              <div className="mt-4">
                <div className="soft-label mb-1">Errors</div>
                <ul className="text-sm space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-rose-600">Row {e.row}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 soft-table-wrap overflow-x-auto">
          <table className="w-full border-collapse soft-table">
            <thead>
              <tr>{["Name", "Party", "Country", "Role", "Actions"].map((h) => (
                <th key={h}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">No politicians yet</td></tr>}
              {items.map((p) => (
                <tr key={p.id} data-testid={`politician-row-${p.id}`}>
                  <td className="font-bold">
                    <Link to={`/dashboard/politicians/${p.id}`} className="hover:text-emerald-600 transition-colors">
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.party || "—"}</td>
                  <td className="font-mono">{p.country_code}</td>
                  <td>{p.role || "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link to={`/politicians/${p.id}`} className="btn-soft-secondary text-xs px-3 py-1.5" title="View public page">
                        <ExternalLink size={12} />
                      </Link>
                      <button data-testid={`edit-politician-${p.id}`} onClick={() => nav(`/dashboard/politicians/${p.id}`)} className="btn-soft-secondary text-xs px-3 py-1.5">
                        <Edit size={12} />
                      </button>
                      <button data-testid={`delete-politician-${p.id}`} onClick={() => del(p)} className="btn-soft-danger px-3 py-1.5">
                        <Trash size={12} />
                      </button>
                    </div>
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
