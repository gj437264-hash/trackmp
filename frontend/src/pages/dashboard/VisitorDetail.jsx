import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { ArrowLeft, Mail, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

function StatBox({ label, value }) {
  return (
    <div className="soft-card p-4">
      <div className="font-display font-black text-2xl text-slate-800">{value}</div>
      <div className="soft-label mt-1 mb-0">{label}</div>
    </div>
  );
}

export default function VisitorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const deleteVisitor = async () => {
    if (!window.confirm(`Permanently delete ${visitor.first_name} ${visitor.last_name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/visitors/${id}`);
      toast.success("Contributor deleted.");
      navigate("/dashboard/visitors");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    api.get(`/admin/visitors/${id}`).then((r) => setVisitor(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading || !visitor) {
    return <DashboardLayout><div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl">
        <Link to="/dashboard/visitors" className="soft-label mb-0 inline-flex items-center gap-2 hover:text-emerald-600 transition-colors">
          <ArrowLeft size={12} /> Contributors
        </Link>

        <div className="mt-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <h1 className="font-display font-black text-3xl text-slate-900">{visitor.first_name} {visitor.last_name}</h1>
            <button onClick={deleteVisitor} disabled={deleting} className="btn-soft-danger text-xs px-4 py-2 disabled:opacity-50" data-testid="delete-visitor-btn">
              <Trash2 size={14} className="mr-1" /> {deleting ? "Deleting…" : "Delete Contributor"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1"><Mail size={14} /> {visitor.email}</span>
            {visitor.organization && <span className="inline-flex items-center gap-1"><Building2 size={14} /> {visitor.organization}</span>}
            {visitor.country_code && <span>{visitor.country_code}</span>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Total Tickets" value={visitor.ticket_count} />
          <StatBox label="Approved" value={visitor.approved_count} />
          <StatBox label="Rejected" value={visitor.rejected_count} />
          <StatBox label="Politicians Added" value={visitor.politicians_added_count} />
        </div>

        <div className="mt-6 text-xs text-slate-400">
          First contact {new Date(visitor.first_contact_date).toLocaleDateString()} · Last contact {new Date(visitor.last_contact_date).toLocaleDateString()}
        </div>

        <div className="mt-8">
          <h2 className="font-display font-bold text-xl text-slate-800 mb-4">Ticket History</h2>
          <div className="soft-table-wrap divide-y divide-slate-100">
            {(visitor.tickets || []).map((t) => (
              <Link key={t.id} to={`/dashboard/community/${t.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors duration-200">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-600">{t.ticket_number}</span>
                  <div className="font-bold text-sm mt-1 text-slate-800">{t.subject}</div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || "bg-slate-100 text-slate-500"}`}>
                  {t.status?.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
