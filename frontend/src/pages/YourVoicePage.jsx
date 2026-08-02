import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { voiceApi } from "@/lib/voiceApi";
import DOMPurify from "dompurify";
import {
  Search,
  MessageCircle,
  CornerDownRight,
  Send,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Filter,
  MessageSquare,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Bell,
  BellOff,
  Smile,
  X,
  Check,
  ArrowUp,
  Users,
  Hash,
} from "lucide-react";

// ============================================
// SECURITY UTILITIES
// ============================================
// NOTE: everything in this file runs in the browser. sanitizeText() below
// is a UX affordance only — the backend independently re-sanitizes every
// field server-side (bleach), and is the sole source of truth for
// authorship (session cookie), ownership, and anonymization (HMAC label).
// Anyone can open devtools and call the API directly with curl/Postman —
// the server-side checks are what actually matter.

const MAX_COMMENT_LENGTH = 500;
const MAX_SEARCH_LENGTH = 100;
const MAX_REPORT_LENGTH = 200;

function sanitizeText(text, maxLength = MAX_COMMENT_LENGTH) {
  if (!text || typeof text !== "string") return "";
  const bounded = text.slice(0, maxLength * 2);
  return DOMPurify.sanitize(bounded, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function timeAgo(iso) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return "";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

// ============================================
// SCROLL TO TOP
// ============================================
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors"
      title="Back to top"
      aria-label="Back to top"
    >
      <ArrowUp size={16} />
    </button>
  );
}

