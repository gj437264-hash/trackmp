import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { CONTENT_TYPE_LIST, getContentType } from "@/lib/seo/contentTypes";
import { searchContentItems } from "@/lib/seo/seoApi";
import { Search, ChevronRight, Loader2, SearchX } from "lucide-react";

const PAGE_SIZE = 20;

export default function SEOManagement() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTypeKey = searchParams.get("type") || CONTENT_TYPE_LIST[0]?.key;
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeType = getContentType(activeTypeKey);

  const updateParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const load = useCallback(async () => {
    if (!activeType) return;
    setLoading(true);
    try {
      const { items: results, total: t } = await searchContentItems(activeType.key, {
        q,
        page,
        limit: PAGE_SIZE,
      });
      setItems(results);
      setTotal(t);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeType, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openItem = (item) => {
    const itemId = activeType.getItemId(item);
    nav(`/dashboard/seo/${activeType.key}/${itemId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span className="uppercase tracking-wider">SEO Management</span>
          </div>
          <h1 className="font-display font-black text-4xl text-slate-900 tracking-tight">
            SEO Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Choose a content type, then select an item to view and edit its search and social
            metadata.
          </p>
        </div>

        {/* Content type selector */}
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Content type">
          {CONTENT_TYPE_LIST.map((ct) => {
            const Icon = ct.icon;
            const active = ct.key === activeTypeKey;
            return (
              <button
                key={ct.key}
                role="tab"
                aria-selected={active}
                onClick={() => updateParams({ type: ct.key, q: "", page: 1 })}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  active
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <Icon size={16} />
                {ct.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mt-6 relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => updateParams({ q: e.target.value, page: 1 })}
            placeholder={`Search ${activeType?.label.toLowerCase() || "items"}...`}
            className="soft-input pl-10 pr-4 py-2.5 w-full"
            aria-label={`Search ${activeType?.label || "content"}`}
          />
        </div>

        {/* Results */}
        <div className="mt-6 soft-table-wrap rounded-xl border border-slate-200/60 overflow-hidden">
          {loading && (
            <div className="p-12 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading...</span>
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-12 flex flex-col items-center gap-2 text-center">
              <SearchX size={40} className="text-slate-300" />
              <span className="text-slate-500 font-medium">No results</span>
              <span className="text-xs text-slate-400">Try a different search term.</span>
            </div>
          )}
          {!loading &&
            items.map((item) => (
              <button
                key={activeType.getItemId(item)}
                onClick={() => openItem(item)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left"
                data-testid={`seo-item-${activeType.getItemId(item)}`}
              >
                <div>
                  <div className="font-medium text-slate-800">{activeType.getItemLabel(item)}</div>
                  <div className="text-xs text-slate-500">{activeType.getItemSubLabel(item)}</div>
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} — {total.toLocaleString()} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="btn-soft-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="btn-soft-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
