import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";

const MIN_MATCH_OPTIONS = [
  { value: 1, label: "Any match (name + 1 field)" },
  { value: 2, label: "Strong match (name + 2 fields)" },
  { value: 3, label: "Exact geo match (name + 3 fields)" },
];

const FIELD_LABELS = {
  country_code: "Country",
  state_id: "State",
  city_id: "City",
  constituency_id: "Constituency",
};

export default function DuplicatePoliticiansFinder() {
  const [clusters, setClusters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [minMatches, setMinMatches] = useState(1);
  const [countryCode, setCountryCode] = useState("");
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/politicians/filter-options")
      .then(({ data }) => setCountries(data.countries || []))
      .catch(() => setCountries([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, min_matches: minMatches };
      if (countryCode) params.country_code = countryCode;
      const { data } = await api.get("/admin/politicians/duplicates", { params });
      setClusters(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [page, limit, minMatches, countryCode]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const cellClass = (cluster, field) =>
    cluster.matched_fields.includes(field)
      ? "bg-amber-50 text-amber-800 font-medium rounded px-2 py-1"
      : "text-slate-600 px-2 py-1";

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
          <span className="uppercase tracking-wider">Data Quality</span>
        </div>
        <h1 className="font-display font-black text-4xl text-slate-900 tracking-tight">
          Duplicate Politicians
        </h1>
        <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
          <Info size={14} />
          Records are grouped by matching name; the highlighted columns below
          show which additional fields also matched for that group.
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Match strength</label>
            <select
              value={minMatches}
              onChange={(e) => {
                setPage(1);
                setMinMatches(parseInt(e.target.value, 10));
              }}
              className="soft-input text-sm py-2.5"
            >
              {MIN_MATCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Country</label>
            <select
              value={countryCode}
              onChange={(e) => {
                setPage(1);
                setCountryCode(e.target.value);
              }}
              className="soft-input text-sm py-2.5"
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-xs text-slate-500 font-mono">
            {total.toLocaleString()} duplicate group{total !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 space-y-4">
          {loading && (
            <div className="soft-card p-12 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Scanning for duplicates...</span>
            </div>
          )}

          {!loading && clusters.length === 0 && (
            <div className="soft-card p-12 text-center">
              <Copy size={40} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">No duplicate politicians found</p>
              <p className="text-xs text-slate-400 mt-1">Try lowering the match strength.</p>
            </div>
          )}

          {!loading && clusters.map((cluster, idx) => (
            <div key={idx} className="soft-card p-5 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-display font-bold text-lg text-slate-800">{cluster.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Matched on:</span>
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    Name
                  </span>
                  {cluster.matched_fields.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"
                    >
                      {FIELD_LABELS[f] || f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase text-slate-400">
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Party</th>
                      <th className="px-2 py-1">Role</th>
                      <th className="px-2 py-1">Country</th>
                      <th className="px-2 py-1">State</th>
                      <th className="px-2 py-1">City</th>
                      <th className="px-2 py-1">Constituency</th>
                      <th className="px-2 py-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cluster.members.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          {m.verified ? (
                            <CheckCircle size={14} className="text-emerald-600" />
                          ) : (
                            <AlertCircle size={14} className="text-amber-500" />
                          )}
                        </td>
                        <td className="px-2 py-1.5 font-medium text-slate-800">{m.name}</td>
                        <td className="px-2 py-1.5 text-slate-600">{m.party || "—"}</td>
                        <td className="px-2 py-1.5 text-slate-600">{m.role || "—"}</td>
                        <td className={cellClass(cluster, "country_code")}>{m.country_code || "—"}</td>
                        <td className={cellClass(cluster, "state_id")}>{m.state_name || "—"}</td>
                        <td className={cellClass(cluster, "city_id")}>{m.city_name || "—"}</td>
                        <td className={cellClass(cluster, "constituency_id")}>{m.constituency_name || "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          <Link
                            to={`/dashboard/politicians/${m.id}`}
                            className="btn-soft-secondary p-2 rounded-lg inline-flex"
                            title="Review this entry"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-soft-secondary text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} className="mr-1" /> Previous
            </button>
            <span className="text-xs font-mono text-slate-500">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-soft-secondary text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
