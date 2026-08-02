import React, { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { ArrowLeft, MessageCircle, Clock, User } from "lucide-react";

export default function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/articles/${id}`)
      .then((r) => setArticle(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (notFound) return <Navigate to="/articles" replace />;

  if (loading || !article) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 text-center text-slate-400 text-sm">Loading…</div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <Link to="/articles" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-600 inline-flex items-center gap-2 transition-colors">
          <ArrowLeft size={12} /> Articles
        </Link>

        <div className="mt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {article.category}
          </span>
        </div>
        <h1 className="mt-3 font-display font-black text-3xl md:text-4xl text-slate-800 tracking-tight leading-tight" data-testid="article-title">
          {article.title}
        </h1>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          {article.author && <span className="inline-flex items-center gap-1"><User size={12} /> {article.author}</span>}
          <span>{(article.created_at || "").slice(0, 10)}</span>
        </div>

        <div
          //className="mt-8 prose prose-slate max-w-none prose-headings:font-display prose-a:text-emerald-600"
          className="article-rendered-content prose prose-slate md:prose-lg lg:prose-xl max-w-none w-full prose-headings:font-display prose-a:text-emerald-600"
          dangerouslySetInnerHTML={{ __html: article.body_html || "<p><em>This article has no content yet.</em></p>" }}
        />

        <div className="mt-10 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-display font-bold text-slate-800">Have thoughts on this?</div>
            <div className="text-sm text-slate-500 mt-1">Join the discussion — anonymous and open to everyone.</div>
          </div>
          <Link
            to={`/your-voice?article=${article.article_id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold uppercase tracking-wider shadow-soft-emerald hover:shadow-soft-lg hover:scale-[1.02] transition-all duration-200"
            data-testid="add-your-voice-btn"
          >
            <MessageCircle size={16} /> Add Your Voice
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
