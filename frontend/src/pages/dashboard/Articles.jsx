import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Search, Trash2, Tag, Eye, EyeOff, Sparkles, X, CheckCircle2, Clock, FileText } from "lucide-react";

const CATEGORIES = ["News", "Updates", "Research", "Reports"];

function StatusBadge({ status }) {
  const isPublished = status === "published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
        isPublished
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {isPublished ? <CheckCircle2 size={10} /> : <Clock size={10} />}
      {status}
    </span>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-slate-200 rounded-full w-16" />
        <div className="h-4 bg-slate-100 rounded-full w-16" />
      </div>
      <div className="h-5 bg-slate-200 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded-full w-1/3 mb-4" />
      <div className="h-8 bg-slate-100 rounded-xl w-1/2" />
    </div>
  );
}

export default function Articles() {
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, "super_admin");
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", category: "News", excerpt: "", author: "", tags: [] });
  const [tagInput, setTagInput] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (tag) params.tag = tag;
    api.get("/admin/articles", { params })
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, tag]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  };
  const removeTag = (t) => setForm({ ...form, tags: form.tags.filter((x) => x !== t) });

  const createArticle = async () => {
    if (!form.title.trim()) { toast.error("Title required."); return; }
    setCreating(true);
    try {
      const { data } = await api.post("/admin/articles", form);
      toast.success(`Article ${data.article_id} created.`);
      setShowCreate(false);
      setForm({ title: "", category: "News", excerpt: "", author: "", tags: [] });
      nav(`/dashboard/articles/${data.id}`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setCreating(false); }
  };

  const togglePublish = async (a) => {
    try {
      const { data } = await api.put(`/admin/articles/${a.id}/status`);
      toast.success(`Article ${data.status}.`);
      setItems((its) => its.map((x) => x.id === a.id ? { ...x, status: data.status } : x));
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const deleteArticle = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/articles/${a.id}`);
      toast.success("Article deleted.");
      setItems((its) => its.filter((x) => x.id !== a.id));
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <DashboardLayout>
      {/* Soft ambient background, consistent with the rest of the redesign */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 via-white to-purple-50/10 -z-20 pointer-events-none" />
      <div className="absolute top-10 -right-20 w-72 h-72 bg-gradient-to-br from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="p-6 md:p-10 relative">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200/50">
              <Sparkles size={13} className="text-indigo-400" /> Content
            </div>
            <h1 className="mt-3 font-display font-black text-4xl tracking-tight text-slate-900">Articles</h1>
          </div>
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-display font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            data-testid="create-article-btn"
          >
            <Plus size={16} /> Create Article
          </button>
        </div>

        {showCreate && (
          <div
            className="mt-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 relative overflow-hidden"
            data-testid="create-article-form"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 opacity-50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title *"
                className="w-full bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                data-testid="new-article-title"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Author"
                className="w-full bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              <input
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Excerpt"
                className="w-full bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div className="relative">
              <div className="flex gap-2 flex-wrap mb-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold pl-3 pr-2 py-1.5 rounded-full border border-indigo-200/60"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:bg-indigo-200/60 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 bg-slate-50/80 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  data-testid="new-article-tag-input"
                />
                <button
                  onClick={addTag}
                  className="inline-flex items-center gap-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-semibold text-xs px-4 py-2 rounded-xl transition-all duration-200"
                  data-testid="add-tag-btn"
                >
                  <Tag size={12} /> Add Tag
                </button>
              </div>
            </div>

            <button
              onClick={createArticle}
              disabled={creating}
              className="relative inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-display font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300"
              data-testid="submit-create-article"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or title…"
              className="w-full bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-sm"
              data-testid="article-search"
            />
          </div>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Filter by tag…"
            className="w-auto bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-sm"
            data-testid="article-tag-filter"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ArticleCardSkeleton key={i} />)
          ) : items.length === 0 ? (
            <div className="col-span-full bg-white/60 backdrop-blur-sm border-2 border-dashed border-indigo-200 rounded-3xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-4">
                <FileText size={28} className="text-indigo-400" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-700 mb-1">No Articles Found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or create a new article.</p>
            </div>
          ) : (
            items.map((a) => (
              <div
                key={a.id}
                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                data-testid={`article-card-${a.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {a.article_id}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <Link
                  to={`/dashboard/articles/${a.id}`}
                  className="block mt-3 font-display font-bold text-lg text-slate-800 hover:text-indigo-600 transition-colors"
                >
                  {a.title}
                </Link>
                <div className="text-xs font-medium text-slate-400 mt-1">{a.category}</div>
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {(a.tags || []).map((t) => (
                    <span key={t} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => togglePublish(a)}
                    className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-semibold text-xs px-3 py-2 rounded-xl transition-all duration-200"
                    data-testid={`toggle-publish-${a.id}`}
                  >
                    {a.status === "published" ? <EyeOff size={12} /> : <Eye size={12} />}
                    {a.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => deleteArticle(a)}
                      className="inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-xl px-3 py-2 transition-all duration-200"
                      data-testid={`delete-article-${a.id}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
