import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, ExternalLink, FileText, UserCheck, CheckCircle2, XCircle, Plus, Trash, Printer, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUSES = ["open", "pending_review", "waiting_for_user", "approved", "rejected", "solved", "closed", "spam", "archived"];

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

function ActivityLine({ a }) {
  const labels = {
    ticket_created: "Ticket created",
    attachment_added: `Attachment added: ${a.detail?.filename || ""}`,
    reply_added: `Reply sent by ${a.detail?.author || "admin"}`,
    internal_note_added: `Internal note added by ${a.detail?.author || "admin"}`,
    status_changed: `Status changed from ${a.detail?.from || "?"} to ${a.detail?.to || "?"}`,
    assigned: `Assigned to ${a.detail?.to || "?"}`,
  };
  return (
    <div className="text-xs text-slate-400 py-1.5 border-l-2 border-slate-200 pl-3">
      {labels[a.action] || a.action} · {new Date(a.created_at).toLocaleString()}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [approveFields, setApproveFields] = useState([{ field: "", value: "" }]);
  const [newPolData, setNewPolData] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/admin/tickets/${id}`).then((r) => setTicket(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, [id]);
    useEffect(() => { api.get("/admin/admins").then((r) => setAdmins(r.data.items || r.data || [])).catch(() => {}); }, []);
    useEffect(() => {
      if (ticket?.detail?.request_type === "add_new") {
        setNewPolData(ticket.detail.new_politician_data || {});
      }
    }, [ticket]);

  const sendMessage = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/tickets/${id}/messages`, { body: replyBody, is_internal: isInternal });
      setReplyBody("");
      toast.success(isInternal ? "Internal note added." : "Reply sent.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSending(false); }
  };

  const changeStatus = async (status) => {
    setChangingStatus(true);
    try {
      await api.put(`/admin/tickets/${id}/status`, { status });
      toast.success("Status updated.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setChangingStatus(false); }
  };

  const assignTo = async (adminEmail) => {
    try {
      await api.put(`/admin/tickets/${id}/assign`, adminEmail ? { admin_email: adminEmail } : {});
      toast.success("Assigned.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const deleteTicket = async () => {
    if (!window.confirm("Permanently delete this ticket? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/tickets/${id}`);
      toast.success("Ticket deleted.");
      navigate("/dashboard/community");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const ALLOWED_FIELDS = ["name", "party", "role", "brief_intro", "image_url", "education", "profession", "date_of_birth", "contact_email", "contact_phone", "official_website"];

  const addFieldRow = () => setApproveFields([...approveFields, { field: "", value: "" }]);
  const setFieldRow = (i, key, val) => setApproveFields(approveFields.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  const removeFieldRow = (i) => setApproveFields(approveFields.filter((_, idx) => idx !== i));

  const approveExisting = async () => {
    const changes = {};
    approveFields.forEach((f) => { if (f.field && f.value) changes[f.field] = f.value; });
    if (Object.keys(changes).length === 0) { toast.error("Add at least one field change."); return; }
    setApproving(true);
    try {
      await api.post(`/admin/tickets/${id}/approve`, { applied_changes: changes });
      toast.success("Approved and applied to politician profile.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setApproving(false); }
  };

  const approveNew = async () => {
    setApproving(true);
    try {
      await api.post(`/admin/tickets/${id}/approve`, { politician_data: newPolData });
      toast.success("Approved and politician created.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setApproving(false); }
  };

  const reject = async () => {
    setRejecting(true);
    try {
      await api.post(`/admin/tickets/${id}/reject`, { reason: rejectReason || null });
      toast.success("Ticket rejected.");
      setShowReject(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setRejecting(false); }
  };

  if (loading || !ticket) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-slate-400 uppercase text-xs font-bold tracking-wider">Loading…</div>
      </DashboardLayout>
    );
  }

  const d = ticket.detail || {};

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-5xl">
        <Link to="/dashboard/community" className="soft-label mb-0 inline-flex items-center gap-2 hover:text-emerald-600 transition-colors">
          <ArrowLeft size={12} /> Community Desk
        </Link>

        <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-emerald-600">{ticket.ticket_number}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                {ticket.status?.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="mt-2 font-display font-black text-2xl md:text-3xl text-slate-900">{ticket.subject}</h1>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={changingStatus}
              className="soft-input w-auto text-sm"
              data-testid="status-select"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <select
              value={ticket.assigned_admin || ""}
              onChange={(e) => assignTo(e.target.value)}
              className="soft-input w-auto text-sm"
              data-testid="assign-select"
            >
              <option value="">Unassigned</option>
              {admins.map((a) => <option key={a.email || a.id} value={a.email}>{a.email}</option>)}
            </select>
            <button onClick={() => window.print()} className="btn-soft-secondary text-xs px-4 py-2" data-testid="print-ticket-btn">
              <Printer size={14} className="mr-1" /> Print
            </button>
            <button onClick={deleteTicket} className="btn-soft-danger px-4 py-2" data-testid="delete-ticket-btn">
              <Trash2 size={14} className="mr-1" /> Delete
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main: submission + conversation */}
          <div className="space-y-6">
            <div className="soft-card p-5">
              <div className="soft-label mb-3">Original Submission</div>
              {ticket.type === "contact" ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p className="whitespace-pre-wrap">{d.message}</p>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-700">
                  <div><span className="soft-label mb-0 inline">Type: </span>{d.request_type === "add_new" ? "Add New Politician" : "Update Existing"}</div>
                  {d.update_type && <div><span className="soft-label mb-0 inline">Update Type: </span>{d.update_type}</div>}
                  {d.description && <p className="whitespace-pre-wrap mt-2">{d.description}</p>}
                  {d.new_politician_data && (
                    <pre className="mt-2 bg-slate-50 rounded-xl p-3 text-xs overflow-x-auto">
                      {JSON.stringify(d.new_politician_data, null, 2)}
                    </pre>
                  )}
                  {(d.evidence_urls || []).length > 0 && (
                    <div className="mt-3">
                      <div className="soft-label mb-1">Evidence URLs</div>
                      {d.evidence_urls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 text-xs hover:underline">
                          {u} <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}
                  {d.notes && <div className="mt-2"><span className="soft-label mb-0 inline">Notes: </span>{d.notes}</div>}
                </div>
              )}
              {(ticket.attachments || []).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="soft-label mb-2">Attachments</div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs bg-slate-50 rounded-xl px-3 py-1.5 text-slate-600 hover:text-emerald-600 transition-colors">
                        <FileText size={12} /> {a.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {ticket.type === "update_request" && !["approved", "rejected"].includes(ticket.status) && (
              <div className="soft-card p-5 border-emerald-200/80">
                <div className="soft-label mb-3">Review & Approve</div>

                {d.request_type === "update_existing" ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">Select which field(s) to update on the politician's profile, and enter the corrected value.</p>
                    {approveFields.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <select value={f.field} onChange={(e) => setFieldRow(i, "field", e.target.value)} className="soft-input w-auto">
                          <option value="">Field...</option>
                          {ALLOWED_FIELDS.map((af) => <option key={af} value={af}>{af}</option>)}
                        </select>
                        <input value={f.value} onChange={(e) => setFieldRow(i, "value", e.target.value)} placeholder="New value" className="soft-input" />
                        <button onClick={() => removeFieldRow(i)} className="btn-soft-danger px-3"><Trash size={14} /></button>
                      </div>
                    ))}
                    <button onClick={addFieldRow} className="btn-soft-secondary text-xs px-4 py-2"><Plus size={12} className="mr-1" /> Add field</button>
                    <div>
                      <button onClick={approveExisting} disabled={approving} className="btn-soft-primary text-sm disabled:opacity-50" data-testid="approve-btn">
                        <CheckCircle2 size={14} className="mr-2" /> {approving ? "Applying…" : "Approve & Apply"}
                      </button>
                    </div>
                  </div>
                ) : newPolData ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">Review the suggested details before creating this politician's profile.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.keys(newPolData).map((key) => (
                        <input
                          key={key}
                          value={newPolData[key] || ""}
                          onChange={(e) => setNewPolData({ ...newPolData, [key]: e.target.value })}
                          placeholder={key}
                          className="soft-input"
                        />
                      ))}
                    </div>
                    <button onClick={approveNew} disabled={approving} className="btn-soft-primary text-sm disabled:opacity-50" data-testid="approve-btn">
                      <CheckCircle2 size={14} className="mr-2" /> {approving ? "Creating…" : "Approve & Create Politician"}
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 pt-4 border-t border-slate-200">
                  {!showReject ? (
                    <button onClick={() => setShowReject(true)} className="btn-soft-danger text-sm" data-testid="reject-btn">
                      <XCircle size={14} className="mr-2" /> Reject
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" className="soft-input" />
                      <div className="flex gap-2">
                        <button onClick={reject} disabled={rejecting} className="btn-soft-danger text-sm disabled:opacity-50" data-testid="confirm-reject-btn">
                          {rejecting ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button onClick={() => setShowReject(false)} className="btn-soft-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {["approved", "rejected"].includes(ticket.status) && (
              <div className={`soft-card p-4 text-sm ${ticket.status === "approved" ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"}`}>
                {ticket.status === "approved" ? (
                  <span className="text-emerald-700 font-bold">✓ Approved by {ticket.approved_by}</span>
                ) : (
                  <span className="text-rose-700 font-bold">✗ Rejected by {ticket.rejected_by}{ticket.rejection_reason ? ` — ${ticket.rejection_reason}` : ""}</span>
                )}
              </div>
            )}

            <div>
              <div className="soft-label mb-3">Conversation</div>
              <div className="space-y-3">
                {(ticket.messages || []).length === 0 ? (
                  <div className="text-sm text-slate-400 italic">No replies yet</div>
                ) : (
                  ticket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl p-4 text-sm ${m.is_internal ? "bg-amber-50/60 border border-amber-200" : "bg-white/80 backdrop-blur-sm border border-slate-200"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {m.is_internal && <Lock size={12} className="text-amber-600" />}
                        <span className="font-bold text-xs text-slate-800">{m.author_email}</span>
                        <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
                        {m.is_internal && <span className="text-[10px] font-bold uppercase text-amber-600">Internal</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-slate-700">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 soft-card p-4">
                <textarea
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={isInternal ? "Write an internal note (not visible to visitor)..." : "Write a reply..."}
                  className="soft-input"
                  data-testid="reply-textarea"
                />
                <div className="flex items-center justify-between mt-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                    Internal note
                  </label>
                  <button onClick={sendMessage} disabled={sending || !replyBody.trim()} className="btn-soft-primary text-sm disabled:opacity-50" data-testid="send-reply">
                    <Send size={14} className="mr-2" /> {sending ? "Sending…" : isInternal ? "Add Note" : "Send Reply"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: visitor info + activity log */}
          <div className="space-y-6">
            <div className="soft-card p-4">
              <div className="soft-label mb-3">Visitor</div>
              <div className="text-sm space-y-1">
                <div className="font-bold text-slate-800">{d.first_name} {d.last_name}</div>
                <div className="text-slate-500">{d.email}</div>
                {d.country_code && <div className="text-slate-500">{d.country_code}</div>}
                {d.organization && <div className="text-slate-500">{d.organization}</div>}
              </div>
              {ticket.politician_id && (
                <Link to={`/dashboard/politicians/${ticket.politician_id}`} className="text-xs text-emerald-600 hover:underline mt-3 inline-block">
                  View related politician →
                </Link>
              )}
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-400">
                Assigned: {ticket.assigned_admin || "Unassigned"}
              </div>
            </div>

            <div className="soft-card p-4">
              <div className="soft-label mb-3">Activity Log</div>
              <div className="space-y-1">
                {(ticket.activity || []).map((a) => <ActivityLine key={a.id} a={a} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
