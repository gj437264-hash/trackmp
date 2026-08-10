import React, { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PromiseProgress from "./PromiseProgress";
import PromiseCard from "./PromiseCard";
import AddPromiseDialog from "./AddPromiseDialog";
import { ALL_STATUS, STATUS_FILTER_OPTIONS, isValidStatusFilter, filterByStatus } from "./filterUtils";

export default function Promises({ promises, politicianId, isAuthed, user, onPromisesChange }) {
  const list = promises || [];
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);

  // Recomputed only when the source list or filter changes — not on every
  // render (e.g. an attachment panel toggling open inside a card).
  const visibleList = useMemo(() => filterByStatus(list, statusFilter), [list, statusFilter]);

  const handleFilterChange = useCallback((val) => {
    // Defense in depth: Select only offers whitelisted values today, but
    // don't trust it blindly if this becomes URL-param-driven later.
    setStatusFilter(isValidStatusFilter(val) ? val : ALL_STATUS);
  }, []);

  return (
    <div>
      {/* Progress bar always reflects the FULL list, not the filtered view */}
      <PromiseProgress promises={list} />
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="text-indigo-500" size={24} aria-hidden="true" /> Promises
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="promise-status-filter" className="sr-only">Filter by status</label>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger
              id="promise-status-filter"
              data-testid="promise-status-filter"
              className="h-9 w-[150px] text-xs font-bold border-slate-200 bg-white/80"
              aria-label="Filter promises by status"
            >
              <Filter size={12} aria-hidden="true" className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} data-testid={`promise-status-filter-${o.value}`}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link to="/how-promises-are-tracked" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
            How we track promises <ExternalLink size={12} aria-hidden="true" />
          </Link>
          {isAuthed && (
            <AddPromiseDialog politicianId={politicianId} onAdded={(promise) => onPromisesChange([promise, ...list])} />
          )}
        </div>
      </div>

      {visibleList.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
          {statusFilter === ALL_STATUS ? "No promises logged yet" : "No promises with this status"}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleList.map((pr) => (
            <PromiseCard
              key={pr.id}
              promise={pr}
              currentUser={user}
              // Mutations still operate on the full `list`, never `visibleList` —
              // otherwise deleting/updating while filtered would corrupt state
              // for statuses currently hidden from view.
              onDelete={(pid) => onPromisesChange(list.filter((x) => x.id !== pid))}
              onUpdate={(updated) => onPromisesChange(list.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
