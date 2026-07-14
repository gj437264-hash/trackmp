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
            <div className="label-eyebrow">/// Moderation</div>
            <h1 className="mt-2 font-display font-black text-4xl uppercase tracking-tighter">Signup Queue</h1>
          </div>
          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected", "activated"].map((s) => (
              <button
                key={s}
                data-testid={`status-${s}`}
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black ${
                  status === s ? "bg-black text-white" : "bg-white hover:bg-surfaceAlt"
                }`}
              >
                {s}
              </button>
            ))}
            <button data-testid="refresh" onClick={load} className="brutal-btn-secondary text-xs">
              <RefreshCw size={14} className="mr-1" /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-8 border-2 border-black bg-white overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-surfaceAlt">
              <tr>
                {["Requested", "Name", "Email", "Country", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-wider p-3 border-b-2 border-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !busy && (
                <tr>
                  <td colSpan={6} className="p-10 text-center label-eyebrow">
                    No {status} requests
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-b border-neutral-300" data-testid={`signup-row-${r.id}`}>
                  <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-bold">{r.full_name}</td>
                  <td className="p-3 font-mono text-sm">{r.email}</td>
                  <td className="p-3 font-mono">{r.country_code}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase bg-black text-white">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          data-testid={`approve-${r.id}`}
                          onClick={() => decide(r.id, "approve")}
                          className="inline-flex items-center px-3 py-1.5 bg-success text-white text-xs font-bold uppercase border-2 border-black hover:opacity-90"
                        >
                          <Check size={14} className="mr-1" /> Approve
                        </button>
                        <button
                          data-testid={`reject-${r.id}`}
                          onClick={() => decide(r.id, "reject")}
                          className="inline-flex items-center px-3 py-1.5 bg-danger text-white text-xs font-bold uppercase border-2 border-black hover:opacity-90"
                        >
                          <X size={14} className="mr-1" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="label-eyebrow">—</span>
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
