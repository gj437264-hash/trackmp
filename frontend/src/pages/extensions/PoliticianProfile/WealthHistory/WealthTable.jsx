import React from "react";
import { ExternalLink } from "lucide-react";
import { formatMoney, ensureUrl } from "../utils";

function WealthTable({ entries, currency = "USD" }) {
  if (!entries?.length) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl overflow-x-auto mt-6 shadow-lg shadow-slate-200/20">
      <table className="w-full border-collapse">
        <caption className="sr-only">Wealth history by year</caption>
        <thead className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80">
          <tr>
            {["Year", "Assets", "Liabilities", "Net Worth", "Notes", "Sources"].map((h) => (
              <th key={h} scope="col" className="text-left text-xs font-bold uppercase tracking-wider p-4 border-b border-slate-200/50 text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-100/50 hover:bg-indigo-50/30 transition-colors">
              <th scope="row" className="p-4 font-mono font-bold text-slate-700 text-left">{e.year}</th>
              <td className="p-4 font-mono text-emerald-600 font-medium">{formatMoney(e.assets, currency)}</td>
              <td className="p-4 font-mono text-red-500 font-medium">{formatMoney(e.liabilities, currency)}</td>
              <td className="p-4 font-mono text-indigo-600 font-bold">{formatMoney(e.net_worth, currency)}</td>
              <td className="p-4 text-sm text-slate-600 max-w-[220px]">{e.notes || "—"}</td>
              <td className="p-4">
                <div className="flex flex-wrap gap-2">
                  {(e.source_urls || []).map((u, i) => (
                    <a key={i} href={ensureUrl(u)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold uppercase text-indigo-600 hover:text-indigo-800 hover:underline">
                      Src {i + 1} <ExternalLink size={10} aria-hidden="true" />
                    </a>
                  ))}
                  {!(e.source_urls?.length) && <span className="text-slate-400">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(WealthTable);
