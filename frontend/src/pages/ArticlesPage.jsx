import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { Search, Clock, ArrowRight } from "lucide-react";

const CATEGORIES = ["News", "Updates", "Research", "Reports"];

function ArticleRow({ a }) {
  return (
    <Link
      to={`/articles/${a.article_id}`}
      className="block py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 -mx-3 px-3 rounded-xl transition-colors duration-200"
      data-testid={`article-row-${a.article_id}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          {a.category}
        </span>
        <span className="text-xs text-slate-400">{(a.created_at || "").slice(0, 10)}</span>
      </div>
      <h3 className="font-display font-bold text-slate-800 leading-snug">{a.title}</h3>
      {a.excerpt && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{a.excerpt}</p>}
    </Link>
  );
}

export default function ArticlesPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (category !== "All") params.category = category;
    const t = setTimeout(() => {
      api.get("/articles", { params })
        .then((r) => setArticles(r.data.items || []))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, category]);

  const featured = articles[0];
  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach((c) => { counts[c] = articles.filter((a) => a.category === c).length; });
    return counts;
  }, [articles]);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">/// Articles</div>
        <h1 className="font-display font-black text-4xl text-slate-800 tracking-tight">News, Research & Reports</h1>
        <p className="mt-3 text-slate-500 max-w-2xl">
          Updates, investigations, and platform reports on political transparency and accountability.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              data-testid="article-search"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                data-testid={`category-filter-${c.toLowerCase()}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                  category === c ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-10 text-center py-16 text-slate-400 text-sm">Loading articles…</div>
        ) : (
          <>
            {category === "All" && !q && featured && (
              <Link
                to={`/articles/${featured.article_id}`}
                className="mt-8 block bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 hover:shadow-soft-lg transition-shadow duration-200"
                data-testid="featured-article"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 mb-2">Featured</div>
                <h2 className="font-display font-black text-2xl text-slate-800">{featured.title}</h2>
                {featured.excerpt && <p className="mt-2 text-slate-500">{featured.excerpt}</p>}
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                  Read more <ArrowRight size={14} />
                </div>
              </Link>
            )}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
              <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl px-3 py-2">
                {articles.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">No articles match your search.</div>
                ) : (
                  articles.map((a) => <ArticleRow key={a.article_id} a={a} />)
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Categories</div>
                  <ul className="space-y-2 text-sm">
                    {CATEGORIES.map((c) => (
                      <li key={c}>
                        <button onClick={() => setCategory(c)} className="text-slate-600 hover:text-emerald-700 transition-colors">
                          {c} <span className="text-slate-300">({categoryCounts[c] ?? 0})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <Clock size={12} /> Recently Published
                  </div>
                  <ul className="space-y-2">
                    {articles.slice(0, 3).map((a) => (
                      <li key={a.article_id}>
                        <Link to={`/articles/${a.article_id}`} className="text-sm text-slate-600 hover:text-emerald-700 transition-colors line-clamp-2">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