// ============================================
// REPLY ITEM
// ============================================
function ReplyItem({ reply, onQuoteReply }) {
  return (
    <div className="bg-slate-50/80 rounded-lg px-3 py-2 hover:bg-slate-100/80 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-teal-600 bg-teal-50/80 px-1.5 py-0.5 rounded">
            {reply.anon_label}
          </span>
          <span className="text-[9px] text-slate-400">{timeAgo(reply.date)}</span>
        </div>
        {reply.edited && <span className="text-[8px] text-slate-400 italic">edited</span>}
      </div>
      <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
        {reply.hidden ? <span className="italic text-slate-400">Comment hidden by moderator</span> : reply.body}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <button
          onClick={() => onQuoteReply(reply.anon_label)}
          className="text-[9px] text-slate-400 hover:text-emerald-600 transition-colors"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMMENT CARD (root comment + replies)
// ============================================
function CommentCard({
  articleId,
  comment,
  index,
  isSubscribed,
  isHighlighted,
  localReaction,
  onReply,
  onReact,
  onEdit,
  onReport,
  onToggleSubscription,
}) {
  const [expanded, setExpanded] = useState(true);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const replyRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (replying) replyRef.current?.focus();
  }, [replying]);
  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  // Real ownership, decided server-side and returned on every fetch — the
  // backend compares the request's session cookie to the comment's stored
  // anon_session_id. is_mine is just a display hint, not a security check;
  // the actual edit endpoint re-verifies ownership independently.
  const isOwner = comment.is_mine;
  const replies = comment.replies || [];
  const visibleReplies = showAllReplies ? replies : replies.slice(0, 3);

  // Reactions/votes are local-only for now (no backend persistence yet) —
  // they reset on page reload and aren't shared between visitors.
  const vote = localReaction?.vote || null;
  const upvotes = (comment.upvotes || 0) + (vote === "up" ? 1 : 0);
  const downvotes = (comment.downvotes || 0) + (vote === "down" ? 1 : 0);
  const reactions = localReaction?.reactions || {};

  const submitReply = useCallback(() => {
    const clean = sanitizeText(replyBody);
    if (!clean) return;
    onReply(comment.id, clean);
    setReplyBody("");
    setReplying(false);
  }, [replyBody, comment.id, onReply]);

  const submitEdit = useCallback(() => {
    if (!isOwner) return;
    const clean = sanitizeText(editBody);
    if (!clean || clean === comment.body) {
      setEditing(false);
      return;
    }
    onEdit(comment.id, clean);
    setEditing(false);
  }, [editBody, comment.body, comment.id, isOwner, onEdit]);

  return (
    <div
      id={`comment-${comment.id}`}
      className={`bg-white border rounded-xl transition-all duration-300 ${
        isHighlighted
          ? "border-emerald-400 shadow-lg shadow-emerald-100/50"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="px-4 py-3 flex items-start justify-between border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
          <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
            {comment.anon_label}
          </span>
          <span className="text-[10px] text-slate-400">{timeAgo(comment.date)}</span>
          {comment.edited && <span className="text-[9px] text-slate-400 italic">(edited)</span>}
          {replies.length > 0 && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded((v) => !v)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <MessageSquare size={12} /> Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    onToggleSubscription(comment.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  {isSubscribed ? <BellOff size={12} /> : <Bell size={12} />}
                  {isSubscribed ? "Unsubscribe" : "Subscribe"}
                </button>
                <button
                  onClick={() => {
                    setReportOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Flag size={12} /> Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3">
          {editing ? (
            <div className="flex gap-2">
              <textarea
                ref={editRef}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitEdit();
                  }
                  if (e.key === "Escape") {
                    setEditing(false);
                    setEditBody(comment.body);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={submitEdit}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {comment.hidden ? (
                <span className="italic text-slate-400">Comment hidden by moderator</span>
              ) : (
                comment.body
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setReplying((v) => !v)}
              className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1.5 transition-colors"
            >
              <CornerDownRight size={12} /> Reply
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onReact(comment.id, "vote", "up")}
                className={`p-0.5 rounded transition-colors ${
                  vote === "up" ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-emerald-600"
                }`}
              >
                <ThumbsUp size={12} />
              </button>
              <span className="text-[10px] font-medium text-slate-500 min-w-[16px] text-center">{upvotes}</span>
              <button
                onClick={() => onReact(comment.id, "vote", "down")}
                className={`p-0.5 rounded transition-colors ${
                  vote === "down" ? "text-red-600 bg-red-50" : "text-slate-400 hover:text-red-600"
                }`}
              >
                <ThumbsDown size={12} />
              </button>
              <span className="text-[10px] font-medium text-slate-500 min-w-[16px] text-center">{downvotes}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setReactionsOpen((v) => !v)}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <Smile size={12} />
              </button>
              {reactionsOpen && (
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex gap-1 z-10">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(comment.id, "emoji", emoji);
                        setReactionsOpen(false);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-sm transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {Object.keys(reactions).length > 0 && (
              <div className="flex items-center gap-1">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <span key={emoji} className="text-[10px] bg-slate-100 rounded-full px-1.5 py-0.5">
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {replying && (
            <div className="mt-3 flex gap-2">
              <textarea
                ref={replyRef}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitReply();
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={submitReply}
                  disabled={!replyBody.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={12} />
                </button>
                <button
                  onClick={() => setReplying(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {visibleReplies.length > 0 && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-emerald-200/50 space-y-2">
              {visibleReplies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  onQuoteReply={(quotedLabel) => {
                    setReplying(true);
                    setReplyBody(`@${quotedLabel} `);
                  }}
                />
              ))}
              {!showAllReplies && replies.length > 3 && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors pl-1"
                >
                  Show {replies.length - 3} more replies
                </button>
              )}
              {showAllReplies && replies.length > 3 && (
                <button
                  onClick={() => setShowAllReplies(false)}
                  className="text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors pl-1"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            {reportSent ? (
              <div className="text-center py-4">
                <Check size={32} className="mx-auto mb-3 text-emerald-600" />
                <h3 className="font-bold text-slate-800 mb-1">Report submitted</h3>
                <p className="text-sm text-slate-600">Thank you for helping keep our community safe.</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-800 mb-3">Report comment</h3>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please describe why you're reporting this comment..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-3 resize-none"
                  rows={3}
                  maxLength={MAX_REPORT_LENGTH}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReportOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const clean = sanitizeText(reportReason, MAX_REPORT_LENGTH);
                      if (!clean) return;
                      onReport(comment.id, clean);
                      setReportSent(true);
                      setTimeout(() => {
                        setReportOpen(false);
                        setReportSent(false);
                        setReportReason("");
                      }, 2000);
                    }}
                    disabled={!reportReason.trim()}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// NEW COMMENT COMPOSER
// ============================================
function NewCommentBox({ articleId, onSubmit }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const clean = sanitizeText(value);
    if (!clean) return;
    onSubmit(articleId, clean);
    setValue("");
  };
  return (
    <div className="flex gap-2 items-start bg-white/70 border border-slate-200 rounded-xl p-3">
      <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-1 shrink-0">
        Anonymous
      </span>
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add your voice to this discussion..."
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none transition-shadow"
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="Add comment"
        />
        <div className="absolute bottom-2 right-2 text-[9px] text-slate-400 opacity-60">Enter to post</div>
      </div>
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Send size={14} />
      </button>
    </div>
  );
}

// ============================================
// SIDEBAR LIST ITEM
// ============================================
function DiscussionListItem({ discussion, isActive, isBookmarked, onSelect }) {
  return (
    <button
      onClick={() => onSelect(discussion.article_id)}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isActive ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-slate-800 line-clamp-2">{discussion.article_title}</span>
        {isBookmarked && <Bookmark size={12} className="shrink-0 mt-0.5 text-amber-500" fill="currentColor" />}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <MessageCircle size={11} /> {discussion.comment_count}
        </span>
      </div>
    </button>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function YourVoicePage() {
  const [searchParams] = useSearchParams();
  const jumpToArticle = searchParams.get("article");
  const jumpToComment = searchParams.get("comment");

  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState("active");
  const [showFilters, setShowFilters] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState(jumpToArticle || null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({ id: "", title: "" });

  const [discussionList, setDiscussionList] = useState([]); // [{article_id, article_title, comment_count}]
  const [activeThread, setActiveThread] = useState(null);   // {article_id, comments: [...]}

  // Local-only reactions/votes overlay, keyed by comment id. Not persisted
  // to the backend — resets on reload. Survives thread refetches because
  // it lives outside activeThread state.
  const [localReactions, setLocalReactions] = useState({});

  useEffect(() => {
    window.__voiceFormRenderedAt = new Date().toISOString();
    voiceApi.listDiscussions().then((r) => setDiscussionList(r.data)).catch(() => {});
  }, []);

  const loadThread = useCallback((articleId) => {
    voiceApi.getDiscussion(articleId).then((r) => setActiveThread(r.data)).catch(() => {});
  }, []);

  // Ensure the linked article appears in the sidebar even if it has zero
  // comments yet (list endpoint only returns articles with existing
  // discussion), then load its thread.
  useEffect(() => {
    if (!jumpToArticle) return;
    setActiveArticleId(jumpToArticle);
    loadThread(jumpToArticle);
    setDiscussionList((prev) => {
      if (prev.some((d) => d.article_id === jumpToArticle)) return prev;
      return prev; // filled in below once we know the title
    });
    api
      .get(`/articles/${jumpToArticle}`)
      .then((r) => {
        const a = r.data;
        setDiscussionList((prev) =>
          prev.some((d) => d.article_id === jumpToArticle)
            ? prev
            : [{ article_id: a.article_id, article_title: a.title, comment_count: 0 }, ...prev]
        );
      })
      .catch(() => {});
  }, [jumpToArticle, loadThread]);

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = sessionStorage.getItem("voice-bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    try {
      const saved = sessionStorage.getItem("voice-subscriptions");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("voice-bookmarks", JSON.stringify([...bookmarks]));
    } catch {}
  }, [bookmarks]);

  useEffect(() => {
    try {
      sessionStorage.setItem("voice-subscriptions", JSON.stringify([...subscriptions]));
    } catch {}
  }, [subscriptions]);

  useEffect(() => {
    if (!jumpToComment) return;
    const t = setTimeout(() => {
      document.getElementById(`comment-${jumpToComment}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [jumpToComment, activeArticleId]);

  const addComment = (articleId, body) => {
    voiceApi.postComment(articleId, body).then(() => {
      loadThread(articleId);
      setDiscussionList((prev) =>
        prev.map((d) => (d.article_id === articleId ? { ...d, comment_count: d.comment_count + 1 } : d))
      );
    });
  };

  const addReply = (articleId, commentId, body) => {
    voiceApi.postComment(articleId, body, commentId).then(() => loadThread(articleId));
  };

  const editComment = (articleId, commentId, newBody) => {
    const clean = sanitizeText(newBody);
    if (!clean) return;
    voiceApi.editComment(commentId, clean).then(() => loadThread(articleId));
  };

  // Local-only — no backend persistence for votes/reactions yet.
  const addReaction = (commentId, kind, value) => {
    setLocalReactions((prev) => {
      const existing = prev[commentId] || { vote: null, reactions: {} };
      if (kind === "vote") {
        const nextVote = existing.vote === value ? null : value;
        return { ...prev, [commentId]: { ...existing, vote: nextVote } };
      }
      const reactions = { ...existing.reactions, [value]: (existing.reactions[value] || 0) + 1 };
      return { ...prev, [commentId]: { ...existing, reactions } };
    });
  };

  const reportComment = (articleId, commentId, reason) => {
    voiceApi.reportComment(commentId, reason);
  };

  const toggleSubscription = (commentId) => {
    setSubscriptions((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  const toggleBookmark = (articleId) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(articleId) ? next.delete(articleId) : next.add(articleId);
      return next;
    });
  };

  const openShare = (articleId, articleTitle) => {
    setShareData({ id: articleId, title: articleTitle });
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/voice?article=${shareData.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setTimeout(() => setShowShareModal(false), 1200))
      .catch(() => {});
  };

  // Search/sort operate on the sidebar list only (titles + comment counts);
  // full-text search across comment bodies would need a dedicated backend
  // search endpoint, not built yet.
  const filteredDiscussions = useMemo(() => {
    let result = discussionList;
    if (q) {
      const term = q.toLowerCase();
      result = result.filter((d) => d.article_title.toLowerCase().includes(term));
    }
    if (sortMode === "popular") {
      result = [...result].sort((a, b) => b.comment_count - a.comment_count);
    }
    if (bookmarks.size > 0) {
      result = [...result].sort((a, b) => {
        if (bookmarks.has(a.article_id) && !bookmarks.has(b.article_id)) return -1;
        if (!bookmarks.has(a.article_id) && bookmarks.has(b.article_id)) return 1;
        return 0;
      });
    }
    return result;
  }, [discussionList, q, sortMode, bookmarks]);

  useEffect(() => {
    if (!activeArticleId && filteredDiscussions.length > 0) {
      const first = filteredDiscussions[0].article_id;
      setActiveArticleId(first);
      loadThread(first);
    }
  }, [activeArticleId, filteredDiscussions, loadThread]);

  const activeMeta = discussionList.find((d) => d.article_id === activeArticleId);
  const totalComments = discussionList.reduce((sum, d) => sum + d.comment_count, 0);

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200/50">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
            <Hash size={12} />
            <span>/// Your Voice</span>
            <span className="w-px h-3 bg-emerald-200" />
            <span className="text-slate-400 font-normal">Anonymous Discussions</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display font-black text-3xl text-slate-800 tracking-tight">Focus Flow</h1>
              <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                Browse a discussion on the left, join the conversation on the right.
              </p>
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="p-2 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Bell size={16} className="text-slate-600" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                  </div>
                  <div className="p-4 text-center text-xs text-slate-400">No notifications yet</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MessageCircle size={14} className="text-emerald-600" />
            <span className="font-bold text-slate-700">{totalComments}</span>
            <span>comments</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={14} className="text-emerald-600" />
            <span className="font-bold text-slate-700">{discussionList.length}</span>
            <span>active threads</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${
              showFilters ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Filter size={12} /> Filters
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(sanitizeText(e.target.value, MAX_SEARCH_LENGTH))}
            placeholder="Search discussions by title..."
            className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-shadow"
            maxLength={MAX_SEARCH_LENGTH}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl flex flex-wrap gap-2">
            <span className="text-[9px] font-bold uppercase text-slate-400 w-full">Sort</span>
            {[
              { mode: "active", label: "Active" },
              { mode: "popular", label: "Popular" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  sortMode === mode ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Body: sidebar + thread */}
        {filteredDiscussions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No discussions found</p>
            <p className="text-sm">{q ? "Try adjusting your search terms" : "Be the first to start a discussion!"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="space-y-2 lg:max-h-[75vh] lg:overflow-y-auto lg:pr-1">
              {filteredDiscussions.map((d) => (
                <DiscussionListItem
                  key={d.article_id}
                  discussion={d}
                  isActive={activeArticleId === d.article_id}
                  isBookmarked={bookmarks.has(d.article_id)}
                  onSelect={(id) => {
                    setActiveArticleId(id);
                    loadThread(id);
                  }}
                />
              ))}
            </aside>

            {activeThread && activeMeta && (
              <main>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/articles/${activeMeta.article_id}`}
                      className="text-base font-bold text-slate-800 hover:text-emerald-600 transition-colors"
                    >
                      {activeMeta.article_title}
                    </Link>
                    {bookmarks.has(activeMeta.article_id) && (
                      <span className="text-[8px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                        ★ Bookmarked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleBookmark(activeMeta.article_id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        bookmarks.has(activeMeta.article_id)
                          ? "text-amber-500 bg-amber-50"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Bookmark size={14} fill={bookmarks.has(activeMeta.article_id) ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => openShare(activeMeta.article_id, activeMeta.article_title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                <NewCommentBox articleId={activeMeta.article_id} onSubmit={addComment} />

                {activeThread.comments.length === 0 ? (
                  <div className="text-center py-8 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl mt-4">
                    <p className="text-sm text-slate-400">No comments yet — start the discussion!</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {activeThread.comments.map((comment, idx) => (
                      <CommentCard
                        key={comment.id}
                        articleId={activeMeta.article_id}
                        comment={comment}
                        index={idx}
                        isSubscribed={subscriptions.has(comment.id)}
                        isHighlighted={jumpToComment === comment.id}
                        localReaction={localReactions[comment.id]}
                        onReply={(commentId, body) => addReply(activeMeta.article_id, commentId, body)}
                        onReact={addReaction}
                        onEdit={(commentId, body) => editComment(activeMeta.article_id, commentId, body)}
                        onReport={(commentId, reason) => reportComment(activeMeta.article_id, commentId, reason)}
                        onToggleSubscription={toggleSubscription}
                      />
                    ))}
                  </div>
                )}
              </main>
            )}
          </div>
        )}

        <ScrollTopButton />

        {showShareModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Share discussion</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{shareData.title}</p>
              <div className="flex gap-2">
                <input
                  value={`${window.location.origin}/voice?article=${shareData.id}`}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
