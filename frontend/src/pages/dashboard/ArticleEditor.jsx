import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Upload,
  Copy,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Video,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";

function mediaIcon(type) {
  if (type === "image") return ImageIcon;
  if (type === "pdf") return FileArchive;
  if (type === "video") return Video;
  return FileText;
}

// Soft status badge — mirrors the "Present Active" / "Verified" style
// used on the public profile and search pages.
function StatusBadge({ status }) {
  const isPublished = status === "published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
        isPublished
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {isPublished ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl animate-pulse">
        <div className="h-4 bg-slate-200 rounded-full w-32 mb-6" />
        <div className="h-8 bg-slate-200 rounded-full w-2/3 mb-8" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    </DashboardLayout>
  );
}

export default function ArticleEditor() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [bodyHtml, setBodyHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const htmlFileRef = useRef(null);   // NEW
  const mediaFileRef = useRef(null);  // NEW

  const load = () => {
    setLoading(true);
    api.get(`/admin/articles/${id}`).then((r) => {
      setArticle(r.data);
      setBodyHtml(r.data.body_html || "");
    }).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const saveBody = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/articles/${id}/body`, { html: bodyHtml });
      toast.success("Article content saved.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post(`/admin/articles/${id}/media`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.applied_to_body) {
        toast.success("HTML applied to article body.");
        load();
      } else {
        toast.success("File uploaded.");
        load();
      }
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploading(false); }
  };

  const copyLink = async (url) => {
    const backendOrigin = API_BASE.replace(/\/api$/, "");
    const fullUrl = url.startsWith("http") ? url : `${backendOrigin}${url}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Link copied to clipboard.");
    } catch (e) {
      toast.error(`Could not copy automatically. Link: ${fullUrl}`);
    }
  };

  const deleteMedia = async (mid) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await api.delete(`/article-media/${mid}`);
      toast.success("File deleted.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (loading || !article) {
    return <LoadingSkeleton />;
  }

  return (
    <DashboardLayout>
      {/* Soft ambient background, consistent with public pages */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 via-white to-purple-50/10 -z-20 pointer-events-none" />
      <div className="absolute top-10 -left-20 w-72 h-72 bg-gradient-to-br from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="p-6 md:p-10 max-w-4xl relative">
        <Link
          to="/dashboard/articles"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} /> Articles
        </Link>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            {article.article_id}
          </span>
          <StatusBadge status={article.status} />
        </div>

        <h1 className="mt-3 font-display font-black text-3xl md:text-4xl tracking-tight text-slate-900">
          {article.title}
        </h1>

        {/* Article Content */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 opacity-50" />

          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Article Content (HTML)</span>
          </div>

          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={14}
            className="w-full bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-2xl px-4 py-3 font-mono text-xs text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            placeholder="<p>Write or paste article HTML here. Use the Copy Link button on any uploaded file below to reference it, e.g. <img src='...' />.</p>"
            data-testid="article-body-input"
          />

          <button
            onClick={saveBody}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-display font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            data-testid="save-article-body"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save Content"}
          </button>
        </div>

        {/* Media & Files */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-gradient-to-br from-indigo-100/20 to-purple-100/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between mb-5 flex-wrap gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Media & Files (images, video, PDF, or upload .html to replace content)
            </span>
            <div className="flex gap-2">
              <input
                ref={htmlFileRef}
                type="file"
                accept=".html,.htm"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                className="hidden"
                data-testid="article-html-file-input"
              />
              <button
                onClick={() => htmlFileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-indigo-50 disabled:opacity-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-200"
                data-testid="upload-article-html-btn"
              >
                <FileText size={13} /> {uploading ? "Uploading…" : "Upload HTML (replaces content)"}
              </button>

              <input
                ref={mediaFileRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                className="hidden"
                data-testid="article-media-file-input"
              />
              <button
                onClick={() => mediaFileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-indigo-50 disabled:opacity-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-200"
                data-testid="upload-article-media-btn"
              >
                <Upload size={13} /> {uploading ? "Uploading…" : "Upload Image / Video / PDF"}
              </button>
            </div>
          </div>

          {(article.media || []).length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No files uploaded yet
            </div>
          ) : (
            <div className="relative space-y-2">
              {article.media.map((m) => {
                const Icon = mediaIcon(m.file_type);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-3 transition-all duration-200"
                    data-testid={`article-media-${m.id}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-indigo-500" />
                    </div>
                    <span className="flex-1 text-sm text-slate-700 truncate">{m.filename}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {m.file_type}
                    </span>
                    <button
                      onClick={() => copyLink(m.url)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl px-3 py-1.5 shrink-0 transition-colors duration-200"
                      data-testid={`copy-link-${m.id}`}
                    >
                      <Copy size={12} /> Copy Link
                    </button>
                    <button
                      onClick={() => deleteMedia(m.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      data-testid={`delete-media-${m.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
