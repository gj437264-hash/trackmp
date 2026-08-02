import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Grid3x3,
  List,
  ArrowUpDown,
  Calendar,
  User,
  BookOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CATEGORIES = ["News", "Updates", "Research", "Reports"];
const ITEMS_PER_PAGE = 9;

// Memoized StatusBadge component
const StatusBadge = React.memo(({ status }) => {
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
});

StatusBadge.displayName = 'StatusBadge';

// Memoized ArticleCard component
const ArticleCard = React.memo(({ article, isSuperAdmin, onTogglePublish, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`article-card-${article.id}`}
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg inline-block">
              {article.article_id}
            </span>
            <Link
              to={`/dashboard/articles/${article.id}`}
              className="block mt-2 font-display font-bold text-base text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2"
            >
              {article.title}
            </Link>
          </div>
          <StatusBadge status={article.status} />
        </div>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full">
            <BookOpen size={11} />
            {article.category}
          </span>
          {article.author && (
            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full">
              <User size={11} />
              {article.author}
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full">
            <Calendar size={11} />
            {new Date(article.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Tags */}
        {(article.tags || []).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {(article.tags || []).slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"
              >
                {t}
              </span>
            ))}
            {(article.tags || []).length > 3 && (
              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                +{(article.tags || []).length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => onTogglePublish(article)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              article.status === "published"
                ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
            }`}
            data-testid={`toggle-publish-${article.id}`}
          >
            {article.status === "published" ? (
              <>
                <EyeOff size={12} /> Unpublish
              </>
            ) : (
              <>
                <Eye size={12} /> Publish
              </>
            )}
          </button>
          
          {isSuperAdmin && (
            <button
              onClick={() => onDelete(article)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              data-testid={`delete-article-${article.id}`}
              aria-label="Delete article"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ArticleCard.displayName = 'ArticleCard';

// Memoized Skeleton component
const ArticleCardSkeleton = React.memo(() => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-5 bg-slate-200 rounded w-3/4 mt-2" />
      </div>
      <div className="h-6 bg-slate-200 rounded-full w-20" />
    </div>
    <div className="mt-3 flex gap-2">
      <div className="h-5 bg-slate-100 rounded-full w-16" />
      <div className="h-5 bg-slate-100 rounded-full w-16" />
    </div>
    <div className="mt-3 flex gap-1.5">
      <div className="h-4 bg-slate-100 rounded-full w-12" />
      <div className="h-4 bg-slate-100 rounded-full w-12" />
    </div>
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="h-8 bg-slate-100 rounded-lg w-full" />
    </div>
  </div>
));

ArticleCardSkeleton.displayName = 'ArticleCardSkeleton';

export default function Articles() {
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, "super_admin");
  const navigate = useNavigate();

  // State
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "News",
    excerpt: "",
    author: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Memoized filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.article_id.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter((item) => (item.tags || []).includes(selectedTag));
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return result;
  }, [items, searchQuery, selectedTag, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Load articles with debounce
  const loadArticles = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (selectedTag) params.tag = selectedTag;

      const response = await api.get("/admin/articles", { params });
      setItems(response.data.items || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedTag]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) loadArticles();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag]);

  // Initial load
  useEffect(() => {
    loadArticles();
  }, []);

  // Tag management
  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  }, [tagInput, form.tags]);

  const removeTag = useCallback((tagToRemove) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  }, []);

  // Create article
  const createArticle = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post("/admin/articles", form);
      toast.success(`Article "${data.title}" created successfully.`);
      setShowCreate(false);
      setForm({ title: "", category: "News", excerpt: "", author: "", tags: [] });
      await loadArticles();
      navigate(`/dashboard/articles/${data.id}`);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setCreating(false);
    }
  }, [form, navigate, loadArticles]);

  // Toggle publish status
  const togglePublish = useCallback(async (article) => {
    try {
      const { data } = await api.put(`/admin/articles/${article.id}/status`);
      toast.success(`Article ${data.status}.`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === article.id ? { ...item, status: data.status } : item
        )
      );
    } catch (error) {
      toast.error(formatApiError(error));
    }
  }, []);

  // Delete article
  const deleteArticle = useCallback(async (article) => {
    if (!window.confirm(`Delete "${article.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/articles/${article.id}`);
      toast.success("Article deleted successfully.");
      setItems((prev) => prev.filter((item) => item.id !== article.id));
    } catch (error) {
      toast.error(formatApiError(error));
    }
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setForm({ title: "", category: "News", excerpt: "", author: "", tags: [] });
    setTagInput("");
    setShowCreate(false);
  }, []);

  return (
    <DashboardLayout>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 -z-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-200/10 to-purple-200/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-200/10 to-indigo-200/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="p-6 md:p-8 lg:p-10 relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-indigo-200/50">
              <Sparkles size={13} className="text-indigo-400" />
              Content Management
            </div>
            <h1 className="mt-3 font-display font-black text-3xl md:text-4xl tracking-tight text-slate-900">
              Articles
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage and organize your content library
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadArticles(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreate((prev) => !prev)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="create-article-btn"
            >
              <Plus size={18} />
              Create Article
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div
            className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            data-testid="create-article-form"
          >
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
            
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-bold text-slate-800">
                  New Article
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter article title"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
                    data-testid="new-article-title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Author
                  </label>
                  <input
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Author name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Excerpt
                  </label>
                  <input
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Brief summary"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-200"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white"
                    data-testid="new-article-tag-input"
                  />
                  <button
                    onClick={addTag}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all duration-200"
                    data-testid="add-tag-btn"
                  >
                    <Tag size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={createArticle}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold text-sm rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
                  data-testid="submit-create-article"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Article
                    </>
                  )}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, or category..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              data-testid="article-search"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                placeholder="Filter by tag..."
                className="w-40 bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                data-testid="article-tag-filter"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">By Title</option>
            </select>

            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors duration-200 ${
                  viewMode === "grid"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="Grid view"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors duration-200 ${
                  viewMode === "list"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? (
              "Loading..."
            ) : (
              <>
                Showing <span className="font-semibold text-slate-700">{filteredItems.length}</span> articles
                {filteredItems.length !== items.length && (
                  <> (filtered from <span className="font-semibold text-slate-700">{items.length}</span>)</>
                )}
              </>
            )}
          </p>
        </div>

        {/* Articles Grid */}
        <div className="mt-4">
          {loading ? (
            <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-4`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-indigo-200 rounded-2xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-4">
                <FileText size={28} className="text-indigo-400" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-700 mb-1">
                No Articles Found
              </h3>
              <p className="text-slate-500 text-sm">
                {searchQuery || selectedTag
                  ? "Try adjusting your search or filters"
                  : "Create your first article to get started"}
              </p>
              {!searchQuery && !selectedTag && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Create Article
                </button>
              )}
            </div>
          ) : (
            <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-4`}>
              {paginatedItems.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isSuperAdmin={isSuperAdmin}
                  onTogglePublish={togglePublish}
                  onDelete={deleteArticle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
