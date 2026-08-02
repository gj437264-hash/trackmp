import React from "react";
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

const ISSUE_ICON = {
  good: ShieldCheck,
  warning: AlertTriangle,
  missing: HelpCircle,
  invalid: XCircle,
};

const ISSUE_STYLE = {
  warning: "text-amber-700 bg-amber-50 border-amber-100",
  missing: "text-slate-600 bg-slate-50 border-slate-100",
  invalid: "text-rose-700 bg-rose-50 border-rose-100",
};

function scoreColor(score) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export function SEOValidationPanel({ score, issues }) {
  return (
    <div className="soft-card p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          SEO completeness
        </span>
        <span className={`text-2xl font-display font-black ${scoreColor(score)}`}>{score}%</span>
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <ShieldCheck size={16} /> No issues found.
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => {
            const Icon = ISSUE_ICON[issue.status] || HelpCircle;
            return (
              <li
                key={issue.field}
                className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${ISSUE_STYLE[issue.status]}`}
              >
                <Icon size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{issue.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
