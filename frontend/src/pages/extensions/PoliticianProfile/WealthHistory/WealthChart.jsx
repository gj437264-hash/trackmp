// WealthChart.jsx — isolated so recharts only loads when this chunk is requested.
import React, { useMemo } from "react";
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatMoney } from "../utils";

function WealthChart({ entries, currency = "USD" }) {
  const data = useMemo(() => {
    if (!entries?.length) return [];
    return entries.map((e) => ({ year: e.year, Assets: e.assets, Liabilities: e.liabilities, NetWorth: e.net_worth }));
  }, [entries]);

  if (!entries?.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No wealth history recorded
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 shadow-lg shadow-slate-200/20">
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8" />
          <YAxis tick={{ fontFamily: "Inter", fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => formatMoney(v, currency)} />
          <Tooltip
            contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "12px", fontFamily: "Inter", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
            formatter={(v) => formatMoney(v, currency)}
          />
          <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }} />
          <Area type="monotone" dataKey="NetWorth" stroke="#6366F1" strokeWidth={3} fill="url(#netWorthGradient)" dot={{ r: 5, strokeWidth: 2 }} />
          <Area type="monotone" dataKey="Assets" stroke="#10B981" strokeWidth={2} fill="url(#assetsGradient)" dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Liabilities" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default React.memo(WealthChart);
