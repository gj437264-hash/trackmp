import React, { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Users, Calendar, ExternalLink, Paperclip } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ensureUrl } from "../utils";
import { PROMISE_STATUS, statusMeta } from "./promiseStatus";
import PromiseAttachments from "./PromiseAttachments";
import EditPromiseDialog from "./EditPromiseDialog";

function PromiseStatusBadge({ status }) {
  const s = statusMeta(status);
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border-2 ${s.cls} shadow-sm`}>
      <Icon size={12} aria-hidden="true" /> {s.label}
    </span>
  );
}

function PromiseCard({ promise, currentUser, onDelete, onUpdate }) {
  const isOwner = currentUser && currentUser.id === promise.created_by;
  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "super_admin");
  const canEdit = isOwner || isAdmin;
  const [statusSaving, setStatusSaving] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const remove = useCallback(async () => {
    if (!window.confirm("Delete this promise?")) return;
    try {
      await api.delete(`/promises/${promise.id}`);
      onDelete(promise.id);
      toast.success("Promise removed");
    } catch {
      toast.error("Failed to delete");
    }
  }, [promise.id, onDelete]);

  const changeStatus = useCallback(async (newStatus) => {
    if (newStatus === promise.status) return;
    setStatusSaving(true);
    try {
      await api.put(`/promises/${promise.id}`, { status: newStatus });
      onUpdate({ ...promise, status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }, [promise, onUpdate]);

  const linkCount = (promise.source_links || []).length + (promise.source_url ? 1 : 0);
  const fileCount = (promise.files || []).length;

  return (
    <article data-testid={`promise-card-${promise.id}`} className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display font-bold text-slate-800 text-lg">{promise.title}</h3>
            {canEdit ? (
              <Select value={promise.status} onValueChange={changeStatus} disabled={statusSaving}>
                <SelectTrigger data-testid={`promise-status-select-${promise.id}`} className="h-auto w-auto border-none p-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue><PromiseStatusBadge status={promise.status} /></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROMISE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2"><s.Icon size={12} aria-hidden="true" /> {s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <PromiseStatusBadge status={promise.status} />
            )}
          </div>
          {promise.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{promise.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            {promise.created_by_name && <span className="flex items-center gap-1"><Users size={12} aria-hidden="true" /> Logged by {promise.created_by_name}</span>}
            {promise.date_made && <span className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" /> Made: {promise.date_made}</span>}
            {promise.source_url && (
              <a href={ensureUrl(promise.source_url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-800 hover:underline">
                Source <ExternalLink size={10} aria-hidden="true" />
              </a>
            )}
            <button type="button" onClick={() => setShowAttachments((v) => !v)} data-testid={`promise-attachments-toggle-${promise.id}`} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold" aria-expanded={showAttachments}>
              <Paperclip size={12} aria-hidden="true" /> {linkCount + fileCount} attachment{linkCount + fileCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <EditPromiseDialog promise={promise} onUpdated={onUpdate} />
            <Button size="sm" variant="ghost" onClick={remove} data-testid={`promise-delete-${promise.id}`} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl" aria-label="Delete promise">
              Delete
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showAttachments && <PromiseAttachments promise={promise} canEdit={canEdit} onUpdate={onUpdate} />}
      </AnimatePresence>
    </article>
  );
}

export default React.memo(PromiseCard);
