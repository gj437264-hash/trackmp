import React from "react";
import { Share2, ImageOff } from "lucide-react";

export function SocialPreview({ title, description, imageUrl, domain, platform = "Social" }) {
  return (
    <div className="soft-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Share2 size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {platform} sharing preview
        </span>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ maxWidth: 400 }}>
        <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-400">
              <ImageOff size={22} />
              <span className="text-xs">No image set</span>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 uppercase tracking-wide">
            {domain || "yourdomain.com"}
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-2">
            {title || <span className="text-slate-400 italic font-normal">No title set</span>}
          </div>
          {description && (
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
}
