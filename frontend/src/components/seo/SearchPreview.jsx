import React from "react";
import { Globe } from "lucide-react";

const TITLE_PIXEL_LIMIT = 60; // characters, approximation for truncation hint
const DESC_PIXEL_LIMIT = 160;

export function SearchPreview({ title, url, description }) {
  const titleTruncated = (title || "").length > TITLE_PIXEL_LIMIT;
  const descTruncated = (description || "").length > DESC_PIXEL_LIMIT;

  return (
    <div className="soft-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Google search preview
        </span>
      </div>
      <div className="font-sans" style={{ maxWidth: 560 }}>
        <div className="flex items-center gap-2 text-sm text-slate-700 mb-0.5">
          <span className="w-5 h-5 rounded-full bg-slate-200 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{url || "yourdomain.com › page"}</span>
        </div>
        <div
          className="text-[#1a0dab] text-lg leading-snug truncate"
          title={titleTruncated ? "This title will likely be truncated in search results" : undefined}
        >
          {title || <span className="text-slate-400 italic">No title set</span>}
        </div>
        <p className="text-sm text-[#4d5156] leading-snug mt-0.5 line-clamp-2">
          {description || <span className="text-slate-400 italic">No description set</span>}
        </p>
      </div>
      {(titleTruncated || descTruncated) && (
        <p className="text-xs text-amber-600 mt-3">
          {titleTruncated && "Title may be truncated. "}
          {descTruncated && "Description may be truncated."}
        </p>
      )}
    </div>
  );
}
