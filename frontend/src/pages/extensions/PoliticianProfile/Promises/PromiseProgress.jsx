import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PROMISE_STATUS } from "./promiseStatus";

function PromiseProgress({ promises }) {
  const total = promises.length;

  const { counts, deliveredPct, brokenPct, chartData, broken } = useMemo(() => {
    const counts = PROMISE_STATUS.map((s) => ({ ...s, count: promises.filter((p) => p.status === s.value).length }));
    const delivered = counts.find((c) => c.value === "delivered")?.count || 0;
    const broken = counts.find((c) => c.value === "broken")?.count || 0;
    const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const brokenPct = total > 0 ? Math.round((broken / total) * 100) : 0;
    const chartData = counts.filter((c) => c.count > 0).map((c) => ({ name: c.label, value: c.count, color: c.color }));
    return { counts, deliveredPct, brokenPct, chartData, broken };
  }, [promises, total]);

  if (!total) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No promises logged yet
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 mb-8 shadow-lg shadow-slate-200/20">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-center">
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="white" strokeWidth={2}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "12px", fontFamily: "Inter", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display font-bold text-3xl text-slate-800">{deliveredPct}%</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Delivered</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {counts.map((c) => (
            <div key={c.value} className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <c.Icon size={12} aria-hidden="true" /> {c.label}
              </div>
              <div className="font-display font-bold text-2xl mt-1 text-slate-800">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <span>{total} total promise{total !== 1 ? "s" : ""} tracked</span>
        <span className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> {deliveredPct}% delivered</span>
          {broken > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" /> {brokenPct}% broken</span>}
        </span>
      </div>
    </div>
  );
}

export default React.memo(PromiseProgress);
