import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { getArticle } from "@/lib/mockArticles";
import { SEED_DISCUSSIONS } from "@/lib/mockDiscussions";
import { api } from "@/lib/api";
import { getAnonLabel } from "@/lib/anonId";
import { Search, MessageCircle, CornerDownRight, Send } from "lucide-react";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Comment({ threadId, comment, onReply }) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const label = `Anon#${comment.authorId}`;

  const submitReply = () => {
    if (!replyBody.trim()) return;
    onReply(comment.id, replyBody.trim());
    setReplyBody("");
    setReplying(false);
  };

  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{label}</span>
        <span className="text-[11px] text-slate-400">{timeAgo(comment.date)}</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{comment.body}</p>
      <button
        onClick={() => setReplying((r) => !r)}
        className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1"
      >
        <CornerDownRight size={11} /> Reply
      </button>

      {replying && (
        <div className="mt-2 flex gap-2">
          <input
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
            placeholder="Write a reply..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            data-testid={`reply-input-${comment.id}`}
          />
          <button onClick={submitReply} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">
            <Send size={12} />
          </button>
        </div>
      )}

      {(comment.replies || []).length > 0 && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-slate-100 space-y-3">
          {comment.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">Anon#{r.authorId}</span>
                <span className="text-[11px] text-slate-400">{timeAgo(r.date)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadCard({ threadId, articleId, articleTitle, comments, onAddComment, onReply }) {
  const [newComment, setNewComment] = useState("");
  const label = getAnonLabel(threadId);

  const submit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 break-inside-avoid mb-6" data-testid={`thread-${articleId}`}>
      <Link to={`/articles/${articleId}`} className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:underline">
        {articleTitle}
      </Link>
      <div className="mt-3 divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="py-3 text-sm text-slate-400 italic">No comments yet — be the first to add your voice.</div>
        ) : (
          comments.map((c) => <Comment key={c.id} threadId={threadId} comment={c} onReply={onReply} />)
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 items-start">
        <span className="font-mono text-[10px] font-bold text-slate-400 mt-2 shrink-0">{label}</span>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add your voice..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          data-testid={`comment-input-${articleId}`}
        />
        <button onClick={submit} className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

export default function YourVoicePage() {
  const [searchParams] = useSearchParams();
  const jumpToArticle = searchParams.get("article");
  const [q, setQ] = useState("");
  const [discussions, setDiscussions] = useState(() =>
    SEED_DISCUSSIONS.map((d) => ({ ...d, comments: d.comments.map((c) => ({ ...c, replies: [...(c.replies || [])] })) }))
  );

  // Ensure the article we arrived from has a (possibly empty) discussion card.
  // Checks mock articles first (for seeded demo threads), then falls back to
  // the real backend for published articles created via the admin CMS.
  useEffect(() => {
    if (!jumpToArticle) return;
    setDiscussions((prev) => {
      if (prev.some((d) => d.articleId === jumpToArticle)) return prev;
      return prev;
    });

    const mockArticle = getArticle(jumpToArticle);
    if (mockArticle) {
      setDiscussions((prev) =>
        prev.some((d) => d.articleId === jumpToArticle)
          ? prev
          : [{ articleId: mockArticle.id, articleTitle: mockArticle.title, comments: [] }, ...prev]
      );
      return;
    }

    api.get(`/articles/${jumpToArticle}`)
      .then((r) => {
        const a = r.data;
        setDiscussions((prev) =>
          prev.some((d) => d.articleId === jumpToArticle)
            ? prev
            : [{ articleId: a.article_id, articleTitle: a.title, comments: [] }, ...prev]
        );
      })
      .catch(() => { /* article not found or unpublished — no thread card shown */ });
  }, [jumpToArticle]);

  const addComment = (articleId, body) => {
    setDiscussions((prev) =>
      prev.map((d) =>
        d.articleId === articleId
          ? { ...d, comments: [...d.comments, { id: `c${Date.now()}`, authorId: getAnonLabel(articleId).split("#")[1], body, date: new Date().toISOString(), replies: [] }] }
          : d
      )
    );
  };

  const addReply = (articleId, commentId, body) => {
    setDiscussions((prev) =>
      prev.map((d) =>
        d.articleId !== articleId
          ? d
          : {
              ...d,
              comments: d.comments.map((c) =>
                c.id === commentId
                  ? { ...c, replies: [...(c.replies || []), { id: `${commentId}r${Date.now()}`, authorId: getAnonLabel(articleId).split("#")[1], body, date: new Date().toISOString() }] }
                  : c
              ),
            }
      )
    );
  };

  const filtered = useMemo(() => {
    if (!q) return discussions;
    return discussions.filter((d) => d.articleTitle.toLowerCase().includes(q.toLowerCase()));
  }, [discussions, q]);

  const orderedFiltered = jumpToArticle
    ? [...filtered].sort((a, b) => (a.articleId === jumpToArticle ? -1 : b.articleId === jumpToArticle ? 1 : 0))
    : filtered;

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">/// Your Voice</div>
        <h1 className="font-display font-black text-4xl text-slate-800 tracking-tight">Open Discussion</h1>
        <p className="mt-3 text-slate-500 max-w-2xl">
          Anonymous, threaded discussion on articles and reports. Each visitor gets a unique, thread-specific ID — nothing links your identity across discussions.
        </p>

        <div className="mt-8 relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search discussions by article..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            data-testid="voice-search"
          />
        </div>

        <div className="mt-8">
          {orderedFiltered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
              No discussions match your search.
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-6">
              {orderedFiltered.map((d) => (
                <ThreadCard
                  key={d.articleId}
                  threadId={d.articleId}
                  articleId={d.articleId}
                  articleTitle={d.articleTitle}
                  comments={d.comments}
                  onAddComment={(body) => addComment(d.articleId, body)}
                  onReply={(commentId, body) => addReply(d.articleId, commentId, body)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
