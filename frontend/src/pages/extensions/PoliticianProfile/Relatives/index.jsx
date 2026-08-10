import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import WealthChart from "../WealthHistory/WealthChart";
import WealthTable from "../WealthHistory/WealthTable";

export default function Relatives({ relatives, defaultCurrency }) {
  if (!relatives?.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No relatives on record
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="border border-slate-200/50 rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-slate-200/20">
      {relatives.map((r) => (
        <AccordionItem key={r.id} value={r.id} className="border-b border-slate-100/50 last:border-b-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold uppercase tracking-wider text-left text-slate-800 hover:bg-indigo-50/30 transition-colors" data-testid={`relative-${r.id}`}>
            <div className="flex-1 flex items-center justify-between gap-4 pr-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{r.name}</span>
                {r.is_political && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full normal-case border border-indigo-200">
                    Politically Active
                  </span>
                )}
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">{r.relationship}</span>
            </div>
          </AccordionTrigger>
          {/* forceMount not used: accordion content mounts lazily on open, which is desired here (per-relative charts are expensive) */}
          <AccordionContent className="px-6 pb-6">
            {r.description && <p className="text-sm text-slate-600 mb-4">{r.description}</p>}
            {r.is_political && (r.political_role || r.linked_politician_id) && (
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 mb-4">
                {r.political_role && (
                  <div className="text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Role: </span>
                    <span className="font-bold text-slate-800">{r.political_role}</span>
                  </div>
                )}
                {r.linked_politician_id && (
                  <Link to={`/politicians/${r.linked_politician_id}`} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 mt-2 hover:underline">
                    View {r.linked_politician_name || "linked"} profile <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
            <WealthChart entries={r.wealth || []} currency={r.wealth_currency || defaultCurrency} />
            <WealthTable entries={r.wealth || []} currency={r.wealth_currency || defaultCurrency} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
