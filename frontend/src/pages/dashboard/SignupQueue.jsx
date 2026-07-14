import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Check, X, RefreshCw } from "lucide-react";

export default function SignupQueue() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const { data } = await api.get("/admin/signup-requests", { params: { status } });
      setItems(data.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const decide = async (id, action) => {
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} this request?`)) return;
    try {
      await api.post(`/admin/signup-requests/${id}/${action}`, { note: null });
      toast.success(`Request ${action}d.`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="soft-label mb-0">/// Moderation</div>
            <h1 className="mt-2 font-display font-black text-4xl text-slate-900">Signup Queue</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["pending", "approved", "rejected", "activated"].map((s) => (
              <button
                key={s}
                data-testid={`status-${s}`}
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors duration-200 ${
                  status === s ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
            <button data-testid="refresh" onClick={load} className="btn-soft-secondary text-xs px-4 py-2">
              <RefreshCw size={14} className="mr-1" /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-8 soft-table-wrap overflow-x-auto">
          <table className="w-full border-collapse soft-table">
            <thead>
              <tr>
                {["Requested", "Name", "Email", "Country", "Status", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !busy && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">
                    No {status} requests
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} data-testid={`signup-row-${r.id}`}>
                  <td className="font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="font-bold">{r.full_name}</td>
                  <td className="font-mono text-sm">{r.email}</td>
                  <td className="font-mono">{r.country_code}</td>
                  <td>
                    <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase bg-slate-800 text-white rounded-full">
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          data-testid={`approve-${r.id}`}
                          onClick={() => decide(r.id, "approve")}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase rounded-xl hover:bg-emerald-100 transition-colors duration-200"
                        >
                          <Check size={14} className="mr-1" /> Approve
                        </button>
                        <button
                          data-testid={`reject-${r.id}`}
                          onClick={() => decide(r.id, "reject")}
                          className="btn-soft-danger px-3 py-1.5"
                        >
                          <X size={14} className="mr-1" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="soft-label mb-0">—</span>
                    )}
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
