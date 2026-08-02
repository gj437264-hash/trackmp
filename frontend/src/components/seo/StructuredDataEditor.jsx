import React from "react";
import { Braces, Plus, X } from "lucide-react";
import { SEOPlainField } from "./SEOField";

/**
 * Renders editable fields for a content type's schema.org type, driven by
 * `contentType.structuredDataFields` (see lib/seo/contentTypes.js).
 * List-type fields (e.g. sameAs URLs) render as a tag/chip editor.
 */
export function StructuredDataEditor({ contentType, structuredData, onChange }) {
  const fields = contentType.structuredDataFields || [];

  const setField = (key, value) => {
    onChange({ ...structuredData, fields: { ...structuredData.fields, [key]: value } });
  };

  return (
    <div className="soft-card p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Braces className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-slate-800">Structured Data</h3>
          <p className="text-xs text-slate-500">
            Schema.org type:{" "}
            <span className="font-mono font-semibold text-slate-700">
              {structuredData.schema_type}
            </span>
          </p>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">
          No structured-data fields are configured for this content type yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) =>
            f.isList ? (
              <ListField
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                values={structuredData.fields[f.key] || []}
                onChange={(vals) => setField(f.key, vals)}
              />
            ) : (
              <SEOPlainField
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                value={structuredData.fields[f.key] || ""}
                onChange={(v) => setField(f.key, v)}
                testId={`sd-field-${f.key}`}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function ListField({ label, placeholder, values, onChange }) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <label className="soft-label">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="soft-input flex-1"
        />
        <button type="button" onClick={add} className="btn-soft-secondary px-3">
          <Plus size={14} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {values.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full"
            >
              <span className="truncate max-w-[180px]">{v}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${v}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
