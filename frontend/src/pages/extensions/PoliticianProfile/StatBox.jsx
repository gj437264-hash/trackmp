// StatBox.jsx — small, critical-path component. CSS transitions instead of framer-motion.
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const TONE_CLASSES = {
  primary: "from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/20",
  success: "from-green-500 via-emerald-500 to-teal-500 text-white shadow-green-500/20",
  warning: "from-amber-500 via-orange-500 to-yellow-500 text-white shadow-amber-500/20",
  danger: "from-red-500 via-pink-500 to-rose-500 text-white shadow-red-500/20",
  info: "from-blue-500 via-indigo-500 to-purple-500 text-white shadow-blue-500/20",
  default: "bg-white/80 border border-slate-200/60 text-slate-800 shadow-slate-200/20",
};

function StatBox({ label, value, tone = "default", icon: Icon, trend, trendValue }) {
  const isHighlight = tone !== "default";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-out
        hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]
        ${isHighlight ? `bg-gradient-to-br ${TONE_CLASSES[tone]} shadow-lg` : TONE_CLASSES[tone]}`}
    >
      {isHighlight && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </>
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          {Icon && (
            <Icon size={14} className={isHighlight ? "text-white/70" : "text-indigo-400"} aria-hidden="true" />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHighlight ? "text-white/70" : "text-slate-500"}`}>
            {label}
          </span>
        </div>
        <div className={`font-display font-bold text-2xl md:text-3xl leading-tight ${isHighlight ? "text-white" : "text-slate-800"}`}>
          {value !== undefined && value !== null && value !== "—" ? value : "—"}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${isHighlight ? "text-white/70" : "text-slate-500"}`}>
            {trend === "up" ? (
              <TrendingUp size={12} className="text-emerald-400" aria-hidden="true" />
            ) : (
              <TrendingDown size={12} className="text-red-400" aria-hidden="true" />
            )}
            <span>{trendValue || "0%"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(StatBox);
