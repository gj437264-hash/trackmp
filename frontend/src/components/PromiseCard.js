import { useState } from "react";
import StatusBadge, { STATUS_OPTIONS } from "@/components/StatusBadge";
import { ArrowBigUp, ArrowBigDown, ExternalLink, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PromiseCard({ promise, onChange, onDelete }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isAuthed = user && user !== false;
  const canDelete = isAuthed && (user.id === promise.created_by || user.role === "admin");

  const vote = async (value) => {
    if (!isAuthed) return toast.error("Please login to vote");
    setBusy(true);
    try {
      const newVal = promise.my_vote === value ? 0 : value;
      const { data } = await api.post(`/promises/${promise.id}/vote`, { value: newVal });
      onChange?.(data);
    } catch (e) {
      toast.error("Vote failed");
    } finally { setBusy(false); }
  };

  const changeStatus = async (status) => {
    if (!isAuthed) return toast.error("Please login");
    setBusy(true);
    try {
      const { data } = await api.patch(`/promises/${promise.id}/status`, { status });
      onChange?.(data);
      toast.success("Status updated");
    } catch (e) {
      toast.error("Update failed");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!canDelete) return;
    if (!window.confirm("Delete this promise?")) return;
    try {
      await api.delete(`/promises/${promise.id}`);
      onDelete?.(promise.id);
    } catch {
      toast.error("Delete failed");
    }
  };

  const score = (promise.upvotes || 0) - (promise.downvotes || 0);

  return (
    <div data-testid={`promise-card-${promise.id}`} className="border border-zinc-200 rounded-md p-5 bg-white hover-lift">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            data-testid={`promise-upvote-${promise.id}`}
            disabled={busy}
            onClick={() => vote(1)}
            className={`p-1 rounded hover:bg-zinc-100 ${promise.my_vote === 1 ? "text-green-600" : "text-zinc-500"}`}
          >
            <ArrowBigUp className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tabular-nums">{score}</span>
          <button
            data-testid={`promise-downvote-${promise.id}`}
            disabled={busy}
            onClick={() => vote(-1)}
            className={`p-1 rounded hover:bg-zinc-100 ${promise.my_vote === -1 ? "text-red-600" : "text-zinc-500"}`}
          >
            <ArrowBigDown className="h-5 w-5" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            <h4 className="font-display font-semibold text-base text-zinc-950 flex-1 min-w-0">{promise.title}</h4>
            <StatusBadge status={promise.status} />
          </div>
          {promise.description && (
            <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{promise.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <span>by <span className="text-zinc-700 font-medium">{promise.created_by_name}</span></span>
              {promise.date_made && <span className="tabular-nums">made: {promise.date_made}</span>}
              {promise.source_url && (
                <a href={promise.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isAuthed && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-testid={`promise-status-trigger-${promise.id}`} size="sm" variant="ghost" className="h-7 text-xs">Update status</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((s) => (
                      <DropdownMenuItem key={s.value} data-testid={`promise-status-option-${s.value}-${promise.id}`} onClick={() => changeStatus(s.value)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canDelete && (
                <Button data-testid={`promise-delete-${promise.id}`} size="sm" variant="ghost" onClick={remove}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
