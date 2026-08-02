import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash,
  Search,
  ExternalLink,
  Upload,
  Download,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Globe,
  Briefcase,
  Shield,
  Users,
  FileText,
  Loader2,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export default function PoliticiansList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ countries: [], roles: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const fileRef = useRef(null);
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const sortBy = searchParams.get("sort_by") || "name";
  const sortDir = searchParams.get("sort_dir") || "asc";
  const verified = searchParams.get("verified") || "all";
  const countryCode = searchParams.get("country_code") || "";
  const role = searchParams.get("role") || "";

  const updateParams = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // Memoized filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (verified !== "all") count++;
    if (countryCode) count++;
    if (role) count++;
    if (q) count++;
    return count;
  }, [verified, countryCode, role, q]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const { data } = await api.get("/admin/politicians/filter-options");
        setFilterOptions(data);
      } catch (error) {
        // Non-critical, dropdowns stay empty
        console.warn("Failed to fetch filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      if (q) params.q = q;
      if (verified !== "all") params.verified = verified === "verified";
      if (countryCode) params.country_code = countryCode;
      if (role) params.role = role;
      const { data } = await api.get("/admin/politicians", { params });
      setItems(data.items || []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortDir, verified, countryCode, role, q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const del = async (p) => {
    if (!window.confirm(`Are you sure you want to move "${p.name}" to Trash?`)) return;
    try {
      await api.delete(`/politicians/${p.id}`);
      toast.success(`${p.name} moved to Trash successfully.`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const toggleVerified = async (p) => {
    try {
      const { data } = await api.patch(`/politicians/${p.id}/verify`, { verified: !p.verified });
      setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, verified: data.verified } : it)));
      toast.success(data.verified ? `${p.name} verified successfully.` : `${p.name} unverified.`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
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
      toast.success(`Downloading ${filename}...`);
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
        toast.success(`Successfully imported ${data.created} politician${data.created !== 1 ? "s" : ""}.`);
        load();
      } else {
        toast.info("Import completed — no new records were created.");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleSort = (key) => {
    if (sortBy === key) {
      updateParams({ sort_dir: sortDir === "asc" ? "desc" : "asc", page: 1 });
    } else {
      updateParams({ sort_by: key, sort_dir: "asc", page: 1 });
    }
  };

  const clearAllFilters = () => {
    updateParams({
      q: "",
      verified: "all",
      country_code: "",
      role: "",
      page: 1,
    });
    setShowFilters(false);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(items.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleBulkVerify = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Verify ${selectedItems.length} politician${selectedItems.length > 1 ? "s" : ""}?`)) return;
    
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedItems.map(id => 
        api.patch(`/politicians/${id}/verify`, { verified: true })
      ));
      toast.success(`${selectedItems.length} politician${selectedItems.length > 1 ? "s" : ""} verified successfully.`);
      setSelectedItems([]);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const SortHeader = ({ colKey, label }) => (
    <th 
      onClick={() => toggleSort(colKey)} 
      className="cursor-pointer select-none hover:text-emerald-600 transition-colors group"
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {sortBy === colKey ? (
          sortDir === "asc" ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />
        ) : (
          <ArrowUp size={14} className="opacity-0 group-hover:opacity-30 transition-opacity" />
        )}
      </span>
    </th>
  );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="uppercase tracking-wider">Records</span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-slate-600">{total.toLocaleString()} total</span>
            </div>
            <h1 className="font-display font-black text-4xl text-slate-900 tracking-tight">
              Politicians
            </h1>
            {q && (
              <p className="mt-1 text-sm text-slate-500">
                Searching for: <span className="font-medium text-slate-700">"{q}"</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button
              data-testid="download-template-btn"
              onClick={() => downloadFile("/politicians/import-template", "politician_import_template.csv")}
              className="btn-soft-secondary text-xs px-4 py-2.5"
            >
              <FileDown size={14} className="mr-2" /> Template
            </button>
            <button
              data-testid="export-csv-btn"
              onClick={() => downloadFile("/politicians/export", "politicians_export.csv")}
              className="btn-soft-secondary text-xs px-4 py-2.5"
            >
              <Download size={14} className="mr-2" /> Export
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
              className="btn-soft-secondary text-xs px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Upload size={14} className="mr-2" /> Import
                </>
              )}
            </button>
            <button 
              data-testid="new-politician-btn" 
              onClick={() => nav("/dashboard/politicians/new")} 
              className="btn-soft-primary px-4 py-2.5"
            >
              <Plus size={16} className="mr-2" /> New Politician
            </button>
          </div>
        </div>

        {/* Search and Filter Toggle */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="politician-search"
              value={q}
              onChange={(e) => updateParams({ q: e.target.value, page: 1 })}
              placeholder="Search by politician name..."
              className="soft-input pl-10 pr-10 py-2.5"
            />
            {q && (
              <button
                onClick={() => updateParams({ q: "", page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-soft-secondary text-xs px-4 py-2.5 whitespace-nowrap ${
                activeFilterCount > 0 ? "border-emerald-500 bg-emerald-50 text-emerald-700" : ""
              }`}
            >
              <Filter size={14} className="mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors px-2 py-2.5"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <select
              data-testid="page-size-select"
              value={limit}
              onChange={(e) => updateParams({ limit: e.target.value, page: 1 })}
              className="soft-input w-auto text-xs font-bold py-2.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200/60 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Verified Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
                <div className="flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
                  {[
                    { key: "all", label: "All" },
                    { key: "verified", label: "Verified" },
                    { key: "unverified", label: "Unverified" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      data-testid={`filter-${tab.key}`}
                      onClick={() => updateParams({ verified: tab.key, page: 1 })}
                      className={`flex-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                        verified === tab.key 
                          ? "bg-emerald-500 text-white shadow-sm" 
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <Globe size={12} className="inline mr-1" /> Country
                </label>
                <select
                  data-testid="filter-country"
                  value={countryCode}
                  onChange={(e) => updateParams({ country_code: e.target.value, page: 1 })}
                  className="soft-input w-full text-sm py-2.5"
                >
                  <option value="">All Countries</option>
                  {filterOptions.countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <Briefcase size={12} className="inline mr-1" /> Role
                </label>
                <select
                  data-testid="filter-role"
                  value={role}
                  onChange={(e) => updateParams({ role: e.target.value, page: 1 })}
                  className="soft-input w-full text-sm py-2.5"
                >
                  <option value="">All Roles</option>
                  {filterOptions.roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="mt-6 soft-card p-6 animate-in slide-in-from-top-2 duration-200" data-testid="import-result-summary">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-emerald-500" />
                Import Results
              </h3>
              <button
                onClick={() => setImportResult(null)}
                className="text-xs font-bold uppercase text-slate-400 hover:text-slate-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-4 py-2.5">
                <CheckCircle size={18} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  {importResult.created} created
                </span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-4 py-2.5">
                <AlertCircle size={18} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {(importResult.skipped || []).length} skipped
                </span>
              </div>
              <div className="flex items-center gap-2 bg-rose-50 rounded-lg px-4 py-2.5">
                <AlertCircle size={18} className="text-rose-600" />
                <span className="text-sm font-medium text-rose-700">
                  {(importResult.errors || []).length} errors
                </span>
              </div>
            </div>
            {(importResult.skipped || []).length > 0 && (
              <div className="mt-4">
                <div className="soft-label mb-2">Skipped Records</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importResult.skipped.map((s, i) => (
                    <div key={i} className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded">
                      Row {s.row}: {s.name} — <span className="text-slate-400">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(importResult.errors || []).length > 0 && (
              <div className="mt-4">
                <div className="soft-label mb-2">Errors</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-sm text-rose-600 bg-rose-50 px-3 py-1.5 rounded">
                      Row {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-800">
                {selectedItems.length} selected
              </span>
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkVerify}
                disabled={bulkActionLoading}
                className="btn-soft-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                {bulkActionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Shield size={14} className="mr-1.5" />
                )}
                Verify Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-6 soft-table-wrap overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedItems.length === items.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <SortHeader colKey="name" label="Name" />
                <SortHeader colKey="country_code" label="Country" />
                <SortHeader colKey="role" label="Role" />
                <SortHeader colKey="verified" label="Verified" />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider">Loading politicians...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={48} className="text-slate-300" />
                      <span className="text-slate-400 font-medium">No politicians found</span>
                      <span className="text-xs text-slate-400">Try adjusting your search or filters</span>
                    </div>
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id} data-testid={`politician-row-${p.id}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(p.id)}
                      onChange={() => handleSelectItem(p.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="font-medium">
                    <Link 
                      to={`/dashboard/politicians/${p.id}`} 
                      className="hover:text-emerald-600 transition-colors flex items-center gap-2"
                    >
                      <User size={14} className="text-slate-400" />
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} className="text-slate-400" />
                      <span className="font-mono text-sm">{p.country_code}</span>
                    </div>
                  </td>
                  <td className="text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={12} className="text-slate-400" />
                      {p.role || "—"}
                    </div>
                  </td>
                  <td>
                    <button
                      data-testid={`toggle-verified-${p.id}`}
                      onClick={() => toggleVerified(p)}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition-all ${
                        p.verified 
                          ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                          : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                      }`}
                      title="Click to toggle verified status"
                    >
                      {p.verified ? (
                        <CheckCircle size={12} />
                      ) : (
                        <AlertCircle size={12} />
                      )}
                      {p.verified ? "Verified" : "Unverified"}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link 
                        to={`/politicians/${p.id}`} 
                        className="btn-soft-secondary p-2 rounded-lg" 
                        title="View public page"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        data-testid={`edit-politician-${p.id}`}
                        onClick={() => nav(`/dashboard/politicians/${p.id}`)}
                        className="btn-soft-secondary p-2 rounded-lg"
                        title="Edit politician"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        data-testid={`delete-politician-${p.id}`} 
                        onClick={() => del(p)} 
                        className="btn-soft-danger p-2 rounded-lg"
                        title="Delete politician"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            {total > 0 ? (
              <span>
                Showing <span className="font-medium text-slate-700">{(page - 1) * limit + 1}</span>–<span className="font-medium text-slate-700">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
              </span>
            ) : (
              "No results"
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              data-testid="page-prev-btn"
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 })}
              className="btn-soft-secondary text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => updateParams({ page: pageNum })}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === pageNum
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="text-slate-400">…</span>
                  <button
                    onClick={() => updateParams({ page: totalPages })}
                    className="w-8 h-8 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              data-testid="page-next-btn"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: page + 1 })}
              className="btn-soft-secondary text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
