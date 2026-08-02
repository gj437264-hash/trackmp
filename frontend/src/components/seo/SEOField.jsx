import React, { useId } from "react";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, RotateCcw } from "lucide-react";

const STATUS_ICON = {
  good: CheckCircle2,
  warning: AlertTriangle,
  missing: HelpCircle,
  invalid: XCircle,
};

const STATUS_STYLE = {
  good: "text-emerald-700 bg-emerald-50 border-emerald-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
  missing: "text-slate-500 bg-slate-50 border-slate-200",
  invalid: "text-rose-700 bg-rose-50 border-rose-200",
};

const STATUS_LABEL = {
  good: "Good",
  warning: "Needs attention",
  missing: "Missing",
  invalid: "Too long",
};

/**
 * StatusPill communicates validation state with both an icon AND text,
 * so meaning never depends on color alone (accessibility requirement).
 */
export function StatusPill({ status }) {
  const Icon = STATUS_ICON[status] || HelpCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}
    >
      <Icon size={12} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * SEOField renders a title/description-style field that can be either
 * "Custom" (admin-entered, persisted) or "Generated automatically"
 * (derived from a template — not yet persisted as an override).
 *
 * `field` shape: { value, is_custom, generated_value }
 */
export function SEOTemplateField({
  label,
  hint,
  field,
  onFieldChange,
  status,
  maxLength,
  multiline = false,
  testId,
}) {
  const id = useId();
  const displayValue = field.is_custom ? field.value : field.generated_value;
  const charCount = (displayValue || "").length;
  const InputTag = multiline ? "textarea" : "input";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label htmlFor={id} className="soft-label">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {status && <StatusPill status={status} />}
          <span
            className={`text-[11px] font-mono ${
              maxLength && charCount > maxLength ? "text-rose-600 font-bold" : "text-slate-400"
            }`}
            aria-live="polite"
          >
            {charCount}
            {maxLength ? ` / ${maxLength}` : ""}
          </span>
        </div>
      </div>

      <InputTag
        id={id}
        data-testid={testId}
        value={displayValue || ""}
        onChange={(e) => onFieldChange({ ...field, is_custom: true, value: e.target.value })}
        rows={multiline ? 3 : undefined}
        className="soft-input w-full"
        placeholder={field.generated_value || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />

      <div className="flex items-center justify-between gap-2">
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              field.is_custom ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {field.is_custom ? "Custom" : "Generated automatically"}
          </span>
          {field.is_custom && (
            <button
              type="button"
              onClick={() => onFieldChange({ ...field, is_custom: false })}
              className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 transition-colors"
              title="Discard custom value and use the generated default"
            >
              <RotateCcw size={11} />
              Reset to generated
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Plain field for values with no generated/default concept (canonical URL, slug, images...). */
export function SEOPlainField({ label, hint, value, onChange, status, placeholder, testId, type = "text" }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="soft-label">
          {label}
        </label>
        {status && <StatusPill status={status} />}
      </div>
      <input
        id={id}
        type={type}
        data-testid={testId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="soft-input w-full"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
